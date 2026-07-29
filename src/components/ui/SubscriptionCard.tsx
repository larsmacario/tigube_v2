import React from 'react';
import { Check, Crown, Star, Users, ExternalLink } from 'lucide-react';
import Button from './Button';
import { useSubscription } from '../../lib/auth/useSubscription';
import { getPlanPrice } from '../../lib/stripe/stripeConfig';
import { openStripeBillingPortal } from '../../lib/stripe/stripeService';

interface SubscriptionCardProps {
  plan: 'basic' | 'premium';
  userType: 'owner' | 'caretaker';
  onSelectPlan?: (plan: 'basic' | 'premium') => void;
  className?: string;
  highlighted?: boolean;
}

export function SubscriptionCard({
  plan,
  userType,
  onSelectPlan,
  className = '',
  highlighted = false
}: SubscriptionCardProps) {
  const { subscription } = useSubscription();
  const planConfig = getPlanConfig(plan, userType);

  // Check if this is the user's current plan
  const currentPlan = subscription?.plan_type || 'free';
  const isCurrentPlan = currentPlan === plan;

  // Check if user is in beta
  const isBetaUser = subscription?.status === 'trial';

  const handleManageSubscription = () => {
    void openStripeBillingPortal();
  };

  const handlePremiumClick = () => {
    onSelectPlan?.(plan);
  };

  return (
    <>
      <div className={`subscription-card ${className}`}>
        <div className={`
          relative bg-white rounded-xl border-2 p-6 h-full flex flex-col
          ${highlighted ? 'border-primary-600 shadow-2xl transform scale-105' : 'border-gray-200 shadow-lg'}
          transition-all duration-300 hover:shadow-xl
        `}>
          {/* Popular Badge */}
          {highlighted && (
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <span className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-4 py-1 rounded-full text-sm font-medium">
                Am beliebtesten
              </span>
            </div>
          )}

          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center mb-3">
              {planConfig.icon}
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {planConfig.name}
            </h3>
            <div className="mb-2">
              <span className="text-4xl font-bold text-gray-900">{planConfig.price}</span>
              {planConfig.price !== 'Kostenlos' && (
                <span className="text-gray-500 ml-1">/Monat</span>
              )}
            </div>
            <p className="text-gray-600 text-sm">{planConfig.description}</p>
          </div>

          {/* Features */}
          <div className="space-y-3 mb-6">
            {planConfig.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {feature.available ? (
                    <Check className="w-5 h-5 text-green-500" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <span className={`text-sm ${feature.available ? 'text-gray-900' : 'text-gray-400'}`}>
                    {feature.name}
                  </span>
                  {feature.limit && (
                    <span className="text-xs text-gray-500 ml-2">({feature.limit})</span>
                  )}
                  {feature.highlight && (
                    <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full ml-2">
                      {feature.highlight}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Beta Notice */}
          {isBetaUser && plan === 'premium' && (
            <div className="mb-4 p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 text-center">
                <strong>Testphase:</strong> Premium-Features sind vorübergehend freigeschaltet.
              </p>
            </div>
          )}
          {isBetaUser && plan === 'basic' && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800 text-center">
                <strong>Testphase:</strong> Erweiterte Limits können temporär gelten.
              </p>
            </div>
          )}

          {/* CTA Button */}
          <div className="pt-4 space-y-3 mt-auto">
            {isCurrentPlan ? (
              <>
                <Button variant="outline" disabled className="w-full">
                  Aktueller Plan
                </Button>
                {plan === 'premium' && (
                  <Button
                    variant="primary"
                    className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
                    onClick={handleManageSubscription}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Mitgliedschaft verwalten
                  </Button>
                )}
              </>
            ) : isBetaUser && plan === 'premium' ? (
              <Button
                variant={highlighted ? 'primary' : 'outline'}
                className="w-full"
                onClick={handlePremiumClick}
              >
                {`Upgrade zu ${planConfig.name}`}
              </Button>
            ) : isBetaUser ? (
              <Button variant="outline" disabled className="w-full">
                Im Starter-Plan
              </Button>
            ) : (
              <Button
                variant={highlighted ? 'primary' : 'outline'}
                className="w-full"
                onClick={plan === 'premium' ? handlePremiumClick : () => onSelectPlan?.(plan)}
              >
                {plan === 'basic' ? 'Kostenlos starten' : `Upgrade zu ${planConfig.name}`}
              </Button>
            )}
          </div>

        </div>
      </div>
    </>
  );
}

interface FeatureItem {
  name: string;
  available: boolean;
  limit?: string;
  highlight?: string;
}

function getPlanConfig(plan: 'basic' | 'premium', userType: 'owner' | 'caretaker') {
  const planPrice = getPlanPrice(userType, plan);

  if (userType === 'owner') {
    const ownerFeatures: Record<string, {
      name: string;
      price: string;
      description: string;
      icon: React.ReactNode;
      features: FeatureItem[];
    }> = {
      basic: {
        name: 'Starter',
        price: planPrice,
        description: 'Perfekt zum Starten',
        icon: <Users className="w-8 h-8 text-gray-600" />,
        features: [
          { name: 'Kontaktanfragen', available: true, limit: '3 pro Monat' },
          { name: 'Basis-Suchfilter', available: true },
          { name: 'Profil erstellen', available: true },
          { name: 'Bewertungen schreiben', available: true },
          { name: 'Bewertungen lesen', available: false },
          { name: 'Werbefrei', available: false },
          { name: 'Erweiterte Filter', available: false },
          { name: 'Premium Support', available: false }
        ]
      },
      premium: {
        name: 'Premium',
        price: planPrice,
        description: 'Für aktive Tierhalter',
        icon: <Star className="w-8 h-8 text-blue-600" />,
        features: [
          { name: 'Kontaktanfragen', available: true, highlight: 'Unlimited' },
          { name: 'Basis-Suchfilter', available: true },
          { name: 'Profil erstellen', available: true },
          { name: 'Bewertungen schreiben', available: true },
          { name: 'Bewertungen lesen', available: true },
          { name: 'Werbefrei', available: true },
          { name: 'Erweiterte Filter', available: true },
          { name: 'Premium Support', available: true }
        ]
      }
    };
    return ownerFeatures[plan];
  } else {
    const caretakerFeatures: Record<string, {
      name: string;
      price: string;
      description: string;
      icon: React.ReactNode;
      features: FeatureItem[];
    }> = {
      basic: {
        name: 'Starter',
        price: planPrice,
        description: 'Grundausstattung für Dienstleister',
        icon: <Users className="w-8 h-8 text-gray-600" />,
        features: [
          { name: 'Kontaktanfragen', available: true, limit: '3 pro Monat' },
          { name: 'Basis-Profil', available: true },
          { name: 'Bis zu 3 Umgebungsbilder', available: true },
          { name: 'Verfügbarkeitskalender', available: true },
          { name: 'Premium Badge', available: false },
          { name: 'Priorität in Suche', available: false },
          { name: 'Premium Support', available: false }
        ]
      },
      premium: {
        name: 'Professional',
        price: planPrice,
        description: 'Für professionelle Dienstleister',
        icon: <Crown className="w-8 h-8 text-purple-600" />,
        features: [
          { name: 'Kontaktanfragen', available: true, highlight: 'Unlimited' },
          { name: 'Basis-Profil', available: true },
          { name: 'Verfügbarkeitskalender', available: true },
          { name: 'Premium Badge', available: true },
          { name: 'Priorität in Suche', available: true },
          { name: 'Bis zu 6 Umgebungsbilder', available: true },
          { name: 'Premium Support', available: true }
        ]
      }
    };
    return caretakerFeatures[plan];
  }
}

// Pricing-Seiten-Layout-Komponente
interface PricingGridProps {
  userType: 'owner' | 'caretaker';
  onSelectPlan?: (plan: 'basic' | 'premium') => void;
  onUserTypeChange?: (userType: 'owner' | 'caretaker') => void;
  className?: string;
  isUserLoggedIn?: boolean;
}

export function PricingGrid({ userType, onSelectPlan, onUserTypeChange, className = '', isUserLoggedIn = false }: PricingGridProps) {
  const { } = useSubscription();
  const isBetaUser = false; // Beta phase ended

  return (
    <div className={`max-w-7xl mx-auto ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
          {userType === 'owner'
            ? 'Finde die perfekte Betreuung für dein Haustier mit den Funktionen, die du brauchst.'
            : 'Erweitere dein Geschäft mit professionellen Tools und Features.'
          }
        </p>

        {/* User Type Toggle - nur für nicht-eingeloggte User */}
        {onUserTypeChange && !isUserLoggedIn && (
          <div className="flex justify-center mb-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl w-full">
              <button
                onClick={() => onUserTypeChange('owner')}
                className={`relative bg-white rounded-xl border transition-all duration-300 hover:shadow-lg p-6 text-left ${userType === 'owner'
                  ? 'border-2 border-primary-600 shadow-lg transform scale-105 ring-2 ring-primary-600/20'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                {userType === 'owner' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Ausgewählt
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-center mb-3">
                  <span className="text-2xl mr-2">🐕</span>
                  <h3 className="text-lg font-bold text-gray-900">Ich bin Tierhalter</h3>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Finde die perfekte Betreuung
                </p>
              </button>

              <button
                onClick={() => onUserTypeChange('caretaker')}
                className={`relative bg-white rounded-xl border transition-all duration-300 hover:shadow-lg p-6 text-left ${userType === 'caretaker'
                  ? 'border-2 border-primary-600 shadow-lg transform scale-105 ring-2 ring-primary-600/20'
                  : 'border-gray-200 hover:border-gray-300'
                  }`}
              >
                {userType === 'caretaker' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Ausgewählt
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-center mb-3">
                  <span className="text-2xl mr-2">🏠</span>
                  <h3 className="text-lg font-bold text-gray-900">Ich bin Betreuer</h3>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  Erweitere dein Geschäft
                </p>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        <SubscriptionCard
          plan="basic"
          userType={userType}
          onSelectPlan={onSelectPlan}
        />
        <SubscriptionCard
          plan="premium"
          userType={userType}
          onSelectPlan={onSelectPlan}
          highlighted={!isBetaUser}
        />
      </div>

      {/* Feature Comparison Toggle */}
      <div className="mt-12 text-center">
        <details className="bg-gray-50 rounded-lg p-6">
          <summary className="cursor-pointer text-lg font-semibold text-gray-900 hover:text-blue-600">
            Detaillierter Feature-Vergleich anzeigen
          </summary>
          <div className="mt-6">
            <FeatureComparisonTable userType={userType} />
          </div>
        </details>
      </div>
    </div>
  );
}

function FeatureComparisonTable({ userType }: { userType: 'owner' | 'caretaker' }) {
  const planName = userType === 'owner' ? 'Premium' : 'Professional';
  const planPrice = userType === 'owner' ? '€4,90/Monat' : '€12,90/Monat';

  const features = [
    { name: 'Kontaktanfragen', basic: '3/Monat', premium: 'Unlimited' },
    { name: 'Suchfilter', basic: 'Basis', premium: 'Erweitert' },
    { name: 'Premium Badge', basic: '❌', premium: '✅' },
    { name: 'Werbung', basic: 'Mit Werbung', premium: 'Werbefrei' },
    { name: 'Support', basic: 'E-Mail Support', premium: 'Premium Chat' },
    ...(userType === 'caretaker' ? [
      { name: 'Priorität in Suche', basic: 'Normal', premium: 'Höchste' },
      { name: 'Umgebungsbilder', basic: '❌', premium: '✅ (6 max)' }
    ] : [
      { name: 'Bewertungen schreiben', basic: '✅', premium: '✅' },
      { name: 'Bewertungen lesen', basic: '❌', premium: '✅' },
      { name: 'Erweiterte Filter', basic: '❌', premium: '✅' }
    ])
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white rounded-lg border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Feature
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              Gratis
            </th>
            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
              {planName}
              <div className="text-xs font-normal text-gray-400 mt-1">{planPrice}</div>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {features.map((feature, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                {feature.name}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                {feature.basic}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">
                {feature.premium}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}