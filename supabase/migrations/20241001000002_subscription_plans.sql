-- Subscription Plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    price INTEGER NOT NULL, -- Monthly price in JPY
    max_cards INTEGER NOT NULL, -- Maximum number of cards
    max_emails_per_sync INTEGER DEFAULT 100,
    features JSONB, -- Additional features
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insert default plans
INSERT INTO public.subscription_plans (name, price, max_cards, max_emails_per_sync, features) VALUES
    ('Free', 0, 2, 50, '{"basic_categories": true, "monthly_report": false, "export_csv": false}'),
    ('Basic', 500, 5, 200, '{"basic_categories": true, "monthly_report": true, "export_csv": true}'),
    ('Pro', 1500, 10, 500, '{"basic_categories": true, "monthly_report": true, "export_csv": true, "advanced_analytics": true, "api_access": true}'),
    ('Business', 3000, 999, 1000, '{"basic_categories": true, "monthly_report": true, "export_csv": true, "advanced_analytics": true, "api_access": true, "team_sharing": true}');

-- Add plan_id to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.subscription_plans(id),
ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP WITH TIME ZONE;

-- Set default plan to Free for all users
UPDATE public.profiles
SET plan_id = (SELECT id FROM public.subscription_plans WHERE name = 'Free')
WHERE plan_id IS NULL;

-- Card Companies/Issuers table
CREATE TABLE IF NOT EXISTS public.card_issuers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    email_domain TEXT, -- e.g., 'rakuten-card.co.jp'
    email_keywords TEXT[], -- Keywords to search in emails
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Insert common Japanese card issuers
INSERT INTO public.card_issuers (name, email_domain, email_keywords) VALUES
    ('楽天カード', 'rakuten-card.co.jp', ARRAY['楽天カード', 'Rakuten Card']),
    ('三井住友カード', 'smbc-card.com', ARRAY['三井住友', 'SMBC', 'Sumitomo']),
    ('JCBカード', 'jcb.co.jp', ARRAY['JCB', 'ジェーシービー']),
    ('イオンカード', 'aeoncard.co.jp', ARRAY['イオンカード', 'AEON']),
    ('エポスカード', 'eposcard.co.jp', ARRAY['エポス', 'EPOS']),
    ('dカード', 'd-card.jp', ARRAY['dカード', 'ドコモ']),
    ('au PAYカード', 'kddi.com', ARRAY['au PAY', 'au カード']),
    ('セゾンカード', 'saisoncard.co.jp', ARRAY['セゾン', 'SAISON', 'クレディセゾン']),
    ('オリコカード', 'orico.co.jp', ARRAY['オリコ', 'Orico']),
    ('ビューカード', 'viewcard.co.jp', ARRAY['ビューカード', 'VIEW', 'Suica']),
    ('PayPayカード', 'paypay-card.co.jp', ARRAY['PayPay', 'ペイペイ']),
    ('American Express', 'americanexpress.com', ARRAY['American Express', 'AMEX', 'アメックス']),
    ('Visa/Mastercard (その他)', null, ARRAY['VISA', 'Mastercard', 'マスターカード']);

-- User's registered cards (updated structure)
ALTER TABLE public.credit_cards
ADD COLUMN IF NOT EXISTS issuer_id UUID REFERENCES public.card_issuers(id),
ADD COLUMN IF NOT EXISTS nickname TEXT; -- User-friendly name

-- Junction table for user's selected card issuers
CREATE TABLE IF NOT EXISTS public.user_card_issuers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    issuer_id UUID REFERENCES public.card_issuers(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, issuer_id)
);

-- Enable RLS
ALTER TABLE public.user_card_issuers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own issuers" ON public.user_card_issuers
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own issuers" ON public.user_card_issuers
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own issuers" ON public.user_card_issuers
    FOR DELETE USING (auth.uid() = user_id);

-- Function to check card limit
CREATE OR REPLACE FUNCTION check_card_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_plan_max_cards INTEGER;
    current_card_count INTEGER;
BEGIN
    -- Get user's plan max cards
    SELECT sp.max_cards INTO user_plan_max_cards
    FROM profiles p
    JOIN subscription_plans sp ON p.plan_id = sp.id
    WHERE p.id = NEW.user_id;

    -- Count current cards
    SELECT COUNT(*) INTO current_card_count
    FROM credit_cards
    WHERE user_id = NEW.user_id AND id != NEW.id;

    -- Check limit
    IF current_card_count >= user_plan_max_cards THEN
        RAISE EXCEPTION 'Card limit reached for your plan. Please upgrade to add more cards.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER enforce_card_limit
BEFORE INSERT OR UPDATE ON public.credit_cards
FOR EACH ROW
EXECUTE FUNCTION check_card_limit();