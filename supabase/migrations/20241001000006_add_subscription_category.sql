-- Add category to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS category TEXT;

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_subscriptions_category ON public.subscriptions(category);
