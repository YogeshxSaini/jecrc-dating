# Frontend Deployment Guide

## Quick Deployment to Cloudflare Pages

### Option 1: Using the deployment script (Recommended)
```bash
cd frontend
./deploy.sh
```

### Option 2: Using npm script
```bash
cd frontend
npm run deploy:cloudflare
```

### Option 3: Manual deployment
```bash
cd frontend
npm run build:production
npx wrangler pages deploy out --project-name=dayalcolonizers
```

## Environment Variables

- **Local Development**: Uses `.env.local` (points to localhost:4000)
- **Production Build**: Uses `.env.production` (points to Render backend)

The deployment script automatically uses production environment variables, so you don't need to manually backup/restore `.env.local` anymore!

## Deployment URL

After deployment, your site will be available at:
- Custom domain: https://dayalcolonizers.xyz
- Cloudflare Pages: https://dayalcolonizers.pages.dev

## Notes

- `.env.local` is gitignored and only used for local development
- Production builds automatically use `.env.production`
- The deploy script cleans previous builds before deploying
