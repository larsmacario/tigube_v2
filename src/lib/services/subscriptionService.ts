import { supabase } from '../supabase/client';

// Feature-Matrix basierend auf Plan-Type in der users Tabelle
export const FEATURE_MATRIX = {
  free: {
    max_contact_requests: 3,
    max_bookings: 3,
    max_environment_images: 3,
    advanced_filters: false,
    priority_ranking: false,
    unlimited_messages: false,
    customer_support: false,
    featured_listing: false,
    post_owner_jobs: false,
    apply_owner_jobs: false
  },
  premium: {
    max_contact_requests: 999,
    max_bookings: 999,
    max_environment_images: 10,
    advanced_filters: true,
    priority_ranking: true,
    unlimited_messages: true,
    customer_support: true,
    featured_listing: true,
    post_owner_jobs: true,
    apply_owner_jobs: true
  }
};

// Vereinfachte Subscription-Struktur (basiert auf users-Tabelle)
export interface UserSubscription {
  plan_type: 'free' | 'premium';
  plan_expires_at: string | null;
  show_ads: boolean;
  premium_badge: boolean;
}

export class SubscriptionService {
  /**
   * NEUE METHODE: Holt Subscription-Daten direkt aus der users-Tabelle
   */
  static async getUserSubscription(userId: string): Promise<UserSubscription | null> {
    try {
      console.log('🔍 Getting user subscription from users table:', userId);

      const { data: user, error } = await supabase
        .from('users')
        .select('plan_type, plan_expires_at, show_ads, premium_badge, created_at, is_admin')
        .eq('id', userId)
        .single() as any;

      if (error) {
        console.error('❌ Error fetching user subscription:', error);
        return null;
      }

      if (user.is_admin === true) {
        return {
          plan_type: 'premium',
          plan_expires_at: null,
          show_ads: false,
          premium_badge: true
        };
      }

      // Prüfe ob Premium-Plan abgelaufen ist
      const isExpired = user.plan_expires_at && new Date(user.plan_expires_at) <= new Date();

      return {
        plan_type: isExpired ? 'free' : (user.plan_type || 'free'),
        plan_expires_at: user.plan_expires_at,
        show_ads: user.show_ads ?? true,
        premium_badge: user.premium_badge ?? false
      };
    } catch (error) {
      console.error('❌ Error in getUserSubscription:', error);
      return null;
    }
  }

  /**
   * LEGACY METHODE (für Rückwärtskompatibilität)
   * Wrapper um getUserSubscription für alte Aufrufe
   */
  static async getActiveSubscription(userId: string): Promise<UserSubscription | null> {
    return this.getUserSubscription(userId);
  }

  /**
   * Feature-Matrix für Plan-Type abrufen
   */
  static getFeatures(planType: string) {
    return FEATURE_MATRIX[planType as keyof typeof FEATURE_MATRIX] || FEATURE_MATRIX.free;
  }

  /**
   * NEUE METHODE: Prüfe Feature-Zugriff basierend auf User-Spalten
   */
  static async checkFeatureAccess(userId: string, featureName: string): Promise<boolean> {
    try {
      const subscription = await this.getUserSubscription(userId);
      if (!subscription) return false;

      const features = this.getFeatures(subscription.plan_type);
      return Boolean(features[featureName as keyof typeof features]);
    } catch (error) {
      console.error('❌ Error checking feature access:', error);
      return false;
    }
  }

  /**
   * Update User-Plan (z. B. Admin oder interne Tools)
   */
  static async updateUserPlan(
    userId: string,
    planType: 'free' | 'premium',
    expiresAt?: string | null,
    stripeCustomerId?: string,
    stripeSubscriptionId?: string
  ): Promise<{ success: boolean; error?: any }> {
    try {
      console.log('🔄 Updating user plan:', { userId, planType, expiresAt, stripeCustomerId, stripeSubscriptionId });

      const updateData: any = {
        plan_type: planType,
        plan_expires_at: expiresAt,
        updated_at: new Date().toISOString()
      };

      // Setze Stripe Customer ID wenn verfügbar
      if (stripeCustomerId) {
        updateData.stripe_customer_id = stripeCustomerId;
      }

      // Setze Stripe Subscription ID wenn verfügbar
      if (stripeSubscriptionId) {
        updateData.stripe_subscription_id = stripeSubscriptionId;
      }

      // Setze Feature-Flags und Limits basierend auf Plan
      if (planType === 'premium') {
        updateData.show_ads = false;
        updateData.premium_badge = true;
        updateData.max_contact_requests = -1; // -1 = unlimited
        updateData.max_bookings = -1; // -1 = unlimited
        updateData.search_priority = 5;
      } else {
        updateData.show_ads = true;
        updateData.premium_badge = false;
        updateData.max_contact_requests = 3;
        updateData.max_bookings = 3;
        updateData.search_priority = 0;
      }

      const { error } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', userId);

      if (error) {
        console.error('❌ Error updating user plan:', error);
        return { success: false, error };
      }

      console.log('✅ User plan updated successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Error in updateUserPlan:', error);
      return { success: false, error };
    }
  }

  /**
   * LEGACY METHODS - Entfernt für Vereinfachung
   * Diese Methoden existieren nicht mehr im neuen System:
   * - getAllUserSubscriptions()
   * - syncSubscriptionStatus()
   * - updateUserProfileForPlan()
   * - manualStripeSync()
   */

  /**
   * HELPER: Prüfe ob User Premium-Zugriff hat
   */
  static async isPremiumUser(userId: string): Promise<boolean> {
    const subscription = await this.getUserSubscription(userId);
    return subscription?.plan_type === 'premium' &&
      (!subscription.plan_expires_at || new Date(subscription.plan_expires_at) > new Date());
  }

  /**
   * HELPER: Hole verbleibende Tage für Premium
   */
  static async getRemainingPremiumDays(userId: string): Promise<number | null> {
    const subscription = await this.getUserSubscription(userId);

    if (!subscription?.plan_expires_at || subscription.plan_type !== 'premium') {
      return null;
    }

    const expiryDate = new Date(subscription.plan_expires_at);
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }
} 