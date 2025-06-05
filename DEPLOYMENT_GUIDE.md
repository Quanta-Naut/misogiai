# Vercel Deployment Guide

This guide will help you deploy the Launchpad Platform to Vercel.

## Prerequisites

1. **Vercel Account**: Create an account at [vercel.com](https://vercel.com)
2. **GitHub Repository**: Push your code to a GitHub repository
3. **Environment Variables**: Prepare all required API keys and configuration

## Required Environment Variables

Set these environment variables in your Vercel project settings:

### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### AI Service API Keys
```
OPENAI_API_KEY=your_openai_api_key
GROQ_API_KEY=your_groq_api_key
GOOGLE_AI_API_KEY=your_google_ai_api_key
```

### AI Model Configuration (Optional - defaults are set)
```
OPENAI_MODEL=gpt-4
GROQ_MODEL=mixtral-8x7b-32768
GOOGLE_AI_MODEL=gemini-pro
```

### Application Environment
```
NODE_ENV=production
NEXTAUTH_URL=https://your-app-domain.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_key
```

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard

1. **Connect Repository**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Project**
   - Framework Preset: Next.js (auto-detected)
   - Root Directory: `launchpad-platform` (if not in root)
   - Build Command: `npm run build` (default)
   - Output Directory: `.next` (default)

3. **Set Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add all required variables listed above

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to project directory
cd launchpad-platform

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

## Post-Deployment Setup

### 1. Update Supabase Configuration
Update your Supabase project's authentication settings:
- Add your Vercel domain to allowed origins
- Update redirect URLs if using authentication

### 2. Test API Endpoints
Verify these endpoints are working:
- `/api/ai` - AI service integration
- `/api/pdf-extract` - PDF processing

### 3. Environment Variable Verification
Check that all environment variables are properly set:
```bash
# In your Vercel project settings, verify:
# - All required variables are present
# - No typos in variable names
# - Values are properly formatted
```

## Troubleshooting

### Build Errors

**TypeScript Errors:**
```bash
# Run type check locally first
npm run type-check
```

**Dependency Issues:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Runtime Errors

**Environment Variables:**
- Check spelling and formatting
- Ensure all required variables are set
- Verify API keys are valid

**API Routes:**
- Check function timeout settings (30s max)
- Verify memory allocation (1024MB)
- Monitor function logs in Vercel dashboard

### Performance Optimization

**Build Performance:**
- Enable caching in Vercel settings
- Use latest Node.js version
- Optimize dependencies

**Runtime Performance:**
- Monitor function execution time
- Use appropriate memory allocation
- Enable compression

## Security Considerations

1. **Environment Variables**
   - Never commit API keys to repository
   - Use different keys for development/production
   - Regularly rotate sensitive keys

2. **API Security**
   - Implement rate limiting
   - Validate input data
   - Use HTTPS only

3. **Database Security**
   - Use row-level security in Supabase
   - Limit service role key usage
   - Monitor database access

## Monitoring and Maintenance

1. **Vercel Analytics**
   - Enable Web Analytics
   - Monitor Core Web Vitals
   - Track function performance

2. **Error Monitoring**
   - Set up error tracking (Sentry recommended)
   - Monitor API endpoint failures
   - Track build failures

3. **Regular Updates**
   - Keep dependencies updated
   - Monitor security advisories
   - Test deployments in preview mode

## Support

For deployment issues:
1. Check Vercel build logs
2. Review function logs
3. Test locally with production environment
4. Contact support if needed

---

**Note**: This application uses Next.js 14 with the App Router and requires Node.js 18+ for optimal performance.