# EarlyReply.app Deployment Checklist

## ✅ Pre-Deployment Checklist

### 1. Code Ready
- [ ] X OAuth working locally ✅
- [ ] User data pulling correctly ✅
- [ ] Mobile-optimized UI ✅
- [ ] Error handling implemented ✅
- [ ] Security features enabled ✅

### 2. Environment Setup
- [ ] GitHub repository created
- [ ] Vercel account ready
- [ ] X Developer app configured
- [ ] Environment variables prepared

### 3. X Developer Portal Configuration
- [ ] App permissions set to "Read"
- [ ] App type set to "Web App"
- [ ] Callback URLs configured:
  - [ ] `http://localhost:3000/api/auth/x-callback` (development)
  - [ ] `https://earlyreply.app/api/auth/x-callback` (production)
- [ ] Website URL set to `https://earlyreply.app`

## 🚀 Deployment Steps

### Step 1: Deploy to Vercel
```bash
# Run deployment script
./scripts/deploy.sh

# Or manually:
git add .
git commit -m "Deploy to production"
git push origin main
```

### Step 2: Configure Vercel
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Import your GitHub repository
3. Set environment variables:
   - `TWITTER_CLIENT_ID`
   - `TWITTER_CLIENT_SECRET`

### Step 3: Configure Custom Domain
1. Go to Project Settings → Domains
2. Add `earlyreply.app`
3. Configure DNS as instructed by Vercel

### Step 4: Test Production
1. Visit `https://earlyreply.app`
2. Test OAuth sign-in flow
3. Verify user data displays correctly
4. Test mobile responsiveness

## 🔧 Post-Deployment Verification

### OAuth Flow
- [ ] Sign-in button works
- [ ] Redirects to X OAuth
- [ ] User authorization successful
- [ ] Callback to earlyreply.app works
- [ ] User data displays correctly
- [ ] Session persists

### Security
- [ ] HTTPS redirects working
- [ ] Secure cookies set
- [ ] CSRF protection active
- [ ] No console errors

### Mobile Experience
- [ ] Responsive design
- [ ] Touch-friendly buttons
- [ ] Fast loading times
- [ ] Proper viewport settings

## 🐛 Troubleshooting

### Common Issues
1. **OAuth Callback Fails**
   - Check callback URL in X Developer Portal
   - Verify environment variables in Vercel

2. **Domain Issues**
   - Ensure DNS is configured correctly
   - Check SSL certificate status

3. **Session Problems**
   - Verify cookie domain settings
   - Check SameSite cookie policy

### Debug Commands
```bash
# Check build locally
npm run build

# Test production build
npm start

# Check environment variables
echo $TWITTER_CLIENT_ID
echo $TWITTER_CLIENT_SECRET
```

## 📞 Support

If you encounter issues:
1. Check Vercel deployment logs
2. Review browser console for errors
3. Verify X Developer Portal settings
4. Test with different browsers/devices

## 🎉 Success Indicators

- ✅ Users can sign in with X
- ✅ Real user data displays (name, profile picture, etc.)
- ✅ Session persists across page reloads
- ✅ Mobile experience is smooth
- ✅ No security warnings in browser
- ✅ Fast loading times

---

**Ready to deploy!** 🚀

Run `./scripts/deploy.sh` to start the deployment process. 