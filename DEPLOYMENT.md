# 🚀 JECRC Dating App - Cloudflare Deployment Guide

This guide will help you deploy your JECRC Dating App to Cloudflare for a permanent hosting solution.

## 📋 Architecture Overview

- **Frontend**: Next.js static site on Cloudflare Pages
- **Backend**: Express.js API on Railway (Docker deployment)
- **Database**: PostgreSQL on Railway
- **File Storage**: MinIO/S3 compatible storage
- **DNS & CDN**: Cloudflare for global performance

## 🛠️ Prerequisites

1. **Cloudflare Account** (free tier works)
2. **Railway Account** (free tier with $5/month credit)
3. **GitHub Repository** (already set up)

### Install Required CLI Tools

```bash
# Cloudflare Wrangler CLI
npm install -g wrangler

# Railway CLI (optional, can deploy via web interface)
npm install -g @railway/cli
```

## 🎯 Deployment Steps

### Option 1: Automated Deployment (Recommended)

Run the deployment script:

```bash
./deploy.sh
```

### Option 2: Manual Deployment

#### Step 1: Deploy Backend to Railway

1. **Go to [railway.app](https://railway.app)** and sign up
2. **Create New Project** → **Deploy from GitHub repo**
3. **Select your repository** and set root directory to `backend`
4. **Add Environment Variables** (copy from `backend/.env.production`):
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secure-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   REDIS_URL=redis://...
   EMAIL_FROM=noreply@jecrcu.edu.in
   ALLOWED_EMAIL_DOMAIN=jecrcu.edu.in
   FRONTEND_URL=https://jecrc-dating.pages.dev
   ```
5. **Deploy** - Railway will automatically build and deploy your Docker container
6. **Note your Railway URL** (e.g., `https://your-app.railway.app`)

#### Step 2: Deploy Frontend to Cloudflare Pages

1. **Go to [Cloudflare Dashboard](https://dash.cloudflare.com)** → **Pages**
2. **Connect to Git** → **Select your GitHub repository**
3. **Configure build settings**:
   - **Framework preset**: Next.js (Static HTML Export)
   - **Build command**: `npm run build`
   - **Build output directory**: `out`
   - **Root directory**: `frontend`
4. **Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://your-app.railway.app
   NEXT_PUBLIC_SOCKET_URL=https://your-app.railway.app
   NODE_ENV=production
   ```
5. **Deploy** - Cloudflare will build and deploy automatically

#### Step 3: Add Database Services

**In Railway Dashboard:**
1. **Add PostgreSQL service** to your project
2. **Add Redis service** to your project
3. **Copy connection strings** to your backend environment variables

#### Step 4: Configure Custom Domain (Optional)

1. **In Cloudflare Pages** → **Custom domains**
2. **Add your domain** (e.g., `dating.jecrcu.edu.in`)
3. **Update DNS records** as instructed by Cloudflare
4. **SSL certificate** will be automatically provisioned

## 🔧 Configuration Files Created

- `frontend/next.config.js` - Updated for static export
- `frontend/_redirects` - SPA routing for Cloudflare Pages  
- `frontend/.env.production` - Production environment template
- `backend/railway.json` - Railway deployment configuration
- `backend/.env.production` - Backend environment template
- `deploy.sh` - Automated deployment script

## 🌐 URLs After Deployment

- **Frontend**: `https://jecrc-dating.pages.dev` (or your custom domain)
- **Backend**: `https://your-app.railway.app`
- **Admin**: Same as frontend with `/admin` routes

## 💰 Cost Estimation

- **Cloudflare Pages**: Free (unlimited bandwidth, 500 builds/month)
- **Railway**: Free tier ($5/month credit, ~2-3 months free)
- **Total**: Effectively free for initial months, ~$5/month after

## 🔒 Security & Performance

- **Cloudflare CDN**: Global edge caching
- **DDoS Protection**: Built-in Cloudflare protection
- **SSL/TLS**: Automatic HTTPS with Let's Encrypt
- **Rate Limiting**: Express rate limiting + Cloudflare security rules

## 🚀 Benefits Over ngrok

- **Permanent URLs**: No more tunnel restarts
- **SSL Certificates**: Automatic HTTPS everywhere
- **Global CDN**: Fast loading worldwide
- **DDoS Protection**: Enterprise-grade security
- **Analytics**: Built-in traffic analytics
- **Scalability**: Auto-scaling based on traffic

## 📊 Monitoring & Logs

- **Railway**: Built-in logs and metrics dashboard
- **Cloudflare**: Analytics and Web Analytics for frontend
- **Database**: Built-in PostgreSQL metrics in Railway

## 🔄 Continuous Deployment

Both services support automatic deployments:
- **Push to main branch** → **Automatic deployment**
- **Build status** visible in GitHub commits
- **Rollback** available through service dashboards

## 🆘 Troubleshooting

### Common Issues:

1. **Build Failures**: Check build logs in respective dashboards
2. **Environment Variables**: Ensure all required vars are set
3. **CORS Issues**: Update backend CORS configuration with new domains
4. **Socket.IO**: Verify WebSocket support on Railway (should work)

### Support Resources:
- Railway: [docs.railway.app](https://docs.railway.app)
- Cloudflare Pages: [developers.cloudflare.com/pages](https://developers.cloudflare.com/pages)
- Community: GitHub Issues on this repository

---

## 🎉 Ready to Deploy!

Your JECRC Dating App is now configured for professional cloud deployment. Run `./deploy.sh` to get started!