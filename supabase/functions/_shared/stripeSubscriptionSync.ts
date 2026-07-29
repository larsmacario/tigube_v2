import Stripe from 'https://esm.sh/stripe@14.21.0?target=deno';
import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

export type StripePlanKind = 'owner_premium' | 'caretaker_professional';

export function resolvePlanKind(userType: string, planType: string): StripePlanKind | null {
  if (userType === 'owner' && planType === 'premium') return 'owner_premium';
  const dienstleister = [
    'caretaker', 'tierarzt', 'hundetrainer', 'tierfriseur',
    'physiotherapeut', 'ernaehrungsberater', 'tierfotograf', 'sonstige', 'dienstleister',
  ];
  if (dienstleister.includes(userType) && planType === 'professional') {
    return 'caretaker_professional';
  }
  return null;
}

export function priceIdForPlan(planKind: StripePlanKind): string {
  const owner = Deno.env.get('STRIPE_PRICE_OWNER_PREMIUM');
  const pro = Deno.env.get('STRIPE_PRICE_CARETAKER_PROFESSIONAL');
  if (planKind === 'owner_premium') {
    if (!owner) throw new Error('STRIPE_PRICE_OWNER_PREMIUM not configured');
    return owner;
  }
  if (!pro) throw new Error('STRIPE_PRICE_CARETAKER_PROFESSIONAL not configured');
  return pro;
}

export function siteUrl(): string {
  return (Deno.env.get('SITE_URL') || Deno.env.get('VITE_APP_URL') || 'https://tigube.de').replace(/\/$/, '');
}

interface ApplySubscriptionParams {
  userId: string;
  userType: string;
  planType: 'premium' | 'professional';
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  subscriptionStatus: string;
  currentPeriodEnd: number | null;
}

export async function applyActiveSubscription(
  supabase: SupabaseClient,
  params: ApplySubscriptionParams,
) {
  const isProfessional = params.planType === 'professional';
  const userUpdate = {
    plan_type: 'premium',
    plan_expires_at: params.currentPeriodEnd
      ? new Date(params.currentPeriodEnd * 1000).toISOString()
      : null,
    stripe_customer_id: params.stripeCustomerId,
    stripe_subscription_id: params.stripeSubscriptionId,
    subscription_status: params.subscriptionStatus,
    show_ads: false,
    premium_badge: true,
    max_contact_requests: -1,
    max_bookings: isProfessional ? -1 : 3,
    search_priority: isProfessional ? 10 : 5,
    updated_at: new Date().toISOString(),
  };

  const { error: userError } = await supabase.from('users').update(userUpdate).eq('id', params.userId);
  if (userError) throw userError;

  const subRow = {
    user_id: params.userId,
    user_type: params.userType === 'owner' ? 'owner' : 'caretaker',
    plan_type: params.planType,
    status: 'active',
    billing_start_date: new Date().toISOString(),
    auto_renew: true,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', params.userId)
    .eq('status', 'active')
    .maybeSingle();

  if (existing?.id) {
    await supabase.from('subscriptions').update(subRow).eq('id', existing.id);
  } else {
    const { error: subError } = await supabase.from('subscriptions').insert(subRow);
    if (subError) {
      console.warn('subscriptions table sync skipped:', subError.message);
    }
  }
}

export async function applyCancelledSubscription(
  supabase: SupabaseClient,
  userId: string,
) {
  const { error: userError } = await supabase
    .from('users')
    .update({
      plan_type: 'free',
      plan_expires_at: null,
      subscription_status: 'cancelled',
      stripe_subscription_id: null,
      show_ads: true,
      premium_badge: false,
      max_contact_requests: 3,
      max_bookings: 3,
      search_priority: 0,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (userError) throw userError;

  await supabase
    .from('subscriptions')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('status', 'active');
}

export async function syncFromStripeSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  fallbackUserId?: string,
) {
  const userId =
    subscription.metadata?.userId ||
    fallbackUserId ||
    subscription.metadata?.user_id;
  if (!userId) {
    console.warn('No userId in subscription metadata', subscription.id);
    return;
  }

  const userType = subscription.metadata?.userType || subscription.metadata?.user_type || 'owner';
  const planType = (subscription.metadata?.planType || subscription.metadata?.plan_type || 'premium') as
    | 'premium'
    | 'professional';

  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id;

  if (!customerId) return;

  if (subscription.status === 'active' || subscription.status === 'trialing') {
    await applyActiveSubscription(supabase, {
      userId,
      userType,
      planType,
      stripeCustomerId: customerId,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPeriodEnd: subscription.current_period_end,
    });
  } else if (
    subscription.status === 'canceled' ||
    subscription.status === 'unpaid' ||
    subscription.status === 'incomplete_expired'
  ) {
    await applyCancelledSubscription(supabase, userId);
  }
}
