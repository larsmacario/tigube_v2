import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PricingGrid } from '../components/ui/SubscriptionCard';
import { UsageLimitIndicator } from '../components/ui/UsageLimitIndicator';
import { useAuth } from '../lib/auth/AuthContext';
import { useSubscription } from '../lib/auth/useSubscription';
import { useCurrentUsage } from '../hooks/useCurrentUsage';
import { StripeService } from '../lib/stripe/stripeService';
import { config } from '../lib/stripe/stripeConfig';
import Button from '../components/ui/Button';

export default function PricingPage() {
  console.log('🎯 PricingPage: Component loaded successfully');

  try {
    const navigate = useNavigate();
    const { user, userProfile } = useAuth();
    const { } = useSubscription();

    // Debug Stripe configuration on component mount
    React.useEffect(() => {
      console.log('[PricingPage] Stripe configuration check:', {
        stripeEnabled: StripeService.isStripeReady(),
        environment: config.app.environment,
        appUrl: config.app.url
      });
    }, []);

    // Separate Usage Hooks für verschiedene Features
    const { currentUsage: contactUsage, isLoading: contactLoading } = useCurrentUsage('contact_request');
    const { currentUsage: profileUsage, isLoading: profileLoading } = useCurrentUsage('profile_view');


    // Setze den Default-Tab basierend auf dem User-Profil
    const [selectedUserType, setSelectedUserType] = useState<'owner' | 'caretaker'>('owner');
    const [hasInitialized, setHasInitialized] = useState(false);

    // Update selectedUserType nur beim ersten Laden des User-Profils, danach ist der Toggle frei
    useEffect(() => {
      // Nur beim ersten Laden das User-Profil als Default setzen
      if (userProfile?.user_type && !hasInitialized) {
        setSelectedUserType(userProfile.user_type);
        setHasInitialized(true);
      }
    }, [userProfile?.user_type, hasInitialized]);

    // Für eingeloggte User: verwende immer den User Type aus dem Profil
    const effectiveUserType = user && userProfile ? userProfile.user_type : selectedUserType;

    const handleSelectPlan = async (plan: 'basic' | 'premium') => {
      console.log('Plan selected:', plan);

      // Basic plan ist kostenlos - für nicht-eingeloggte User zur Registrierung
      if (plan === 'basic') {
        if (!user) {
          navigate('/registrieren');
        }
        // Eingeloggte User: nichts tun, sie sind bereits registriert
        return;
      }

      // Check if user is logged in
      if (!user || !userProfile) {
        alert('Bitte melde dich an, um ein Upgrade durchzuführen.');
        return;
      }

      try {
        console.log('🚀 Starting checkout process...');
        console.log('User:', { id: user.id, email: user.email, type: displayUserType });

        // Check Stripe configuration first
        if (!StripeService.isStripeReady()) {
          console.error('❌ Stripe configuration issue');
          alert('Zahlungssystem ist momentan nicht verfügbar.\n\nBitte kontaktiere den Support oder versuche es später erneut.');
          return;
        }

        // Map plan to actual plan type
        const planType = effectiveUserType === 'owner' ? 'premium' : 'professional';
        console.log('Plan type:', planType);

        // Subscription initiated

        // Start Stripe checkout
        console.log('Calling StripeService.startCheckout...');
        await StripeService.startCheckout({
          userType: effectiveUserType,
          plan: planType,
          userId: user.id,
          userEmail: user.email!
        });

        console.log('✅ Checkout completed successfully');

      } catch (error) {
        console.error('❌ Checkout error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';

        // Verbesserte Fehlermeldungen für Benutzer
        let userMessage = 'Fehler beim Starten des Zahlungsvorgangs:\n\n';

        if (errorMessage.includes('Payment Link nicht konfiguriert')) {
          userMessage += '🔧 Das Zahlungssystem wird gerade konfiguriert.\n\nBitte versuche es in wenigen Minuten erneut oder kontaktiere den Support.';
        } else if (errorMessage.includes('Environment Variable')) {
          userMessage += '⚙️ Konfigurationsproblem beim Zahlungsanbieter.\n\nBitte kontaktiere den Support mit dem Hinweis "Stripe Environment Variables".';
        } else if (errorMessage.includes('Stripe ist nicht konfiguriert')) {
          userMessage += '🔌 Zahlungssystem ist momentan nicht verfügbar.\n\nBitte versuche es später erneut oder kontaktiere den Support.';
        } else {
          userMessage += errorMessage;
          userMessage += '\n\nFalls das Problem weiterhin besteht, kontaktiere bitte den Support.';
        }

        alert(userMessage);

        // Log details for debugging
        console.error('Error details for debugging:', {
          message: errorMessage,
          error: error,
          userType: effectiveUserType,
          planType: effectiveUserType === 'owner' ? 'premium' : 'professional',
          userId: user.id
        });
      }
    };


    // Verwende den effektiven User-Type für die Anzeige
    const displayUserType = effectiveUserType;

    return (
      <div className="min-h-screen bg-gray-50">

        {/* Hero Section */}
        <div className="bg-white border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                tigube Mitgliedschaften
              </h1>
              <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
                Starte kostenlos oder upgrade für erweiterte Features – Abo über Stripe, jederzeit kündbar
              </p>
            </div>
          </div>
        </div>

        {/* Main Pricing Section */}
        <div className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <PricingGrid
              userType={displayUserType}
              onSelectPlan={handleSelectPlan}
              onUserTypeChange={setSelectedUserType}
              isUserLoggedIn={!!user}
            />
          </div>
        </div>

        {/* Usage Overview (nur für eingeloggte User) */}
        {user && (
          <div className="py-12 bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                  Deine aktuelle Nutzung
                </h2>
                <p className="text-base sm:text-lg text-gray-600 mb-4">
                  Übersicht über deine Limits und Nutzung in diesem Monat
                </p>
              </div>

              {/* Loading State */}
              {(contactLoading || profileLoading) ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  {[1, 2].map((i) => (
                    <div key={i} className="bg-white rounded-lg border p-6 animate-pulse">
                      <div className="h-4 bg-gray-200 rounded mb-4"></div>
                      <div className="h-8 bg-gray-200 rounded mb-2"></div>
                      <div className="h-2 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                  <UsageLimitIndicator
                    featureType="contact_request"
                    currentUsage={contactUsage}
                    showProgress={true}
                  />
                  <UsageLimitIndicator
                    featureType="profile_view"
                    currentUsage={profileUsage}
                    showProgress={true}
                  />
                </div>
              )}
            </div>
          </div>
        )}


        {/* FAQ Section */}
        <div className="py-12 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-8 sm:mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4">
                Häufig gestellte Fragen
              </h2>
            </div>

            <div className="space-y-8">
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Wie buche ich Premium oder Professional?
                </h3>
                <p className="text-gray-600">
                  Wähle auf dieser Seite deinen Plan und schließe das Abo sicher über Stripe ab.
                  Premium und Professional kannst du im Kundenportal jederzeit verwalten oder kündigen.
                </p>
              </div>

              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Kann ich meinen Plan jederzeit ändern?
                </h3>
                <p className="text-gray-600">
                  Ja! Du kannst jederzeit upgraden oder downgraden. Bei einem Upgrade werden die neuen
                  Features sofort freigeschaltet. Bei einem Downgrade gelten die neuen Limits ab dem
                  nächsten Abrechnungszyklus.
                </p>
              </div>



              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Unterscheiden sich die Pläne für Tierhalter und Betreuer?
                </h3>
                <p className="text-gray-600">
                  Ja, beide nutzen das gleiche 2-Plan-System, aber mit unterschiedlichen Namen und Features:
                  Tierhalter erhalten "Premium" (€4,90/Monat) mit unlimited Kontakten und erweiterten Filtern.
                  Betreuer erhalten "Professional" (€12,90/Monat) mit zusätzlichen Business-Features wie
                  Umgebungsbildern und erweiterten Analytics.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Werden meine Limits am Monatsende zurückgesetzt?
                </h3>
                <p className="text-gray-600">
                  Ja, alle monatlichen Limits werden am ersten Tag des neuen Monats automatisch zurückgesetzt.
                  Du startest also jeden Monat mit vollen Kontingenten.
                </p>
              </div>
            </div>
          </div>
        </div>

      </div>
    );
  } catch (error) {
    console.error('❌ PricingPage component failed to render:', error);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-xl text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Fehler beim Laden der Preisübersicht
          </h2>
          <p className="text-gray-600 mb-6">
            Es ist ein Problem beim Laden der Preisübersicht aufgetreten. Bitte versuche es später erneut.
          </p>
          <Button onClick={() => window.location.reload()}>
            Erneut versuchen
          </Button>
        </div>
      </div>
    );
  }
} 