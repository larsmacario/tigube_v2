import { supabase } from '../supabase/client';
import { config } from './stripeConfig';

export type DienstleisterType =
  | 'caretaker'
  | 'tierarzt'
  | 'hundetrainer'
  | 'tierfriseur'
  | 'physiotherapeut'
  | 'ernaehrungsberater'
  | 'tierfotograf'
  | 'sonstige'
  | 'dienstleister';

export interface CheckoutSessionData {
  userType: 'owner' | DienstleisterType;
  plan: 'premium' | 'professional';
  userId: string;
  userEmail: string;
}

export class StripeService {
  static isStripeReady(): boolean {
    return config.stripe.isEnabled;
  }

  static validateStripeConfiguration(): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.stripe.publishableKey) {
      errors.push('VITE_STRIPE_PUBLISHABLE_KEY nicht gesetzt');
    } else if (config.app.environment === 'production' && !config.stripe.publishableKey.includes('pk_live_')) {
      warnings.push('Production verwendet Test-Publishable-Key');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  static async startCheckout(data: CheckoutSessionData): Promise<void> {
    if (!this.isStripeReady()) {
      throw new Error('Stripe ist nicht konfiguriert — VITE_STRIPE_PUBLISHABLE_KEY fehlt');
    }

    const check = this.validateStripeConfiguration();
    if (!check.isValid) {
      throw new Error(`Stripe Konfigurationsfehler:\n${check.errors.join('\n')}`);
    }

    const { data: sessionData, error } = await supabase.functions.invoke('create-checkout-session', {
      body: {
        userType: data.userType,
        plan: data.plan,
        userEmail: data.userEmail,
      },
    });

    if (error) {
      console.error('create-checkout-session error:', error);
      throw new Error(error.message || 'Checkout konnte nicht gestartet werden');
    }

    const url = sessionData?.url as string | undefined;
    if (!url) {
      throw new Error(sessionData?.error || 'Keine Checkout-URL erhalten');
    }

    window.location.href = url;
  }

  static async validateCheckoutSession(sessionId: string): Promise<{
    success: boolean;
    session?: {
      id: string;
      payment_status?: string;
      status?: string;
      amount_total?: number;
      currency?: string;
      customer_email?: string;
      client_reference_id?: string;
      metadata?: Record<string, string>;
    };
    error?: string;
  }> {
    const { data, error } = await supabase.functions.invoke('validate-checkout-session', {
      body: { sessionId },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (!data?.success) {
      return { success: false, error: data?.error || 'Validierung fehlgeschlagen' };
    }

    return { success: true, session: data.session };
  }

  static async openBillingPortal(): Promise<void> {
    const { data, error } = await supabase.functions.invoke('create-billing-portal-session', {
      body: {},
    });

    if (error) {
      throw new Error(error.message || 'Kundenportal konnte nicht geöffnet werden');
    }

    const url = data?.url as string | undefined;
    if (!url) {
      throw new Error(data?.error || 'Keine Portal-URL erhalten');
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export async function openStripeBillingPortal(): Promise<void> {
  try {
    await StripeService.openBillingPortal();
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unbekannter Fehler';
    alert(`Mitgliedschaft verwalten:\n${message}`);
  }
}
