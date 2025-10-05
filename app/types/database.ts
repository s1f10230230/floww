export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  gmail_refresh_token?: string
  gmail_access_token?: string
  gmail_token_expiry?: string
  plan_id?: string
  plan_expires_at?: string
  created_at: string
  updated_at: string
}

export interface Email {
  id: string
  user_id: string
  gmail_message_id: string
  sender: string
  subject?: string
  snippet?: string
  body_text?: string
  body_html?: string
  received_at: string
  is_processed: boolean
  created_at: string
}

export interface Transaction {
  id: string
  user_id: string
  email_id?: string
  merchant: string
  amount: number
  currency: string
  category?: string
  item_name?: string
  transaction_date: string
  is_subscription: boolean
  card_last4?: string
  card_brand?: string
  payment_method?: string
  issuer_id?: string
  created_at: string
  emails?: {
    received_at: string
  }
  card_issuers?: {
    name: string
  }
  card_issuer_name?: string
}

export interface CreditCard {
  id: string
  user_id: string
  card_last4: string
  card_brand?: string
  card_name?: string
  color?: string
  is_active: boolean
  issuer_id?: string
  nickname?: string
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  service_name: string
  amount: number
  currency: string
  billing_cycle?: 'monthly' | 'yearly' | 'weekly'
  next_billing_date?: string
  last_detected_date?: string
  status: 'active' | 'cancelled' | 'paused'
  first_detected_date?: string
  transaction_count: number
  category?: string
  created_at: string
  updated_at: string
}

export interface Category {
  id: string
  name: string
  icon?: string
  color?: string
  created_at: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  max_cards: number
  max_emails_per_sync: number
  features?: Record<string, boolean | string>
  is_active: boolean
  created_at: string
}

export interface CardIssuer {
  id: string
  name: string
  email_domain?: string
  email_keywords?: string[]
  include_from_domains?: string[]
  exclude_from_domains?: string[]
  include_subject_keywords?: string[]
  exclude_subject_keywords?: string[]
  logo_url?: string
  is_active: boolean
  created_at: string
}

export interface UserCardIssuer {
  id: string
  user_id: string
  issuer_id: string
  created_at: string
}

export interface MerchantCategoryMapping {
  id: string
  user_id: string
  merchant_name: string
  category: string
  created_at: string
  updated_at: string
}