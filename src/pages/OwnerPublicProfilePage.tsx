import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import { useAuth } from '../lib/auth/AuthContext';
import { useSubscription } from '../lib/auth/useSubscription';
import { getOrCreateConversation } from '../lib/supabase/chatService';
import { applyToOwnerJobViaChat } from '../lib/supabase/ownerJobApply';
import { ownerPublicService } from '../lib/supabase/ownerPublicService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import AdvertisementBanner from '../components/ui/AdvertisementBanner';
import OwnerJobCard from '../components/owner/OwnerJobCard';
import type { PublicOwnerJob, PublicOwnerProfile } from '../lib/supabase/types';
import { isCaretakerLikeUserType } from '../lib/utils';
import {
  PawPrint,
  ArrowLeft,
  Lock,
  AlertTriangle,
  User,
  MessageCircle,
  Briefcase,
  Heart
} from 'lucide-react';
import Button from '../components/ui/Button';
import ToastContainer from '../components/ui/ToastContainer';
import { useToast } from '../hooks/useToast';

// Hilfsfunktion für Namensformatierung "Vorname N."
const formatOwnerName = (firstName: string | null, lastName: string | null): string => {
  if (!firstName && !lastName) return 'Tierhalter';
  if (!lastName) return firstName || 'Tierhalter';
  return `${firstName || ''} ${lastName.charAt(0)}.`;
};

function OwnerPublicProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, userProfile } = useAuth();
  const { subscription } = useFeatureAccess();
  const { isPremiumUser, hasFeature } = useSubscription();
  const { toasts, showError, removeToast } = useToast();

  const [profile, setProfile] = useState<PublicOwnerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unauthorized, setUnauthorized] = useState(false);
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId || !user) {
        setError('Benutzer nicht gefunden');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      setUnauthorized(false);

      try {
        const { data, error: profileError } = await ownerPublicService.getPublicOwnerProfile(userId, user.id);

        if (profileError) {
          if (profileError === 'UNAUTHORIZED') {
            setUnauthorized(true);
          } else {
            setError(profileError);
          }
          setProfile(null);
        } else if (data) {
          setProfile(data);
        } else {
          setError('Profil nicht gefunden');
        }
      } catch (e) {
        console.error('Exception beim Laden des Profils:', e);
        setError('Unbekannter Fehler beim Laden des Profils');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
    // `user?.id` statt `user`: gleiche Session, neue Objektreferenz würde sonst den Effect erneut triggern
    // und nach erfolgreichem ersten Load fälschlich den 30s-Cooldown auslösen.
  }, [userId, user?.id]);

  // SEO-Optimierung: Meta-Tags dynamisch setzen
  useEffect(() => {
    if (profile) {
      const fullName = formatOwnerName(profile.first_name, profile.last_name);
      const petNames = profile.pets?.map(pet => pet.name).join(', ') || '';
      const description = `Tierhalter-Profil von ${fullName}${petNames ? ` mit ${petNames}` : ''} auf tigube - Professionelle Tierbetreuung finden`;

      // Dynamische Meta-Tags setzen
      document.title = `${fullName} - Tierhalter-Profil | tigube`;

      // Meta Description
      let metaDescription = document.querySelector('meta[name="description"]');
      if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.setAttribute('name', 'description');
        document.head.appendChild(metaDescription);
      }
      metaDescription.setAttribute('content', description);

      // Open Graph Tags für Social Media
      const setMetaProperty = (property: string, content: string) => {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      setMetaProperty('og:title', `${fullName} - Tierhalter-Profil | tigube`);
      setMetaProperty('og:description', description);
      setMetaProperty('og:type', 'profile');
      setMetaProperty('og:url', window.location.href);
      if (profile.profile_photo_url) {
        setMetaProperty('og:image', profile.profile_photo_url);
      }

      // Twitter Card Tags
      const setMetaName = (name: string, content: string) => {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      };

      setMetaName('twitter:card', 'summary');
      setMetaName('twitter:title', `${fullName} - Tierhalter-Profil | tigube`);
      setMetaName('twitter:description', description);
      if (profile.profile_photo_url) {
        setMetaName('twitter:image', profile.profile_photo_url);
      }
    }

    // Cleanup: Standard-Meta-Tags bei Component Unmount
    return () => {
      document.title = 'tigube - Professionelle Tierbetreuung finden';

      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 'tigube - Die Plattform für professionelle Tierbetreuung. Finden Sie vertrauensvolle Betreuer für Ihre Haustiere.');
      }
    };
  }, [profile]);

  // Loading State
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  // Unauthorized Access
  if (unauthorized) {
    return (
      <div className="bg-gray-50 min-h-screen">
        <div className="container-custom py-16 px-4 flex items-center justify-center">
          <div className="text-center max-w-md">
          <div className="relative mb-8">
            <PawPrint className="mx-auto h-24 w-24 text-gray-300" />
            <Lock className="absolute -top-2 -right-2 h-12 w-12 text-primary-500 bg-white rounded-full p-2 shadow-lg" />
          </div>

          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            🔒 Pssst... das ist privat!
          </h1>

          <p className="text-lg text-gray-600 mb-6 leading-relaxed">
            Du bist nicht berechtigt, dieses Profil zu sehen.
            Nur Betreuer, die bereits von diesem Tierhalter kontaktiert wurden, haben Zugriff! 🐕
          </p>

          <div className="bg-primary-50 rounded-lg p-6 mb-8 text-left">
            <div className="flex items-start">
              <Heart className="h-6 w-6 text-primary-600 mt-1 mr-3 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-primary-800 mb-2">
                  Wie bekomme ich Zugriff?
                </h3>
                <ul className="text-sm text-primary-700 space-y-1">
                  <li>• Warte darauf, dass der Tierhalter dich kontaktiert</li>
                  <li>• Profile sind nur für bestehende Chat-Partner sichtbar</li>
                  <li>• Erstelle ein attraktives Betreuer-Profil, damit Besitzer dich finden</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">
              Noch kein Betreuer? Werde Teil unserer Community!
            </p>
            <Button
              onClick={() => navigate('/registrieren?type=caretaker')}
              variant="outline"
              className="flex items-center justify-center gap-2 mx-auto"
            >
              <Heart className="h-4 w-4" />
              Betreuer werden
            </Button>
          </div>
        </div>
        </div>
      </div>
    );
  }

  // Error State
  if (error) {
    const notPublic = error.includes('nicht öffentlich') || error.includes('keine Freigabe');
    return (
      <div className="container-custom py-16 text-center px-4">
        <AlertTriangle className="mx-auto h-16 w-16 text-red-400 mb-4" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {notPublic ? 'Profil nicht verfügbar' : 'Oops! Etwas ist schief gelaufen'}
        </h2>
        <p className="text-gray-600 mb-6">{error}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => window.location.reload()}>
            Erneut versuchen
          </Button>
          <Button
            variant="secondary"
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
            onClick={() => navigate('/suche')}
          >
            <ArrowLeft className="h-4 w-4" />
            Zurück zur Suche
          </Button>
        </div>
      </div>
    );
  }

  // Main Profile Content
  if (!profile) {
    return (
      <div className="container-custom py-16 text-center">
        <p className="text-gray-600">Profil nicht gefunden</p>
        <Button variant="primary" className="mt-4" onClick={() => navigate('/suche')}>
          Zurück zur Suche
        </Button>
      </div>
    );
  }

  const fullName = formatOwnerName(profile.first_name, profile.last_name);
  const avatarUrl = profile.share_settings?.profilePhoto && profile.profile_photo_url
    ? profile.profile_photo_url
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=f3f4f6&color=374151`;

  const handleApplyToJob = async (job: PublicOwnerJob) => {
    if (!user || !userId) return;
    setApplyingJobId(job.id);
    try {
      const result = await applyToOwnerJobViaChat({
        ownerId: userId,
        caretakerId: user.id,
        jobId: job.id,
        jobTitle: job.title
      });
      if ('error' in result) {
        console.error(result.error);
        return;
      }
      navigate(`/nachrichten/${result.conversationId}`);
    } finally {
      setApplyingJobId(null);
    }
  };

  const handleSendMessage = async () => {
    if (!user) {
      navigate(`/anmelden?redirect=${encodeURIComponent(`/owner/${userId}`)}`);
      return;
    }

    if (!userId) return;

    setIsContactLoading(true);
    try {
      const { data: conversation, error: convError } = await getOrCreateConversation({
        owner_id: userId,
        caretaker_id: user.id
      });

      if (convError || !conversation) {
        console.error('Fehler beim Öffnen der Konversation:', convError);
        showError(
          'Nachricht konnte nicht gestartet werden',
          convError || 'Bitte versuche es erneut.'
        );
        return;
      }

      navigate(`/nachrichten/${conversation.id}`);
    } finally {
      setIsContactLoading(false);
    }
  };

  const heroAboutSnippet = profile.short_intro?.trim()
    ? profile.short_intro.trim()
    : profile.about_me
      ? profile.about_me.length > 280
        ? `${profile.about_me.slice(0, 280).trim()}…`
        : profile.about_me
      : '';

  const bannerTargeting = {
    petTypes: userProfile?.pet_types || [],
    location: userProfile?.location || '',
    subscriptionType: subscription?.plan_type || 'free'
  };

  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Hero — analog BetreuerProfilePage */}
      <div className="bg-white shadow-sm">
        <div className="container-custom py-5 sm:py-8">
          <div className="flex flex-col md:flex-row items-start gap-5 sm:gap-8">
            <div className="md:w-1/4 lg:w-1/5 w-full max-w-[160px] sm:max-w-[200px] mx-auto md:mx-0 shrink-0">
              <div className="relative rounded-xl overflow-hidden shadow-md">
                <img
                  src={avatarUrl}
                  alt={fullName}
                  className="w-full aspect-square object-cover"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=f3f4f6&color=374151`;
                  }}
                />
              </div>
            </div>

            <div className="flex-1 w-full min-w-0 text-center md:text-left">
              <div className="flex items-start justify-center md:justify-start mb-3 sm:mb-4 gap-3 sm:gap-4">
                <div className="min-w-0">
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-2 break-words">{fullName}</h1>
                </div>
              </div>

              {profile.pets && profile.pets.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-5 sm:mb-6 justify-center md:justify-start">
                  {profile.pets.map((pet) => (
                    <span
                      key={pet.id}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800"
                    >
                      <PawPrint className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                      {pet.name} ({pet.type})
                    </span>
                  ))}
                </div>
              )}

              {heroAboutSnippet ? (
                <p className="text-gray-700 mb-5 sm:mb-6 text-sm sm:text-base whitespace-pre-wrap break-words w-full lg:w-3/5">
                  {heroAboutSnippet}
                </p>
              ) : (
                <p className="text-gray-500 mb-5 sm:mb-6 text-sm sm:text-base italic w-full lg:w-3/5">
                  Noch keine Kurzvorstellung hinterlegt.
                </p>
              )}

              <div className="flex flex-col sm:flex-row gap-3 flex-wrap w-full sm:w-auto items-stretch sm:items-start justify-center md:justify-start">
                <Button
                  variant="outline"
                  size="lg"
                  leftIcon={<MessageCircle className="h-4 w-4" />}
                  onClick={handleSendMessage}
                  isLoading={isContactLoading}
                  disabled={isContactLoading}
                  className="w-full sm:w-auto justify-center"
                >
                  Nachricht senden
                </Button>
                {user && userId === user.id && userProfile?.user_type === 'owner' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<ArrowLeft className="h-3 w-3" />}
                    onClick={() => navigate('/dashboard-owner')}
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-100 w-full sm:w-auto justify-center"
                  >
                    Dashboard
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container-custom py-4">
        <AdvertisementBanner placement="profile_top" targetingOptions={bannerTargeting} />
      </div>

      <div className="container-custom py-6 sm:py-10 lg:py-12">
        <div className="grid lg:grid-cols-3 gap-5 sm:gap-8">
          <div className="lg:col-span-2 space-y-5 sm:space-y-8 min-w-0">
        {/* Über mich — immer als Karte (Hauptbereich unter Banner, linke Spalte) */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5 text-primary-600 shrink-0" />
            Über mich
          </h2>
          {profile.about_me ? (
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{profile.about_me}</p>
          ) : (
            <p className="text-gray-500 text-sm italic">
              Hier ist noch kein Text hinterlegt oder die Anzeige ist in den Einstellungen deaktiviert.
            </p>
          )}
        </div>

        {/* Meine Tiere — immer als Karte */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <PawPrint className="h-5 w-5 text-primary-600 shrink-0" />
            Meine Tiere
          </h2>
          {profile.pets && profile.pets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              {profile.pets.map((pet) => (
                <div key={pet.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                  {pet.photo_url ? (
                    <img
                      src={pet.photo_url}
                      alt={pet.name}
                      className="w-20 h-20 rounded-xl object-cover border-2 border-primary-100"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) {
                          fallback.style.display = 'flex';
                        }
                      }}
                    />
                  ) : null}
                  <div
                    className="w-20 h-20 rounded-xl bg-gray-100 border-2 border-primary-100 flex items-center justify-center text-gray-400 text-2xl font-bold"
                    style={{ display: pet.photo_url ? 'none' : 'flex' }}
                  >
                    {pet.name ? pet.name.charAt(0) : <PawPrint className="h-8 w-8" />}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-base sm:text-lg break-words">{pet.name}</div>
                    <div className="text-gray-600 text-sm">
                      {pet.type}
                      {pet.breed && ` • ${pet.breed}`}
                    </div>
                    {pet.age && (
                      <div className="text-gray-500 text-sm">Alter: {pet.age} Jahre</div>
                    )}
                    {pet.gender && (
                      <div className="text-gray-500 text-sm">
                        Geschlecht: {pet.gender === 'Rüde' ? 'Rüde' : pet.gender === 'Hündin' ? 'Hündin' : pet.gender}
                        {pet.neutered && ' (kastriert)'}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm italic">
              Keine Tiere auf diesem Profil sichtbar — es sind noch keine eingetragen oder die Anzeige ist in den
              Einstellungen deaktiviert.
            </p>
          )}
        </div>

        {/* Offene Gesuche */}
        <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-primary-600 shrink-0" />
            Gesuche
          </h2>
          {profile.jobs && profile.jobs.length > 0 ? (
            <div className="space-y-4">
              {profile.jobs.map((job) => {
                const isOwnProfile = user?.id === userId;
                const canApply =
                  !!user &&
                  !isOwnProfile &&
                  isCaretakerLikeUserType(userProfile?.user_type) &&
                  isPremiumUser &&
                  hasFeature('apply_owner_jobs');
                let hint: string | undefined;
                if (!isOwnProfile && user && !isCaretakerLikeUserType(userProfile?.user_type)) {
                  hint = 'Nur für Betreuer und Dienstleister.';
                } else if (!isOwnProfile && user && (!isPremiumUser || !hasFeature('apply_owner_jobs'))) {
                  hint = 'Mit Premium kannst du dich per Chat bewerben.';
                }
                return (
                  <OwnerJobCard
                    key={job.id}
                    job={job}
                    canApply={canApply}
                    onApply={() => void handleApplyToJob(job)}
                    applying={applyingJobId === job.id}
                    applyBlockedHint={!canApply && !isOwnProfile && user ? hint : undefined}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-gray-600 text-sm leading-relaxed">
              Aktuell keine offenen Gesuche von diesem Tierhalter.
            </p>
          )}
          <Link
            to="/gesuche"
            className="inline-block mt-4 text-sm text-primary-600 hover:underline font-medium"
          >
            Alle Tierhalter-Gesuche
          </Link>
        </div>
          </div>

          {/* Sidebar — analog BetreuerProfil */}
          <div className="space-y-5 sm:space-y-6 min-w-0">
            <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary-600 shrink-0" />
                Kontakt
              </h2>
              <p className="text-sm text-gray-600 leading-relaxed">
                Telefon, E-Mail und Adresse werden auf diesem Profil nicht angezeigt. Bitte nutze{' '}
                <strong>Nachricht senden</strong>, um mit dem Tierhalter zu schreiben.
              </p>
            </div>

            <AdvertisementBanner placement="profile_sidebar" targetingOptions={bannerTargeting} />
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}

export default OwnerPublicProfilePage; 