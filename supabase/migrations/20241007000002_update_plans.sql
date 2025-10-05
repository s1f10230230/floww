-- Update subscription plans to new pricing
-- Delete old plans
DELETE FROM public.subscription_plans WHERE name IN ('Basic', 'Pro', 'Business');

-- Update Free plan with new features
UPDATE public.subscription_plans
SET
  features = '{"basic_categories": true, "monthly_report": false, "export_csv": false, "data_retention_months": 3, "show_ads": true}'::jsonb,
  max_emails_per_sync = 50
WHERE name = 'Free';

-- Insert new plans
INSERT INTO public.subscription_plans (name, price, max_cards, max_emails_per_sync, features) VALUES
    ('Standard', 480, 5, 200, '{"basic_categories": true, "monthly_report": true, "export_csv": true, "data_retention_months": null, "show_ads": false, "advanced_analytics": false, "api_access": false}'::jsonb),
    ('Premium', 880, 10, 500, '{"basic_categories": true, "monthly_report": true, "export_csv": true, "data_retention_months": null, "show_ads": false, "advanced_analytics": true, "api_access": true}'::jsonb)
ON CONFLICT (name) DO UPDATE SET
  price = EXCLUDED.price,
  max_cards = EXCLUDED.max_cards,
  max_emails_per_sync = EXCLUDED.max_emails_per_sync,
  features = EXCLUDED.features;

-- Update existing users to Free plan if they had Basic/Pro/Business
UPDATE public.profiles
SET plan_id = (SELECT id FROM public.subscription_plans WHERE name = 'Free')
WHERE plan_id IN (
  SELECT id FROM public.subscription_plans WHERE name IN ('Basic', 'Pro', 'Business')
);
