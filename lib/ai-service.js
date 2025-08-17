import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// 1. Business extraction (onboarding)
export async function extractBusinessProfile(siteText) {
  const prompt = `You are extracting a tiny business profile for auto-reply generation on X.

Return strict JSON with keys:
summary (1 sentence),
products (max 3),
audience (2–3 words each),
value_props (3 bullets),
tone: {style: one of [casual, neutral, pro], emojis: one of [never, mirror]},
safe_topics (5–10 topic nouns/phrases),
avoid (list; must include politics, tragedy; add competitor names only if explicit in text),
starter_keywords (8–15 short buyer-intent tweet phrases),
plug_line (1 gentle sentence, no hype).

Rules:
- Keep it short and concrete.
- Infer tone from the text; default casual if unclear.
- Keywords must sound like tweets ("any tools for…?", "recommend ___?", "how do I ___?"), not SEO terms.
- Do not invent features not present in the text.

TEXT START
${siteText}
TEXT END`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a business profile extractor. Return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    })

    const response = completion.choices[0].message.content
    return JSON.parse(response)
  } catch (error) {
    console.error('Error extracting business profile:', error)
    throw new Error('Failed to extract business profile')
  }
}

// 2. Relevance check (every cron cycle)
export async function checkRelevance(tweetText, safeTopics, summary) {
  const prompt = `You are a relevance filter for auto-reply on X.

Return JSON:
{
  "relevant": true|false,
  "reason": "short explanation"
}

Rules:
- Tweet must contain a buyer-intent phrase such as: any tools, recommend, how do I, best way, quick way, tips for, stuck with, need help with, looking for.
- Skip if it looks like giveaway, hiring, politics, election, NSFW, or promo spam.
- Skip if older than 5 minutes.
- Otherwise, check semantic similarity to provided safe_topics/summary. If similarity feels medium+ → relevant=true.
- Keep it strict: only pass tweets that a business could reply helpfully to.

Tweet: "${tweetText}"
Safe topics: ${JSON.stringify(safeTopics)}
Business summary: "${summary}"`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a relevance filter. Return only valid JSON."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 200
    })

    const response = completion.choices[0].message.content
    return JSON.parse(response)
  } catch (error) {
    console.error('Error checking relevance:', error)
    return { relevant: false, reason: 'Error processing tweet' }
  }
}

// 3. Reply generator (main)
export async function generateReply(tweetText, businessProfile) {
  const prompt = `You are EarlyReply. Write ONE reply (≤240 chars) to the given tweet.

Rules:
- Start with one practical, concrete tip that addresses the author's need.
- If relevant, add a second short sentence using the provided plug_line.
- No hashtags. No links (unless CTA says link).
- Use "we" voice unless told otherwise.
- Mirror emoji use only if the author used them.
- Avoid hype, absolutes, politics, tragedy, harassment, health/finance advice.
- Reply must be helpful and natural, not salesy.

Tweet: "${tweetText}"
Business summary: "${businessProfile.summary}"
Value props: ${JSON.stringify(businessProfile.value_props)}
Products: ${JSON.stringify(businessProfile.products)}
Plug line: "${businessProfile.plug_line}"
Tone style: ${businessProfile.tone.style}
Emoji policy: ${businessProfile.tone.emojis}

Return the reply text only.`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are EarlyReply. Generate helpful, natural replies."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 100
    })

    return completion.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error generating reply:', error)
    throw new Error('Failed to generate reply')
  }
}

// 4. Shorten / neutralize (fallback if reply too long or unsafe)
export async function shortenReply(replyText, tweetText) {
  const prompt = `Rewrite the reply to ≤220 chars. Keep the key tip. Remove hype. No emojis unless the tweet used them. Keep it link-free. Output only the rewritten reply.

Original reply: "${replyText}"
Original tweet: "${tweetText}"`

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are a reply editor. Shorten and clean up replies."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 100
    })

    return completion.choices[0].message.content.trim()
  } catch (error) {
    console.error('Error shortening reply:', error)
    // Fallback: truncate manually
    return replyText.length > 220 ? replyText.substring(0, 217) + '...' : replyText
  }
}

// Helper function to process a tweet through the full AI pipeline
export async function processTweetWithAI(tweetText, businessProfile) {
  try {
    // Step 1: Check relevance
    const relevanceResult = await checkRelevance(tweetText, businessProfile.safe_topics, businessProfile.summary)
    
    if (!relevanceResult.relevant) {
      return {
        relevant: false,
        reason: relevanceResult.reason
      }
    }

    // Step 2: Generate reply
    let reply = await generateReply(tweetText, businessProfile)
    
    // Step 3: Check if reply needs shortening
    if (reply.length > 220) {
      reply = await shortenReply(reply, tweetText)
    }

    return {
      relevant: true,
      reply: reply,
      relevanceReason: relevanceResult.reason
    }
  } catch (error) {
    console.error('Error in AI pipeline:', error)
    return {
      relevant: false,
      reason: 'Error processing tweet'
    }
  }
} 