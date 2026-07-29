import React from 'react';
import { AlertCircle, CheckCircle, Clock, CreditCard } from 'lucide-react';
import { config, isStripeLiveMode, isStripeTestMode, getProductionReadiness } from '../../lib/stripe/stripeConfig';
import { StripeService } from '../../lib/stripe/stripeService';

export default function StripeStatusIndicator() {
  const productionReadiness = getProductionReadiness();
  const configCheck = StripeService.validateStripeConfiguration();

  const getStatusIcon = () => {
    if (!config.stripe.isEnabled) {
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    }
    if (productionReadiness.isReady) {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <Clock className="w-5 h-5 text-yellow-500" />;
  };

  const getStatusColor = () => {
    if (!config.stripe.isEnabled) return 'red';
    if (productionReadiness.isReady) return 'green';
    return 'yellow';
  };

  const statusColor = getStatusColor();

  return (
    <div className={`border rounded-lg p-4 ${{
      green: 'border-green-200 bg-green-50',
      yellow: 'border-yellow-200 bg-yellow-50',
      red: 'border-red-200 bg-red-50'
    }[statusColor]}`}>
      <div className="flex items-center gap-3 mb-3">
        <CreditCard className="w-6 h-6 text-gray-600" />
        <div>
          <h3 className="font-semibold text-gray-900">Stripe-Integration</h3>
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className={`text-sm font-medium ${{
              green: 'text-green-700',
              yellow: 'text-yellow-700',
              red: 'text-red-700'
            }[statusColor]}`}>
              {!config.stripe.isEnabled 
                ? 'Nicht konfiguriert'
                : productionReadiness.isReady 
                  ? 'Produktionsbereit'
                  : 'Konfiguration unvollständig'
              }
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Modus:</span>
          <span className={`font-medium ${
            isStripeLiveMode ? 'text-green-600' : 
            isStripeTestMode ? 'text-blue-600' : 
            'text-red-600'
          }`}>
            {isStripeLiveMode ? 'LIVE' : isStripeTestMode ? 'TEST' : 'UNBEKANNT'}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Environment:</span>
          <span className="font-medium text-gray-900">{config.app.environment}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">App URL:</span>
          <span className="font-medium text-gray-900 truncate max-w-48">{config.app.url}</span>
        </div>
      </div>

      {/* Errors */}
      {configCheck.errors.length > 0 && (
        <div className="mt-3 p-3 bg-red-100 border border-red-200 rounded">
          <h4 className="font-medium text-red-800 mb-1">Fehler:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {configCheck.errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Warnings */}
      {configCheck.warnings.length > 0 && (
        <div className="mt-3 p-3 bg-yellow-100 border border-yellow-200 rounded">
          <h4 className="font-medium text-yellow-800 mb-1">Warnungen:</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            {configCheck.warnings.map((warning, index) => (
              <li key={index}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Production Setup Help */}
      {config.app.environment === 'production' && !productionReadiness.isReady && (
        <div className="mt-3 p-3 bg-blue-100 border border-blue-200 rounded">
          <h4 className="font-medium text-blue-800 mb-2">Für Live-Betrieb benötigt:</h4>
          <div className="text-sm text-blue-700 space-y-1">
            <div>1. <strong>Live Publishable Key</strong> (pk_live_) in Vercel</div>
            <div>2. <strong>Supabase Secrets</strong>: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, Price-IDs, SITE_URL</div>
            <div>3. <strong>Edge Functions</strong> deployen + Webhook in Stripe</div>
            <div>4. Siehe <code className="text-xs">docs/STRIPE_SETUP.md</code></div>
          </div>
        </div>
      )}
    </div>
  );
} 