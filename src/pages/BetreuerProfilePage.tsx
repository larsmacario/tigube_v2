import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { MapPin, Star, Clock, Shield, Calendar, MessageCircle, Heart, HeartOff, ArrowLeft, Verified, ChevronRight, CheckCircle, Edit3, Briefcase, Globe, Moon, User, Award, Image, GraduationCap, Info } from 'lucide-react';
import AdvertisementBanner from '../components/ui/AdvertisementBanner';
import { DE, GB, FR, ES, IT, PT, NL, RU, PL, TR, AE } from 'country-flag-icons/react/3x2';
import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AvailabilityDisplay from '../components/ui/AvailabilityDisplay';
import { ReviewForm } from '../components/ui/ReviewForm';
import { caretakerSearchService, ownerCaretakerService, caretakerPartnerService } from '../lib/supabase/db';

import { formatCurrency } from '../lib/utils';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase/client';
import { useAuth } from '../lib/auth/AuthContext';
import { getOrCreateConversation } from '../lib/supabase/chatService';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import { useShortTermAvailability } from '../contexts/ShortTermAvailabilityContext';

import HomePhotosSection from '../components/ui/HomePhotosSection';
import ResponseTimeDisplay from '../components/ui/ResponseTimeDisplay';
import ToastContainer from '../components/ui/ToastContainer';
import { useToast } from '../hooks/useToast';
import { getCaretakerResponseTime, calculateCaretakerResponseTime } from '../lib/supabase/responseTimeService';
import type { TravelCostConfig } from '../lib/types/service-categories';
import {
  formatTravelCostGerman,
  getCheapestPricedService,
  parseEffectivePriceType,
  parseServicesWithCategoriesJson,
  priceDisplayTitleForType,
  priceTypeSuffixGerman,
  resolveTravelCostConfig,
} from '../lib/pricing/servicePricing';

interface Caretaker {
  id: string | null;
  userId?: string; // users.id des Betreuers für Chat/Conversations
  name: string;
  avatar: string;
  location: string;
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  prices?: Record<string, number | string>; // Service-spezifische Preise
  services: any[]; // Json[] von Supabase - kann string[] oder andere Typen enthalten
  bio: string;
  responseTime: string;
  verified: boolean;
  isCommercial?: boolean;
  experienceYears?: number;
  fullBio?: string;
  qualifications: string[];
  languages?: string[]; // Sprachen die der Betreuer spricht
  experience_description?: string; // Beschreibung aus dem Qualifikationen-Bereich
  availability?: any;
  phone?: string | null;
  email?: string | null;
  home_photos?: string[]; // Umgebungsbilder aus dem caretaker-home-photos Bucket
  short_term_available?: boolean;
  overnight_availability?: Record<string, boolean>; // Übernachtungs-Verfügbarkeit pro Wochentag
  short_about_me?: string; // Kurze Beschreibung für die Profilseite
  servicesWithCategories?: any[];
  travelCostConfig?: TravelCostConfig | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string | null;
  user_id: string | null;
  caretaker_response?: string | null;
  caretaker_response_created_at?: string | null;
  users?: {
    first_name: string | null;
    last_name: string | null;
  } | null;
}

function BetreuerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, user, userProfile } = useAuth();
  const { checkFeature, canSendContactRequest, trackUsage, subscription } = useFeatureAccess();
  const { toasts, showError, removeToast } = useToast();

  const { shortTermAvailable } = useShortTermAvailability();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
  const [isPartner, setIsPartner] = useState(false);
  const [isPartnerLoading, setIsPartnerLoading] = useState(false);
  const [caretaker, setCaretaker] = useState<Caretaker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [isContactLoading, setIsContactLoading] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [responseTime, setResponseTime] = useState<string | null>(null);
  const [responseTimeLoading, setResponseTimeLoading] = useState(false);
  const [responseTimeData, setResponseTimeData] = useState<{ text: string; messageCount: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCaretaker = async () => {
      if (!id) {
        setError('Keine Betreuer-ID angegeben');
        setLoading(false);
        return;
      }


      setLoading(true);
      setError(null);

      try {
        // Use the getCaretakerById function from db.ts
        // Übergebe user.id als viewerId, damit das eigene Profil auch ohne Freigabe geladen wird
        const { data, error: fetchError } = await caretakerSearchService.getCaretakerById(id, user?.id);

        if (cancelled) return;

        console.log('🔍 Fetch result:', { data, error: fetchError });

        if (fetchError) {
          console.error('❌ Fetch error:', fetchError);
          // Prüfe ob es das eigene Profil ist
          if (user && id === user.id) {
            setError('Dein Profil konnte nicht geladen werden. Bitte versuche es später erneut.');
          } else if (fetchError.message?.includes('not found') || fetchError.message?.includes('No rows returned')) {
            setError('Dieses Betreuer-Profil ist nicht verfügbar oder noch nicht freigegeben');
          } else {
            setError('Fehler beim Laden des Betreuer-Profils');
          }
          setCaretaker(null);
        } else if (!data) {
          console.error('❌ No data returned');
          // Prüfe ob es das eigene Profil ist
          if (user && id === user.id) {
            setError('Dein Profil konnte nicht geladen werden. Bitte versuche es später erneut.');
          } else {
            setError('Betreuer nicht gefunden oder noch nicht freigegeben');
          }
          setCaretaker(null);
        } else {
          console.log('✅ Caretaker data loaded successfully:', data);
          // Override short_term_available with context value if this is the current user's profile
          const updatedData = {
            ...data,
            short_term_available: user && data.userId === user.id ? shortTermAvailable : data.short_term_available
          };
          if (!cancelled) {
            setCaretaker(updatedData);
          }

          // Profile loaded
        }
      } catch (err) {
        console.error('Error fetching caretaker:', err);
        if (!cancelled) {
          setError('Unerwarteter Fehler beim Laden des Profils');
          setCaretaker(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCaretaker();
    return () => {
      cancelled = true;
    };
  }, [id, user?.id]);

  // Update caretaker's short_term_available when context changes
  useEffect(() => {
    if (caretaker && user && caretaker.userId === user.id) {
      setCaretaker(prev => prev ? {
        ...prev,
        short_term_available: shortTermAvailable
      } : null);
    }
  }, [shortTermAvailable, caretaker?.userId, user?.id]);

  // Lade Favoriten-Status wenn User eingeloggt ist
  useEffect(() => {
    const fetchFavoriteStatus = async () => {
      if (!user || !id) return;

      try {
        const { isFavorite: favoriteStatus } = await ownerCaretakerService.isFavorite(user.id, id);
        setIsFavorite(favoriteStatus);
      } catch (error) {
        console.error('Error fetching favorite status:', error);
      }
    };

    fetchFavoriteStatus();
  }, [user, id]);

  // Lade Partner-Status wenn User eingeloggt ist und ein Dienstleister/Betreuer ist
  useEffect(() => {
    const fetchPartnerStatus = async () => {
      if (!user || !id || !userProfile) return;

      // Nur für Dienstleister/Betreuer anzeigen
      const isCaretakerUser = userProfile.user_type === 'caretaker' ||
        (userProfile.user_type && ['hundetrainer', 'tierarzt', 'tierfriseur', 'physiotherapeut', 'ernaehrungsberater', 'tierfotograf', 'sonstige'].includes(userProfile.user_type));

      if (!isCaretakerUser) return;

      try {
        const { isPartner: partnerStatus } = await caretakerPartnerService.isPartner(user.id, id);
        setIsPartner(partnerStatus);
      } catch (error) {
        console.error('Error fetching partner status:', error);
      }
    };

    fetchPartnerStatus();
  }, [user, id, userProfile]);

  // Bewertungen von echter DB laden
  useEffect(() => {
    const fetchReviews = async () => {
      if (!id) return;

      setReviewsLoading(true);
      try {
        const { data, error } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            user_id,
            caretaker_response,
            caretaker_response_created_at,
            users(first_name, last_name)
          `)
          .eq('caretaker_id', id)
          .order('created_at', { ascending: false });

        if (!error && data) {
          setReviews(data);

          // Aktualisiere auch die Bewertungsdaten im Caretaker-Objekt
          if (caretaker) {
            const averageRating = data.length > 0
              ? data.reduce((sum, review) => sum + review.rating, 0) / data.length
              : 0;

            setCaretaker(prev => prev ? {
              ...prev,
              rating: averageRating,
              reviewCount: data.length
            } : null);
          }
        }
      } catch (err) {
        console.error('Error fetching reviews:', err);
      } finally {
        setReviewsLoading(false);
      }
    };

    fetchReviews();
  }, [id]);

  // Lade Antwortzeit des Caretakers
  useEffect(() => {
    const fetchResponseTime = async () => {
      if (!id) return;

      setResponseTimeLoading(true);
      try {
        const responseTimeData = await calculateCaretakerResponseTime(id);
        if (responseTimeData) {
          setResponseTime(responseTimeData.responseTimeText);
          setResponseTimeData({
            text: responseTimeData.responseTimeText,
            messageCount: responseTimeData.messageCount
          });
        } else {
          setResponseTime(null);
          setResponseTimeData(null);
        }
      } catch (error) {
        console.error('Error fetching response time:', error);
        setResponseTime(null);
        setResponseTimeData(null);
      } finally {
        setResponseTimeLoading(false);
      }
    };

    fetchResponseTime();
  }, [id]);

  // Funktion zum Abkürzen des Nachnamens
  const formatCaretakerName = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length <= 1) return name;

    const firstName = parts[0];
    const lastName = parts[parts.length - 1];

    if (lastName && lastName.length > 0) {
      return `${firstName} ${lastName.charAt(0)}.`;
    }

    return name;
  };

  // Kontakt-Button Handler mit Feature Gate
  const handleContactClick = async () => {
    if (!user) {
      // Nicht eingeloggte Benutzer zur Anmeldung weiterleiten
      navigate('/anmelden?redirect=' + encodeURIComponent(`/betreuer/${id}`));
      return;
    }

    if (!caretaker?.userId) {
      console.error('Caretaker userId fehlt');
      showError(
        'Chat nicht möglich',
        'Die Betreuer-Daten sind unvollständig. Bitte versuche es später erneut.'
      );
      return;
    }

    setIsContactLoading(true);

    try {
      // Feature Gate Check: Kontaktanfrage (Premium = immer erlaubt, Free = Limit prüfen)
      const allowed = await canSendContactRequest();

      if (!allowed) {
        setIsContactLoading(false);
        navigate('/mitgliedschaften?feature=contact_request');
        return;
      }

      // Track feature usage (nur für Free relevant, Premium ist unbegrenzt ok)
      await trackUsage('contact_request');

      // Erstelle oder finde bestehende Konversation
      const { data: conversation, error } = await getOrCreateConversation({
        owner_id: user.id,
        caretaker_id: caretaker.userId
      });

      if (conversation && !error) {
        navigate(`/nachrichten/${conversation.id}`);
      } else {
        console.warn('Konversation konnte nicht erstellt/gefunden werden:', error);
        showError(
          'Nachricht konnte nicht gestartet werden',
          error || 'Bitte versuche es erneut oder wende dich an den Support.'
        );
      }
    } catch (error) {
      console.error('Unerwarteter Fehler beim Kontaktieren:', error);
      showError(
        'Nachricht konnte nicht gestartet werden',
        error instanceof Error ? error.message : 'Bitte versuche es erneut.'
      );
    } finally {
      setIsContactLoading(false);
    }
  };

  // Review Submit Handler - Nur für Premium Owners
  const handleReviewSubmit = async (rating: number, comment: string) => {
    if (!user || !caretaker?.id) {
      console.error('User or caretaker ID missing');
      return;
    }

    // Zusätzliche Prüfung: Nur Owners können bewerten
    if (userProfile?.user_type !== 'owner') {
      console.error('Only owners can submit reviews');
      return;
    }

    // Prüfung: Nur Owners können bewerten (kein Plan-Check mehr)
    // Free-Owner können schreiben, Premium-Owner können lesen UND schreiben
    if (subscription?.plan_type !== 'basic' && subscription?.plan_type !== 'premium' && subscription?.plan_type !== undefined) {
      console.error('Invalid plan type');
      return;
    }

    setIsSubmittingReview(true);
    try {
      const { error } = await supabase
        .from('reviews')
        .insert({
          user_id: user.id,
          caretaker_id: caretaker.id,
          rating,
          comment: comment || null
        });

      if (error) {
        console.error('Error submitting review:', error);
        // TODO: Show error toast
        return;
      }

      // Refresh reviews list
      const { data: newReviews, error: fetchError } = await supabase
        .from('reviews')
        .select(`
            id,
            rating,
            comment,
            created_at,
            user_id,
            caretaker_response,
            caretaker_response_created_at,
            users(first_name, last_name)
          `)
        .eq('caretaker_id', caretaker.id)
        .order('created_at', { ascending: false });

      if (!fetchError && newReviews) {
        setReviews(newReviews);

        // Aktualisiere auch die Bewertungsdaten im Caretaker-Objekt
        const averageRating = newReviews.length > 0
          ? newReviews.reduce((sum, review) => sum + review.rating, 0) / newReviews.length
          : 0;

        setCaretaker(prev => prev ? {
          ...prev,
          rating: averageRating,
          reviewCount: newReviews.length
        } : null);
      }

      setShowReviewForm(false);
      // TODO: Show success toast
    } catch (error) {
      console.error('Unexpected error submitting review:', error);
      // TODO: Show error toast
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Favoriten Toggle Handler
  const handleFavoriteToggle = async () => {
    if (!user) {
      console.error('User nicht verfügbar');
      return;
    }

    if (!caretaker?.id) {
      console.error('Caretaker ID fehlt');
      return;
    }

    setIsFavoriteLoading(true);

    try {
      const { isFavorite: newFavoriteStatus, error } = await ownerCaretakerService.toggleFavorite(user.id, caretaker.id);

      if (error) {
        console.error('Fehler beim Aktualisieren der Favoriten:', error);
        // TODO: Toast-Benachrichtigung anzeigen
        return;
      }

      setIsFavorite(newFavoriteStatus);
      // TODO: Success Toast anzeigen
    } catch (error) {
      console.error('Unerwarteter Fehler beim Favorisieren:', error);
      // TODO: Toast-Benachrichtigung anzeigen
    } finally {
      setIsFavoriteLoading(false);
    }
  };

  // Partner Toggle Handler (für Dienstleister/Betreuer)
  const handlePartnerToggle = async () => {
    if (!user) {
      console.error('User nicht verfügbar');
      return;
    }

    if (!caretaker?.id) {
      console.error('Caretaker ID fehlt');
      return;
    }

    setIsPartnerLoading(true);

    try {
      const { isPartner: newPartnerStatus, error } = await caretakerPartnerService.togglePartner(user.id, caretaker.id);

      if (error) {
        console.error('Fehler beim Aktualisieren der Partner:', error);
        return;
      }

      setIsPartner(newPartnerStatus);
    } catch (error) {
      console.error('Unerwarteter Fehler beim Partner-Toggle:', error);
    } finally {
      setIsPartnerLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !caretaker) {
    return (
      <div className="container-custom py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">
          {error || 'Betreuer nicht gefunden'}
        </h1>
        <p className="mb-8">
          {error || 'Der gesuchte Betreuer existiert nicht oder wurde entfernt.'}
        </p>
        <Link to="/suche">
          <Button variant="primary">Zurück zur Suche</Button>
        </Link>
      </div>
    );
  }

  const displayName = formatCaretakerName(caretaker.name);

  const caretakerSwcParsed = parseServicesWithCategoriesJson(caretaker.servicesWithCategories);

  const betreuerTravelLabel = formatTravelCostGerman(
    resolveTravelCostConfig(caretaker.travelCostConfig, caretakerSwcParsed)
  );

  // Sprach-zu-Code Mapping
  const getLanguageFlag = (language: string) => {
    const languageMap: Record<string, any> = {
      'Deutsch': DE,
      'Englisch': GB,
      'English': GB,
      'Französisch': FR,
      'Français': FR,
      'Spanisch': ES,
      'Español': ES,
      'Italienisch': IT,
      'Italiano': IT,
      'Portugiesisch': PT,
      'Português': PT,
      'Niederländisch': NL,
      'Nederlands': NL,
      'Russisch': RU,
      'Русский': RU,
      'Polnisch': PL,
      'Polski': PL,
      'Türkisch': TR,
      'Türkçe': TR,
      'Arabisch': AE,
      'العربية': AE
    };

    return languageMap[language] || null; // Fallback für unbekannte Sprachen
  };



  return (
    <div className="bg-gray-50 min-h-screen pb-16">
      {/* Hero Section */}
      <div className="bg-white shadow-sm">
        <div className="container-custom py-8">
          <div className="flex flex-col md:flex-row items-start gap-8">
            {/* Profile Image */}
            <div className="md:w-1/4 lg:w-1/5">
              <div className="relative rounded-xl overflow-hidden shadow-md">
                <img
                  src={caretaker.avatar}
                  alt={displayName}
                  className="w-full aspect-square object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=f3f4f6&color=374151`;
                  }}
                />

              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center flex-wrap gap-2 sm:gap-3 mb-2">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{displayName}</h1>
                    {caretaker.verified && (
                      <span className="bg-primary-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center">
                        <Verified className="h-2.5 w-2.5 mr-1" /> Verifiziert
                      </span>
                    )}
                    {caretaker.isCommercial && (
                      <span className="bg-gradient-to-r from-purple-600 to-purple-700 text-white text-xs font-bold px-2 py-0.5 rounded-full shadow-md flex items-center">
                        <Briefcase className="h-2.5 w-2.5 mr-1" /> Pro
                      </span>
                    )}
                    {caretaker.short_term_available && (
                      <span className="bg-green-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center">
                        <Clock className="h-2.5 w-2.5 mr-1" /> Kurzfristig Verfügbar
                      </span>
                    )}

                    {/* Herz-Icon neben dem Namen, rechts */}
                    <div className="flex items-center gap-2">
                      {/* Favoriten-Herz (für Owner) */}
                      {user && userProfile?.user_type === 'owner' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleFavoriteToggle}
                          className="p-1 focus:ring-0 focus:ring-offset-0"
                          disabled={isFavoriteLoading}
                          title={!user ? 'Anmelden um zu favorisieren' : (isFavorite ? 'Aus Favoriten entfernen' : 'Zu Favoriten hinzufügen')}
                        >
                          {isFavoriteLoading ? (
                            <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                          ) : isFavorite ? (
                            <Heart className="h-5 w-5 text-primary-500 fill-primary-500" />
                          ) : (
                            <Heart className="h-5 w-5 text-primary-500 hover:text-primary-600" />
                          )}
                        </Button>
                      )}
                      {/* Partner-Herz (für Dienstleister/Betreuer) */}
                      {user && userProfile && (userProfile.user_type === 'caretaker' ||
                        (userProfile.user_type && ['hundetrainer', 'tierarzt', 'tierfriseur', 'physiotherapeut', 'ernaehrungsberater', 'tierfotograf', 'sonstige'].includes(userProfile.user_type))) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handlePartnerToggle}
                            className="p-1 focus:ring-0 focus:ring-offset-0"
                            disabled={isPartnerLoading}
                            title={isPartner ? 'Partner entfernen' : 'Als Partner speichern'}
                          >
                            {isPartnerLoading ? (
                              <div className="w-5 h-5 border-2 border-primary-300 border-t-primary-600 rounded-full animate-spin" />
                            ) : isPartner ? (
                              <Heart className="h-5 w-5 text-primary-500 fill-primary-500" />
                            ) : (
                              <Heart className="h-5 w-5 text-primary-500 hover:text-primary-600" />
                            )}
                          </Button>
                        )}
                    </div>
                  </div>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>{caretaker.location}</span>
                  </div>
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 mr-1" />
                      <span className="font-semibold text-lg">
                        {caretaker.rating > 0 ? caretaker.rating.toFixed(1) : '—'}
                      </span>
                      <span className="text-gray-600 ml-1">
                        ({caretaker.reviewCount} {caretaker.reviewCount === 1 ? 'Bewertung' : 'Bewertungen'})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-right">
                    <div className="text-2xl font-bold text-primary-600">
                      {(() => {
                        const cheapest = getCheapestPricedService(caretakerSwcParsed);
                        if (cheapest) {
                          return `ab ${formatCurrency(cheapest.price)}${priceTypeSuffixGerman(cheapest.priceType)}`;
                        }
                        if (caretaker.hourlyRate > 0) {
                          return `ab ${formatCurrency(caretaker.hourlyRate)}/h`;
                        }
                        return (
                          <span title="Preis auf Anfrage" className="cursor-help border-b border-dotted border-current">
                            a. A.
                          </span>
                        );
                      })()}
                    </div>
                    {betreuerTravelLabel && (
                      <p className="text-sm text-gray-600 mt-2 max-w-[14rem] ml-auto text-right leading-snug">
                        Anfahrt: <span className="font-medium text-gray-800">{betreuerTravelLabel}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Services */}
              <div className="flex flex-wrap gap-2 mb-6">
                {caretaker.services
                  .filter(service => typeof service === 'string' && !service.startsWith('custom_') && !service.toLowerCase().includes('anfahr'))
                  .map(service => (
                    <span
                      key={service}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800"
                    >
                      {service}
                    </span>
                  ))}
              </div>

              <p className="text-gray-700 mb-6 whitespace-pre-wrap break-words w-full lg:w-3/5">
                {caretaker.bio}
              </p>

              {/* Antwortzeit-Anzeige */}
              <div className="mb-4">
                <ResponseTimeDisplay
                  responseTime={responseTime || caretaker.responseTime}
                  messageCount={responseTimeData?.messageCount}
                  isLoading={responseTimeLoading}
                />
              </div>

              {/* Anmeldung-Aufforderung für nicht eingeloggte Benutzer */}
              {!user && (
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <Shield className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-blue-800">
                        Melde dich an, um mit {displayName} in Kontakt zu treten
                      </h3>
                      <p className="text-sm text-blue-600 mt-1">
                        Du kannst das Profil ansehen, aber für Nachrichten und Favoriten musst du angemeldet sein.
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => navigate('/anmelden?redirect=' + encodeURIComponent(`/betreuer/${id}`))}
                    >
                      Anmelden
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/registrieren?redirect=' + encodeURIComponent(`/betreuer/${id}`))}
                    >
                      Registrieren
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="outline"
                  size="lg"
                  leftIcon={<MessageCircle className="h-4 w-4" />}
                  onClick={handleContactClick}
                  isLoading={isContactLoading}
                  disabled={isContactLoading}
                >
                  Nachricht senden
                </Button>

                {/* Zurück zum Dashboard Button - nur für Betreuer auf eigenem Profil */}
                {user && caretaker.userId === user.id && userProfile?.user_type === 'caretaker' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<ArrowLeft className="h-3 w-3" />}
                    onClick={() => navigate('/dashboard-caretaker')}
                    className="text-gray-600 hover:text-gray-800 hover:bg-gray-100"
                  >
                    Dashboard
                  </Button>
                )}

                {/* Review Button - only for authenticated owners */}
                {/* Review Button wurde in die Bewertungs-Sektion verschoben */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Banner Top */}
      <div className="container-custom py-4">
        <AdvertisementBanner
          placement="profile_top"
          targetingOptions={{
            petTypes: userProfile?.pet_types || [],
            location: userProfile?.location || '',
            subscriptionType: subscription?.plan_type || 'free'
          }}
        />
      </div>

      {/* Details Tabs */}
      <div className="container-custom py-12">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* About Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <User className="h-5 w-5 text-primary-600" />
                Über {displayName}
              </h2>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                {caretaker.fullBio || caretaker.bio}
              </p>
            </div>

            {/* Kurze Beschreibung */}
            {caretaker.short_about_me && (
              <div className="bg-white rounded-xl p-6 shadow-sm max-w-2xl mx-auto w-full lg:w-3/5">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Info className="h-5 w-5 text-primary-600" />
                  Kurze Beschreibung
                </h2>
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">
                  {caretaker.short_about_me}
                </p>
              </div>
            )}

            {/* Erfahrung */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Award className="h-5 w-5 text-primary-600" />
                Erfahrung
              </h2>
              {caretaker.experience_description ? (
                <p className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{caretaker.experience_description}</p>
              ) : (
                <p className="text-gray-500 italic">Keine Erfahrungsbeschreibung hinterlegt.</p>
              )}
            </div>

            {/* Verfügbarkeit */}
            <AvailabilityDisplay
              availability={caretaker.availability}
              overnightAvailability={caretaker.overnight_availability}
            />

            {/* Umgebungsbilder */}
            <HomePhotosSection homePhotos={caretaker.home_photos || []} caretakerName={displayName} />

            {/* Reviews */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Star className="h-5 w-5 text-primary-600" />
                Bewertungen ({reviews.length})
              </h2>

              {/* Review Form - Für alle Owner (Free & Premium) */}
              {showReviewForm && caretaker && userProfile?.user_type === 'owner' && (
                <div className="mb-6">
                  <ReviewForm
                    caretakerId={caretaker.id || ''}
                    caretakerName={displayName}
                    onSubmit={handleReviewSubmit}
                    onCancel={() => setShowReviewForm(false)}
                    isLoading={isSubmittingReview}
                    reviewerName={userProfile ? `${userProfile.first_name} ${userProfile.last_name?.charAt(0) || ''}.` : undefined}
                  />
                </div>
              )}

              {/* Review Button - Für alle Owner anzeigen */}
              {!showReviewForm && userProfile?.user_type === 'owner' && (
                <div className="mb-6">
                  <Button
                    variant="primary"
                    onClick={() => setShowReviewForm(true)}
                    className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm"
                  >
                    ⭐ Bewertung schreiben
                  </Button>
                </div>
              )}

              {/* Info für Caretaker */}
              {userProfile?.user_type === 'caretaker' && (
                <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-700 text-sm">
                    <strong>Bewertungen lesen:</strong> Nur Premium-Tierhalter können Bewertungen anderer Tierhalter sehen.
                  </p>
                </div>
              )}

              {/* Reviews-Anzeige: Nur für Premium-Owner sichtbar */}
              {userProfile?.user_type === 'owner' && subscription?.plan_type !== 'premium' && (
                <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-amber-800 text-sm">
                    <strong>Bewertungen lesen:</strong> Du benötigst ein Premium-Abo, um Bewertungen zu lesen.
                    <Link to="/mitgliedschaften" className="text-amber-900 underline ml-1">
                      Jetzt upgraden →
                    </Link>
                  </p>
                </div>
              )}

              {reviewsLoading ? (
                <div className="flex justify-center py-8">
                  <LoadingSpinner />
                </div>
              ) : subscription?.plan_type === 'premium' || userProfile?.user_type !== 'owner' ? (
                reviews.length > 0 ? (
                  <div className="space-y-6">
                    {reviews.map(review => (
                      <ReviewCard key={review.id} review={review} caretakerName={displayName} />
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-600">Noch keine Bewertungen vorhanden.</p>
                )
              ) : null}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Leistungen & Preise */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary-600" />
                Leistungen & Preise
              </h2>
              <div className="space-y-6">
                {caretaker.services
                  .filter(service => typeof service === 'string' && !service.startsWith('custom_'))
                  .map(service => {
                    const swc = caretakerSwcParsed.find(
                      (s: any) => s && s.name === service
                    );
                    const servicePrice =
                      swc?.price ??
                      (caretaker.prices && caretaker.prices[service]);

                    const hasValidPrice =
                      servicePrice !== undefined &&
                      servicePrice !== '' &&
                      servicePrice !== null &&
                      (typeof servicePrice === 'number'
                        ? servicePrice > 0
                        : parseFloat(String(servicePrice)) > 0);

                    const effType = swc
                      ? parseEffectivePriceType(swc.price_type)
                      : 'per_hour';
                    const suffix = priceTypeSuffixGerman(effType);
                    const priceTitle = priceDisplayTitleForType(effType);

                    const displayPrice = hasValidPrice
                      ? `${formatCurrency(
                          typeof servicePrice === 'string'
                            ? parseFloat(servicePrice)
                            : Number(servicePrice)
                        )}${suffix}`
                      : (
                          <span title="Preis auf Anfrage" className="cursor-help border-b border-dotted border-current">
                            a. A.
                          </span>
                        );

                    return (
                      <div key={service} className="flex justify-between items-start gap-4">
                        <span className="text-gray-800 font-medium break-words flex-1">{service}</span>
                        <span
                          className="text-lg font-semibold text-primary-600 text-right shrink-0 whitespace-nowrap"
                          title={priceTitle}
                        >
                          {displayPrice}
                        </span>
                      </div>
                    );
                  })}
                {betreuerTravelLabel && (
                  <div className="flex justify-between items-start gap-4 p-3 rounded-lg border border-orange-200 bg-orange-50">
                    <span className="text-gray-800 font-medium flex-1">Anfahrtskosten</span>
                    <span className="text-lg font-semibold text-primary-600 text-right shrink-0 whitespace-nowrap">
                      {betreuerTravelLabel}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Sprachen */}
            {caretaker.languages && caretaker.languages.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold mb-6 flex items-center">
                  <Globe className="h-5 w-5 mr-2 text-primary-600" />
                  Sprachen
                </h2>
                <div className="flex flex-wrap gap-3">
                  {caretaker.languages.map((language, index) => {
                    const FlagComponent = getLanguageFlag(language);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200"
                      >
                        {FlagComponent && (
                          <FlagComponent
                            className="w-5 h-4 rounded-sm border border-gray-300 shadow-sm"
                            title={language}
                          />
                        )}
                        <span className="text-gray-700 font-medium">{language}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Fähigkeiten & Qualifikationen */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
                <GraduationCap className="h-5 w-5 text-primary-600" />
                Fähigkeiten & Qualifikationen
              </h2>
              <div className="space-y-3">
                {caretaker.qualifications && caretaker.qualifications.length > 0 ? (
                  caretaker.qualifications.map((qualification, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <CheckCircle className="w-5 h-5 text-primary-500" />
                      <span className="text-gray-700">{qualification}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-600">Keine Qualifikationen hinterlegt.</p>
                )}
              </div>
            </div>

            {/* Advertisement Banner */}
            <AdvertisementBanner
              placement="profile_sidebar"
              targetingOptions={{
                petTypes: userProfile?.pet_types || [],
                location: userProfile?.location || '',
                subscriptionType: subscription?.plan_type || 'free'
              }}
            />
          </div>
        </div>
      </div>
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
    </div>
  );
}

interface ReviewCardProps {
  review: Review;
  caretakerName: string;
}

function ReviewCard({ review, caretakerName }: ReviewCardProps) {
  // Formatierung des Reviewer-Namens: Name + erster Buchstabe des Nachnamens
  const formatReviewerName = (firstName: string | null, lastName: string | null) => {
    if (!firstName && !lastName) {
      // Fallback für Reviews ohne Benutzer-Daten
      return 'Tierhalter';
    }

    if (!firstName) {
      // Nur Nachname vorhanden
      return lastName || 'Tierhalter';
    }

    if (!lastName) {
      // Nur Vorname vorhanden
      return firstName;
    }

    // Vollständiger Name: Vorname + erster Buchstabe des Nachnamens
    return `${firstName} ${lastName.charAt(0)}.`;
  };

  const reviewerName = formatReviewerName(
    review.users?.first_name || null,
    review.users?.last_name || null
  );

  return (
    <div className="border-b border-gray-200 last:border-b-0 pb-4 last:pb-0">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                className={cn(
                  "h-4 w-4",
                  i < review.rating
                    ? "text-yellow-500 fill-yellow-500"
                    : "text-gray-300"
                )}
              />
            ))}
          </div>
          <span className="ml-2 text-sm font-medium text-gray-900">
            {reviewerName}
          </span>
        </div>
        <span className="text-sm text-gray-600">
          {new Date(review.created_at || '').toLocaleDateString('de-DE')}
        </span>
      </div>
      <p className="text-gray-700">{review.comment || ''}</p>

      {/* Caretaker Antwort */}
      {review.caretaker_response && (
        <div className="mt-3 ml-4 pl-4 border-l-2 border-primary-200 bg-primary-50 rounded-r-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-medium text-primary-800">Antwort von {caretakerName}:</div>
            <span className="text-xs text-primary-600">
              {review.caretaker_response_created_at ? new Date(review.caretaker_response_created_at).toLocaleDateString('de-DE') : ''}
            </span>
          </div>
          <p className="text-sm text-primary-700 whitespace-pre-line">{review.caretaker_response}</p>
        </div>
      )}
    </div>
  );
}

export default BetreuerProfilePage;