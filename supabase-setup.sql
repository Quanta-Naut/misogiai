-- LaunchPad Platform Database Setup
-- Run this script in your Supabase SQL editor

-- Enable Row Level Security
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    user_type TEXT CHECK (user_type IN ('founder', 'investor')) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create startups table
CREATE TABLE IF NOT EXISTS startups (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    founder_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    tagline TEXT NOT NULL,
    description TEXT NOT NULL,
    vision TEXT NOT NULL,
    product_description TEXT NOT NULL,
    market_size TEXT NOT NULL,
    business_model TEXT NOT NULL,
    funding_ask DECIMAL(15,2) NOT NULL DEFAULT 0,
    equity_offered DECIMAL(5,2) NOT NULL DEFAULT 0,
    current_valuation DECIMAL(15,2) NOT NULL DEFAULT 0,
    pitch_deck_url TEXT,
    status TEXT CHECK (status IN ('draft', 'active', 'funded')) DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create funding_rounds table
CREATE TABLE IF NOT EXISTS funding_rounds (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE NOT NULL,
    investor_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    equity_percentage DECIMAL(5,2) NOT NULL,
    valuation DECIMAL(15,2) NOT NULL,
    status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    terms TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create ratings table
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE NOT NULL,
    investor_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    team_score INTEGER CHECK (team_score >= 1 AND team_score <= 5) NOT NULL,
    product_score INTEGER CHECK (product_score >= 1 AND product_score <= 5) NOT NULL,
    market_score INTEGER CHECK (market_score >= 1 AND market_score <= 5) NOT NULL,
    overall_score DECIMAL(3,2) NOT NULL,
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(startup_id, investor_id)
);

-- Create pitch_sessions table
CREATE TABLE IF NOT EXISTS pitch_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    startup_id UUID REFERENCES startups(id) ON DELETE CASCADE NOT NULL,
    session_name TEXT NOT NULL,
    description TEXT,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status TEXT CHECK (status IN ('scheduled', 'active', 'completed')) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create chat_messages table
CREATE TABLE IF NOT EXISTS chat_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id UUID REFERENCES pitch_sessions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE NOT NULL,
    message TEXT NOT NULL,
    message_type TEXT CHECK (message_type IN ('text', 'ai_response', 'system')) DEFAULT 'text',
    ai_provider TEXT CHECK (ai_provider IN ('openai', 'groq', 'gemini')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_startups_founder_id ON startups(founder_id);
CREATE INDEX IF NOT EXISTS idx_startups_status ON startups(status);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_startup_id ON funding_rounds(startup_id);
CREATE INDEX IF NOT EXISTS idx_funding_rounds_investor_id ON funding_rounds(investor_id);
CREATE INDEX IF NOT EXISTS idx_ratings_startup_id ON ratings(startup_id);
CREATE INDEX IF NOT EXISTS idx_pitch_sessions_startup_id ON pitch_sessions(startup_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Set up Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE startups ENABLE ROW LEVEL SECURITY;
ALTER TABLE funding_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pitch_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Profiles policies (FIXED - Allow users to create their own profile)
CREATE POLICY "Users can view all profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = user_id);

-- Startups policies
CREATE POLICY "Anyone can view active startups" ON startups FOR SELECT USING (status = 'active' OR founder_id = auth.uid());
CREATE POLICY "Founders can insert startups" ON startups FOR INSERT WITH CHECK (founder_id = auth.uid());
CREATE POLICY "Founders can update own startups" ON startups FOR UPDATE USING (founder_id = auth.uid());
CREATE POLICY "Founders can delete own startups" ON startups FOR DELETE USING (founder_id = auth.uid());

-- Funding rounds policies
CREATE POLICY "View funding rounds" ON funding_rounds FOR SELECT USING (
    EXISTS (SELECT 1 FROM startups WHERE startups.id = funding_rounds.startup_id AND startups.founder_id = auth.uid())
    OR investor_id = auth.uid()
);
CREATE POLICY "Investors can create funding rounds" ON funding_rounds FOR INSERT WITH CHECK (investor_id = auth.uid());
CREATE POLICY "Update funding rounds" ON funding_rounds FOR UPDATE USING (
    EXISTS (SELECT 1 FROM startups WHERE startups.id = funding_rounds.startup_id AND startups.founder_id = auth.uid())
    OR investor_id = auth.uid()
);

-- Ratings policies
CREATE POLICY "Anyone can view ratings" ON ratings FOR SELECT USING (true);
CREATE POLICY "Investors can create ratings" ON ratings FOR INSERT WITH CHECK (investor_id = auth.uid());
CREATE POLICY "Investors can update own ratings" ON ratings FOR UPDATE USING (investor_id = auth.uid());

-- Pitch sessions policies
CREATE POLICY "Anyone can view pitch sessions" ON pitch_sessions FOR SELECT USING (true);
CREATE POLICY "Founders can create pitch sessions" ON pitch_sessions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM startups WHERE startups.id = pitch_sessions.startup_id AND startups.founder_id = auth.uid())
);
CREATE POLICY "Founders can manage pitch sessions" ON pitch_sessions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM startups WHERE startups.id = pitch_sessions.startup_id AND startups.founder_id = auth.uid())
);
CREATE POLICY "Founders can delete pitch sessions" ON pitch_sessions FOR DELETE USING (
    EXISTS (SELECT 1 FROM startups WHERE startups.id = pitch_sessions.startup_id AND startups.founder_id = auth.uid())
);

-- Chat messages policies
CREATE POLICY "Users can view messages in sessions" ON chat_messages FOR SELECT USING (true);
CREATE POLICY "Users can send messages" ON chat_messages FOR INSERT WITH CHECK (user_id = auth.uid());

-- Create functions for automatic timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamps
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_startups_updated_at BEFORE UPDATE ON startups FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_funding_rounds_updated_at BEFORE UPDATE ON funding_rounds FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_ratings_updated_at BEFORE UPDATE ON ratings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_pitch_sessions_updated_at BEFORE UPDATE ON pitch_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Create a function to handle user signup and create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, user_type)
  VALUES (new.id, new.raw_user_meta_data->>'full_name', COALESCE(new.raw_user_meta_data->>'user_type', 'founder'));
  RETURN new;
END;
$$ language plpgsql security definer;

-- Create trigger to automatically create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Enable realtime for chat messages
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;

-- Insert sample data for development (optional)
-- Uncomment these lines if you want some test data

-- INSERT INTO profiles (user_id, full_name, user_type) VALUES 
-- ('11111111-1111-1111-1111-111111111111', 'John Founder', 'founder'),
-- ('22222222-2222-2222-2222-222222222222', 'Jane Investor', 'investor');

-- INSERT INTO startups (founder_id, name, tagline, description, vision, product_description, market_size, business_model, funding_ask, equity_offered, current_valuation, status) VALUES 
-- ('11111111-1111-1111-1111-111111111111', 'TechStart AI', 'AI-powered business automation', 'We automate business processes using AI', 'To revolutionize how businesses operate', 'AI platform for workflow automation', 'Targeting SMBs globally, $50B market', 'SaaS subscription model', 500000, 10, 5000000, 'active');

-- INSERT INTO pitch_sessions (startup_id, session_name, description, start_time, end_time, status) VALUES 
-- ((SELECT id FROM startups WHERE name = 'TechStart AI'), 'Demo Day Pitch', 'Presenting to angel investors', NOW(), NOW() + INTERVAL '2 hours', 'active');