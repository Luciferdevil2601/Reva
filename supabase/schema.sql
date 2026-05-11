CREATE TABLE profiles (
  id UUID REFERENCES auth.users PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free','pro','premium')),
  analyses_used INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE analyses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  jd_text TEXT,
  original_text TEXT,
  optimized_text TEXT,
  template TEXT DEFAULT 'modern',
  ats_before INT,
  ats_after INT,
  keywords_added JSONB,
  keywords_missing JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  razorpay_sub_id TEXT,
  plan TEXT,
  status TEXT,
  period_end TIMESTAMPTZ
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own data" ON profiles FOR ALL USING (auth.uid()=id);
CREATE POLICY "own analyses" ON analyses FOR ALL USING (auth.uid()=user_id);
CREATE OR REPLACE FUNCTION new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles(id,name,email)
  VALUES(NEW.id, NEW.raw_user_meta_data->>'name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
CREATE TRIGGER on_signup AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION new_user();
