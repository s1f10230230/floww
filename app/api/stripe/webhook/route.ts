import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@/app/lib/supabase-server'

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-09-30.clover',
    })
  : null

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: Request) {
  try {
    if (!stripe || !webhookSecret) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 })
    }

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    const supabase = await createClient()

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.user_id
        const planId = session.metadata?.plan_id

        if (userId && planId) {
          // Get plan from database
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select('id')
            .eq('name', planId.charAt(0).toUpperCase() + planId.slice(1))
            .single()

          if (plan) {
            // Update user's plan
            await supabase
              .from('profiles')
              .update({
                plan_id: plan.id,
                stripe_customer_id: session.customer as string,
                stripe_subscription_id: session.subscription as string,
                plan_expires_at: null, // Subscription is active
                updated_at: new Date().toISOString(),
              })
              .eq('id', userId)
          }
        }
        break
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find user by Stripe customer ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          if (event.type === 'customer.subscription.deleted' || subscription.status === 'canceled') {
            // Downgrade to free plan
            const { data: freePlan } = await supabase
              .from('subscription_plans')
              .select('id')
              .eq('name', 'Free')
              .single()

            if (freePlan) {
              await supabase
                .from('profiles')
                .update({
                  plan_id: freePlan.id,
                  stripe_subscription_id: null,
                  plan_expires_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq('id', profile.id)
            }
          }
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Find user and notify them
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, user_email:profiles!inner(email)')
          .eq('stripe_customer_id', customerId)
          .single()

        if (profile) {
          // TODO: Send email notification about payment failure
          console.log('Payment failed for user:', profile.id)
        }
        break
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
