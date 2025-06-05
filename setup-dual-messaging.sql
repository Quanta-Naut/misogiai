-- DUAL MESSAGING SYSTEM SETUP
-- This creates a system where direct messages also appear in pitch rooms
-- and provide notifications to founders

-- Create a table to link direct messages to pitch rooms
CREATE TABLE IF NOT EXISTS message_pitch_room_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  direct_message_id UUID REFERENCES direct_messages(id) ON DELETE CASCADE,
  pitch_session_id UUID REFERENCES pitch_sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(direct_message_id, pitch_session_id)
);

-- Create a notification system for founders
CREATE TABLE IF NOT EXISTS investor_messages_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  founder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  investor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
  direct_message_id UUID REFERENCES direct_messages(id) ON DELETE CASCADE,
  message_preview TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_message_pitch_room_links_direct_message ON message_pitch_room_links (direct_message_id);
CREATE INDEX IF NOT EXISTS idx_message_pitch_room_links_pitch_session ON message_pitch_room_links (pitch_session_id);
CREATE INDEX IF NOT EXISTS idx_investor_notifications_founder ON investor_messages_notifications (founder_id);
CREATE INDEX IF NOT EXISTS idx_investor_notifications_unread ON investor_messages_notifications (founder_id, is_read);

-- Function to handle dual messaging - when a direct message is sent, also create pitch room entry
CREATE OR REPLACE FUNCTION handle_investor_to_founder_message()
RETURNS TRIGGER AS $$
DECLARE
    startup_rec RECORD;
    active_session_id UUID;
    investor_profile RECORD;
BEGIN
    -- Only process messages from investors to founders
    SELECT p1.user_type as sender_type, p2.user_type as recipient_type,
           p1.full_name as sender_name, p2.full_name as recipient_name
    INTO investor_profile
    FROM profiles p1
    JOIN profiles p2 ON p2.user_id = NEW.recipient_id
    WHERE p1.user_id = NEW.sender_id;
    
    -- Check if this is investor → founder message
    IF investor_profile.sender_type = 'investor' AND investor_profile.recipient_type = 'founder' THEN
        
        -- Find the founder's startup
        SELECT id, name, founder_id INTO startup_rec
        FROM startups 
        WHERE founder_id = NEW.recipient_id 
        AND status = 'active'
        LIMIT 1;
        
        IF startup_rec.id IS NOT NULL THEN
            -- Find or create an active pitch session for this startup
            SELECT id INTO active_session_id
            FROM pitch_sessions 
            WHERE startup_id = startup_rec.id 
            AND status = 'active'
            ORDER BY created_at DESC
            LIMIT 1;
            
            -- If no active session exists, create one
            IF active_session_id IS NULL THEN
                INSERT INTO pitch_sessions (
                    startup_id,
                    session_name,
                    description,
                    start_time,
                    end_time,
                    status
                ) VALUES (
                    startup_rec.id,
                    'Investor Chat Session - ' || startup_rec.name,
                    'Auto-created session for investor-founder conversations',
                    NOW(),
                    NOW() + INTERVAL '7 days',
                    'active'
                ) RETURNING id INTO active_session_id;
            END IF;
            
            -- Add the direct message to the pitch room as a chat message
            INSERT INTO chat_messages (
                session_id,
                user_id,
                user_name,
                user_type,
                message,
                message_type,
                created_at
            ) VALUES (
                active_session_id,
                NEW.sender_id,
                investor_profile.sender_name,
                'investor',
                NEW.message,
                'direct_message_sync',
                NEW.created_at
            );
            
            -- Link the direct message to the pitch session
            INSERT INTO message_pitch_room_links (
                direct_message_id,
                pitch_session_id
            ) VALUES (
                NEW.id,
                active_session_id
            ) ON CONFLICT (direct_message_id, pitch_session_id) DO NOTHING;
            
            -- Create notification for the founder
            INSERT INTO investor_messages_notifications (
                founder_id,
                investor_id,
                startup_id,
                direct_message_id,
                message_preview,
                is_read
            ) VALUES (
                NEW.recipient_id,
                NEW.sender_id,
                startup_rec.id,
                NEW.id,
                LEFT(NEW.message, 100),
                FALSE
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for dual messaging
DROP TRIGGER IF EXISTS trigger_investor_to_founder_message ON direct_messages;
CREATE TRIGGER trigger_investor_to_founder_message
    AFTER INSERT ON direct_messages
    FOR EACH ROW
    EXECUTE FUNCTION handle_investor_to_founder_message();

-- Enable RLS on new tables
ALTER TABLE message_pitch_room_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_messages_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their message links" ON message_pitch_room_links
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM direct_messages dm 
            WHERE dm.id = direct_message_id 
            AND (dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid())
        )
    );

CREATE POLICY "Users can view their notifications" ON investor_messages_notifications
    FOR SELECT USING (auth.uid() = founder_id OR auth.uid() = investor_id);

CREATE POLICY "Users can update their notifications" ON investor_messages_notifications
    FOR UPDATE USING (auth.uid() = founder_id);

-- Grant permissions
GRANT SELECT ON message_pitch_room_links TO authenticated;
GRANT SELECT, UPDATE ON investor_messages_notifications TO authenticated;

-- Add a column to chat_messages to identify synced direct messages
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS direct_message_id UUID REFERENCES direct_messages(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_chat_messages_direct_message ON chat_messages (direct_message_id);

-- Function to get unread investor message count for founders
CREATE OR REPLACE FUNCTION get_founder_unread_investor_messages(founder_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)
        FROM investor_messages_notifications
        WHERE founder_id = founder_user_id AND is_read = FALSE
    );
END;
$$ LANGUAGE plpgsql;

-- Function to mark investor messages as read
CREATE OR REPLACE FUNCTION mark_investor_messages_read(founder_user_id UUID, investor_user_id UUID DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
    IF investor_user_id IS NOT NULL THEN
        -- Mark messages from specific investor as read
        UPDATE investor_messages_notifications
        SET is_read = TRUE
        WHERE founder_id = founder_user_id AND investor_id = investor_user_id AND is_read = FALSE;
    ELSE
        -- Mark all messages as read
        UPDATE investor_messages_notifications
        SET is_read = TRUE
        WHERE founder_id = founder_user_id AND is_read = FALSE;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- View to get investor messages with startup info
CREATE OR REPLACE VIEW founder_investor_messages AS
SELECT 
    n.id,
    n.founder_id,
    n.investor_id,
    n.startup_id,
    n.direct_message_id,
    n.message_preview,
    n.is_read,
    n.created_at,
    s.name as startup_name,
    pi.full_name as investor_name,
    pf.full_name as founder_name,
    dm.message as full_message
FROM investor_messages_notifications n
JOIN startups s ON s.id = n.startup_id
JOIN profiles pi ON pi.user_id = n.investor_id
JOIN profiles pf ON pf.user_id = n.founder_id
JOIN direct_messages dm ON dm.id = n.direct_message_id
ORDER BY n.created_at DESC;

-- Grant view access
GRANT SELECT ON founder_investor_messages TO authenticated;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '=== DUAL MESSAGING SYSTEM SETUP COMPLETE ===';
    RAISE NOTICE 'Features enabled:';
    RAISE NOTICE '1. Direct messages from investors automatically appear in pitch rooms';
    RAISE NOTICE '2. Founders get notifications about investor messages';
    RAISE NOTICE '3. Pitch sessions auto-created for investor-founder conversations';
    RAISE NOTICE '4. Message synchronization between direct chat and pitch rooms';
    RAISE NOTICE '';
    RAISE NOTICE 'How it works:';
    RAISE NOTICE '- Investor sends direct message → appears in both direct chat AND pitch room';
    RAISE NOTICE '- Founder receives notification with message preview';
    RAISE NOTICE '- Founder can view in pitch room or direct messages';
    RAISE NOTICE '- Real-time updates in both locations';
END $$;
