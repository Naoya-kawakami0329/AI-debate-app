-- AI vs AI Debate App Database Schema

-- Create custom types
CREATE TYPE debate_stage AS ENUM ('setup', 'opening', 'rebuttal', 'closing', 'summary');
CREATE TYPE ai_provider AS ENUM ('openai', 'gemini', 'claude');
CREATE TYPE speaker_role AS ENUM ('pro', 'con');
CREATE TYPE debate_winner AS ENUM ('pro', 'con', 'draw');

-- Topics table
CREATE TABLE IF NOT EXISTS topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- AI Models table
CREATE TABLE IF NOT EXISTS ai_models (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    provider ai_provider NOT NULL,
    description TEXT,
    avatar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debates table
CREATE TABLE IF NOT EXISTS debates (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    topic_id UUID REFERENCES topics(id) ON DELETE CASCADE,
    pro_model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    con_model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    stage debate_stage DEFAULT 'setup',
    current_speaker speaker_role DEFAULT 'pro',
    winner debate_winner,
    summary TEXT,
    duration INTEGER DEFAULT 3, -- minutes per stage
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Debate Messages table
CREATE TABLE IF NOT EXISTS debate_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
    speaker speaker_role NOT NULL,
    ai_model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    stage debate_stage NOT NULL,
    reactions INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evidence table
CREATE TABLE IF NOT EXISTS evidence (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID REFERENCES debate_messages(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    source TEXT NOT NULL,
    snippet TEXT,
    credibility INTEGER CHECK (credibility >= 0 AND credibility <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Audience Questions table
CREATE TABLE IF NOT EXISTS audience_questions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    author TEXT DEFAULT 'Anonymous',
    votes INTEGER DEFAULT 0,
    answered BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trending Topics table (for caching trend data)
CREATE TABLE IF NOT EXISTS trending_topics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    keyword TEXT NOT NULL,
    trend TEXT NOT NULL, -- e.g., "+12%"
    source TEXT NOT NULL, -- 'Google Trends' or 'NewsAPI'
    category TEXT NOT NULL,
    description TEXT,
    search_volume INTEGER,
    news_count INTEGER,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Notes table (for personal memos during debates)
CREATE TABLE IF NOT EXISTS user_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    debate_id UUID REFERENCES debates(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    author TEXT DEFAULT 'You',
    important BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_debates_topic_id ON debates(topic_id);
CREATE INDEX IF NOT EXISTS idx_debates_created_at ON debates(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_debate_messages_debate_id ON debate_messages(debate_id);
CREATE INDEX IF NOT EXISTS idx_debate_messages_created_at ON debate_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_evidence_message_id ON evidence(message_id);
CREATE INDEX IF NOT EXISTS idx_audience_questions_debate_id ON audience_questions(debate_id);
CREATE INDEX IF NOT EXISTS idx_trending_topics_last_updated ON trending_topics(last_updated DESC);
CREATE INDEX IF NOT EXISTS idx_user_notes_debate_id ON user_notes(debate_id);
CREATE INDEX IF NOT EXISTS idx_topics_trending ON topics(trending, created_at DESC);

-- Enable RLS on all tables
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE debates ENABLE ROW LEVEL SECURITY;
ALTER TABLE debate_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE trending_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notes ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (allowing public read access for now)
CREATE POLICY "Public read access" ON topics FOR SELECT USING (true);
CREATE POLICY "Public read access" ON ai_models FOR SELECT USING (true);
CREATE POLICY "Public read access" ON debates FOR SELECT USING (true);
CREATE POLICY "Public read access" ON debate_messages FOR SELECT USING (true);
CREATE POLICY "Public read access" ON evidence FOR SELECT USING (true);
CREATE POLICY "Public read access" ON audience_questions FOR SELECT USING (true);
CREATE POLICY "Public read access" ON trending_topics FOR SELECT USING (true);
CREATE POLICY "Public read access" ON user_notes FOR SELECT USING (true);

-- Insert default AI models
INSERT INTO ai_models (name, provider, description, avatar) VALUES
('GPT-4', 'openai', '最新のOpenAI言語モデル、高度な推論能力を持つ', '🧠'),
('GPT-3.5', 'openai', '効率的で高性能なOpenAI言語モデル', '🤖'),
('Gemini Pro', 'gemini', 'Googleの先進的な多模態言語モデル', '💎'),
('Claude 3 Opus', 'claude', 'Anthropicの最高性能言語モデル', '🎭'),
('Claude 3 Sonnet', 'claude', 'バランスの取れたClaude言語モデル', '🎪');

-- Insert default debate topics
INSERT INTO topics (title, description, category) VALUES
('AI技術の発展は人類にとって脅威か？', 'AI技術の急速な発展が社会に与える影響について議論する', 'テクノロジー'),
('リモートワークは従来のオフィス勤務より効率的か？', '働き方の変化と生産性への影響を考察する', 'ワークスタイル'),
('暗号通貨は将来の金融システムを支配するか？', 'デジタル通貨の将来性と既存金融システムへの影響', '経済・金融'),
('気候変動対策は経済成長を阻害するか？', '環境保護と経済発展の両立について議論する', '環境・エネルギー'),
('ソーシャルメディアの規制は必要か？', 'プラットフォームの社会的責任と表現の自由のバランス', '社会・政治');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_topics_updated_at BEFORE UPDATE ON topics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_debates_updated_at BEFORE UPDATE ON debates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();