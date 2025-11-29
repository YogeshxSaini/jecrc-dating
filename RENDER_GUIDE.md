# 🆓 Render Free Hosting - Step by Step Guide

## Why Render?
- **100% FREE** for your use case
- **750 hours/month** (enough for 24/7 for 1 month)
- **Free PostgreSQL + Redis** included
- **Automatic deployments** from GitHub
- **No credit card required** for free tier

## 🚀 Quick Setup (5 minutes)

### Step 1: Create PostgreSQL Database

1. **Go to [render.com](https://render.com)** and sign up with GitHub
2. **Click "New +"** → **"PostgreSQL"**
3. **Settings**:
   - Name: `jecrc-dating-db`
   - Plan: **Free**
   - Region: **Oregon (US West)**
4. **Click "Create Database"**
5. **Copy the connection string** (External Database URL)

### Step 2: Create Web Service (Backend)

1. **Click "New +"** → **"Web Service"**
2. **Connect GitHub** → Select `YogeshxSaini/jecrc-dating`
3. **Settings**:
   - Name: `jecrc-dating-backend`
   - Root Directory: `backend`
   - Runtime: **Docker**
   - Plan: **Free**
   - Auto-Deploy: **Yes**

### Step 3: Create Free Redis (Upstash)

Since Render free tier doesn't include Redis, we'll use Upstash:

1. **Go to [upstash.com](https://upstash.com)** and sign up
2. **Click "Create Database"**
3. **Settings**:
   - Name: `jecrc-dating-redis`
   - Type: **Redis**
   - Region: **US-West-1** (closest to Render Oregon)
4. **Copy the Redis URL** from dashboard

### Step 4: Add Environment Variables

In your Render web service settings, add these environment variables:

```bash
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://[paste-your-database-url-from-step-1]
REDIS_URL=redis://[paste-your-upstash-redis-url]
JWT_SECRET=your-super-secure-secret-change-this
JWT_REFRESH_SECRET=another-super-secure-secret-change-this
ALLOWED_EMAIL_DOMAIN=jecrcu.edu.in
EMAIL_PROVIDER=console
EMAIL_FROM=noreply@jecrcu.edu.in
FRONTEND_URL=https://jecrc-dating.pages.dev
```

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