const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

const ownerPremiumDisplayCents = 490;
const caretakerProfessionalDisplayCents = 1290;

export const stripePromise = null;

export const config = {
  stripe: {
    publishableKey: stripePublishableKey,
    isEnabled: !!stripePublishableKey,
  },
  app: {
    url: import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : ''),
    environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  },
  pricing: {
    ownerPremium: ownerPremiumDisplayCents,
    caretakerProfessional: caretakerProfessionalDisplayCents,
  },
};

export const formatPrice = (cents: number): string =>
  new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(cents / 100);

const DIENSTLEISTER_TYPES = [
  'caretaker', 'tierarzt', 'hundetrainer', 'tierfriseur',
  'physiotherapeut', 'ernaehrungsberater', 'tierfotograf', 'sonstige', 'dienstleister',
] as const;

export const getPlanDisplayName = (userType: string, plan: 'basic' | 'premium'): string => {
  if (plan === 'basic') return 'Starter';
  return userType === 'owner' ? 'Premium' : 'Professional';
};

export const getPlanPrice = (userType: string, plan: 'basic' | 'premium'): string => {
  if (plan === 'basic') return 'Kostenlos';
  const cents = userType === 'owner' ? config.pricing.ownerPremium : config.pricing.caretakerProfessional;
  return formatPrice(cents);
};

export const isDevelopment = config.app.environment === 'development';
export const isProduction = config.app.environment === 'production';
export const isStripeTestMode = stripePublishableKey?.includes('pk_test_') ?? false;
export const isStripeLiveMode = stripePublishableKey?.includes('pk_live_') ?? false;

export const getProductionReadiness = () => {
  const checks = {
    hasLiveKeys: isStripeLiveMode,
    hasPublishableKey: !!stripePublishableKey,
    hasValidAppUrl: !config.app.url.includes('localhost'),
    environment: config.app.environment,
  };
  const isReady = isProduction
    ? checks.hasLiveKeys && checks.hasPublishableKey && checks.hasValidAppUrl
    : checks.hasPublishableKey;

  return {
    ...checks,
    isReady,
    warnings: [
      ...(isProduction && !checks.hasLiveKeys ? ['Production ohne Live-Keys (pk_live_)'] : []),
      ...(isProduction && !checks.hasValidAppUrl ? ['App-URL ist noch localhost'] : []),
    ],
  };
};

if (isProduction && isStripeTestMode) {
  console.warn('[Stripe] Production nutzt Test-Keys — echte Zahlungen sind deaktiviert.');
}
