-- Add tables for investment and messaging functionality

-- Investments table
CREATE TABLE IF NOT EXISTS investments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investor_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL CHECK (amount > 0),
  message TEXT,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Constraints
  UNIQUE(investor_id, startup_id, created_at) -- Prevent duplicate investments at the same time
);

-- Create indexes for investments table
CREATE INDEX IF NOT EXISTS idx_investments_investor_id ON investments (investor_id);
CREATE INDEX IF NOT EXISTS idx_investments_startup_id ON investments (startup_id);
CREATE INDEX IF NOT EXISTS idx_investments_status ON investments (status);
CREATE INDEX IF NOT EXISTS idx_investments_created_at ON investments (created_at);

-- Direct messages table for investor-founder communication
CREATE TABLE IF NOT EXISTS direct_messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'file', 'image')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Constraints
  CHECK (sender_id != recipient_id) -- Can't send message to yourself
);

-- Create indexes for direct_messages table
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON direct_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_recipient_id ON direct_messages (recipient_id);
CREATE INDEX IF NOT EXISTS idx_direct_messages_created_at ON direct_messages (created_at);
CREATE INDEX IF NOT EXISTS idx_direct_messages_conversation ON direct_messages (sender_id, recipient_id, created_at);

-- Investment notifications table
CREATE TABLE IF NOT EXISTS investment_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id UUID REFERENCES investments(id) ON DELETE CASCADE,
  founder_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create indexes for investment_notifications table
CREATE INDEX IF NOT EXISTS idx_investment_notifications_founder_id ON investment_notifications (founder_id);
CREATE INDEX IF NOT EXISTS idx_investment_notifications_is_read ON investment_notifications (is_read);
CREATE INDEX IF NOT EXISTS idx_investment_notifications_created_at ON investment_notifications (created_at);

-- Add trigger to update updated_at timestamp for investments
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc'::text, NOW());
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_investments_updated_at ON investments;
CREATE TRIGGER update_investments_updated_at 
  BEFORE UPDATE ON investments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies

-- Investments policies
ALTER TABLE investments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Investors can view their own investments" ON investments;
DROP POLICY IF EXISTS "Founders can view investments in their startups" ON investments;
DROP POLICY IF EXISTS "Only investors can create investments" ON investments;
DROP POLICY IF EXISTS "Founders can update investment status" ON investments;

-- Investors can view their own investments
CREATE POLICY "Investors can view their own investments" ON investments
  FOR SELECT USING (auth.uid() = investor_id);

-- Founders can view investments in their startups
CREATE POLICY "Founders can view investments in their startups" ON investments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM startups 
      WHERE startups.id = investments.startup_id 
      AND startups.founder_id = auth.uid()
    )
  );

-- Only investors can create investments
CREATE POLICY "Only investors can create investments" ON investments
  FOR INSERT WITH CHECK (
    auth.uid() = investor_id AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.user_id = auth.uid() 
      AND profiles.user_type = 'investor'
    )
  );

-- Founders can update investment status for their startups
CREATE POLICY "Founders can update investment status" ON investments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM startups 
      WHERE startups.id = investments.startup_id 
      AND startups.founder_id = auth.uid()
    )
  );

-- Direct messages policies
ALTER TABLE direct_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can send messages" ON direct_messages;
DROP POLICY IF EXISTS "Users can update received messages" ON direct_messages;

-- Users can view messages they sent or received
CREATE POLICY "Users can view their messages" ON direct_messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

-- Users can send messages
CREATE POLICY "Users can send messages" ON direct_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Users can update messages they received (mark as read)
CREATE POLICY "Users can update received messages" ON direct_messages
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Investment notifications policies
ALTER TABLE investment_notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Founders can view their notifications" ON investment_notifications;
DROP POLICY IF EXISTS "System can create notifications" ON investment_notifications;
DROP POLICY IF EXISTS "Founders can update their notifications" ON investment_notifications;

-- Founders can view their investment notifications
CREATE POLICY "Founders can view their notifications" ON investment_notifications
  FOR SELECT USING (auth.uid() = founder_id);

-- System can create notifications (via service role)
CREATE POLICY "System can create notifications" ON investment_notifications
  FOR INSERT WITH CHECK (true);

-- Founders can update their notifications (mark as read)
CREATE POLICY "Founders can update their notifications" ON investment_notifications
  FOR UPDATE USING (auth.uid() = founder_id);

-- Function to create investment notification
CREATE OR REPLACE FUNCTION create_investment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the founder_id from the startup
  INSERT INTO investment_notifications (investment_id, founder_id)
  SELECT NEW.id, startups.founder_id
  FROM startups
  WHERE startups.id = NEW.startup_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger to avoid conflicts
DROP TRIGGER IF EXISTS create_investment_notification_trigger ON investments;
CREATE TRIGGER create_investment_notification_trigger
  AFTER INSERT ON investments
  FOR EACH ROW EXECUTE FUNCTION create_investment_notification();

-- Add helpful views for common queries

-- View for investment summary by startup
DROP VIEW IF EXISTS startup_investment_summary;
CREATE VIEW startup_investment_summary AS
SELECT 
  s.id as startup_id,
  s.name as startup_name,
  s.founder_id,
  COUNT(i.id) as total_investments,
  COALESCE(SUM(i.amount), 0) as total_invested,
  COALESCE(AVG(i.amount), 0) as average_investment,
  COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_investments,
  COUNT(CASE WHEN i.status = 'accepted' THEN 1 END) as accepted_investments
FROM startups s
LEFT JOIN investments i ON s.id = i.startup_id
GROUP BY s.id, s.name, s.founder_id;

-- View for investor portfolio
DROP VIEW IF EXISTS investor_portfolio;
CREATE VIEW investor_portfolio AS
SELECT 
  i.investor_id,
  i.startup_id,
  s.name as startup_name,
  s.tagline,
  i.amount,
  i.status,
  i.created_at as investment_date,
  -- Calculate approximate equity percentage
  ROUND((i.amount::decimal / s.current_valuation::decimal) * 100, 2) as estimated_equity_percent
FROM investments i
JOIN startups s ON i.startup_id = s.id
WHERE i.status = 'accepted';

-- View for conversation threads
DROP VIEW IF EXISTS conversation_threads;
CREATE VIEW conversation_threads AS
SELECT 
  CASE 
    WHEN dm.sender_id < dm.recipient_id 
    THEN dm.sender_id 
    ELSE dm.recipient_id 
  END as user1_id,
  CASE 
    WHEN dm.sender_id < dm.recipient_id 
    THEN dm.recipient_id 
    ELSE dm.sender_id 
  END as user2_id,
  MAX(dm.created_at) as last_message_at,
  COUNT(*) as message_count,
  COUNT(CASE WHEN NOT dm.is_read AND dm.recipient_id = auth.uid() THEN 1 END) as unread_count
FROM direct_messages dm
WHERE dm.sender_id = auth.uid() OR dm.recipient_id = auth.uid()
GROUP BY user1_id, user2_id
ORDER BY last_message_at DESC;

-- Grant necessary permissions
GRANT SELECT ON startup_investment_summary TO authenticated;
GRANT SELECT ON investor_portfolio TO authenticated;
GRANT SELECT ON conversation_threads TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Investment and messaging tables created successfully!';
  RAISE NOTICE 'Tables created: investments, direct_messages, investment_notifications';
  RAISE NOTICE 'Views created: startup_investment_summary, investor_portfolio, conversation_threads';
  RAISE NOTICE 'RLS policies and triggers configured.';
END $$;