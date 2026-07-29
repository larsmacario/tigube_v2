import React from 'react';
import { CheckCircle, Crown, Star, X, ExternalLink } from 'lucide-react';
import Button from './Button';
import { openStripeBillingPortal } from '../../lib/stripe/stripeService';

interface PaymentSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  planType: 'premium' | 'professional';
  userType: 'owner' | 'caretaker';
  sessionData?: {
    amount_total?: number;
    customer_email?: string;
  };
}

export default function PaymentSuccessModal({ 
  isOpen, 
  onClose, 
  planType, 
  userType,
  sessionData 
}: PaymentSuccessModalProps) {
  if (!isOpen) return null;

  const getPlanInfo = () => {
    if (userType === 'owner' && planType === 'premium') {
      return {
        name: 'Premium',
        icon: <Star className="w-16 h-16 text-yellow-500" />,
        color: 'bg-yellow-50 border-yellow-200',
        price: '€4,90/Monat',
        features: [
          'Unbegrenzte Kontaktanfragen',
          'Keine Werbung',
          'Priority Support',
          'Erweiterte Suchfilter'
        ]
      };
    } else {
      return {
        name: 'Professional',
        icon: <Crown className="w-16 h-16 text-purple-500" />,
        color: 'bg-purple-50 border-purple-200',
        price: '€12,90/Monat',
        features: [
          'Unbegrenzte Buchungen',
          'Premium Badge',
          'Höchste Suchpriorität',
          'Keine Werbung',
          'Erweiterte Analytics',
          'Business Features'
        ]
      };
    }
  };

  const planInfo = getPlanInfo();

  const handleManageSubscription = () => {
    void openStripeBillingPortal();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 relative overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Header with success icon */}
        <div className="text-center pt-8 pb-6">
          <div className="mb-4">
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Zahlung erfolgreich!
          </h2>
          <p className="text-gray-600">
            Willkommen bei Tigube {planInfo.name}
          </p>
        </div>

        {/* Plan details */}
        <div className={`mx-6 mb-6 p-4 rounded-lg border ${planInfo.color}`}>
          <div className="flex items-center justify-center mb-3">
            {planInfo.icon}
          </div>
          <div className="text-center">
            <h3 className="font-bold text-lg text-gray-900 mb-1">
              {planInfo.name} Plan
            </h3>
            <p className="text-gray-600 text-sm mb-3">
              {planInfo.price}
            </p>
            <div className="space-y-1">
              {planInfo.features.map((feature, index) => (
                <div key={index} className="flex items-center text-sm text-gray-700">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Customer email */}
        {sessionData?.customer_email && (
          <div className="mx-6 mb-6 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              Bestätigungs-E-Mail wurde an<br />
              <span className="font-medium text-gray-900">
                {sessionData.customer_email}
              </span><br />
              gesendet
            </p>
          </div>
        )}

        {/* Action buttons */}
        <div className="px-6 pb-6 space-y-3">
          <Button
            onClick={onClose}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg font-medium transition-colors"
          >
            Dashboard weiter nutzen
          </Button>
          
          <Button
            onClick={handleManageSubscription}
            variant="outline"
            className="w-full border-gray-300 text-gray-700 hover:bg-gray-50 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            Mitgliedschaft verwalten
          </Button>
        </div>

        {/* Bottom note */}
        <div className="bg-gray-50 px-6 py-4 text-center">
          <p className="text-xs text-gray-500">
            Du kannst deine Mitgliedschaft jederzeit über das Stripe-Portal verwalten oder kündigen.
          </p>
        </div>
      </div>
    </div>
  );
} 