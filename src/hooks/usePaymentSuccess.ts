import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { StripeService } from '../lib/stripe/stripeService';
import { useAuth } from '../lib/auth/AuthContext';

interface PaymentSuccessData {
  isOpen: boolean;
  planType: 'premium' | 'professional';
  userType: 'owner' | 'caretaker';
  sessionData?: {
    amount_total?: number;
    customer_email?: string;
    session_id?: string;
  };
}

async function waitForSubscriptionRefresh(
  refresh: () => Promise<void>,
  attempts = 8,
  delayMs = 1500,
) {
  for (let i = 0; i < attempts; i++) {
    await refresh();
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
}

export function usePaymentSuccess() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshSubscription } = useAuth();
  const [paymentSuccess, setPaymentSuccess] = useState<PaymentSuccessData>({
    isOpen: false,
    planType: 'premium',
    userType: 'owner',
  });
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const checkPaymentSuccess = async () => {
      const sessionId = searchParams.get('session_id');
      const paymentSuccessFlag = searchParams.get('payment_success');
      const planFromUrl = searchParams.get('plan') as 'premium' | 'professional' | null;
      const userTypeFromUrl = searchParams.get('user_type') as 'owner' | 'caretaker' | null;

      if (!sessionId && paymentSuccessFlag !== 'true') return;

      setIsValidating(true);

      try {
        let sessionData: PaymentSuccessData['sessionData'];

        if (sessionId) {
          const result = await StripeService.validateCheckoutSession(sessionId);
          if (result.success && result.session) {
            sessionData = {
              amount_total: result.session.amount_total,
              customer_email: result.session.customer_email,
              session_id: sessionId,
            };
          }
          await waitForSubscriptionRefresh(refreshSubscription);
        } else {
          await refreshSubscription();
        }

        let planType: 'premium' | 'professional' = planFromUrl || 'premium';
        let userType: 'owner' | 'caretaker' = userTypeFromUrl || 'owner';

        if (sessionData?.amount_total === 1290) {
          planType = 'professional';
          userType = 'caretaker';
        } else if (sessionData?.amount_total === 490) {
          planType = 'premium';
          userType = 'owner';
        }

        setPaymentSuccess({
          isOpen: true,
          planType,
          userType,
          sessionData,
        });
      } catch (error) {
        console.error('Payment success handling error:', error);
        if (planFromUrl && userTypeFromUrl) {
          setPaymentSuccess({
            isOpen: true,
            planType: planFromUrl,
            userType: userTypeFromUrl,
          });
        }
      } finally {
        setIsValidating(false);
      }
    };

    checkPaymentSuccess();
  }, [searchParams, refreshSubscription]);

  const closeModal = () => {
    setPaymentSuccess((prev) => ({ ...prev, isOpen: false }));
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('session_id');
    newSearchParams.delete('payment_success');
    newSearchParams.delete('plan');
    newSearchParams.delete('user_type');
    setSearchParams(newSearchParams, { replace: true });
  };

  return { paymentSuccess, isValidating, closeModal };
}
