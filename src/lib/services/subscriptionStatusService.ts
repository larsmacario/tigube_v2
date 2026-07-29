import { supabase } from '../supabase/client';

export interface SubscriptionStatus {
  user_id: string;
  user_type: 'owner' | 'caretaker';
  plan_type?: 'premium' | 'professional';
  subscription_status?: 'active' | 'cancelled' | 'past_due' | 'unpaid';
  is_premium_active: boolean;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  started_at?: string;
  ends_at?: string;
}

class SubscriptionStatusService {
  /**
   * Get current user's subscription status
   */
  async getCurrentUserSubscriptionStatus(): Promise<SubscriptionStatus | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('No authenticated user found');
        return null;
      }

      return await this.getUserSubscriptionStatus(user.id);
    } catch (error) {
      console.error('Error getting current user subscription status:', error);
      return null;
    }
  }

  /**
   * Get subscription status for a specific user
   */
  async getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null> {
    try {
      // First get user info
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, user_type')
        .eq('id', userId)
        .single();

      if (userError) {
        console.error('Error fetching user data:', userError);
        return null;
      }

      // Then check for active subscriptions
      const { data: subscriptionData, error: subError } = await supabase
        .from('subscriptions' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle();

      if (subError || !subscriptionData) {
        console.warn('No subscription data found, returning basic user info');
        return {
          user_id: userData.id,
          user_type: userData.user_type as 'owner' | 'caretaker',
          is_premium_active: false
        };
      }

      return {
        user_id: userData.id,
        user_type: userData.user_type as 'owner' | 'caretaker',
        plan_type: (subscriptionData as any).plan_type,
        subscription_status: (subscriptionData as any).status,
        is_premium_active: (subscriptionData as any).status === 'active',
        stripe_customer_id: (subscriptionData as any).stripe_customer_id,
        stripe_subscription_id: (subscriptionData as any).stripe_subscription_id,
        started_at: (subscriptionData as any).started_at,
        ends_at: (subscriptionData as any).ends_at
      };
    } catch (error) {
      console.error('Error in getUserSubscriptionStatus:', error);
      return null;
    }
  }

  /**
   * Check if user has an active subscription for a specific plan
   */
  async hasActivePlan(userId: string, planType: 'premium' | 'professional'): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('subscriptions' as any)
        .select('id')
        .eq('user_id', userId)
        .eq('plan_type', planType)
        .eq('status', 'active')
        .limit(1);

      if (error) {
        console.error('Error checking active plan:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Error in hasActivePlan:', error);
      return false;
    }
  }

  /**
   * Get all active subscriptions for a user
   */
  async getUserActiveSubscriptions(userId: string) {
    try {
      const { data, error } = await supabase
        .from('subscriptions' as any)
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching active subscriptions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getUserActiveSubscriptions:', error);
      return [];
    }
  }

  /**
   * @deprecated Webhook übernimmt Sync; nur noch für manuelle Tests
   */
  async syncCheckoutSession(_checkoutSessionId: string): Promise<boolean> {
    console.warn('syncCheckoutSession is deprecated; subscription sync runs via Stripe webhook.');
    return false;
  }

  /**
   * Get subscription analytics for admin (if user has admin access)
   */
  async getSubscriptionAnalytics() {
    try {
      const { data, error } = await supabase
        .from('subscriptions' as any)
        .select('*');

      if (error) {
        console.error('Error fetching subscription analytics:', error);
        return null;
      }

      // Process analytics manually
      const analytics = {
        total_subscriptions: data?.length || 0,
        active_subscriptions: data?.filter((s: any) => s.status === 'active').length || 0,
        premium_subscriptions: data?.filter((s: any) => s.plan_type === 'premium').length || 0,
        professional_subscriptions: data?.filter((s: any) => s.plan_type === 'professional').length || 0,
        total_revenue_cents: data?.reduce((sum: number, s: any) => sum + (s.amount_paid_cents || 0), 0) || 0
      };

      return analytics;
    } catch (error) {
      console.error('Error in getSubscriptionAnalytics:', error);
      return null;
    }
  }
}

export const subscriptionStatusService = new SubscriptionStatusService();
export default subscriptionStatusService; 