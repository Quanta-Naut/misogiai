# 🔧 LaunchPad Setup Guide

## Getting Your Supabase Credentials

### Step 1: Create a Supabase Account
1. Go to [supabase.com](https://supabase.com)
2. Click "Sign Up" and create an account
3. Verify your email address

### Step 2: Create a New Project
1. Once logged in, click "New Project"
2. Choose your organization (or create one)
3. Fill in project details:
   - **Project Name**: `launchpad-platform` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the one closest to you
4. Click "Create new project"
5. Wait 2-3 minutes for setup to complete

### Step 3: Get Your Project Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. You'll find three important values:

**Project URL:**
```
https://[your-project-id].supabase.co
```
Copy this for `NEXT_PUBLIC_SUPABASE_URL`

**Anon/Public Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Copy this for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Service Role Key:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
Copy this for `SUPABASE_SERVICE_ROLE_KEY`

### Step 4: Setup Database Schema ⚠️ IMPORTANT
1. In Supabase dashboard, go to **SQL Editor**
2. Click "New query"
3. **Copy the ENTIRE contents** of `supabase-setup.sql` file from this project
4. **Paste it ALL at once** in the SQL editor
5. Click "Run" to create all tables, policies, and triggers

**❗ Critical**: The setup script includes:
- Database tables
- Row Level Security policies (fixed for profile creation)
- Automatic profile creation trigger
- Proper permissions

### Step 5: Update Environment Variables
Replace the placeholder values in your `.env.local` file:

```env
# Replace these with your actual Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-actual-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_actual_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key_here

# AI API Keys (optional for basic functionality)
OPENAI_API_KEY=your_openai_api_key_here
GROQ_API_KEY=your_groq_api_key_here
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## AI Provider Information

### Groq Configuration
When you use Groq in the LaunchPad platform, it uses:

**Model:** `mixtral-8x7b-32768`

**About this model:**
- **Type**: Mixtral 8x7B (Mixture of Experts)
- **Context Length**: 32,768 tokens
- **Speed**: Ultra-fast inference (Groq's specialty)
- **Best For**: Quick responses, real-time chat, rapid analysis
- **Performance**: High-quality outputs with lightning speed

**Why Mixtral 8x7B?**
- **Fast**: Perfect for real-time chat in pitch rooms
- **Smart**: Good reasoning capabilities for startup advice
- **Efficient**: Lower costs compared to larger models
- **Reliable**: Consistent performance

**Alternative Groq Models** (you can change in `src/lib/ai-services.ts`):
- `llama2-70b-4096` - Llama 2 70B
- `gemma-7b-it` - Google's Gemma 7B

### OpenAI Configuration
**Model:** `gpt-4`
- Best for: Strategic planning and detailed analysis
- Slower but more comprehensive responses

### Google Gemini Configuration
**Model:** `gemini-pro`
- Best for: Market research and comprehensive insights
- Good balance of speed and quality

## Quick Setup Checklist

- [ ] **Supabase Project**: Created and configured
- [ ] **Database Schema**: Run the COMPLETE SQL setup script
- [ ] **Environment Variables**: Updated with real credentials
- [ ] **Development Server**: Running with `npm run dev`
- [ ] **Test Signup**: Try creating an account to verify setup

## Troubleshooting

### ⚠️ Row Level Security Error Fix

**Error**: `new row violates row-level security policy for table "profiles"`

**Solution**: This has been FIXED in the updated `supabase-setup.sql`. The new script includes:

1. **Proper RLS policies** that allow users to create their own profiles
2. **Automatic profile creation trigger** that creates a profile when users sign up
3. **Correct permissions** for all tables

**To fix existing setup:**
1. Go to Supabase SQL Editor
2. Run the updated `supabase-setup.sql` script completely
3. The new policies will override the old ones

### Common Issues:

1. **"Invalid URL" Error**
   - Make sure your Supabase URL is properly formatted
   - Should start with `https://` and end with `.supabase.co`

2. **Authentication Not Working**
   - Check that your Supabase anon key is correct
   - Ensure the COMPLETE database schema has been set up
   - Verify RLS policies are properly configured

3. **Profile Creation Fails**
   - **FIXED**: Updated SQL script includes automatic profile creation
   - Make sure you ran the complete updated `supabase-setup.sql`

4. **AI Features Not Working**
   - AI features will show placeholder messages if API keys aren't configured
   - This is normal - the app works without AI keys for basic functionality

### Getting API Keys:

**OpenAI:**
1. Visit [platform.openai.com](https://platform.openai.com/)
2. Sign up and create an API key
3. Add billing information (required for API usage)

**Groq:**
1. Visit [console.groq.com](https://console.groq.com/)
2. Sign up and create an API key
3. Free tier available

**Google AI:**
1. Visit [makersuite.google.com](https://makersuite.google.com/)
2. Get an API key for Gemini
3. Free tier available

## Database Schema Features

The updated SQL script includes:

✅ **Automatic Profile Creation**: Users get profiles automatically on signup
✅ **Proper RLS Policies**: Security that actually works
✅ **Real-time Chat**: Enabled for pitch rooms
✅ **Complete Permissions**: All CRUD operations properly configured
✅ **Triggers & Functions**: Automatic timestamp updates

## Testing Your Setup

1. **Start the dev server**: `npm run dev`
2. **Open**: http://localhost:3000
3. **Try signup**: Create a new account
4. **Check profile**: Should automatically create your profile
5. **Browse features**: Dashboard, startup creation, etc.

## Support

If you encounter any issues:
1. **Check browser console** for error messages
2. **Verify environment variables** are set correctly
3. **Ensure complete SQL script** was run in Supabase
4. **Check development server** is running on port 3000
5. **Test with fresh signup** to verify automatic profile creation

The updated setup fixes all known RLS and authentication issues!