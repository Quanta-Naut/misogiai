# 🔧 Messaging System Troubleshooting Guide

## Current Issue
- Investor sends message to founder → Message doesn't appear for founder
- Founder goes to pitch room → Can't see messages from investor

## Step-by-Step Fix Process

### Step 1: Apply Database Fixes
Run these SQL scripts in your Supabase SQL Editor in this order:

1. **First, run the complete messaging fix:**
   ```sql
   -- Copy and paste the entire contents of fix-messaging-complete.sql
   ```

2. **Then run diagnostics:**
   ```sql
   -- Copy and paste the entire contents of diagnose-messaging.sql
   ```

### Step 2: Verify Database Setup
After running the scripts, check the output for:
- ✓ All tables exist (direct_messages, chat_messages, profiles)
- ✓ RLS policies are properly configured
- ✓ Test messages can be inserted
- ✓ Users have profiles

### Step 3: Test in Browser
1. **Open browser console** (F12 → Console tab)
2. **Sign in as an investor**
3. **Go to /startups page**
4. **Click "Chat" button on a startup**
5. **Check console for any error messages**

### Step 4: Debug Message Sending
When sending a message, you should see these console logs:
```
Sending message: {sender_id: "...", recipient_id: "...", message: "..."}
User authenticated, session: ...
Message sent successfully: [...]
Loading messages between: {currentUser: "...", otherUser: "..."}
Loaded messages: X messages
```

### Step 5: Check Real-time Functionality
1. **Open two browser windows/tabs**
2. **Sign in as investor in one, founder in the other**
3. **Start a conversation**
4. **Send message from investor**
5. **Check if it appears immediately for founder**

### Step 6: Pitch Room Testing
1. **Founder creates a pitch session**
2. **Investor joins the pitch session**
3. **Both send messages**
4. **Verify messages appear for both users**

## Common Error Messages and Solutions

### "Permission denied" or RLS errors
**Solution:** Re-run `fix-messaging-complete.sql`

### "Invalid recipient" or foreign key errors
**Solution:** Check that both users exist and have profiles:
```sql
SELECT id, email FROM auth.users;
SELECT user_id, full_name, user_type FROM profiles;
```

### Messages not appearing in real-time
**Solution:** Check Supabase real-time is enabled:
1. Go to Supabase Dashboard → Settings → API
2. Ensure real-time is enabled for your tables

### "Authentication error"
**Solution:** Check user session:
```javascript
// In browser console
supabase.auth.getSession().then(console.log)
```

### Different message systems confusion
**Important:** There are TWO messaging systems:
- `direct_messages` table: Private investor ↔ founder chats
- `chat_messages` table: Public pitch room discussions

## Browser Console Debugging

### Enable detailed logging:
1. Open browser console (F12)
2. Look for these log messages when testing:
   - "Sending message: ..."
   - "User authenticated, session: ..."
   - "Message sent successfully: ..."
   - "Loading messages between: ..."
   - "Setting up real-time subscription..."

### If you see errors:
- **RLS policy errors:** Re-run the SQL fixes
- **Authentication errors:** Sign out and sign back in
- **Network errors:** Check internet connection and Supabase status

## Manual Testing Steps

### Test 1: Direct Messaging
1. Investor → /startups → Click "Chat" on startup
2. Should redirect to /messages?conversation=founder_id
3. Type message and send
4. Founder → /messages → Should see conversation and message

### Test 2: Pitch Room Messaging
1. Founder → /pitch-rooms → Create session
2. Investor → /pitch-rooms → Join session
3. Both users send messages
4. Messages should appear for both users immediately

## If Nothing Works

### Nuclear Option - Reset Everything:
```sql
-- WARNING: This deletes all messages
DELETE FROM direct_messages;
DELETE FROM chat_messages;

-- Disable RLS temporarily
ALTER TABLE direct_messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages DISABLE ROW LEVEL SECURITY;

-- Grant all permissions
GRANT ALL ON direct_messages TO authenticated, anon;
GRANT ALL ON chat_messages TO authenticated, anon;
```

### Then test basic functionality before re-enabling security.

## Success Indicators

✅ **Messaging Works When:**
- No errors in browser console
- Messages appear immediately for both users
- Real-time subscriptions are active
- Database diagnostics show all green checkmarks

❌ **Still Broken If:**
- Console shows RLS or permission errors
- Messages sent but don't appear for recipient
- Real-time subscriptions fail to connect
- Database diagnostics show missing tables/policies

## Next Steps

1. **Run the SQL fixes first**
2. **Test with browser console open**
3. **Follow the debugging steps**
4. **Check the success indicators**

If you still have issues after following this guide, the problem might be:
- Supabase project configuration
- Environment variables
- Network/connectivity issues
- Browser cache (try incognito mode)
