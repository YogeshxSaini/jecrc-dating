# Automated Deployment Setup

This repository uses GitHub Actions to automatically deploy:
- **Backend** to Render (when backend files change)
- **Frontend** to Cloudflare Pages (when frontend files change)

## 🔧 Required GitHub Secrets

You need to add these secrets to your GitHub repository:

### For Backend Deployment (Render)

1. **RENDER_DEPLOY_HOOK_URL**
   - Go to your Render dashboard: https://dashboard.render.com
   - Select your backend service
   - Go to **Settings** → **Deploy Hook**
   - Copy the deploy hook URL
   - Add it as a GitHub secret

### For Frontend Deployment (Cloudflare Pages)

1. **CLOUDFLARE_API_TOKEN**
   - Go to Cloudflare dashboard: https://dash.cloudflare.com
   - Navigate to **My Profile** → **API Tokens**
   - Click **Create Token**
   - Use the **Edit Cloudflare Workers** template
   - Or create a custom token with these permissions:
     - Account - Cloudflare Pages - Edit
   - Copy the token and add it as a GitHub secret

2. **CLOUDFLARE_ACCOUNT_ID**
   - Go to Cloudflare dashboard
   - Select **Workers & Pages**
   - Your Account ID is shown on the right sidebar
   - Copy and add it as a GitHub secret

## 📝 How to Add GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with the exact name shown above

## 🚀 How It Works

### Backend Deployment
- Triggers when files in `backend/` directory change
- Automatically calls Render's deploy hook
- Render rebuilds and deploys your backend

### Frontend Deployment
- Triggers when files in `frontend/` directory change
- Builds the Next.js app
- Deploys to Cloudflare Pages using Wrangler

## 🔍 Monitoring Deployments

### Backend (Render)
- Check deployment status: https://dashboard.render.com
- View logs in Render dashboard

### Frontend (Cloudflare)
- Check deployment status: https://dash.cloudflare.com
- View deployment history in Cloudflare Pages dashboard
- Live site: https://dayalcolonizers.pages.dev

## 🧪 Testing the Automation

### Test Backend Deployment
```bash
# Make a change to any backend file
echo "// test" >> backend/src/index.ts
git add backend/src/index.ts
git commit -m "test: trigger backend deployment"
git push origin main
```

### Test Frontend Deployment
```bash
# Make a change to any frontend file
echo "// test" >> frontend/src/app/page.tsx
git add frontend/src/app/page.tsx
git commit -m "test: trigger frontend deployment"
git push origin main
```

## 📊 Workflow Status

You can check the status of deployments in the **Actions** tab of your GitHub repository.

## 🛠️ Troubleshooting

### Backend deployment not triggering
- Verify `RENDER_DEPLOY_HOOK_URL` is set correctly
- Check that changes are in the `backend/` directory
- View workflow logs in GitHub Actions

### Frontend deployment failing
- Verify `CLOUDFLARE_API_TOKEN` has correct permissions
- Verify `CLOUDFLARE_ACCOUNT_ID` is correct
- Check build logs in GitHub Actions
- Ensure `npm run build` works locally

## 🔄 Manual Deployment

If you need to deploy manually:

### Backend
```bash
cd backend
git push  # Render auto-deploys on push
```

### Frontend
```bash
cd frontend
npm run build
npx wrangler pages deploy out --project-name=dayalcolonizers
```

## 📌 Notes

- Deployments only trigger on pushes to the `main` branch
- Both workflows run independently
- If you change both backend and frontend files, both will deploy
- Deployment typically takes 2-5 minutes
