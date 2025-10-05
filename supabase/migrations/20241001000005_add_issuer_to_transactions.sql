-- Add issuer_id to transactions table
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS issuer_id UUID REFERENCES public.card_issuers(id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_transactions_issuer_id ON public.transactions(issuer_id);
