import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Clock, Heart, Users, PawPrint, CheckCircle, X, ChevronDown, UserCheck, Shield } from 'lucide-react';
import Button from '../components/ui/Button';
import { useAuth } from '../lib/auth/AuthContext';

export default function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, userProfile, loading: authLoading } = useAuth();
  const [showMessage, setShowMessage] = useState(!!location.state?.message);

  // Redirect eingeloggte Benutzer zum Dashboard
  useEffect(() => {
    // Wenn ein Passwort-Reset-Link aufgerufen wurde, leite zur Reset-Seite weiter
    // und verhindere den Login-Redirect
    if (window.location.hash.includes('type=recovery') || window.location.search.includes('type=recovery')) {
      navigate('/reset-password' + window.location.hash, { replace: true });
      return;
    }

    if (isAuthenticated && !authLoading && userProfile) {
      const userType = userProfile.user_type;
      const dashboardPath = (userType === 'caretaker' || userType === 'dienstleister' ||
        userType === 'tierarzt' || userType === 'hundetrainer' ||
        userType === 'tierfriseur' || userType === 'physiotherapeut' ||
        userType === 'ernaehrungsberater' || userType === 'tierfotograf' ||
        userType === 'sonstige')
        ? '/dashboard-caretaker'
        : '/dashboard-owner';

      console.log('🏠 HomePage redirect - userType:', userType, 'dashboardPath:', dashboardPath);
      navigate(dashboardPath, { replace: true });
    }
  }, [isAuthenticated, authLoading, userProfile, navigate]);



  return (
    <div className="flex flex-col min-h-screen">
      {/* Success Message */}
      {showMessage && location.state?.message && (
        <div className="bg-green-50 border border-green-200 px-4 py-3 relative">
          <div className="flex items-center justify-between container-custom">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800">{location.state.message}</span>
            </div>
            <button
              onClick={() => setShowMessage(false)}
              className="text-green-600 hover:text-green-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Mitgliedschaft-Hinweis */}
      <div className="bg-primary-600 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4 text-center text-sm sm:text-base">
          <span>Suche und Registrierung kostenlos</span>
          <span className="hidden sm:inline mx-2 opacity-70">·</span>
          <span className="block sm:inline mt-1 sm:mt-0">
            Premium ab 4,90 €/Monat –{' '}
            <Link to="/mitgliedschaften" className="font-semibold underline underline-offset-2 hover:text-primary-100">
              Mitgliedschaften
            </Link>
          </span>
        </div>
      </div>

      {/* Hero */}
      <section className="relative bg-white overflow-hidden">
        <div className="container-custom py-16 lg:py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">

            {/* Left — Text */}
            <div className="max-w-xl">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-[4.25rem] font-extrabold text-gray-900 leading-[1.08] tracking-tight mb-6">
                Tierbetreuung,{' '}
                <br className="hidden sm:block" />
                die{' '}
                <span className="text-primary-600">verbindet.</span>
              </h1>

              <p className="text-lg md:text-xl text-gray-500 leading-relaxed mb-10 max-w-lg">
                tigube bringt Tierhalter:innen und Betreuungspersonen zusammen –
                ehrlich, verlässlich und auf Augenhöhe.
              </p>

              <div className="flex flex-wrap items-center gap-4">
                <Link to="/fuer-tierhalter">
                  <Button
                    variant="primary"
                    size="lg"
                    className="!rounded-full px-8 py-3.5 text-base font-semibold shadow-lg shadow-primary-600/20 hover:shadow-xl hover:shadow-primary-600/30 transition-all"
                  >
                    Ich bin Tierhalter:in
                  </Button>
                </Link>
                <Link to="/fuer-betreuungspersonen">
                  <Button
                    variant="outline"
                    size="lg"
                    className="!rounded-full px-8 py-3.5 text-base font-semibold"
                  >
                    Ich möchte betreuen
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right — Image Card */}
            <div className="relative hidden md:block">
              {/* Green organic shape */}
              <div className="absolute -top-6 right-0 -bottom-6 left-12 bg-primary-50 rounded-[2rem] rotate-2 -z-10" />

              <div className="relative rounded-2xl overflow-hidden shadow-2xl">
                <img
                  src="https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg?auto=compress&cs=tinysrgb&w=800"
                  alt="Glücklicher Hund bei der Betreuung"
                  className="w-full h-[480px] lg:h-[540px] object-cover"
                  loading="eager"
                />

                {/* Badge: Betreuer in der Nähe */}
                <div className="absolute top-4 right-4 bg-white/95 backdrop-blur-sm rounded-full pl-3 pr-4 py-2 shadow-lg flex items-center gap-2.5">
                  <div className="flex -space-x-1.5">
                    <span className="w-7 h-7 rounded-full bg-primary-200 border-2 border-white flex items-center justify-center">
                      <PawPrint className="w-3.5 h-3.5 text-primary-700" />
                    </span>
                    <span className="w-7 h-7 rounded-full bg-amber-200 border-2 border-white flex items-center justify-center">
                      <Heart className="w-3.5 h-3.5 text-amber-700" />
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-gray-700">+15 Betreuer in der Nähe</span>
                </div>

                {/* Badge: Premium Betreuung */}
                <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-xl px-5 py-3.5 shadow-lg flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Shield className="w-5 h-5 text-primary-600" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Premium Betreuung</p>
                    <p className="text-gray-500 text-xs">Sicher · Liebevoll · Transparent</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">So funktioniert tigube?</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Für Tierhalter:innen */}
            <div className="bg-white rounded-xl p-8 shadow-md">
              <h3 className="text-2xl font-bold mb-6 text-gray-900">Für Tierhalter:innen</h3>
              <p className="text-gray-700 mb-6">
                Finde zuverlässige Betreuung für dein Tier – einfach, sicher und transparent.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Einfach & kostenlos registrieren</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Betreuungspersonen nach Ort, Tierart & Verfügbarkeit filtern</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Alle Betreuer:innen geprüft & gebrieft</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Transparente Profile</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Ideal für Berufstätige, Urlaube, Notfälle oder den Alltag</p>
                  </div>
                </li>
              </ul>
            </div>

            {/* Für Betreuungspersonen */}
            <div className="bg-white rounded-xl p-8 shadow-md">
              <h3 className="text-2xl font-bold mb-6 text-gray-900">Für Betreuungspersonen</h3>
              <p className="text-gray-700 mb-6">
                Werde Teil unserer Community und biete deine Tierbetreuung an.
              </p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Sichtbar werden für lokale Tierhalter</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Eigene Betreuung anbieten & Profil gestalten</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Kostenlos starten – mit professioneller Unterstützung</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Verlässliches Matching & direkte Anfragen</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Teil einer wachsenden Community</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Warum tigube? */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="text-center mb-10 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Warum tigube?</h2>
            <p className="text-base sm:text-lg text-gray-600 max-w-2xl mx-auto">
              Vertrauen, Erfahrung und Leidenschaft für Tiere
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<UserCheck className="w-8 h-8" />}
              title="Geprüfte Betreuungspersonen"
              description="Alle Tierbetreuer:innen werden vor Freischaltung sorgfältig ausgewählt, geprüft und geschult"
            />
            <FeatureCard
              icon={<PawPrint className="w-8 h-8" />}
              title="Für alle Tiere"
              description="Ob Hund, Katze oder Meerschweinchen – bei tigube findest du passende Unterstützung"
            />
            <FeatureCard
              icon={<Clock className="w-8 h-8" />}
              title="Alltag & Notfall"
              description="Ob regelmäßig oder spontan – wir bringen euch zuverlässig zusammen"
            />
            <FeatureCard
              icon={<Heart className="w-8 h-8" />}
              title="Erfahrung aus der Praxis"
              description="tigube wurde von echten Tierprofis entwickelt – mit Herz, Verstand und jahrzehntelanger Erfahrung"
            />
          </div>
        </div>
      </section>

      {/* Von Tiermenschen für Tiermenschen */}
      <section className="py-16 bg-gray-50">
        <div className="container-custom">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Von Tiermenschen für Tiermenschen</h2>
          </div>

          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8 lg:p-12">
              {/* Bilder Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mb-12">
                <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                  <img
                    src="/Image/tigube_Gabriel_Haaga.jpg"
                    alt="Gabriel Haaga"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                  <img
                    src="/Image/tigube_Tamara_Pfaff.jpg"
                    alt="Tamara Pfaff"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="relative aspect-square rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
                  <img
                    src="/Image/Boxer_Hund_Luna.jpg"
                    alt="Luna - Boxer Hund"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Text */}
              <div className="max-w-3xl mx-auto">
                <p className="text-gray-700 mb-4 text-lg leading-relaxed">
                  Mara und Gabriel haben tigube gegründet, denn sie wissen aus erster Hand, wie schwer es sein kann, gute Betreuung für geliebte Vierbeiner zu finden.
                </p>
                <p className="text-gray-700 mb-4 text-lg leading-relaxed">
                  Aus ihrer langjährigen Arbeit in der eigenen Hundepension und Katzenbetreuung entstand der Wunsch, eine digitale Lösung zu schaffen – zuverlässig, menschlich und professionell.
                </p>
                <p className="text-gray-700 text-lg leading-relaxed">
                  Mit über einem Dutzend Aus- und Weiterbildungen (u. a. Hundetraining, Problemhundeberatung, Tierernährung, Sachkundenachweise, Tierschutzgesetz, …) bringen sie nicht nur Fachwissen, sondern echte Leidenschaft mit.
                </p>
              </div>
            </div>
            <div className="bg-primary-50 px-8 lg:px-12 py-6">
              <p className="text-center text-gray-700 italic">
                tigube ist das Ergebnis dieser Vision: eine Plattform, die Vertrauen schafft – und Tierliebe mit Alltag vereinbar macht.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Häufige Fragen */}
      <section className="py-16 bg-white">
        <div className="container-custom">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold mb-3 sm:mb-4">Häufige Fragen</h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-6">
            <FAQItem
              question="Welche Tiere kann ich betreuen lassen?"
              answer="tigube vermittelt Betreuung für Hunde, Katzen und andere Kleintiere."
            />
            <FAQItem
              question="Wie finde ich jemanden in meiner Nähe?"
              answer="Mit deiner Postleitzahl und Filtern zur Tierart und Verfügbarkeit findest du passende Betreuung in deiner Umgebung."
            />
            <FAQItem
              question="Wie wird sichergestellt, dass die Sitter:innen geeignet sind?"
              answer="Alle Betreuungspersonen durchlaufen einen strukturierten Check und ein Onboarding durch das tigube-Team."
            />
            <FAQItem
              question="Kann ich selbst Tierbetreuung anbieten?"
              answer="Ja! Registriere dich als Dienstleister und erstelle dein Profil."
            />
          </div>
          <div className="text-center mt-6">
            <Link to="/faq" className="text-primary-600 hover:text-primary-700 font-medium">
              Alle Fragen ansehen →
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-primary-50">
        <div className="container-custom">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-5">
              <div className="lg:col-span-3 p-8 md:p-12 flex flex-col items-center lg:items-start text-center lg:text-left">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-3xl font-bold">Bereit für mehr (Planungs-) Sicherheit im Alltag – für dich und dein Tier?</h2>
                </div>
                <p className="text-gray-600 mb-8 max-w-xl">
                  tigube bringt zusammen, was zusammengehört.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button
                    variant="primary"
                    size="lg"
                    onClick={() => navigate('/registrieren')}
                  >
                    🐾 Kostenlos starten
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => navigate('/registrieren?type=caretaker')}
                  >
                    Als Betreuer starten
                  </Button>
                </div>
                <p className="text-sm text-gray-500 mt-4">
                  Kostenlose Registrierung • Keine versteckten Gebühren • Jederzeit kündbar
                </p>
              </div>
              <div className="lg:col-span-2 relative hidden lg:block">
                <img
                  src="https://images.pexels.com/photos/2123773/pexels-photo-2123773.jpeg?auto=compress&cs=tinysrgb"
                  alt="Happy dog with caretaker"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div className="text-center p-6">
      <div className="rounded-full bg-primary-50 p-4 inline-flex mb-4 text-primary-600">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3 text-gray-900">{title}</h3>
      <p className="text-gray-600">{description}</p>
    </div>
  );
}

interface FAQItemProps {
  question: string;
  answer: string;
}

function FAQItem({ question, answer }: FAQItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-semibold text-gray-900">{question}</span>
        <ChevronDown
          className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? 'transform rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-gray-50">
          <p className="text-gray-700">{answer}</p>
        </div>
      )}
    </div>
  );
}
