# Monitor Keywords Upgrade

This document describes the major upgrade to the `/api/cron/monitor-keywords` endpoint to improve efficiency, reduce costs, and provide better observability.

## 🚀 Key Changes

### A) Removed 3-Param Probing
- **Before**: The system tried `limit`, `count`, and `max_results` parameters in a loop
- **After**: Single request per rule per cycle using the provider's default page size
- **Benefit**: Reduces API calls from 3 per rule to 1 per rule

### B) Server-Side New-Only Fetching
- **Before**: Used client-side time filtering (`start_time`/`end_time`) which was often ignored
- **After**: Maintains `RuleState { rule_id, since_id }` for each rule
- **Implementation**: 
  - Uses `SEARCH_SINCE_PARAM` environment variable (default: `since_id`)
  - Updates `since_id` after each successful call to `max(since_id, newest.tweet_id)`
  - No more wasted credits on ignored time filters

### C) Strict One-at-a-Time Per User
- **Before**: Multiple cron instances could process the same user simultaneously
- **After**: Distributed lock key `scan:{user_id}` with 240s TTL
- **Implementation**: Uses Redis-style SETNX pattern via Supabase
- **Benefit**: Prevents duplicate processing and race conditions

### D) Early-Stop + Random Order
- **Before**: Processed all rules regardless of hits
- **After**: 
  - Uniform Fisher-Yates shuffle seeded by `hash(user_id||yyyy-mm-dd HH:MM)`
  - Stops scanning when first rule returns ≥1 tweet
  - Sends one alert for newest tweet, enqueues backfill

### E) Smart Backfill
- **Before**: Always ran backfill regardless of hits
- **After**: Only runs if a rule hit
- **Limits**: 
  - `BACKFILL_MAX_PAGES=2` (configurable)
  - `BACKFILL_MAX_TWEETS=6` (configurable)
- **Logic**: Continues calling with same `since_id` until caught up

### F) Enhanced Observability
- **Per Request Logging**:
  - `request_id`, `user_id`, `rule_id`
  - Parameters sent (including single since param name)
  - `tweets_returned` (length of array)
  - `credits_est = tweets_returned * 15`
- **Cycle Summary**:
  - `calls_made`, `rules_scanned`, `tweets_returned_total`
  - `$estimated = (tweets_returned_total*15)/100000`

### G) Safety Rails
- **Hard Cap**: One request per rule per cycle (no internal retries)
- **Huge Page Warning**: Aborts backfill if provider returns >50 tweets
- **Early Exit**: No second request if `tweets_returned` is 0

## 🔧 Configuration

```bash
# Override the since parameter name if needed
SEARCH_SINCE_PARAM=since_id

# Control backfill behavior
BACKFILL_MAX_PAGES=2
BACKFILL_MAX_TWEETS=6

# Lock timeout
LOCK_TTL_SECONDS=240
```

## 📊 Database Schema Changes

### New Tables

#### `rule_state`
```sql
CREATE TABLE rule_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rule_id UUID REFERENCES keyword_rules(id) ON DELETE CASCADE UNIQUE,
  since_id TEXT,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `distributed_locks`
```sql
CREATE TABLE distributed_locks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lock_key TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  instance_id TEXT NOT NULL
);
```

### New Functions

#### `get_or_create_rule_state(rule_uuid UUID)`
Returns existing rule state or creates new one with `since_id = NULL`

#### `update_rule_state_since_id(rule_uuid UUID, new_since_id TEXT)`
Updates the `since_id` for a rule, creating record if it doesn't exist

## 🧪 Testing

### Test Endpoint
Use `/api/test/monitor-test` to verify:
- Database tables exist and are accessible
- Functions work correctly
- Environment variables are set

### Expected Behavior

#### Scenario 1: Seed since_id low
- First call returns items, updates since_id
- Next call returns 0 (no new tweets)

#### Scenario 2: 10 rules, no hits
- Maximum 10 calls (not 30 like before)
- Early stop when no matches found

#### Scenario 3: Hits on rule #4
- Only 4 calls + small backfill
- Significant cost reduction

## 📈 Cost Impact

### Before (Old System)
- **3 API calls per rule** (limit, count, max_results)
- **Time-based filtering** (often ignored by provider)
- **Always backfill** (regardless of hits)
- **Parallel processing** (potential race conditions)

### After (New System)
- **1 API call per rule** (using since_id)
- **Server-side filtering** (provider respects since_id)
- **Conditional backfill** (only if rule hits)
- **Sequential processing** (distributed locks prevent conflicts)

### Expected Savings
- **API Calls**: 66% reduction (3 → 1 per rule)
- **Credits**: Significant reduction due to since_id filtering
- **Reliability**: No more duplicate processing or race conditions

## 🚨 Migration Notes

1. **Run the migration** to create new tables and functions
2. **Update environment variables** if needed
3. **Monitor the first few runs** to ensure since_id logic works
4. **Verify distributed locks** prevent parallel processing

## 🔍 Monitoring

Watch for these log patterns:
- `🔒 User X is already being processed, skipping`
- `📝 Updated since_id for rule Y to Z`
- `🚨 HUGE_PAGE_WARNING - aborting backfill`
- `🎯 Cron job completed: calls_made: X, $estimated: $Y`

## 🎯 Success Metrics

- **Cost reduction** in estimated credits per cycle
- **Fewer API calls** per user per cycle
- **No duplicate processing** (check distributed_locks table)
- **Proper since_id progression** (rule_state table updates) 