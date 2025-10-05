-- Merchant Category Mappings table
-- Stores user-defined category mappings for merchant names
CREATE TABLE IF NOT EXISTS public.merchant_category_mappings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    merchant_name TEXT NOT NULL,
    category TEXT,  -- Allow NULL to remove category
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(user_id, merchant_name)
);

-- Enable RLS
ALTER TABLE public.merchant_category_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own merchant mappings" ON public.merchant_category_mappings
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own merchant mappings" ON public.merchant_category_mappings
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own merchant mappings" ON public.merchant_category_mappings
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own merchant mappings" ON public.merchant_category_mappings
    FOR DELETE USING (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_merchant_mappings_user_id ON public.merchant_category_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_mappings_merchant_name ON public.merchant_category_mappings(user_id, merchant_name);
