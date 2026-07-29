import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';
import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import {
  applyActiveSubscription,
  applyCancelledSubscription,
  syncFromStripeSubscription,
} from '../_shared/stripeSubscriptionSync.ts';

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) {
    console.error('Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET');
    return new Response('Stripe webhook not configured', { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  const { data: existingLog } = await supabase
    .from('webhook_logs')
    .select('id')
    .filter('raw_data->>stripe_event_id', 'eq', event.id)
    .maybeSingle();

  if (existingLog) {
    return new Response(JSON.stringify({ received: true, duplicate: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== 'subscription' || !session.subscription) break;

        const userId = session.metadata?.userId || session.client_reference_id;
        if (!userId) break;

        const subscription = await stripe.subscriptions.retrieve(
          typeof session.subscription === 'string' ? session.subscription : session.subscription.id,
        );

        const userType = session.metadata?.userType || 'owner';
        const planType = (session.metadata?.planType || 'premium') as 'premium' | 'professional';
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id;

        if (customerId) {
          await applyActiveSubscription(supabase, {
            userId,
            userType,
            planType,
            stripeCustomerId: customerId,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: subscription.status,
            currentPeriodEnd: subscription.current_period_end,
          });
        }
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await syncFromStripeSubscription(supabase, subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = typeof invoice.subscription === 'string' ? invoice.subscription : invoice.subscription?.id;
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          const userId = subscription.metadata?.userId;
          if (userId) {
            await supabase.from('users').update({
              subscription_status: 'past_due',
              updated_at: new Date().toISOString(),
            }).eq('id', userId);
          }
        }
        break;
      }
      default:
        break;
    }

    await supabase.from('webhook_logs').insert({
      event_type: event.type,
      status: 'processed',
      raw_data: { stripe_event_id: event.id, object: event.data.object },
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook handler error:', error);
    await supabase.from('webhook_logs').insert({
      event_type: event.type,
      status: 'error',
      error_message: error instanceof Error ? error.message : 'Unknown error',
      raw_data: { stripe_event_id: event.id, object: event.data.object },
    });
    return new Response('Webhook handler failed', { status: 500 });
  }
});
