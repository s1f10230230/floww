export interface Profile {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
  gmail_refresh_token?: string
  gmail_access_token?: string
  gmail_token_expiry?: string
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
  created_at: string
}

export interface CreditCard {
  id: string
  user_id: string
  card_last4: string
  card_brand?: string
  card_name?: string
  color?: string
  is_active: boolean
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