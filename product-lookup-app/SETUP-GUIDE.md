# 🚀 Quick Setup Guide

## Step 1: Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Sign up/Login and create a new project
3. Wait for the project to be ready (usually 2-3 minutes)

## Step 2: Get Your Credentials
1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL** (looks like: `https://abcdefgh.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

## Step 3: Create Environment File
Create a file called `.env.local` in your project root with:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

Replace the values with your actual credentials from Step 2.

## Step 4: Set Up Database
1. In Supabase dashboard, go to **SQL Editor**
2. Copy and paste the contents of `supabase-setup.sql`
3. Click **Run** to create the table and policies

## Step 5: Test Connection
Run this command to test your setup:

```bash
# Replace with your actual credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here node debug-upload.js
```

## Step 6: Start the App
```bash
npm run dev
```

## Common Issues & Solutions

### ❌ "Upload failed: Authentication error"
- Check your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is correct
- Make sure there are no extra spaces or quotes

### ❌ "Database table not found"
- Run the `supabase-setup.sql` script in Supabase SQL Editor
- Make sure the table name is exactly `products`

### ❌ "Permission denied"
- The RLS policy might not be set up correctly
- Re-run the `supabase-setup.sql` script

### ❌ "Invalid URL"
- Check your `NEXT_PUBLIC_SUPABASE_URL` format
- Should be: `https://your-project-id.supabase.co`

## Need Help?
1. Check the browser console for detailed error messages
2. Use the "Test Connection" button in the CSV import dialog
3. Run the debug script: `node debug-upload.js`













