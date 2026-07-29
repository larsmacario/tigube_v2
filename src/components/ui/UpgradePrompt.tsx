import React from 'react';
import { useSubscription } from '../../lib/auth/useSubscription';
import { Crown, Star, Zap, ArrowRight, X } from 'lucide-react';
import Button from './Button';

interface UpgradePromptProps {
  variant: 'modal' | 'banner' | 'inline';
  trigger: 'limit_reached' | 'feature_blocked' | 'general';
  featureType?: 'contact_request' | 'booking_request' | 'environment_images' | 'premium_badge';
  userType?: 'owner' | 'caretaker';
  onClose?: () => void;
  onUpgrade?: (plan: 'premium') => void;
  className?: string;
}

export function UpgradePrompt({ 
  variant, 
  trigger, 
  featureType,
  userType = 'owner',
  onClose, 
  onUpgrade,
  className = '' 
}: UpgradePromptProps) {
  const { subscription } = useSubscription();

  const getPromptContent = (): {
    title: string;
    description: string;
    icon: React.ReactNode;
    urgency: 'low' | 'medium' | 'high';
  } => {
    const planName = userType === 'owner' ? 'Premium' : 'Professional';
    switch (trigger) {
      case 'limit_reached':
        return {
          title: 'Monatslimit erreicht',
          description: `Du hast dein Limit für ${getFeatureLabel(featureType)} erreicht. Upgrade zu ${planName} für unlimited Zugang!`,
          icon: <Crown className="w-6 h-6 text-yellow-500" />,
          urgency: 'high' as const
        };
      case 'feature_blocked':
        return {
          title: `${planName} Feature`,
          description: `${getFeatureLabel(featureType)} ist nur in ${planName} verfügbar. Jetzt upgraden?`,
          icon: <Star className="w-6 h-6 text-purple-500" />,
          urgency: 'medium' as const
        };
      case 'general':
        return {
          title: `Upgrade zu ${planName}`,
          description: `Schalte alle Features frei und genieße unlimited Zugang zu tigube.`,
          icon: <Zap className="w-6 h-6 text-blue-500" />,
          urgency: 'low' as const
        };
      default:
        return {
          title: 'Upgrade verfügbar',
          description: `Erweitere deine Möglichkeiten mit ${planName}.`,
          icon: <Crown className="w-6 h-6 text-yellow-500" />,
          urgency: 'low' as const
        };
    }
  };

  const content = getPromptContent();

  if (variant === 'modal') {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
          <UpgradeContent 
            content={content}
            userType={userType}
            onUpgrade={onUpgrade}
            onClose={onClose}
            showCloseButton
          />
        </div>
      </div>
    );
  }

  if (variant === 'banner') {
    return (
      <div className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {content.icon}
            <div>
              <h3 className="font-semibold">{content.title}</h3>
              <p className="text-sm opacity-90">{content.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="border-white text-white hover:bg-white hover:text-blue-600"
              onClick={() => onUpgrade?.('premium')}
            >
              Upgrade
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            {onClose && (
              <button onClick={onClose} className="p-1 hover:bg-white/20 rounded">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Inline variant
  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      <UpgradeContent 
        content={content}
        userType={userType}
        onUpgrade={onUpgrade}
        compact
      />
    </div>
  );
}

interface UpgradeContentProps {
  content: {
    title: string;
    description: string;
    icon: React.ReactNode;
    urgency: 'low' | 'medium' | 'high';
  };
  userType?: 'owner' | 'caretaker';
  onUpgrade?: (plan: 'premium') => void;
  onClose?: () => void;
  showCloseButton?: boolean;
  compact?: boolean;
}

function UpgradeContent({ 
  content, 
  userType = 'owner',
  onUpgrade, 
  onClose, 
  showCloseButton,
  compact 
}: UpgradeContentProps) {
  const planName = userType === 'owner' ? 'Premium' : 'Professional';
  const planPrice = userType === 'owner' ? '€4,90/Monat' : '€12,90/Monat';
  const planFeatures = userType === 'owner' 
    ? ['Unlimited Kontakte', 'Premium Badge', 'Keine Werbung', 'Erweiterte Filter']
    : ['Unlimited Kontakte & Buchungen', 'Umgebungsbilder', 'Business-Profile', 'Premium Analytics'];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {content.icon}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{content.title}</h3>
            {!compact && (
              <p className="text-sm text-gray-600">{content.description}</p>
            )}
          </div>
        </div>
        {showCloseButton && onClose && (
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        )}
      </div>

      {compact && (
        <p className="text-sm text-gray-600 mb-4">{content.description}</p>
      )}

      {/* Plan Details */}
      <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">{planName}</h4>
              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                Empfohlen
              </span>
            </div>
            <p className="text-sm font-medium text-blue-600">{planPrice}</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onUpgrade?.('premium')}
          >
            Jetzt upgraden
          </Button>
        </div>
        
        {!compact && (
          <ul className="text-xs text-gray-600 space-y-1">
            {planFeatures.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-1">
                <Star className="w-3 h-3 text-blue-500" />
                {feature}
              </li>
            ))}
          </ul>
        )}
      </div>


    </div>
  );
}


// Helper functions
function getFeatureLabel(featureType?: string): string {
  switch (featureType) {
    case 'contact_request': return 'Kontaktanfragen';
    case 'booking_request': return 'Buchungsanfragen';
    case 'environment_images': return 'Umgebungsbilder';
    case 'premium_badge': return 'Premium Badge';
    default: return 'dieses Feature';
  }
} 