-- Add credit card fields to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS card_last4 VARCHAR(4),
ADD COLUMN IF NOT EXISTS card_brand VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50) DEFAULT 'credit_card';

-- Create credit_cards table for managing multiple cards
CREATE TABLE IF NOT EXISTS public.credit_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    card_last4 VARCHAR(4) NOT NULL,
    card_brand VARCHAR(50),
    card_name TEXT, -- User-defined name like "楽天カード", "メインカード"
    color VARCHAR(7), -- Color for UI display
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, card_last4)
);

-- Enable RLS for credit_cards
ALTER TABLE public.credit_cards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_cards
CREATE POLICY "Users can view own cards" ON public.credit_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cards" ON public.credit_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cards" ON public.credit_cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cards" ON public.credit_cards
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON public.credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_card_last4 ON public.transactions(card_last4);