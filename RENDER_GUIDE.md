# 🆓 Render Free Hosting - Step by Step Guide

## Why Render?
- **100% FREE** for your use case
- **750 hours/month** (enough for 24/7 for 1 month)
- **Free PostgreSQL + Redis** included
- **Automatic deployments** from GitHub
- **No credit card required** for free tier

## 🚀 Quick Setup (5 minutes)

### Step 1: Prepare Your Repository
Your repository is already configured with `render.yaml`! ✅

### Step 2: Deploy to Render

1. **Go to [render.com](https://render.com)**
2. **Sign up** with your GitHub account
3. **Click "New +"** → **"Blueprint"**
4. **Connect GitHub** → Select `YogeshxSaini/jecrc-dating`
5. **Click "Connect"** - Render will automatically:
   - Create web service (your backend API)
   - Create PostgreSQL database
   - Create Redis instance
   - Deploy with Docker

### Step 3: Configure Environment Variables

Render will auto-create most variables, but you need to add:

```bash
JWT_SECRET=your-super-secure-secret-here
JWT_REFRESH_SECRET=another-super-secure-secret-here
FRONTEND_URL=https://jecrc-dating.pages.dev
```

**How to add:**
1. Go to your web service dashboard
2. Click "Environment" tab
3. Add the variables above

### Step 4: Deploy Frontend to Cloudflare Pages

1. **Go to [dash.cloudflare.com](https://dash.cloudflare.com)** → **Pages**
2. **"Connect to Git"** → Select your repository
3. **Build settings:**
   - Framework: `Next.js (Static HTML Export)`
   - Build command: `npm run build`
   - Build output directory: `out`
   - Root directory: `frontend`
4. **Environment variables:**
   - `NEXT_PUBLIC_API_URL=https://your-app.onrender.com`
   - `NEXT_PUBLIC_SOCKET_URL=https://your-app.onrender.com`

### Step 5: Update Backend CORS

After getting your Cloudflare Pages URL, update the backend CORS:

1. Go to Render dashboard → Your web service
2. Environment tab
3. Update `FRONTEND_URL` to your actual Cloudflare Pages URL

## 🎯 Final URLs

- **Frontend**: `https://jecrc-dating.pages.dev`
- **Backend**: `https://your-app-name.onrender.com`
- **Database**: Auto-configured by Render

## 💡 Important Notes

- **Sleeping**: App sleeps after 15min of inactivity (starts in ~30 seconds)
- **Hours**: 750 hours/month = about 25 days of 24/7 usage
- **Database**: 1GB PostgreSQL storage free
- **Redis**: 25MB Redis storage free

## 🔧 Troubleshooting

### Build Issues:
- Check "Logs" tab in Render dashboard
- Ensure all environment variables are set

### Database Connection:
- Render auto-configures `DATABASE_URL`
- Check if Prisma migrations ran successfully

### CORS Errors:
- Update `FRONTEND_URL` with correct Cloudflare Pages URL
- Restart the service after environment changes

## 🎉 Benefits

- **$0 cost** for several months of usage
- **Professional URLs** with SSL
- **Automatic deployments** on git push
- **Built-in monitoring** and logs
- **Easy scaling** when needed

Your JECRC Dating App will be live and professional with zero cost! 🚀