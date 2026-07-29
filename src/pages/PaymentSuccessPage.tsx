import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CheckCircle, Loader, Crown, Star, AlertCircle } from 'lucide-react';
import Button from '../components/ui/Button';
import { StripeService } from '../lib/stripe/stripeService';
import { useAuth } from '../lib/auth/AuthContext';

export default function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userProfile, refreshSubscription } = useAuth();
  const [isValidating, setIsValidating] = useState(true);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    session?: {
      amount_total?: number;
      customer_email?: string;
      metadata?: { planType?: string; userType?: string };
    };
    error?: string;
  } | null>(null);

  const sessionId = searchParams.get('session_id');

  const navigateToDashboard = () => {
    const userType = userProfile?.user_type;
    const caretakerTypes = [
      'caretaker', 'dienstleister', 'tierarzt', 'hundetrainer', 'tierfriseur',
      'physiotherapeut', 'ernaehrungsberater', 'tierfotograf', 'sonstige',
    ];
    if (userType && caretakerTypes.includes(userType)) {
      navigate('/dashboard-caretaker');
    } else {
      navigate('/dashboard-owner');
    }
  };

  useEffect(() => {
    const validatePayment = async () => {
      if (!sessionId) {
        setValidationResult({ success: false, error: 'Keine Session-ID gefunden' });
        setIsValidating(false);
        return;
      }

      try {
        const result = await StripeService.validateCheckoutSession(sessionId);

        if (result.success && result.session) {
          let planType = result.session.metadata?.planType || 'premium';
          let userType = result.session.metadata?.userType || 'owner';

          if (result.session.amount_total === 1290) {
            planType = 'professional';
            userType = 'caretaker';
          } else if (result.session.amount_total === 490) {
            planType = 'premium';
            userType = 'owner';
          }

          setValidationResult({
            success: true,
            session: {
              ...result.session,
              metadata: { planType, userType },
            },
          });

          for (let i = 0; i < 6; i++) {
            await refreshSubscription();
            await new Promise((r) => setTimeout(r, 1500));
          }
        } else {
          setValidationResult({ success: false, error: result.error });
        }
      } catch (error) {
        console.error('Payment validation error:', error);
        setValidationResult({ success: false, error: 'Fehler bei der Validierung' });
      } finally {
        setIsValidating(false);
      }
    };

    validatePayment();
  }, [sessionId, refreshSubscription]);

  const getPlanInfo = () => {
    if (!validationResult?.session?.metadata) return null;
    const { planType, userType } = validationResult.session.metadata;

    if (userType === 'owner' && planType === 'premium') {
      return {
        name: 'Premium',
        icon: <Star className="w-12 h-12 text-yellow-500" />,
        features: [
          'Unlimited Kontaktanfragen',
          'Bewertungen schreiben',
          'Erweiterte Suchfilter',
          'Werbefrei',
          'Premium Support',
        ],
      };
    }

    if (userType === 'caretaker' && planType === 'professional') {
      return {
        name: 'Professional',
        icon: <Crown className="w-12 h-12 text-purple-500" />,
        features: [
          'Unlimited Buchungsanfragen',
          'Premium Badge',
          'Bis zu 6 Umgebungsbilder',
          'Höchste Priorität in Suche',
          'Werbefrei',
          'Premium Support',
        ],
      };
    }

    return null;
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <Loader className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Zahlung wird überprüft…</h2>
            <p className="text-gray-600">
              Bitte warte einen Moment, während wir deine Zahlung bestätigen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!validationResult?.success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Zahlung konnte nicht bestätigt werden
            </h2>
            <p className="text-gray-600 mb-6">
              {validationResult?.error || 'Es gab ein Problem bei der Verarbeitung deiner Zahlung.'}
            </p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/mitgliedschaften')} className="w-full">
                Zurück zu den Mitgliedschaften
              </Button>
              <Button variant="outline" onClick={navigateToDashboard} className="w-full">
                Zum Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const planInfo = getPlanInfo();
  const amount = validationResult.session?.amount_total
    ? (validationResult.session.amount_total / 100).toFixed(2)
    : '0.00';

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="max-w-2xl w-full mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Zahlung erfolgreich!</h1>
            <p className="text-lg text-gray-600">
              Willkommen in deinem neuen {planInfo?.name || 'Premium'}-Plan
            </p>
          </div>

          {planInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
              <div className="flex items-center justify-center mb-4">
                {planInfo.icon}
                <h3 className="text-2xl font-bold text-gray-900 ml-3">{planInfo.name} Plan</h3>
              </div>
              <div className="text-center mb-6">
                <p className="text-3xl font-bold text-gray-900">€{amount}</p>
                <p className="text-gray-600">pro Monat</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {planInfo.features.map((feature) => (
                  <div key={feature} className="flex items-center">
                    <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-center">
            <Button onClick={navigateToDashboard} className="w-full sm:w-auto px-8">
              Zum Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
