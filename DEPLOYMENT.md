# GitHub Pages Deployment Guide

## 📦 What's Been Set Up

Your project now includes automatic deployment to GitHub Pages using GitHub Actions.

### Files Created/Modified:

1. **`.github/workflows/deploy.yml`** - GitHub Actions workflow
   - Triggers on push to `main` branch
   - Builds the Vite project
   - Deploys to GitHub Pages

2. **`vite.config.ts`** - Vite configuration
   - Sets the correct base path for GitHub Pages
   - **⚠️ IMPORTANT**: Update the repo name in this file!

3. **`README.md`** - Added deployment instructions

## 🚀 Quick Start

### Step 1: Update Repository Name

Edit `vite.config.ts` and change the base path:

```typescript
base: process.env.NODE_ENV === 'production' ? '/YOUR-REPO-NAME/' : '/',
```

Replace `YOUR-REPO-NAME` with your actual GitHub repository name.

### Step 2: Enable GitHub Pages

1. Go to your GitHub repository
2. Click **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: Select **GitHub Actions**

### Step 3: Push Your Code

```bash
# Add all files
git add .

# Commit
git commit -m "Add GitHub Actions deployment"

# Push to GitHub
git push origin main
```

### Step 4: Monitor Deployment

1. Go to the **Actions** tab in your repository
2. Watch the "Deploy to GitHub Pages" workflow
3. Once complete (green checkmark), your game is live!

## 🌐 Your Game URL

After deployment, your game will be available at:

```
https://YOUR-USERNAME.github.io/YOUR-REPO-NAME/
```

Example: `https://malik.github.io/browser-rts-game/`

## 🔧 Troubleshooting

### Assets Not Loading (404 Errors)

**Problem**: Game loads but shows missing assets or blank screen.

**Solution**: Check the `base` path in `vite.config.ts` matches your repo name exactly:
- Repo: `my-awesome-game` → Base: `/my-awesome-game/`
- Must include leading and trailing slashes!

### Workflow Fails with "Permission Denied"

**Problem**: GitHub Actions workflow fails during deployment step.

**Solution**:
1. Go to Settings → Actions → General
2. Scroll to "Workflow permissions"
3. Select "Read and write permissions"
4. Save and re-run the workflow

### Changes Not Appearing

**Problem**: Pushed changes but the site shows old version.

**Solutions**:
1. **Hard refresh** your browser: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. **Wait a minute**: GitHub Pages can take 1-2 minutes to update
3. **Check Actions tab**: Make sure the workflow completed successfully

### Music Not Playing on GitHub Pages

**Problem**: Music file not found (404 error).

**Solution**: Make sure `public/music/background.mp3` exists and is committed to git:
```bash
git add public/music/background.mp3
git commit -m "Add background music"
git push
```

## 🔄 Workflow Details

The deployment happens automatically when you:
- Push to the `main` branch
- Or manually trigger via "Actions" tab → "Deploy to GitHub Pages" → "Run workflow"

### What Happens During Deployment:

1. **Checkout**: Clones your repository
2. **Setup Node**: Installs Node.js 20
3. **Install**: Runs `npm ci` (clean install)
4. **Build**: Runs `npm run build` (creates `dist/` folder)
5. **Upload**: Packages the `dist/` folder
6. **Deploy**: Publishes to GitHub Pages

## 🎮 Testing Locally Before Deploy

Always test the production build locally first:

```bash
# Build production version
npm run build

# Preview the production build
npm run preview
```

This runs a local server with the production build, letting you catch issues before deploying.

## 📝 Manual Deployment (Alternative)

If you prefer manual deployment or need to deploy from a different branch:

```bash
# Install gh-pages package
npm install -D gh-pages

# Add to package.json scripts:
"deploy": "npm run build && gh-pages -d dist"

# Deploy
npm run deploy
```

## 🔐 Custom Domain (Optional)

To use a custom domain like `game.yourdomain.com`:

1. Add a `CNAME` file to the `public/` folder:
   ```
   game.yourdomain.com
   ```

2. Configure DNS with your domain provider:
   - Type: `CNAME`
   - Name: `game` (or `@` for root domain)
   - Value: `your-username.github.io`

3. In GitHub Settings → Pages, enter your custom domain

## 🎯 Next Steps

- [ ] Update `vite.config.ts` with your repo name
- [ ] Enable GitHub Pages in repository settings
- [ ] Push to main branch
- [ ] Share your game URL!

---

**Need help?** Check the [GitHub Pages documentation](https://docs.github.com/en/pages)
