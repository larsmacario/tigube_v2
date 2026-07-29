import { useAuth } from './AuthContext';
import { FEATURE_MATRIX } from '../services/subscriptionService';
import { useMemo } from 'react';

export function useSubscription() {
  const { subscription, subscriptionLoading, refreshSubscription, user } = useAuth();

  // Feature-Zugriff basierend auf aktueller Subscription (jetzt aus users-Tabelle)
  const features = useMemo(() => {
    if (!subscription) {
      return FEATURE_MATRIX.free;
    }

    return FEATURE_MATRIX[subscription.plan_type as keyof typeof FEATURE_MATRIX] || FEATURE_MATRIX.free;
  }, [subscription]);

  // Helper-Funktionen für Feature-Checks
  const hasFeature = (featureName: keyof typeof features): boolean => {
    return Boolean(features[featureName]);
  };

  // Vereinfachte Feature-Check ohne async Database-Call
  const canUseFeature = (featureName: string): boolean => {
    return Boolean(features[featureName as keyof typeof features]);
  };

  // Subscription-Status checks
  const isPremiumUser = subscription?.plan_type === 'premium' && 
                       (!subscription.plan_expires_at || new Date(subscription.plan_expires_at) > new Date());

  // Helper: Check if premium is expired
  const isPremiumExpired = subscription?.plan_type === 'premium' && 
                          subscription.plan_expires_at && 
                          new Date(subscription.plan_expires_at) <= new Date();

  return {
    subscription,
    subscriptionLoading,
    refreshSubscription,
    features,
    hasFeature,
    canUseFeature,
    isPremiumUser,
    isPremiumExpired,
    isBetaUser: false,
    daysUntilBetaEnd: 0,
  };
} 