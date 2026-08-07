import Button from '../components/ui/Button';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AvailabilityScheduler from '../components/ui/AvailabilityScheduler';
import OvernightAvailabilitySelector from '../components/ui/OvernightAvailabilitySelector';
import ClientDetailsAccordion from '../components/ui/ClientDetailsAccordion';
import LanguageSelector from '../components/ui/LanguageSelector';
import CommercialInfoInput from '../components/ui/CommercialInfoInput';
import type { ClientData } from '../components/ui/ClientDetailsAccordion';
import { useAuth } from '../lib/auth/AuthContext';
import { useEffect, useState, useRef, useMemo } from 'react';
import { caretakerProfileService, ownerCaretakerService, userService, caretakerPartnerService } from '../lib/supabase/db';
import { Calendar, Check, Edit, LogOut, MapPin, Phone, Shield, Upload, Camera, Star, Info, Lock, Briefcase, Verified, Eye, EyeOff, KeyRound, Trash2, AlertTriangle, Mail, X, Clock, Crown, Settings, PawPrint, Moon, CheckCircle, User, XCircle, ChevronRight, Heart } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase/client';
import { useFeatureAccess } from '../hooks/useFeatureAccess';
import PaymentSuccessModal from '../components/ui/PaymentSuccessModal';
import { usePaymentSuccess } from '../hooks/usePaymentSuccess';
import { openStripeBillingPortal } from '../lib/stripe/stripeService';
import { PremiumBadge } from '../components/ui/PremiumBadge';
import { useSubscription } from '../lib/auth/useSubscription';
import RegistrationSuccessModal from '../components/ui/RegistrationSuccessModal';
import ProfileImageCropper from '../components/ui/ProfileImageCropper';
import AdvertisementBanner from '../components/ui/AdvertisementBanner';
import { DEFAULT_SERVICE_CATEGORIES, type ServiceCategory, type CategorizedService, type TravelCostConfig } from '../lib/types/service-categories';
import { ServiceUtils as SupabaseServiceUtils } from '../lib/supabase/service-categories';
import { useShortTermAvailability } from '../contexts/ShortTermAvailabilityContext';
import { useToast } from '../hooks/useToast';
import ToastContainer from '../components/ui/ToastContainer';
import { VerificationService, type VerificationDocument } from '../lib/services/verificationService';
import CaretakerContactTab from '../components/ui/CaretakerContactTab';
import { isCaretaker, formatCurrency } from '../lib/utils';
import {
  defaultPriceTypeFromHint,
  formatTravelCostGerman,
  getCheapestPricedService,
  isExcludedFromAbPrice,
  normalizePriceTypeForSave,
  parseEffectivePriceType,
  priceTypeSelectValue,
  priceTypeSuffixGerman,
  resolveTravelCostConfig,
  type StoredPriceType,
} from '../lib/pricing/servicePricing';
import ServicePriceTypeSelect from '../components/pricing/ServicePriceTypeSelect';
import RefGrowDashboard from '../components/ui/RefGrowDashboard';
import DashboardReleaseTeaser from '../components/dashboard/DashboardReleaseTeaser';


function CaretakerDashboardPage() {
  const { user, userProfile, loading: authLoading, subscription, updateProfileState } = useAuth();
  const navigate = useNavigate();
  const { toasts, showSuccess, showError, removeToast } = useToast();
  const { isPremiumUser } = useSubscription();
  const { maxEnvironmentImages } = useFeatureAccess();
  // Saniertes Initialprofil, verhindert Nullzugriffe in der UI während kurzer Übergänge
  const [profile, setProfile] = useState<any>({ services_with_categories: [], animal_types: [] });
  // Optimistische Avatar-URL für sofortige Anzeige nach Upload
  const [optimisticAvatarUrl, setOptimisticAvatarUrl] = useState<string | null>(null);
  // Stabiles Render-Profil (Snapshot), verhindert UI-Flackern bei kurzzeitigem Context-Reload
  const [renderProfile, setRenderProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profileLoadAttempts, setProfileLoadAttempts] = useState(0);

  /** Verhindert doppeltes Öffnen, wenn `userProfile` nach Registrierung nachlädt (gleicher Tab) */
  const onboardingOpenedFromRegistrationRef = useRef(false);

  const ONBOARDING_DONE_KEY = 'tigube_caretaker_onboarding_done';

  const dismissCaretakerOnboarding = () => {
    try {
      localStorage.setItem(ONBOARDING_DONE_KEY, '1');
    } catch {
      /* ignore */
    }
    setShowOnboarding(false);
  };

  // Onboarding-Modal State
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingUserName, setOnboardingUserName] = useState<string>('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [showImageCropper, setShowImageCropper] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Payment Success Modal
  const { paymentSuccess, isValidating: paymentValidating, closeModal } = usePaymentSuccess();
  const [editData, setEditData] = useState(false);
  // EINFACHER ANSATZ: Ein einziger State für alle Daten
  const [dashboardData, setDashboardData] = useState({
    // Grunddaten
    phoneNumber: '',
    email: '',
    plz: '',
    street: '',
    city: '',
    dateOfBirth: '',
    gender: '',
    firstName: '',
    lastName: '',
    // Flags
    isLoading: true,
    isEditing: false
  });
  const [emailError, setEmailError] = useState<string | null>(null);

  // Short-term availability state (nur lokaler State, keine DB-Persistierung)
  const { shortTermAvailable, setShortTermAvailable, loading: contextLoading } = useShortTermAvailability();
  const [shortTermLoading, setShortTermLoading] = useState(false);

  // Approval state
  const [approvalLoading, setApprovalLoading] = useState(false);
  const [approvalHintDismissed, setApprovalHintDismissed] = useState(false);

  // Verification state
  const [verificationRequest, setVerificationRequest] = useState<VerificationDocument | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<string>('not_submitted');
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [uploadingDocuments, setUploadingDocuments] = useState(false);
  const [ausweisFile, setAusweisFile] = useState<File | null>(null);
  const [zertifikatFiles, setZertifikatFiles] = useState<File[]>([]);
  // Synchronisiere den Snapshot immer, wenn userProfile sich ändert (auch nach Upload),
  // damit Änderungen aus dem Backend in der UI ankommen – ohne das Rendering zu leeren
  useEffect(() => {
    if (userProfile) {
      setRenderProfile(userProfile);
    }
  }, [userProfile]);

  // Synchronisiere short_term_available mit Context wenn sich das Profil ändert
  useEffect(() => {
    if (profile?.short_term_available !== undefined && profile.short_term_available !== shortTermAvailable) {
      setShortTermAvailable(profile.short_term_available);
    }
  }, [profile?.short_term_available, shortTermAvailable, setShortTermAvailable]);

  // Overnight availability state
  const [overnightAvailability, setOvernightAvailability] = useState<Record<string, boolean>>({
    Mo: false,
    Di: false,
    Mi: false,
    Do: false,
    Fr: false,
    Sa: false,
    So: false,
  });

  // Öffnungszeiten state für andere Dienstleister
  // Opening hours state for other service providers
  // Standardmäßig keine Öffnungszeiten gesetzt (null)
  const [openingHours, setOpeningHours] = useState<Record<string, { open: string; close: string; closed: boolean }> | null>(null);

  // Onboarding State für Kategorie-Informationen
  const [onboardingCategoryName, setOnboardingCategoryName] = useState<string | undefined>();
  const [onboardingSpecificUserType, setOnboardingSpecificUserType] = useState<string | undefined>();

  // Onboarding: nach Registrierung (sessionStorage) oder erneute Anmeldung als Betreuer (caretaker) mit offenem Profil
  useEffect(() => {
    if (authLoading || !user) return;

    try {
      const raw = sessionStorage.getItem('onboardingData');
      if (raw) {
        const parsed = JSON.parse(raw) as {
          userType?: string;
          userName?: string;
          categoryName?: string;
          specificUserType?: string;
        };

        const showFromRegistration =
          parsed.userType === 'caretaker' ||
          parsed.userType === 'dienstleister' ||
          parsed.userType === 'betreuer';

        if (showFromRegistration) {
          setOnboardingUserName(parsed.userName || userProfile?.first_name || '');
          setOnboardingCategoryName(parsed.categoryName);
          setOnboardingSpecificUserType(parsed.specificUserType);
          setShowOnboarding(true);
          sessionStorage.setItem('wasJustRegistered', 'true');
          onboardingOpenedFromRegistrationRef.current = true;
        }
        sessionStorage.removeItem('onboardingData');
        return;
      }
    } catch (e) {
      console.warn('⚠️ Konnte onboardingData nicht lesen:', e);
    }

    if (onboardingOpenedFromRegistrationRef.current) return;

    if (!userProfile) return;
    if (userProfile.user_type !== 'caretaker') return;
    if (userProfile.profile_completed === true) return;

    try {
      if (localStorage.getItem(ONBOARDING_DONE_KEY) === '1') return;
    } catch {
      /* ignore */
    }

    setOnboardingUserName(userProfile.first_name || '');
    setOnboardingCategoryName('Betreuer');
    setOnboardingSpecificUserType('caretaker');
    setShowOnboarding(true);
  }, [authLoading, user, userProfile]);

  // Lade Kontaktdaten wenn userProfile verfügbar ist
  useEffect(() => {
    if (userProfile) {

      const newCaretakerData = {
        phoneNumber: profileData.phone_number || '',
        email: user?.email || '',
        plz: profileData.plz || '',
        street: profileData.street || '',
        city: profileData.city || '',
        dateOfBirth: profileData.date_of_birth || '',
        gender: profileData.gender || ''
      };


      setDashboardData(prev => ({ ...prev, ...newCaretakerData }));
    }
  }, [userProfile, user?.email]);

  // --- Verfügbarkeits-State ---
  type TimeSlot = { start: string; end: string };
  type AvailabilityState = Record<string, TimeSlot[]>;
  const defaultAvailability: AvailabilityState = {
    Mo: [],
    Di: [],
    Mi: [],
    Do: [],
    Fr: [],
    Sa: [],
    So: [],
  };
  const [availability, setAvailability] = useState<AvailabilityState>(defaultAvailability);

  // Handler für Speichern der Verfügbarkeit
  const handleSaveAvailability = async (newAvailability: AvailabilityState) => {
    if (!user || !profile) return;



    try {
      // Konvertiere TimeSlot-Objekte zu String-Array für Datenbank
      const dbAvailability: Record<string, string[]> = {};
      for (const [day, slots] of Object.entries(newAvailability)) {
        dbAvailability[day] = slots.map(slot => `${slot.start}-${slot.end}`);
      }



      const result = await caretakerProfileService.saveProfile(user.id, {
        availability: dbAvailability,
      });

      if (result.error) {
        console.error('❌ Fehler beim Speichern der Verfügbarkeit:', result.error);
        return;
      }



      // Lokalen State aktualisieren
      setAvailability(newAvailability);
      setProfile((prev: any) => ({ ...prev, availability: dbAvailability }));

      // AuthContext auch aktualisieren, falls verfügbar
      if (result.data) {
        updateProfileState(result.data);
      }
    } catch (error) {
      console.error('❌ Exception beim Speichern der Verfügbarkeit:', error);
    }
  };

  // --- Leistungen & Qualifikationen State ---
  // Leistungen State mit sessionStorage Persistierung
  const [editServices, setEditServices] = useState(() => {
    return sessionStorage.getItem('editServices') === 'true';
  });

  const [servicesDraft, setServicesDraft] = useState<{
    services: string[];
    servicesWithCategories: CategorizedService[];
    animal_types: string[];
    prices: Record<string, string>;
    travelCostDraft: { pricePerKm: string; freeKm: string };
  }>(() => {
    const saved = sessionStorage.getItem('servicesDraft');
    if (saved) {
      const p = JSON.parse(saved);
      const prices = p.prices ?? {};
      return {
        services: p.services ?? [],
        servicesWithCategories: p.servicesWithCategories ?? [],
        animal_types: p.animal_types ?? [],
        prices,
        travelCostDraft: p.travelCostDraft ?? {
          pricePerKm: typeof prices.Anfahrkosten === 'string' ? prices.Anfahrkosten : '',
          freeKm: '',
        },
      };
    }

    return {
      services: [],
      servicesWithCategories: [],
      animal_types: [],
      prices: {},
      travelCostDraft: { pricePerKm: '', freeKm: '' },
    };
  });

  // Services Edit-Modus in sessionStorage speichern
  useEffect(() => {
    sessionStorage.setItem('editServices', editServices.toString());
  }, [editServices]);

  // Services Draft in sessionStorage speichern
  useEffect(() => {
    sessionStorage.setItem('servicesDraft', JSON.stringify(servicesDraft));
  }, [servicesDraft]);

  // Initialisiere servicesDraft nur beim ersten Laden des Profils (wenn keine sessionStorage-Daten vorhanden)
  useEffect(() => {
    if (profile && !sessionStorage.getItem('servicesDraft')) {
      // Nur initialisieren wenn keine sessionStorage-Daten vorhanden sind
      const servicesWithCategories = profile.services_with_categories || [];

      // Extrahiere Service-Namen und Preise aus der neuen Struktur
      const normalizedServices: string[] = [];
      const prices: Record<string, string> = {};

      if (Array.isArray(servicesWithCategories)) {
        servicesWithCategories.forEach((service: any) => {
          if (service.name && service.name !== 'Anfahrkosten') {
            if (defaultServices.includes(service.name)) {
              normalizedServices.push(service.name);
            }
            if (service.price) {
              prices[service.name] = service.price.toString();
            }
          }
        });
      }

      const rawTc = profile.travel_cost_config;
      let travelCostDraft = { pricePerKm: '', freeKm: '' };
      if (rawTc && typeof rawTc === 'object' && !Array.isArray(rawTc)) {
        const o = rawTc as Record<string, unknown>;
        if (o.price_per_km != null && o.price_per_km !== '') {
          travelCostDraft = {
            ...travelCostDraft,
            pricePerKm: String(o.price_per_km).replace('.', ','),
          };
        }
        if (o.free_km != null && o.free_km !== '') {
          travelCostDraft = { ...travelCostDraft, freeKm: String(o.free_km) };
        }
      } else {
        const leg = (profile.services_with_categories || []).find(
          (s: any) => s?.name === 'Anfahrkosten' && s?.price
        );
        if (leg?.price != null && leg.price !== '') {
          travelCostDraft = { pricePerKm: String(leg.price).replace('.', ','), freeKm: '' };
        }
      }

      setServicesDraft({
        services: normalizedServices,
        servicesWithCategories,
        animal_types: profile.animal_types || [],
        prices,
        travelCostDraft,
      });
    }
  }, [profile]);

  // Qualifikationen State mit sessionStorage Persistierung
  const [editQualifications, setEditQualifications] = useState(() => {
    return sessionStorage.getItem('editQualifications') === 'true';
  });

  const [qualificationsDraft, setQualificationsDraft] = useState<{
    qualifications: string[];
    experience_description: string;
    languages: string[];
    isCommercial: boolean;
    companyName: string;
    taxNumber: string;
    vatId: string;
  }>(() => {
    const saved = sessionStorage.getItem('qualificationsDraft');
    if (saved) {
      return JSON.parse(saved);
    }
    // Fallback-Werte für initiale Initialisierung
    return {
      qualifications: [],
      experience_description: '',
      languages: [],
      isCommercial: false,
      companyName: '',
      taxNumber: '',
      vatId: '',
    };
  });

  // Qualifikationen Edit-Modus in sessionStorage speichern
  useEffect(() => {
    sessionStorage.setItem('editQualifications', editQualifications.toString());
  }, [editQualifications]);

  // Qualifikationen Draft in sessionStorage speichern
  useEffect(() => {
    sessionStorage.setItem('qualificationsDraft', JSON.stringify(qualificationsDraft));
  }, [qualificationsDraft]);

  // Initialisiere qualificationsDraft nur beim ersten Laden des Profils (wenn keine sessionStorage-Daten vorhanden)
  useEffect(() => {
    if (profile && !sessionStorage.getItem('qualificationsDraft')) {
      // Nur initialisieren wenn keine sessionStorage-Daten vorhanden sind
      setQualificationsDraft({
        qualifications: profile.qualifications || [],
        experience_description: profile.experience_description || '',
        languages: profile.languages || [],
        isCommercial: profile.is_commercial || false,
        companyName: profile.company_name || '',
        taxNumber: profile.tax_number || '',
        vatId: profile.vat_id || '',
      });
    }
  }, [profile]);

  // Freie Eingabe für Leistungen, Tierarten, Qualifikationen
  const [newService, setNewService] = useState('');
  const [newServiceCategory, setNewServiceCategory] = useState(8); // Default: Allgemein
  const [newAnimal, setNewAnimal] = useState('');
  const [newQualification, setNewQualification] = useState<string | null>(null);
  const [serviceCategories, setServiceCategories] = useState<any[]>(DEFAULT_SERVICE_CATEGORIES as unknown as any[]);

  // Default-Listen für Tierarten und Qualifikationen
  const defaultAnimals = [
    'Hunde',
    'Katzen',
    'Vögel',
    'Kaninchen',
    'Fische',
    'Kleintiere',
  ];


  // Vordefinierte Dienstleistungen nach Dienstleister-Kategorie (kategorie_id)
  const predefinedServicesByCategory: Record<number, string[]> = {
    1: [ // Betreuer
      'Gassi-Service',
      'Haustierbetreuung zu Hause',
      'Hundetagesbetreuung',
      'Übernachtungsbetreuung',
      'Urlaubsbetreuung',
    ],
    2: [ // Tierarzt
      'Allgemeine Untersuchung',
      'Impfung',
      'Kastration / Sterilisation',
      'Notfallbehandlung',
      'Hausbesuch',
    ],
    3: [ // Hundetrainer
      'Einzeltraining',
      'Gruppentraining',
      'Welpenkurs',
      'Verhaltensberatung',
      'Clickertraining',
    ],
    4: [ // Tierfriseur
      'Komplett-Schnitt',
      'Fellpflege / Grooming',
      'Baden & Waschen',
      'Krallenpflege',
      'Zahnpflege',
    ],
    5: [ // Physiotherapeut
      'Physiotherapie-Sitzung',
      'Massage',
      'Bewegungstherapie',
      'Rehabilitation',
      'Hausbesuch',
    ],
    6: [ // Ernährungsberater
      'Ernährungsberatung',
      'Diätplan-Erstellung',
      'Futteranalyse',
      'Gewichtsmanagement',
      'Allergieberatung',
    ],
    7: [ // Tierfotograf
      'Fotoshooting',
      'Outdoor-Fotografie',
      'Studio-Fotografie',
      'Event-Fotografie',
      'Bildbearbeitung',
    ],
    8: [ // Sonstige
      'Individuelle Beratung',
      'Hausbesuch',
      'Notfall-Service',
      'Langzeitbetreuung',
    ],
  };

  // Hole kategorie_id aus dem Profil (Standard: 1 für Betreuer)
  const currentCategoryId = profile?.kategorie_id || 1;

  // Dynamische Liste der Standard-Leistungen basierend auf kategorie_id
  const defaultServices = useMemo(() => {
    return predefinedServicesByCategory[currentCategoryId] || predefinedServicesByCategory[1];
  }, [currentCategoryId]);

  /** Nur Default für price_type beim Anhaken – nicht mehr als festes Label in der Zeile */
  const servicePriceHints: Record<string, string> = {
    // Betreuer (kategorie_id: 1)
    'Gassi-Service': '€/30 Min',
    'Haustierbetreuung zu Hause': '€/Besuch',
    'Hundetagesbetreuung': '€/Tag',
    'Übernachtungsbetreuung': '€/Nacht',
    'Urlaubsbetreuung': '€/Tag',
    // Tierarzt (kategorie_id: 2)
    'Allgemeine Untersuchung': '€/Termin',
    'Impfung': '€/Termin',
    'Kastration / Sterilisation': '€/Termin',
    'Notfallbehandlung': '€/Termin',
    'Hausbesuch': '€/Besuch',
    // Hundetrainer (kategorie_id: 3)
    'Einzeltraining': '€/Stunde',
    'Gruppentraining': '€/Stunde',
    'Welpenkurs': '€/Kurs',
    'Verhaltensberatung': '€/Stunde',
    'Clickertraining': '€/Stunde',
    // Tierfriseur (kategorie_id: 4)
    'Komplett-Schnitt': '€/Termin',
    'Fellpflege / Grooming': '€/Termin',
    'Baden & Waschen': '€/Termin',
    'Krallenpflege': '€/Termin',
    'Zahnpflege': '€/Termin',
    // Physiotherapeut (kategorie_id: 5)
    'Physiotherapie-Sitzung': '€/Stunde',
    'Massage': '€/Stunde',
    'Bewegungstherapie': '€/Stunde',
    'Rehabilitation': '€/Stunde',
    'Hausbesuch': '€/Besuch',
    // Ernährungsberater (kategorie_id: 6)
    'Ernährungsberatung': '€/Stunde',
    'Diätplan-Erstellung': '€/Plan',
    'Futteranalyse': '€/Analyse',
    'Gewichtsmanagement': '€/Stunde',
    'Allergieberatung': '€/Stunde',
    // Tierfotograf (kategorie_id: 7)
    'Fotoshooting': '€/Shooting',
    'Outdoor-Fotografie': '€/Shooting',
    'Studio-Fotografie': '€/Shooting',
    'Event-Fotografie': '€/Event',
    'Bildbearbeitung': '€/Bild',
    // Sonstige (kategorie_id: 8)
    'Individuelle Beratung': '€/Stunde',
    'Hausbesuch': '€/Besuch',
    'Notfall-Service': '€/Einsatz',
    'Langzeitbetreuung': '€/Tag',
  };

  // Anfahrkosten separat
  const travelCostsLabel = 'Anfahrkosten (€/Km)';

  // Farbsystem für Service-Kategorien
  const getServiceCategoryColor = (serviceName: string) => {
    // Finde die Kategorie für diesen Service
    const categorizedService = servicesDraft.servicesWithCategories.find(s => s.name === serviceName);
    if (!categorizedService) {
      // Fallback für Standard-Services (Allgemein)
      return 'bg-primary-100 text-primary-700 border-primary-300';
    }

    // Farbschema basierend auf Kategorie-ID
    switch (categorizedService.category_id) {
      case 1: // Ernährung
        return 'bg-orange-100 text-orange-700 border-orange-300';
      case 2: // Zubehör
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 3: // Urlaub mit Tier
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 4: // Gesundheit
        return 'bg-red-100 text-red-700 border-red-300';
      case 5: // Züchter
        return 'bg-indigo-100 text-indigo-700 border-indigo-300';
      case 6: // Verein
        return 'bg-teal-100 text-teal-700 border-teal-300';
      case 7: // Training
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 8: // Allgemein (Default)
      default:
        return 'bg-primary-100 text-primary-700 border-primary-300';
    }
  };

  // Handler für Leistungen
  function handleServicesChange(field: string, value: any) {
    setServicesDraft(d => ({ ...d, [field]: value }));
  }

  // Handler für Qualifikationen
  function handleQualificationsChange(field: string, value: any) {
    setQualificationsDraft(d => ({ ...d, [field]: value }));
  }

  function validatePriceInput(value: string): string {
    // Nur Zahlen, Punkt und Komma erlauben
    let cleanValue = value.replace(/[^0-9.,]/g, '');

    // Komma durch Punkt ersetzen für einheitliche Dezimaldarstellung
    cleanValue = cleanValue.replace(',', '.');

    // Nur einen Dezimalpunkt erlauben
    const parts = cleanValue.split('.');
    if (parts.length > 2) {
      cleanValue = parts[0] + '.' + parts.slice(1).join('');
    }

    // Maximal 2 Dezimalstellen erlauben
    if (parts.length === 2 && parts[1].length > 2) {
      cleanValue = parts[0] + '.' + parts[1].substring(0, 2);
    }

    return cleanValue;
  }

  function handlePriceChange(key: string, value: string) {
    const validatedValue = validatePriceInput(value);
    setServicesDraft(d => {
      const newPrices = { ...d.prices };
      newPrices[key] = validatedValue;
      return { ...d, prices: newPrices };
    });
  }
  function handleRemovePrice(key: string) {
    setServicesDraft(d => {
      const newPrices = { ...d.prices };
      delete newPrices[key];
      return {
        ...d,
        prices: newPrices,
        servicesWithCategories: d.servicesWithCategories.filter(s => s.name !== key),
      };
    });
  }
  function handleAddPrice() {
    // Erstelle einen eindeutigen Key für den neuen Preis
    const timestamp = Date.now();
    const newKey = `custom_${timestamp}`;
    setServicesDraft(d => ({ ...d, prices: { ...d.prices, [newKey]: '' } }));

    // Füge auch einen neuen Service zur servicesWithCategories hinzu
    const newService: CategorizedService = {
      name: newKey,
      category_id: 8, // Default: Allgemein
      category_name: 'Allgemein',
      price_type: 'per_hour',
    };
    setServicesDraft(d => ({
      ...d,
      servicesWithCategories: [...d.servicesWithCategories, newService]
    }));
  }

  function handleTravelCostDraftChange(field: 'pricePerKm' | 'freeKm', value: string) {
    const nextVal =
      field === 'freeKm' ? value.replace(/[^0-9]/g, '') : validatePriceInput(value);
    setServicesDraft(d => ({
      ...d,
      travelCostDraft: { ...d.travelCostDraft, [field]: nextVal },
    }));
  }

  function handleServicePriceTypeChange(serviceName: string, priceType: StoredPriceType) {
    setServicesDraft(d => {
      const ix = d.servicesWithCategories.findIndex(s => s.name === serviceName);
      const next = [...d.servicesWithCategories];
      if (ix >= 0) {
        next[ix] = { ...next[ix], price_type: priceType };
      } else {
        next.push({
          name: serviceName,
          category_id: 8,
          category_name: 'Allgemein',
          price_type: priceType,
        });
      }
      return { ...d, servicesWithCategories: next };
    });
  }

  // Speichern der Leistungen
  const handleSaveServices = async () => {
    if (!user || !profile) return;

    try {
      const allActiveServices: CategorizedService[] = [];

      servicesDraft.services.forEach(serviceName => {
        const price = servicesDraft.prices[serviceName];
        const meta = servicesDraft.servicesWithCategories.find(s => s.name === serviceName);
        const pt = normalizePriceTypeForSave(meta?.price_type);
        const service: CategorizedService = {
          name: serviceName,
          category_id: meta?.category_id ?? 8,
          category_name: meta?.category_name ?? 'Allgemein',
          ...(price &&
            price.trim() !== '' && {
              price: parseFloat(price.replace(',', '.')),
              price_type: pt,
            }),
        };
        allActiveServices.push(service);
      });

      Object.keys(servicesDraft.prices).forEach(serviceName => {
        if (
          !servicesDraft.services.includes(serviceName) &&
          serviceName !== 'Anfahrkosten'
        ) {
          const price = servicesDraft.prices[serviceName];
          if (price && price.trim() !== '') {
            const existingService = servicesDraft.servicesWithCategories.find(s => s.name === serviceName);
            const pt = normalizePriceTypeForSave(existingService?.price_type);
            const service: CategorizedService = {
              name: serviceName,
              category_id: existingService?.category_id || 8,
              category_name: existingService?.category_name || 'Allgemein',
              price: parseFloat(price.replace(',', '.')),
              price_type: pt,
            };
            allActiveServices.push(service);
          }
        }
      });

      const pkRaw = servicesDraft.travelCostDraft.pricePerKm.replace(',', '.').trim();
      const fkRaw = servicesDraft.travelCostDraft.freeKm.trim();
      const pk = pkRaw === '' ? NaN : parseFloat(pkRaw);
      const fk = fkRaw === '' ? NaN : parseInt(fkRaw, 10);

      let travelCostConfigPayload: TravelCostConfig | null = null;
      if (!Number.isNaN(pk) && pk > 0) {
        travelCostConfigPayload = { price_per_km: pk };
        if (!Number.isNaN(fk) && fk > 0) travelCostConfigPayload.free_km = fk;
      } else if (!Number.isNaN(fk) && fk > 0) {
        travelCostConfigPayload = { free_km: fk };
      } else {
        travelCostConfigPayload = null;
      }

      const minFromServices = getCheapestPricedService(allActiveServices)?.price ?? null;

      const { error } = await caretakerProfileService.saveProfile(user.id, {
        servicesWithCategories: allActiveServices,
        animalTypes: servicesDraft.animal_types,
        travelCostConfig:
          travelCostConfigPayload && Object.keys(travelCostConfigPayload).length > 0
            ? travelCostConfigPayload
            : null,
        hourlyRate: minFromServices != null ? minFromServices : null,
      });

      if (error) {
        console.error('❌ Fehler beim Speichern der Leistungen:', error);
        setError('Fehler beim Speichern: ' + error.message);
        return;
      }

      setProfile((prev: any) => ({
        ...prev,
        services_with_categories: allActiveServices,
        animal_types: servicesDraft.animal_types,
        travel_cost_config: travelCostConfigPayload,
        hourly_rate: minFromServices != null ? minFromServices : prev.hourly_rate,
      }));

      const nextPrices = { ...servicesDraft.prices };
      delete nextPrices['Anfahrkosten'];

      setServicesDraft(d => ({
        ...d,
        prices: nextPrices,
        travelCostDraft: travelCostConfigPayload
          ? {
              pricePerKm:
                travelCostConfigPayload.price_per_km != null
                  ? String(travelCostConfigPayload.price_per_km).replace('.', ',')
                  : '',
              freeKm:
                travelCostConfigPayload.free_km != null
                  ? String(travelCostConfigPayload.free_km)
                  : '',
            }
          : { pricePerKm: '', freeKm: '' },
      }));

      setEditServices(false);
      setError(null);
      sessionStorage.removeItem('editServices');
      sessionStorage.removeItem('servicesDraft');
    } catch (error) {
      console.error('❌ Exception beim Speichern der Leistungen:', error);
      setError('Unerwarteter Fehler beim Speichern');
    }
  };

  // Abbrechen der Leistungen
  function handleCancelServices() {
    const servicesWithCategories = profile?.services_with_categories || [];

    // Extrahiere Service-Namen und Preise aus der neuen Struktur
    const normalizedServices: string[] = [];
    const prices: Record<string, string> = {};

    if (Array.isArray(servicesWithCategories)) {
      servicesWithCategories.forEach((service: any) => {
        if (service.name && service.name !== 'Anfahrkosten') {
          if (defaultServices.includes(service.name)) {
            normalizedServices.push(service.name);
          }
          if (service.price) {
            prices[service.name] = service.price.toString();
          }
        }
      });
    }

    const rawTc = profile?.travel_cost_config;
    let travelCostDraft = { pricePerKm: '', freeKm: '' };
    if (rawTc && typeof rawTc === 'object' && !Array.isArray(rawTc)) {
      const o = rawTc as Record<string, unknown>;
      if (o.price_per_km != null && o.price_per_km !== '') {
        travelCostDraft = {
          ...travelCostDraft,
          pricePerKm: String(o.price_per_km).replace('.', ','),
        };
      }
      if (o.free_km != null && o.free_km !== '') {
        travelCostDraft = { ...travelCostDraft, freeKm: String(o.free_km) };
      }
    } else {
      const leg = (profile?.services_with_categories || []).find(
        (s: any) => s?.name === 'Anfahrkosten' && s?.price
      );
      if (leg?.price != null && leg.price !== '') {
        travelCostDraft = { pricePerKm: String(leg.price).replace('.', ','), freeKm: '' };
      }
    }

    setServicesDraft({
      services: normalizedServices,
      servicesWithCategories: servicesWithCategories,
      animal_types: profile?.animal_types || [],
      prices,
      travelCostDraft,
    });
    setEditServices(false);
    // Cleanup sessionStorage
    sessionStorage.removeItem('editServices');
    sessionStorage.removeItem('servicesDraft');
  }

  // Speichern der Qualifikationen
  const handleSaveQualifications = async () => {
    if (!user || !profile) return;

    // Validierung für gewerbliche Betreuer
    // Steuernummer ist nur Pflicht, wenn keine USt-IdNr. angegeben ist
    if (qualificationsDraft.isCommercial && !qualificationsDraft.taxNumber.trim() && !qualificationsDraft.vatId.trim()) {
      setError('Bitte gib entweder deine Steuernummer oder USt-IdNr. an, wenn du als gewerblicher Betreuer tätig bist.');
      return;
    }

    try {


      // Nur die Qualifikations-Felder speichern
      const { data, error } = await caretakerProfileService.saveProfile(user.id, {
        qualifications: qualificationsDraft.qualifications,
        experienceDescription: qualificationsDraft.experience_description,
        languages: qualificationsDraft.languages,
        isCommercial: qualificationsDraft.isCommercial,
        companyName: qualificationsDraft.companyName || undefined,
        taxNumber: qualificationsDraft.taxNumber || undefined,
        vatId: qualificationsDraft.vatId || undefined,
      });

      if (error) {
        console.error('❌ Fehler beim Speichern der Qualifikationen:', error);
        setError('Fehler beim Speichern: ' + error.message);
        return;
      }



      // Aktualisiere das Profil mit den neuen Daten
      setProfile((prev: any) => ({
        ...prev,
        qualifications: qualificationsDraft.qualifications,
        experience_description: qualificationsDraft.experience_description,
        languages: qualificationsDraft.languages,
        is_commercial: qualificationsDraft.isCommercial,
        company_name: qualificationsDraft.companyName,
        tax_number: qualificationsDraft.taxNumber,
        vat_id: qualificationsDraft.vatId,
      }));

      setEditQualifications(false);
      setError(null); // Lösche eventuelle Fehler
      // Cleanup sessionStorage
      sessionStorage.removeItem('editQualifications');
      sessionStorage.removeItem('qualificationsDraft');
    } catch (error) {
      console.error('❌ Exception beim Speichern der Qualifikationen:', error);
      setError('Unerwarteter Fehler beim Speichern');
    }
  };

  // Abbrechen der Qualifikationen
  function handleCancelQualifications() {
    setQualificationsDraft({
      qualifications: profile?.qualifications || [],
      experience_description: profile?.experience_description || '',
      languages: profile?.languages || [],
      isCommercial: profile?.is_commercial || false,
      companyName: profile?.company_name || '',
      taxNumber: profile?.tax_number || '',
      vatId: profile?.vat_id || '',
    });
    setEditQualifications(false);
    // Cleanup sessionStorage
    sessionStorage.removeItem('editQualifications');
    sessionStorage.removeItem('qualificationsDraft');
  }

  // State für kurze Beschreibung im Texte-Tab mit sessionStorage Persistierung
  const [shortDescription, setShortDescription] = useState('');
  const [editShortDesc, setEditShortDesc] = useState(() => {
    return sessionStorage.getItem('editShortDesc') === 'true';
  });
  const [shortDescDraft, setShortDescDraft] = useState('');
  const maxShortDesc = 140;

  // State für Über mich Box mit sessionStorage Persistierung
  const [aboutMe, setAboutMe] = useState('');
  const [editAboutMe, setEditAboutMe] = useState(() => {
    return sessionStorage.getItem('editAboutMe') === 'true';
  });
  const [aboutMeDraft, setAboutMeDraft] = useState('');
  const minAboutMe = 500;

  // Text Edit-Modi in sessionStorage speichern
  useEffect(() => {
    sessionStorage.setItem('editShortDesc', editShortDesc.toString());
  }, [editShortDesc]);

  useEffect(() => {
    sessionStorage.setItem('editAboutMe', editAboutMe.toString());
  }, [editAboutMe]);

  // Text Drafts werden nicht mehr in sessionStorage gespeichert

  // Initialisiere Text-Drafts wenn Profil geladen wird
  useEffect(() => {
    if (profile) {

      // Lade Texte immer aus der Datenbank, falls vorhanden
      if (profile.short_about_me !== undefined) {
        setShortDescription(profile.short_about_me || '');
        setShortDescDraft(profile.short_about_me || '');
      }

      if (profile.long_about_me !== undefined) {
        setAboutMe(profile.long_about_me || '');
        setAboutMeDraft(profile.long_about_me || '');
      }
    }
  }, [profile]);

  // Handler für Speichern der kurzen Beschreibung
  const handleSaveShortDescription = async (newText: string) => {
    if (!user || !profile) return;

    try {


      // Nur das shortAboutMe Feld speichern
      const { data, error } = await caretakerProfileService.saveProfile(user.id, {
        shortAboutMe: newText,
      });

      if (error) {
        console.error('❌ Fehler beim Speichern der kurzen Beschreibung:', error);
        return;
      }



      setShortDescription(newText);
      setProfile((prev: any) => ({ ...prev, short_about_me: newText }));
      setEditShortDesc(false);
      // Cleanup sessionStorage
      sessionStorage.removeItem('editShortDesc');
    } catch (error) {
      console.error('❌ Exception beim Speichern der kurzen Beschreibung:', error);
    }
  };

  // Handler für Speichern der langen Beschreibung
  const handleSaveAboutMe = async (newText: string) => {
    if (!user || !profile) return;

    try {


      // Nur das longAboutMe Feld speichern
      const { data, error } = await caretakerProfileService.saveProfile(user.id, {
        longAboutMe: newText,
      });

      if (error) {
        console.error('❌ Fehler beim Speichern der Über mich Beschreibung:', error);
        return;
      }



      setAboutMe(newText);
      setProfile((prev: any) => ({ ...prev, long_about_me: newText }));
      setEditAboutMe(false);
      // Cleanup sessionStorage
      sessionStorage.removeItem('editAboutMe');
    } catch (error) {
      console.error('❌ Exception beim Speichern der Über mich Beschreibung:', error);
    }
  };

  // Handler für Short-Term Availability Toggle (mit Datenbank-Speicherung)
  const handleShortTermAvailabilityToggle = async () => {
    if (shortTermLoading || !user) return;

    setShortTermLoading(true);
    const newValue = !shortTermAvailable;

    try {
      // Speichere in der Datenbank
      const { error } = await caretakerProfileService.saveProfile(user.id, {
        shortTermAvailable: newValue
      });

      if (error) {
        console.error('Fehler beim Speichern der Kurzfristig-Verfügbar Option:', error);
        setShortTermLoading(false);
        return;
      }

      // Aktualisiere lokalen State und Context nur bei erfolgreichem Speichern
      setShortTermAvailable(newValue);
      setProfile((prev: any) => ({ ...prev, short_term_available: newValue }));

    } catch (error) {
      console.error('Fehler beim Speichern der Kurzfristig-Verfügbar Option:', error);
    } finally {
      setShortTermLoading(false);
    }
  };

  // Handler für Profil-Freigabe anfordern
  const handleRequestApproval = async () => {
    if (approvalLoading || !user || !profile) return;

    setApprovalLoading(true);

    try {
      // Import AdminApprovalService dynamisch
      const { AdminApprovalService } = await import('../lib/services/adminApprovalService');

      // Freigabe anfordern
      await AdminApprovalService.requestApproval(user.id);

      // Lokalen State aktualisieren
      setProfile((prev: any) => ({
        ...prev,
        approval_status: 'pending',
        approval_requested_at: new Date().toISOString()
      }));



      // Erfolgs-Benachrichtigung anzeigen
      showSuccess(
        'Profil erfolgreich eingereicht!',
        'Ihr Profil wurde zur Freigabe eingereicht. Sie erhalten eine Benachrichtigung, sobald es von einem Administrator überprüft wurde.',
        6000
      );

    } catch (error: any) {
      console.error('❌ Fehler beim Anfordern der Freigabe:', error);

      // Fehler-Benachrichtigung anzeigen
      const errorMessage = error?.message || 'Ein unbekannter Fehler ist aufgetreten.';
      showError(
        'Fehler beim Einreichen',
        errorMessage,
        8000
      );

    } finally {
      setApprovalLoading(false);
    }
  };

  // Handler für Speichern der Öffnungszeiten (für andere Dienstleister)
  const handleOpeningHoursChange = async (newOpeningHours: Record<string, { open: string; close: string; closed: boolean }> | null) => {
    if (!user || !profile) return;

    // Wenn null oder leer, setze null in der Datenbank
    if (!newOpeningHours || Object.keys(newOpeningHours).length === 0) {
      try {
        const { error } = await caretakerProfileService.saveProfile(user.id, {
          oeffnungszeiten: null as any,
        });

        if (error) {
          console.error('❌ Fehler beim Löschen der Öffnungszeiten:', error);
          showError('Fehler beim Löschen der Öffnungszeiten');
          return;
        }

        setOpeningHours(null);
        setProfile((prev: any) => ({ ...prev, oeffnungszeiten: null }));
        showSuccess('Öffnungszeiten wurden entfernt');
        return;
      } catch (err) {
        console.error('Fehler beim Löschen der Öffnungszeiten:', err);
        showError('Fehler beim Löschen der Öffnungszeiten');
        return;
      }
    }

    // Konvertiere für Datenbank-Format
    const dbOpeningHours: Record<string, any> = {};
    Object.entries(newOpeningHours).forEach(([day, hours]) => {
      if (hours.closed) {
        dbOpeningHours[day] = null; // Geschlossen
      } else {
        dbOpeningHours[day] = {
          open: hours.open,
          close: hours.close
        };
      }
    });

    // Sofort lokalen State aktualisieren
    setOpeningHours(newOpeningHours);
    setProfile((prev: any) => ({ ...prev, oeffnungszeiten: dbOpeningHours }));

    try {
      const { data, error } = await caretakerProfileService.saveProfile(user.id, {
        oeffnungszeiten: dbOpeningHours,
      });

      if (error) {
        console.error('❌ Fehler beim Speichern der Öffnungszeiten:', error);
        // Wiederherstellen des vorherigen Zustands
        const prevHours = (profile as any).oeffnungszeiten;
        if (prevHours) {
          // Konvertiere zurück für UI
          const convertedHours: Record<string, { open: string; close: string; closed: boolean }> = {};
          Object.entries(prevHours).forEach(([day, hours]: [string, any]) => {
            if (hours && typeof hours === 'object' && hours.open && hours.close) {
              convertedHours[day] = {
                open: hours.open,
                close: hours.close,
                closed: false
              };
            }
          });
          setOpeningHours(Object.keys(convertedHours).length > 0 ? convertedHours : null);
        } else {
          setOpeningHours(null);
        }
        showError('Fehler beim Speichern der Öffnungszeiten');
        return;
      }

      showSuccess('Öffnungszeiten erfolgreich gespeichert');
    } catch (error) {
      console.error('❌ Exception beim Speichern der Öffnungszeiten:', error);
      setOpeningHours(openingHours);
      setProfile((prev: any) => ({ ...prev, oeffnungszeiten: (profile as any).oeffnungszeiten }));
      showError('Fehler beim Speichern der Öffnungszeiten');
    }
  };

  // Handler für Übernachtungs-Verfügbarkeit
  const handleOvernightAvailabilityChange = async (newOvernightAvailability: Record<string, boolean>) => {
    if (!user || !profile) return;



    // Sofort lokalen State aktualisieren für bessere UX
    setOvernightAvailability(newOvernightAvailability);
    setProfile((prev: any) => ({ ...prev, overnight_availability: newOvernightAvailability }));

    try {
      // Nur das overnight_availability Feld aktualisieren
      const { data, error } = await caretakerProfileService.saveProfile(user.id, {
        overnightAvailability: newOvernightAvailability,
      });

      if (error) {
        console.error('❌ Fehler beim Speichern der Übernachtungs-Verfügbarkeit:', error);
        // Bei Fehler: State zurücksetzen
        setOvernightAvailability(overnightAvailability);
        setProfile((prev: any) => ({ ...prev, overnight_availability: overnightAvailability }));
        return;
      }


    } catch (error) {
      console.error('❌ Exception beim Speichern der Übernachtungs-Verfügbarkeit:', error);
      // Bei Exception: State zurücksetzen
      setOvernightAvailability(overnightAvailability);
      setProfile((prev: any) => ({ ...prev, overnight_availability: overnightAvailability }));
    }
  };

  // State für Fotos-Tab
  const [photos, setPhotos] = useState<(string | File)[]>([]);
  const fileInputRefFotos = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  function handlePhotoInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files) {
      setPhotos(prev => [...prev, ...Array.from(files)]);
    }
  }
  function handleDropFotos(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setPhotos(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  }
  function handleDragOverFotos(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  // Hilfsfunktion: Upload eines einzelnen Bildes zu Supabase Storage
  async function uploadPhotoToSupabase(file: File, userId: string): Promise<string | null> {
    try {


      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;



      const { error: uploadError } = await supabase.storage.from('caretaker-home-photos').upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('❌ Upload-Fehler:', uploadError);
        setPhotoError('Fehler beim Bildupload: ' + uploadError.message);
        return null;
      }



      const { data: urlData } = supabase.storage.from('caretaker-home-photos').getPublicUrl(fileName);
      const publicUrl = urlData?.publicUrl || null;



      return publicUrl;
    } catch (error) {
      console.error('❌ Exception beim Upload:', error);
      setPhotoError('Unerwarteter Fehler beim Bildupload');
      return null;
    }
  }

  // Hilfsfunktion: Löschen eines Bildes aus Supabase Storage
  async function deletePhotoFromSupabase(url: string) {
    const match = url.match(/caretaker-home-photos\/([^?]+)/);
    const filePath = match ? match[1] : null;
    if (!filePath) return;
    await supabase.storage.from('caretaker-home-photos').remove([filePath]);
  }

  // Handler für neue Fotos (Upload + DB-Sync)
  async function handleAddPhotos(newFiles: FileList | File[]) {
    if (!user) return;
    setPhotoUploading(true);
    setPhotoError(null);

    // Validierung der Dateien
    const files = Array.from(newFiles);
    for (const file of files) {
      // Prüfe Dateityp
      if (!file.type.startsWith('image/')) {
        setPhotoError('Nur Bilddateien sind erlaubt');
        setPhotoUploading(false);
        return;
      }

      // Prüfe Dateigröße (max 5MB)
      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        setPhotoError('Datei zu groß. Maximale Größe: 5MB');
        setPhotoUploading(false);
        return;
      }
    }

    const uploadedUrls: string[] = [];
    for (const file of files) {
      const url = await uploadPhotoToSupabase(file, user.id);
      if (url) uploadedUrls.push(url);
    }

    // Update caretaker_profiles.home_photos
    const newPhotoList = [...(profile?.home_photos || []), ...uploadedUrls];

    try {
      // Nur das homePhotos Feld aktualisieren
      const { data, error } = await caretakerProfileService.saveProfile(user.id, {
        homePhotos: newPhotoList,
      });

      if (error) {
        console.error('❌ Fehler beim Speichern der Fotos:', error);
        setPhotoError('Fehler beim Speichern der Fotos: ' + error.message);
        return;
      }


      setPhotos(newPhotoList);
      setProfile((p: any) => ({ ...p, home_photos: newPhotoList }));
    } catch (error) {
      console.error('❌ Exception beim Speichern der Fotos:', error);
      setPhotoError('Fehler beim Speichern der Fotos');
    } finally {
      setPhotoUploading(false);
    }
  }

  // Handler für Löschen eines Fotos (Storage + DB)
  async function handleDeletePhoto(idx: number) {
    if (!user || !profile) return;
    const toDelete = photos[idx];
    if (typeof toDelete === 'string') {
      await deletePhotoFromSupabase(toDelete);
      const newPhotoList = photos.filter((_, i) => i !== idx).filter(Boolean) as string[];

      try {
        // Nur das homePhotos Feld aktualisieren
        const { data, error } = await caretakerProfileService.saveProfile(user.id, {
          homePhotos: newPhotoList,
        });

        if (error) {
          console.error('❌ Fehler beim Löschen des Fotos:', error);
          return;
        }


        setPhotos(newPhotoList);
        setProfile((p: any) => ({ ...p, home_photos: newPhotoList }));
      } catch (error) {
        console.error('❌ Exception beim Löschen des Fotos:', error);
      }
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await caretakerProfileService.getProfile(user.id);
        if (error) {
          console.error('Caretaker profile loading error:', error);
        }

        // Wenn kein Profil existiert, lege ein Default-Profil an, damit das Dashboard rendern kann
        let ensuredProfile = data as any;
        if (!ensuredProfile) {

          // Default-Verfügbarkeit in DB-Format erzeugen
          const dbDefaultAvailability: Record<string, string[]> = {};
          for (const [day, slots] of Object.entries(defaultAvailability)) {
            dbDefaultAvailability[day] = slots.map(slot => `${slot.start}-${slot.end}`);
          }
          const { data: created, error: createError } = await caretakerProfileService.saveProfile(user.id, {
            servicesWithCategories: [],
            animalTypes: [],
            serviceRadius: 0,
            availability: dbDefaultAvailability,
            homePhotos: [],
            qualifications: [],
            experienceDescription: '',
            shortAboutMe: '',
            longAboutMe: '',
            languages: [],
            isCommercial: false,
            companyName: '',
            taxNumber: '',
            vatId: '',
            overnightAvailability: {
              Mo: false,
              Di: false,
              Mi: false,
              Do: false,
              Fr: false,
              Sa: false,
              So: false,
            },
          });
          if (createError) {
            console.error('Failed to create default caretaker profile:', createError);
            // Fallback: Erstelle ein lokales Profil-Objekt ohne DB-Speicherung

            const fallbackProfile = {
              id: user.id,
              user_id: user.id,
              services_with_categories: [],
              animal_types: [],
              service_radius: 0,
              short_term_available: false,
              availability: dbDefaultAvailability,
              home_photos: [],
              qualifications: [],
              experience_description: '',
              short_about_me: '',
              long_about_me: '',
              languages: [],
              is_commercial: false,
              company_name: '',
              tax_number: '',
              vat_id: '',
              approval_status: 'not_requested',
              overnight_availability: {
                Mo: false,
                Di: false,
                Mi: false,
                Do: false,
                Fr: false,
                Sa: false,
                So: false,
              },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            setProfile(fallbackProfile);
            setLoading(false);
            return;
          }
          ensuredProfile = Array.isArray(created) ? created[0] : created;
        }

        setProfile(ensuredProfile);

        // Debug: Prüfe ob approval_notes geladen wurde
        if (ensuredProfile?.approval_status === 'rejected') {
          console.log('🔍 Profile loaded with rejected status:', {
            approval_status: ensuredProfile?.approval_status,
            approval_notes: ensuredProfile?.approval_notes,
            has_notes: !!ensuredProfile?.approval_notes
          });
        }

        // Synchronisiere short_term_available mit Context wenn Profil geladen wird
        const profileShortTermAvailable = (ensuredProfile as any)?.short_term_available || false;
        if (profileShortTermAvailable !== shortTermAvailable) {
          setShortTermAvailable(profileShortTermAvailable);
        }

        // Texte-States werden automatisch durch den useEffect oben aktualisiert

        // Aktualisiere skillsDraft mit geladenen Daten (nur wenn keine sessionStorage-Daten vorhanden)
        if (!sessionStorage.getItem('servicesDraft')) {
          const servicesWithCategories = (ensuredProfile as any).services_with_categories || [];

          // Extrahiere Service-Namen und Preise aus der neuen Struktur
          const normalizedServices: string[] = [];
          const prices: Record<string, string> = {};

          if (Array.isArray(servicesWithCategories)) {
            servicesWithCategories.forEach((service: any) => {
              if (service.name && service.name !== 'Anfahrkosten') {
                if (defaultServices.includes(service.name)) {
                  normalizedServices.push(service.name);
                }
                if (service.price) {
                  prices[service.name] = service.price.toString();
                }
              }
            });
          }

          const rawTc = (ensuredProfile as any).travel_cost_config;
          let travelCostDraft = { pricePerKm: '', freeKm: '' };
          if (rawTc && typeof rawTc === 'object' && !Array.isArray(rawTc)) {
            const o = rawTc as Record<string, unknown>;
            if (o.price_per_km != null && o.price_per_km !== '') {
              travelCostDraft = {
                ...travelCostDraft,
                pricePerKm: String(o.price_per_km).replace('.', ','),
              };
            }
            if (o.free_km != null && o.free_km !== '') {
              travelCostDraft = { ...travelCostDraft, freeKm: String(o.free_km) };
            }
          } else {
            const leg = servicesWithCategories.find(
              (s: any) => s?.name === 'Anfahrkosten' && s?.price
            );
            if (leg?.price != null && leg.price !== '') {
              travelCostDraft = { pricePerKm: String(leg.price).replace('.', ','), freeKm: '' };
            }
          }

          setServicesDraft({
            services: normalizedServices,
            servicesWithCategories: servicesWithCategories,
            animal_types: (ensuredProfile as any).animal_types || [],
            prices,
            travelCostDraft,
          });
        }

        if (!sessionStorage.getItem('qualificationsDraft')) {
          setQualificationsDraft({
            qualifications: (ensuredProfile as any).qualifications || [],
            experience_description: (ensuredProfile as any).experience_description || '',
            languages: (ensuredProfile as any).languages || [],
            isCommercial: (ensuredProfile as any).is_commercial || false,
            companyName: (ensuredProfile as any).company_name || '',
            taxNumber: (ensuredProfile as any).tax_number || '',
            vatId: (ensuredProfile as any).vat_id || '',
          });
        }

        // Aktualisiere Fotos-State - filtere ungültige URLs
        const validPhotos = ((ensuredProfile as any).home_photos || [])
          .filter((url: string) => url && typeof url === 'string' && !url.includes('undefined') && !url.includes('null'));
        setPhotos(validPhotos);

        // Lade Übernachtungs-Verfügbarkeit
        const dbOvernightAvailability = (ensuredProfile as any).overnight_availability;


        if (dbOvernightAvailability && typeof dbOvernightAvailability === 'object') {

          setOvernightAvailability(dbOvernightAvailability);
        } else {

          // Fallback: Standard-Werte setzen
          setOvernightAvailability({
            Mo: false,
            Di: false,
            Mi: false,
            Do: false,
            Fr: false,
            Sa: false,
            So: false,
          });
        }

        // Lade Öffnungszeiten für andere Dienstleister
        // Nur laden wenn explizit gesetzt, sonst null (keine Standardwerte)
        const dbOpeningHours = (ensuredProfile as any).oeffnungszeiten;
        if (dbOpeningHours && typeof dbOpeningHours === 'object' && Object.keys(dbOpeningHours).length > 0) {
          // Prüfe ob mindestens ein Tag gesetzt ist (nicht alle null)
          const hasAnyHours = Object.values(dbOpeningHours).some(hours => hours !== null && hours !== undefined);

          if (hasAnyHours) {
            // Konvertiere das Format falls nötig
            const convertedHours: Record<string, { open: string; close: string; closed: boolean }> = {};
            const days = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
            days.forEach(day => {
              if (dbOpeningHours[day] && dbOpeningHours[day] !== null) {
                if (typeof dbOpeningHours[day] === 'object' && dbOpeningHours[day].open && dbOpeningHours[day].close) {
                  convertedHours[day] = {
                    open: dbOpeningHours[day].open,
                    close: dbOpeningHours[day].close,
                    closed: dbOpeningHours[day].closed || false
                  };
                }
              }
              // Wenn kein Wert vorhanden ist, wird der Tag nicht hinzugefügt (nicht in convertedHours)
            });

            // Nur setzen wenn mindestens ein Tag konvertiert wurde
            if (Object.keys(convertedHours).length > 0) {
              setOpeningHours(convertedHours);
            } else {
              setOpeningHours(null);
            }
          } else {
            setOpeningHours(null);
          }
        } else {
          setOpeningHours(null);
        }

        // Verfügbarkeit aus der Datenbank laden und validieren
        const dbAvailability = (ensuredProfile as any).availability;


        if (dbAvailability && typeof dbAvailability === 'object') {
          // Konvertiere String-Array-Daten zu TimeSlot-Objekten
          const validatedAvailability: AvailabilityState = {};

          for (const day of ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']) {
            const daySlots = dbAvailability[day];


            if (Array.isArray(daySlots)) {
              validatedAvailability[day] = daySlots
                .map((timeItem: any) => {
                  if (typeof timeItem === 'string' && timeItem.includes('-')) {
                    const [start, end] = timeItem.split('-');
                    return { start: start.trim(), end: end.trim() };
                  }
                  // Für Rückwärtskompatibilität: Falls bereits TimeSlot-Objekte
                  if (typeof timeItem === 'object' && timeItem?.start && timeItem?.end) {
                    return { start: timeItem.start, end: timeItem.end };
                  }
                  return null;
                })
                .filter((slot): slot is { start: string; end: string } =>
                  slot !== null && slot.start && slot.end
                );
            } else {
              validatedAvailability[day] = [];
            }
          }


          setAvailability(validatedAvailability);
        } else {
          // Falls keine Verfügbarkeit in der DB, verwende leere Verfügbarkeit

          setAvailability(defaultAvailability);
        }
      } catch (err) {
        console.error('Unexpected error loading caretaker profile:', err);
        setError('Unerwarteter Fehler beim Laden des Profils');
      }

      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  // useEffect entfernt - verursachte Re-Renders beim Tab-Wechsel
  // careTakerData wird jetzt nur beim ersten Laden initialisiert

  // Zusätzlicher useEffect für robustes Profile-Loading nach Registrierung
  useEffect(() => {
    const ensureProfileLoaded = async () => {
      if (user && !userProfile && !authLoading && profileLoadAttempts < 5) {

        setProfileLoadAttempts(prev => prev + 1);

        // Verzögerung zwischen Versuchen
        await new Promise(resolve => setTimeout(resolve, 300 * (profileLoadAttempts + 1)));

        try {
          const { userService } = await import('../lib/supabase/db');
          const { data: freshProfile, error } = await userService.getUserProfile(user.id);

          if (!error && freshProfile) {

            // Zwinge einen Re-Render durch setzen der dashboardData
            setDashboardData(prev => ({
              ...prev,
              phoneNumber: freshProfile.phone_number || '',
              email: user.email || '',
              plz: freshProfile.plz || '',
              street: (freshProfile as any).street || '',
              city: freshProfile.city || '',
              dateOfBirth: freshProfile.date_of_birth || '',
              gender: freshProfile.gender || ''
            }));
          }
        } catch (error) {
          console.error('❌ CaretakerDashboard: Failed to manually reload profile:', error);
        }
      }
    };

    ensureProfileLoaded();
  }, [user, userProfile, profileLoadAttempts]); // authLoading entfernt - verursacht Re-Renders beim Tab-Wechsel

  // EINFACHER ANSATZ: Lade Daten einmal beim Start
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!user || !userProfile) {

        return;
      }



      setDashboardData({
        phoneNumber: profileData.phone_number || '',
        email: user.email || '',
        plz: profileData.plz || '',
        street: profileData.street || '',
        city: profileData.city || '',
        dateOfBirth: profileData.date_of_birth || '',
        gender: profileData.gender || '',
        firstName: profileData.first_name || '',
        lastName: profileData.last_name || '',
        isLoading: false,
        isEditing: false
      });


    };

    loadDashboardData();
  }, [user, userProfile]);

  // Entfernt: Real-time Subscription verursacht Konflikte mit Frontend-Save-Operationen
  // Stattdessen verlassen wir uns auf die AuthContext Real-time Updates

  // Profilbild-Upload - Robuste Version wie im OwnerDashboard
  async function uploadProfilePhoto(file: File): Promise<string> {
    try {
      const { supabase } = await import('../lib/supabase/client');
      const fileExt = file.name.split('.').pop();
      const filePath = `profile-${user!.id}-${Date.now()}.${fileExt}`;
      const { error } = await supabase.storage.from('profile-photos').upload(filePath, file, { upsert: true });
      if (error) throw error;
      const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Fehler beim Upload zu Supabase:', error);
      throw new Error('Fehler beim Hochladen des Bildes: ' + (error as any)?.message || 'Unbekannter Fehler');
    }
  }

  const handleCroppedImageSave = async (croppedImageUrl: string) => {
    if (!user) return;
    console.log('🖼️ Starting profile image save...');
    setAvatarUploading(true);
    setAvatarError(null);

    try {
      // Konvertiere Data URL zu Blob
      console.log('📸 Converting image to blob...');
      const response = await fetch(croppedImageUrl);
      if (!response.ok) {
        throw new Error('Fehler beim Laden des Bildes');
      }

      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Ungültiges Bild: Leere Datei');
      }
      const file = new File([blob], `profile-${user.id}-${Date.now()}.jpg`, { type: 'image/jpeg' });

      console.log('☁️ Uploading to Supabase...');
      const url = await uploadProfilePhoto(file);

      // WICHTIG: Optimistische URL sofort setzen und Modal schließen
      setOptimisticAvatarUrl(url);
      setShowImageCropper(false);

      console.log('💾 Updating profile in database...');
      const { data, error } = await userService.updateUserProfile(user.id, { profilePhotoUrl: url });

      if (error) {
        console.error('❌ Fehler beim Aktualisieren des Profils:', error);
        setAvatarError('Fehler beim Aktualisieren des Profils: ' + error.message);
        return;
      }

      if (data && data[0]) {
        // Aktualisiere nur den lokalen Snapshot, kein globaler Context-Reload
        console.log('✅ Profile updated successfully');
        setRenderProfile(data[0]);
      }

      console.log('✅ Profile image save completed');
    } catch (e: any) {
      console.error('❌ Fehler beim Profilbild-Upload:', e);
      setAvatarError('Fehler beim Hochladen des Profilbilds: ' + (e.message || 'Unbekannter Fehler'));
      // Bei Fehler: optimistische URL zurücksetzen
      setOptimisticAvatarUrl(null);
    } finally {
      console.log('🏁 Finishing profile image save');
      setAvatarUploading(false);
    }
  };

  // NEUE EINFACHE INPUT-HANDLER
  const handleInputChange = (field: string, value: string) => {

    setDashboardData(prev => ({
      ...prev,
      [field]: value
    }));
  };
  // NEUER EINFACHER SAVE-HANDLER
  const handleSaveDashboardData = async () => {
    if (!user) return;

    try {


      // Daten für Update vorbereiten
      const dataToUpdate = {
        phoneNumber: dashboardData.phoneNumber,
        email: dashboardData.email,
        plz: dashboardData.plz,
        street: dashboardData.street,
        city: dashboardData.city,
        dateOfBirth: dashboardData.dateOfBirth || null,
        gender: dashboardData.gender || null,
        firstName: dashboardData.firstName,
        lastName: dashboardData.lastName
      };



      // Import userService
      const { userService } = await import('../lib/supabase/db');

      // Speichere in DB
      const { data: updatedProfile, error: updateError } = await userService.updateUserProfile(user.id, dataToUpdate);

      if (updateError) {
        console.error('❌ Fehler beim Speichern:', updateError);
        alert('Fehler beim Speichern: ' + updateError.message);
        return;
      }



      if (updatedProfile && updatedProfile[0]) {
        const newProfile = updatedProfile[0];

        // AuthContext aktualisieren
        updateProfileState(newProfile);

        // Dashboard-Daten mit DB-Response aktualisieren
        setDashboardData(prev => ({
          ...prev,
          phoneNumber: newProfile.phone_number || '',
          email: newProfile.email || user.email || '',
          plz: newProfile.plz || '',
          street: newProfile.street || '',
          city: newProfile.city || '',
          dateOfBirth: newProfile.date_of_birth || '',
          gender: newProfile.gender || '',
          firstName: newProfile.first_name || '',
          lastName: newProfile.last_name || '',
          isEditing: false
        }));


      }

      setEditData(false);
    } catch (e) {
      console.error('❌ Exception beim Speichern:', e);
      alert('Unerwarteter Fehler beim Speichern');
    }
  };
  const handleCancelEdit = () => {
    // Zurücksetzen auf ursprüngliche Werte
    setDashboardData(prev => ({
      ...prev,
      phoneNumber: userProfile?.phone_number || '',
      email: user?.email || '',
      plz: userProfile?.plz || '',
      street: userProfile?.street || '',
      city: userProfile?.city || '',
      dateOfBirth: userProfile?.date_of_birth || '',
      gender: userProfile?.gender || '',
      firstName: userProfile?.first_name || '',
      lastName: userProfile?.last_name || '',
      isEditing: false
    }));
    setEditData(false);
  };

  // Fallback-Profil für leere userProfile
  const fallbackProfile = {
    first_name: user?.email?.split('@')[0] || 'Benutzer',
    last_name: '',
    email: user?.email || '',
    phone_number: '',
    plz: '',
    street: '',
    city: '',
    user_type: 'caretaker' as const,
    avatar_url: null
  };

  // Hilfsfunktion für Initialen
  function getInitials(first: string | null | undefined, last: string | null | undefined) {
    const f = (first || '').trim();
    const l = (last || '').trim();
    if (f && l) return `${f[0]}${l[0]}`.toUpperCase();
    if (f) return f.slice(0, 2).toUpperCase();
    if (l) return l.slice(0, 2).toUpperCase();
    return 'NN';
  }

  // Profilquelle: bevorzugt stabilen Snapshot, dann Context, dann Fallback
  const profileData = renderProfile || userProfile || fallbackProfile;
  const fullName = `${profileData.first_name || ''} ${profileData.last_name || ''}`.trim() || profileData.email;
  const initials = getInitials(profileData.first_name, profileData.last_name);

  // Prüfe ob es ein Betreuer ist
  const isCaretakerUser = isCaretaker(
    profileData?.user_type,
    profile?.dienstleister_typ,
    profile?.kategorie_id
  );

  // Sichere Avatar-URL mit Fallback für fehlerhafte URLs
  const getAvatarUrl = () => {
    const preferredUrl = optimisticAvatarUrl || profileData.profile_photo_url || profileData.avatar_url;
    if (preferredUrl &&
      !preferredUrl.includes('undefined') &&
      !preferredUrl.includes('null') &&
      preferredUrl.trim() !== '') {
      return preferredUrl;
    }
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=f3f4f6&color=374151&length=2`;
  };

  const avatarUrl = getAvatarUrl();

  // Tab-Navigation für Übersicht/Fotos
  // Standard-Tab: 'uebersicht' funktioniert für alle Dienstleister-Typen
  const [activeTab, setActiveTab] = useState<'uebersicht' | 'fotos' | 'texte' | 'kunden' | 'bewertungen' | 'affiliate' | 'kontaktdaten' | 'sicherheit' | 'verifizierung' | 'mitgliedschaften' | 'verfuegbarkeit' | 'partner'>('uebersicht');

  // Scroll-Position-Persistierung entfernt - Browser sollte das automatisch handhaben
  // Das Problem liegt woanders - wahrscheinlich an anderen useEffect-Hooks die Re-Renders verursachen
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [respondingToReview, setRespondingToReview] = useState<string | null>(null);
  const [responseText, setResponseText] = useState('');

  // Clients/Kunden State
  const [clients, setClients] = useState<ClientData[]>([]);
  const [clientsLoading, setClientsLoading] = useState(false);
  const [clientsError, setClientsError] = useState<string | null>(null);

  // Partner State
  const [partners, setPartners] = useState<any[]>([]);
  const [partnersLoading, setPartnersLoading] = useState(false);
  const [partnersError, setPartnersError] = useState<string | null>(null);
  const [removingPartnerId, setRemovingPartnerId] = useState<string | null>(null);

  // Bewertungen laden
  useEffect(() => {
    async function fetchReviews() {
      if (!user) return;
      setReviewsLoading(true);
      const { data, error } = await supabase
        .from('reviews')
        .select('id, rating, comment, created_at, user_id, caretaker_response, caretaker_response_created_at, users(first_name, last_name)')
        .eq('caretaker_id', user.id)
        .order('created_at', { ascending: false });
      if (!error && data) setReviews(data);
      setReviewsLoading(false);
    }
    if (activeTab === 'bewertungen') fetchReviews();
  }, [activeTab, user]);

  // Kunden laden
  useEffect(() => {
    async function fetchClients() {
      if (!user || !profile?.id) return;
      setClientsLoading(true);
      setClientsError(null);
      try {
        const { data, error } = await ownerCaretakerService.getCaretakerClients(profile.id);
        if (error) {
          setClientsError('Fehler beim Laden der Kunden!');
          setClients([]);
        } else {
          // Transformiere die Daten auf das ClientData Format
          const transformedClients = (data || []).map((client: any) => ({
            id: client.id,
            name: client.name,
            phoneNumber: client.phoneNumber, // Korrigiert: phoneNumber statt phone
            email: client.email,
            address: client.address,
            city: client.city,
            plz: client.plz,
            vetName: client.vetName,
            vetAddress: client.vetAddress,
            vetPhone: client.vetPhone,
            emergencyContactName: client.emergencyContactName,
            emergencyContactPhone: client.emergencyContactPhone,
            pets: client.pets || [],
            services: client.services || [],
            otherWishes: client.otherWishes || [],
            shareSettings: client.shareSettings
          }));

          setClients(transformedClients);
        }
      } catch (error) {
        console.error('Fehler beim Laden der Kunden:', error);
        setClientsError('Fehler beim Laden der Kunden!');
        setClients([]);
      } finally {
        setClientsLoading(false);
      }
    }
    if (activeTab === 'kunden') fetchClients();
  }, [activeTab, user, profile?.id]);

  // Verifizierungsdaten laden
  useEffect(() => {
    async function fetchVerificationData() {
      if (!user) return;
      setVerificationLoading(true);
      try {
        const [request, status] = await Promise.all([
          VerificationService.getVerificationRequest(user.id),
          VerificationService.getVerificationStatus(user.id)
        ]);
        setVerificationRequest(request);
        setVerificationStatus(status.status);
      } catch (error) {
        console.error('Error fetching verification data:', error);
      } finally {
        setVerificationLoading(false);
      }
    }
    if (activeTab === 'verifizierung') fetchVerificationData();
  }, [activeTab, user]);

  // Partner laden
  useEffect(() => {
    async function fetchPartners() {
      if (!user) return;
      setPartnersLoading(true);
      setPartnersError(null);
      try {
        const { data, error } = await caretakerPartnerService.getPartners(user.id);
        if (error) {
          setPartnersError('Fehler beim Laden der Partner!');
          setPartners([]);
        } else {
          setPartners(data || []);
        }
      } catch (error) {
        console.error('Error fetching partners:', error);
        setPartnersError('Fehler beim Laden der Partner!');
        setPartners([]);
      } finally {
        setPartnersLoading(false);
      }
    }
    if (activeTab === 'partner') fetchPartners();
  }, [activeTab, user]);

  // Partner entfernen Handler
  const handleRemovePartner = async (partner: any, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    setRemovingPartnerId(partner.id);
    try {
      const { error } = await caretakerPartnerService.togglePartner(user.id, partner.id);
      if (error) {
        console.error('Fehler beim Entfernen des Partners:', error);
        showError('Fehler beim Entfernen des Partners. Bitte versuche es erneut.');
      } else {
        // Entferne den Partner aus der lokalen Liste
        setPartners(prev => prev.filter(p => p.id !== partner.id));
        showSuccess('Partner erfolgreich entfernt');
      }
    } catch (error) {
      console.error('Unerwarteter Fehler beim Entfernen des Partners:', error);
      showError('Fehler beim Entfernen des Partners. Bitte versuche es erneut.');
    } finally {
      setRemovingPartnerId(null);
    }
  };

  // Bewertung beantworten
  const handleRespondToReview = async (reviewId: string) => {
    if (!responseText.trim()) return;



    try {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          caretaker_response: responseText.trim(),
          caretaker_response_created_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select();



      if (error) {
        console.error('❌ Fehler beim Speichern der Antwort:', error);
        return;
      }

      // Lokalen State aktualisieren
      setReviews(prev => prev.map(review =>
        review.id === reviewId
          ? {
            ...review,
            caretaker_response: responseText.trim(),
            caretaker_response_created_at: new Date().toISOString()
          }
          : review
      ));

      setResponseText('');
      setRespondingToReview(null);
    } catch (error) {
      console.error('Fehler beim Beantworten der Bewertung:', error);
    }
  };

  // Antwort bearbeiten
  const handleEditResponse = async (reviewId: string) => {
    if (!responseText.trim()) return;



    try {
      const { data, error } = await supabase
        .from('reviews')
        .update({
          caretaker_response: responseText.trim(),
          caretaker_response_created_at: new Date().toISOString()
        })
        .eq('id', reviewId)
        .select();



      if (error) {
        console.error('❌ Fehler beim Bearbeiten der Antwort:', error);
        return;
      }

      // Lokalen State aktualisieren
      setReviews(prev => prev.map(review =>
        review.id === reviewId
          ? {
            ...review,
            caretaker_response: responseText.trim(),
            caretaker_response_created_at: new Date().toISOString()
          }
          : review
      ));

      setResponseText('');
      setRespondingToReview(null);
    } catch (error) {
      console.error('Fehler beim Bearbeiten der Antwort:', error);
    }
  };

  // Antwort löschen
  const handleDeleteResponse = async (reviewId: string) => {
    if (!confirm('Möchtest du deine Antwort wirklich löschen?')) return;

    try {
      const { error } = await supabase
        .from('reviews')
        .update({
          caretaker_response: null,
          caretaker_response_created_at: null
        })
        .eq('id', reviewId);

      if (error) {
        console.error('Fehler beim Löschen der Antwort:', error);
        return;
      }

      // Lokalen State aktualisieren
      setReviews(prev => prev.map(review =>
        review.id === reviewId
          ? {
            ...review,
            caretaker_response: null,
            caretaker_response_created_at: null
          }
          : review
      ));
    } catch (error) {
      console.error('Fehler beim Löschen der Antwort:', error);
    }
  };

  // Kunden löschen
  const handleDeleteClient = async (clientId: string) => {
    if (!user) return;

    // Finde den Kunden-Namen für die Bestätigungsabfrage
    const client = clients.find(c => c.id === clientId);
    const clientName = client?.name || 'diesen Kunden';

    try {
      const { error } = await ownerCaretakerService.removeCaretaker(clientId, user.id);
      if (error) {
        console.error('Fehler beim Entfernen des Kunden:', error);
        alert('Fehler beim Entfernen des Kunden. Bitte versuche es erneut.');
        return;
      }

      // Aktualisiere lokalen State
      setClients(prev => prev.filter(client => client.id !== clientId));

      // Erfolgsbenachrichtigung
      alert(`${clientName} wurde erfolgreich entfernt und hat keinen Zugriff mehr auf deine Kontaktdaten.`);
    } catch (error) {
      console.error('Fehler beim Entfernen des Kunden:', error);
      alert('Fehler beim Entfernen des Kunden. Bitte versuche es erneut.');
    }
  };

  // Sicherheit Tab - Passwort ändern
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  // E-Mail ändern State
  const [newEmail, setNewEmail] = useState('');
  const [currentPasswordForEmail, setCurrentPasswordForEmail] = useState('');
  const [emailChangeLoading, setEmailChangeLoading] = useState(false);
  const [emailChangeError, setEmailChangeError] = useState<string | null>(null);
  const [emailChangeSuccess, setEmailChangeSuccess] = useState<string | null>(null);

  // E-Mail-Validierung
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Passwort ändern Handler
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setPasswordError(null);
    setPasswordSuccess(false);

    // Validierung
    if (!passwordData.currentPassword) {
      setPasswordError('Bitte gib dein aktuelles Passwort ein.');
      return;
    }

    if (!passwordData.newPassword) {
      setPasswordError('Bitte gib ein neues Passwort ein.');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Das neue Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Die neuen Passwörter stimmen nicht überein.');
      return;
    }

    if (passwordData.currentPassword === passwordData.newPassword) {
      setPasswordError('Das neue Passwort muss sich vom aktuellen Passwort unterscheiden.');
      return;
    }

    try {
      setPasswordLoading(true);

      // Erst das aktuelle Passwort verifizieren
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: passwordData.currentPassword
      });

      if (signInError) {
        setPasswordError('Das aktuelle Passwort ist nicht korrekt.');
        return;
      }

      // Neues Passwort setzen
      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordData.newPassword
      });

      if (updateError) {
        setPasswordError('Fehler beim Aktualisieren des Passworts: ' + updateError.message);
        return;
      }

      setPasswordSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });

      // Erfolg nach 3 Sekunden ausblenden
      setTimeout(() => setPasswordSuccess(false), 3000);

    } catch (error: any) {
      console.error('Fehler beim Ändern des Passworts:', error);
      setPasswordError('Ein unerwarteter Fehler ist aufgetreten.');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Konto löschen
  const [deleteAccountConfirmation, setDeleteAccountConfirmation] = useState('');
  const [deleteAccountLoading, setDeleteAccountLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Verifizierung Handler
  const handleFileSelect = (files: FileList | null, type: 'ausweis' | 'zertifikat') => {
    if (!files || files.length === 0) return;

    if (type === 'ausweis') {
      setAusweisFile(files[0]);
    } else {
      setZertifikatFiles(Array.from(files));
    }
  };

  const handleSubmitVerification = async () => {
    if (!user || !ausweisFile) {
      showError('Fehler', 'Bitte lade mindestens deinen Ausweis hoch.');
      return;
    }

    setUploadingDocuments(true);
    try {
      const result = await VerificationService.submitVerificationRequest(
        user.id,
        ausweisFile,
        zertifikatFiles
      );

      setVerificationRequest(result);
      setVerificationStatus('pending');
      setAusweisFile(null);
      setZertifikatFiles([]);

      showSuccess(
        'Verifizierung eingereicht!',
        'Deine Dokumente wurden erfolgreich hochgeladen und zur Überprüfung eingereicht. Du erhältst eine Benachrichtigung, sobald die Überprüfung abgeschlossen ist.',
        6000
      );
    } catch (error: any) {
      console.error('Error submitting verification:', error);
      showError(
        'Fehler beim Hochladen',
        error.message || 'Die Dokumente konnten nicht hochgeladen werden. Bitte versuche es erneut.',
        8000
      );
    } finally {
      setUploadingDocuments(false);
    }
  };

  const getVerificationStatusText = (status: string) => {
    switch (status) {
      case 'not_submitted': return 'Nicht eingereicht';
      case 'pending': return 'Ausstehend';
      case 'in_review': return 'In Bearbeitung';
      case 'approved': return 'Genehmigt';
      case 'rejected': return 'Abgelehnt';
      default: return 'Unbekannt';
    }
  };

  const getVerificationStatusColor = (status: string) => {
    switch (status) {
      case 'not_submitted': return 'text-gray-500';
      case 'pending': return 'text-yellow-600';
      case 'in_review': return 'text-blue-600';
      case 'approved': return 'text-green-600';
      case 'rejected': return 'text-red-600';
      default: return 'text-gray-500';
    }
  };

  const getVerificationStatusIcon = (status: string) => {
    switch (status) {
      case 'not_submitted': return <AlertTriangle className="w-5 h-5" />;
      case 'pending': return <Clock className="w-5 h-5" />;
      case 'in_review': return <Eye className="w-5 h-5" />;
      case 'approved': return <CheckCircle className="w-5 h-5" />;
      case 'rejected': return <XCircle className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  // Konto löschen Handler
  const handleDeleteAccount = async () => {
    if (!user) return;

    if (deleteAccountConfirmation !== 'KONTO LÖSCHEN') {
      alert('Bitte gib "KONTO LÖSCHEN" in das Bestätigungsfeld ein.');
      return;
    }

    const finalConfirmation = window.confirm(
      'Bist du dir absolut sicher, dass du dein Konto löschen möchtest?\n\n' +
      '⚠️ WARNUNG: Diese Aktion kann nicht rückgängig gemacht werden!\n\n' +
      '• Alle deine Profildaten werden gelöscht\n' +
      '• Alle Nachrichten und Konversationen werden gelöscht\n' +
      '• Alle Kundendaten werden gelöscht\n' +
      '• Du verlierst den Zugang zu deinem Konto\n\n' +
      'Klicke OK, um dein Konto endgültig zu löschen.'
    );

    if (!finalConfirmation) return;

    try {
      setDeleteAccountLoading(true);

      // Import der userService deleteUser Funktion
      const { userService } = await import('../lib/supabase/db');
      const { error } = await userService.deleteUser(user.id);

      if (error) {
        console.error('Fehler beim Löschen des Kontos:', error);
        alert('Fehler beim Löschen des Kontos. Bitte versuche es erneut oder kontaktiere den Support.');
        return;
      }

      // Der User wird automatisch ausgeloggt durch die deleteUser Funktion
      alert('Dein Konto wurde erfolgreich gelöscht. Du wirst zur Startseite weitergeleitet.');

      // Navigation zur Startseite erfolgt automatisch durch den Auth-Context
    } catch (error: any) {
      console.error('Fehler beim Löschen des Kontos:', error);
      alert('Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut oder kontaktiere den Support.');
    } finally {
      setDeleteAccountLoading(false);
    }
  };

  // Entfernt: kein Early-Return bei !user, um UI-Flackern bei kurzen Context-Updates zu vermeiden

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-red-600">{error}</div>
      </div>
    );
  }

  // Wenn kein Caretaker-Profil existiert, aber Onboarding aktiv ist, zeige nur das Onboarding-Modal
  if (!profile && !loading && showOnboarding) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Registration Onboarding Modal */}
        <RegistrationSuccessModal
          isOpen={showOnboarding}
          userType="caretaker"
          userName={onboardingUserName}
          categoryName={onboardingCategoryName}
          specificUserType={onboardingSpecificUserType}
          onComplete={dismissCaretakerOnboarding}
          onSkip={dismissCaretakerOnboarding}
        />
      </div>
    );
  }

  // Wenn kein Caretaker-Profil existiert, zeige trotzdem das Dashboard
  // Das Profil wird automatisch erstellt, wenn der User das erste Mal speichert
  if (!profile && !loading && !showOnboarding) {

    // Erstelle ein leeres Profil-Objekt für das Dashboard
    const emptyProfile = {
      id: user?.id || '',
      services_with_categories: [],
      animal_types: [],
      service_radius: 0,
      availability: {},
      home_photos: [],
      qualifications: [],
      experience_description: '',
      short_about_me: '',
      long_about_me: '',
      languages: [],
      is_commercial: false,
      company_name: '',
      tax_number: '',
      vat_id: '',
      short_term_available: false,
      overnight_availability: {
        Mo: false,
        Di: false,
        Mi: false,
        Do: false,
        Fr: false,
        Sa: false,
        So: false,
      },
      hourly_rate: 0,
      rating: 0,
      review_count: 0,
      is_verified: false,
      approval_status: 'not_requested',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Entfernt: Kein Profile-Reset mehr, Dashboard bleibt gefüllt
    setLoading(false);
  }
  return (
    <div className="container-custom px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Profilkarte */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
        <div className="flex flex-col lg:flex-row items-start gap-6">
          <div className="relative w-40 h-40 lg:w-48 lg:h-48 mx-auto lg:mx-0 group flex items-center justify-center">
            <img
              src={avatarUrl}
              alt={fullName}
              className="w-[95%] h-[95%] rounded-xl object-cover border-4 border-primary-100 shadow"
              onError={(e) => {

                const target = e.target as HTMLImageElement;
                const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(initials)}&background=f3f4f6&color=374151&length=2`;
                if (target.src !== fallbackUrl) {
                  target.src = fallbackUrl;
                }
              }}
              onLoad={() => {

              }}
            />
            {/* Overlay für Edit-Button (öffnet Cropper) */}
            <div
              className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-xl flex items-center justify-center cursor-pointer"
              onClick={() => setShowImageCropper(true)}
            >
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-white rounded-full p-2 shadow-lg">
                <Edit className="h-5 w-5 text-primary-600" />
              </div>
            </div>
            {avatarUploading && <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-xl"><div className="w-10 h-10 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div></div>}
          </div>
          <div className="flex-1 w-full">
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Name und Dienstleistung */}
              <div className="flex-1 relative">
                <div className="mb-4">
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-4">
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">{fullName}</h1>
                    {/* Auge-Icon neben dem Namen mit Hovereffekt */}
                    <div className="group relative">
                      <Link
                        to={
                          userProfile?.user_type && ['dienstleister', 'tierarzt', 'hundetrainer', 'tierfriseur', 'physiotherapeut', 'ernaehrungsberater', 'tierfotograf', 'sonstige'].includes(userProfile.user_type)
                            ? `/dienstleister/${user?.id}`
                            : `/betreuer/${user?.id}`
                        }
                        className="inline-flex items-center justify-center w-6 h-6 text-primary-600 hover:text-primary-700 transition-colors"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <div className="absolute left-1/2 transform -translate-x-1/2 top-8 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                        <div className="text-center">Zu meinem Profil</div>
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                      </div>
                    </div>
                    {/* Crown-Icon für Premium-Status mit Hovereffekt */}
                    {profileData?.premium_badge && (
                      <div className="group relative">
                        <div className="inline-flex items-center justify-center w-6 h-6 text-amber-500 hover:text-amber-600 transition-colors">
                          <Crown className="h-4 w-4" />
                        </div>
                        <div className="absolute left-1/2 transform -translate-x-1/2 top-8 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          <div className="text-center">Premium Mitglied</div>
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    )}
                    {/* Freigabe-Icon mit Hovereffekt */}
                    {profile?.approval_status && (
                      <div className="group relative">
                        <div className={`inline-flex items-center justify-center w-6 h-6 transition-colors ${profile.approval_status === 'approved'
                          ? 'text-green-500 hover:text-green-600'
                          : profile.approval_status === 'pending'
                            ? 'text-yellow-500 hover:text-yellow-600'
                            : profile.approval_status === 'rejected'
                              ? 'text-red-500 hover:text-red-600'
                              : 'text-gray-400 hover:text-gray-500'
                          }`}>
                          {profile.approval_status === 'approved' ? (
                            <CheckCircle className="h-4 w-4" />
                          ) : profile.approval_status === 'pending' ? (
                            <Clock className="h-4 w-4" />
                          ) : profile.approval_status === 'rejected' ? (
                            <XCircle className="h-4 w-4" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </div>
                        <div className="absolute left-1/2 transform -translate-x-1/2 top-8 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          <div className="text-center">
                            {profile.approval_status === 'approved'
                              ? 'Profil freigegeben'
                              : profile.approval_status === 'pending'
                                ? 'Freigabe ausstehend'
                                : profile.approval_status === 'rejected'
                                  ? 'Freigabe abgelehnt'
                                  : 'Freigabe nicht angefordert'
                            }
                          </div>
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    )}
                    {/* Briefcase-Icon für Professional-Status mit Hovereffekt */}
                    {profile?.is_commercial && (
                      <div className="group relative">
                        <div className="inline-flex items-center justify-center w-6 h-6 text-purple-600 hover:text-purple-700 transition-colors">
                          <Briefcase className="h-4 w-4" />
                        </div>
                        <div className="absolute left-1/2 transform -translate-x-1/2 top-8 w-48 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          <div className="text-center">Professional</div>
                          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    )}
                    {editData && (
                      <div className="group relative">
                        <Info className="h-5 w-5 text-blue-500 cursor-help" />
                        <div className="absolute left-0 top-8 w-64 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                          <div className="font-medium mb-1">Name ändern</div>
                          <div>Der Name kann nur über das Kontaktformular oder den Support geändert werden.</div>
                          <div className="absolute -top-1 left-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Dienstleistung unter dem Namen */}
                  <div className="mb-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
                      {(() => {
                        // Verwende Snapshot user_type als primäre Quelle, dann profile.dienstleister_typ als Fallback
                        const serviceType = profileData?.user_type || profile?.dienstleister_typ || 'caretaker';

                        switch (serviceType) {
                          case 'hundetrainer': return '🐕 Hundetrainer';
                          case 'tierarzt': return '🩺 Tierarzt';
                          case 'tierfriseur': return '✂️ Tierfriseur';
                          case 'physiotherapeut': return '🏥 Physiotherapeut';
                          case 'ernaehrungsberater': return '🥗 Ernährungsberater';
                          case 'tierfotograf': return '📸 Tierfotograf';
                          case 'sonstige': return '🔧 Sonstige Dienstleistung';
                          default: return '🏠 Betreuer';
                        }
                      })()}
                    </span>
                  </div>

                  {/* Verifiziert-Badge */}
                  {(profile?.is_verified || verificationStatus === 'approved') && (
                    <div className="mb-2">
                      <span className="bg-primary-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full flex items-center">
                        <Verified className="h-2.5 w-2.5 mr-1" /> Verifiziert
                      </span>
                    </div>
                  )}

                  {/* Rechte Seite: Kurzfristig verfügbar und Freigabe-Button untereinander, rechts oben am Rand */}
                  <div className="mt-4 lg:absolute lg:top-0 lg:right-0 flex flex-col items-center lg:items-end gap-2 w-full lg:w-auto">
                    {/* Kurzfristig Verfügbar Toggle */}
                    <div className="flex items-center justify-between lg:justify-end gap-2 w-full sm:w-auto bg-gray-50 lg:bg-transparent p-2 rounded-lg lg:p-0">
                      <span className="text-sm text-gray-600">Kurzfristig verfügbar</span>
                      <button
                        onClick={handleShortTermAvailabilityToggle}
                        disabled={shortTermLoading}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${shortTermAvailable
                          ? 'bg-green-500'
                          : 'bg-gray-300'
                          } ${shortTermLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={shortTermAvailable ? 'Kurzfristig verfügbar - Klicken zum Deaktivieren' : 'Nicht kurzfristig verfügbar - Klicken zum Aktivieren'}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${shortTermAvailable ? 'translate-x-6' : 'translate-x-1'
                            }`}
                        />
                        {shortTermLoading && (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </button>
                    </div>

                    {/* Profil-Freigabe Button */}
                    {profile?.approval_status !== 'approved' && (
                      <div className="flex flex-col items-center lg:items-end gap-2 w-full sm:w-auto">
                        {profile?.approval_status === 'pending' ? (
                          <button
                            disabled
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-lg cursor-not-allowed"
                          >
                            <Clock className="h-4 w-4" />
                            Profil wird überprüft
                          </button>
                        ) : profile?.approval_status === 'rejected' ? (
                          <button
                            onClick={handleRequestApproval}
                            disabled={approvalLoading}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-red-100 text-red-700 text-sm font-medium rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {approvalLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                                Wird gesendet...
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4" />
                                Erneut zur Freigabe geben
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={handleRequestApproval}
                            disabled={approvalLoading}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 text-sm font-medium rounded-lg hover:bg-primary-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {approvalLoading ? (
                              <>
                                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                                Wird gesendet...
                              </>
                            ) : (
                              <>
                                <Shield className="h-4 w-4" />
                                Profil zur Freigabe geben
                              </>
                            )}
                          </button>
                        )}

                        {!approvalHintDismissed && (
                        <div
                          className="relative w-full max-w-md lg:max-w-sm rounded-lg border border-gray-100 bg-gray-50/90 py-3 pl-3 pr-10 text-left text-xs sm:text-sm text-gray-600 leading-relaxed"
                          role="region"
                          aria-label="Hinweis zur Profil-Sichtbarkeit"
                        >
                          <button
                            type="button"
                            onClick={() => setApprovalHintDismissed(true)}
                            className="absolute top-2 right-2 rounded p-0.5 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
                            aria-label="Hinweis schließen"
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </button>
                          <div className="flex gap-2">
                            <Info className="h-4 w-4 shrink-0 text-primary-600 mt-0.5" aria-hidden />
                            <div className="min-w-0 space-y-2 flex-1">
                              <p className="font-medium text-gray-800">Profil ist ohne Freigabe nicht öffentlich</p>
                              <p>
                                Ohne erfolgreiche Freigabe erscheint Ihr Profil nicht in der Betreuer-Suche und ist für andere Nutzer nicht sichtbar.
                              </p>
                              {profile?.approval_status === 'pending' ? (
                                <p>
                                  Ihre Anfrage wird geprüft. Bis zur Entscheidung bleibt das Profil unsichtbar. Sie erhalten eine Rückmeldung nach der Prüfung.
                                </p>
                              ) : (
                                <>
                                  <p>
                                    Fordern Sie die Freigabe aktiv über den Button oben an – tigube prüft jedes Profil manuell, bevor es live geht.
                                  </p>
                                  <p className="font-medium text-gray-700">Voraussetzungen für die Einreichung:</p>
                                  <ul className="list-disc pl-4 space-y-0.5">
                                    <li>Profilbild hinterlegt</li>
                                    <li>„Über mich“ mit mindestens 20 Zeichen (Kurz- und Langtext zusammen)</li>
                                    <li>Mindestens eine Leistung außer alleinigen Anfahrkosten</li>
                                  </ul>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Ablehnungsgrund anzeigen - außerhalb des absoluten Containers, damit er sichtbar ist */}
                  {profile?.approval_status === 'rejected' && (
                    <div className="mt-4 w-full">
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <div className="font-medium text-red-900 text-sm mb-2">
                              Ablehnungsgrund:
                            </div>
                            <div className="text-red-700 text-sm whitespace-pre-wrap">
                              {profile?.approval_notes || 'Keine Angabe verfügbar'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* Kontaktdaten entfernt – jetzt eigener Tab */}
            </div>
          </div>
        </div>
      </div>

      {/* Caretaker Dashboard Banner */}
      <div className="mb-6">
        <AdvertisementBanner
          placement="caretaker_dashboard"
          targetingOptions={{
            petTypes: userProfile?.pet_types || [],
            location: userProfile?.location || '',
            subscriptionType: subscription?.plan_type || 'free'
          }}
        />
      </div>

      {/* Sidebar-Navigation + Content-Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 sm:gap-8 mb-8">
        <aside className="lg:col-span-1 -mx-4 px-4 sm:mx-0 sm:px-0">
          <nav className="bg-white rounded-xl shadow p-2 sm:p-4 lg:sticky lg:top-4 overflow-x-auto scrollbar-hide">
            <ul className="flex flex-row lg:flex-col gap-2 lg:gap-0 lg:space-y-1">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('kunden')}
                  aria-current={activeTab === 'kunden' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'kunden'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Kunden
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('uebersicht')}
                  aria-current={activeTab === 'uebersicht' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'uebersicht'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Leistungen & Qualifikationen
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('kontaktdaten')}
                  aria-current={activeTab === 'kontaktdaten' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'kontaktdaten'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Kontaktdaten
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('verfuegbarkeit')}
                  aria-current={activeTab === 'verfuegbarkeit' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'verfuegbarkeit'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {isCaretakerUser ? 'Verfügbarkeit' : 'Öffnungszeiten'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('fotos')}
                  aria-current={activeTab === 'fotos' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'fotos'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  {isCaretakerUser ? 'Fotos' : 'Portfolio'}
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('texte')}
                  aria-current={activeTab === 'texte' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'texte'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Über mich
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('affiliate')}
                  aria-current={activeTab === 'affiliate' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'affiliate'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Affiliate Programm
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('bewertungen')}
                  aria-current={activeTab === 'bewertungen' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'bewertungen'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Bewertungen
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('sicherheit')}
                  aria-current={activeTab === 'sicherheit' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'sicherheit'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Sicherheit
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('verifizierung')}
                  aria-current={activeTab === 'verifizierung' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'verifizierung'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Verifizierung
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('partner')}
                  aria-current={activeTab === 'partner' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'partner'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Partner
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveTab('mitgliedschaften')}
                  aria-current={activeTab === 'mitgliedschaften' ? 'page' : undefined}
                  className={`w-full whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'mitgliedschaften'
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-700 hover:bg-gray-50'
                    }`}
                >
                  Mitgliedschaft
                </button>
              </li>
              <li>
                <Link
                  to="/hilfe-center"
                  className="w-full flex whitespace-nowrap text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-700 hover:bg-gray-50 items-center"
                >
                  Hilfe-Center
                </Link>
              </li>
            </ul>
          </nav>
        </aside>
        <section className="lg:col-span-3">
          {/* Tab-Inhalt */}
          {activeTab === 'uebersicht' && (
            <div className="space-y-8">
              {/* Leistungen */}
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 mb-2"><PawPrint className="w-5 h-5" /> Leistungen</h2>
                <div className="bg-white rounded-xl shadow p-6 relative">
                  {!editServices && (
                    <button className="absolute top-4 right-4 p-2 text-gray-400 hover:text-primary-600" onClick={() => setEditServices(true)} title="Bearbeiten">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!editServices ? (
                    <>
                      {/* Alle Leistungen aus services_with_categories */}
                      <div className="mb-4">
                        <span className="font-semibold text-gray-900">Leistungen:</span>
                        <div className="mt-2 space-y-2">
                          {(profile?.services_with_categories &&
                            Array.isArray(profile.services_with_categories) &&
                            profile.services_with_categories.some((s: any) => s?.name && !isExcludedFromAbPrice(s.name))) ? (
                              <>
                              {(profile?.services_with_categories ?? [])
                                .filter((s: any) => s?.name && !isExcludedFromAbPrice(s.name))
                                .map((service: any, index: number) => {
                              const isStandardService = defaultServices.includes(service.name);

                              return (
                                <div
                                  key={index}
                                  className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border gap-3 ${
                                    isStandardService
                                      ? 'bg-green-50 border-green-200'
                                      : 'bg-blue-50 border-blue-200'
                                  }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded border-2 border-primary-300 bg-primary-100 flex items-center justify-center shrink-0">
                                      <Check className="w-3 h-3 text-primary-600" />
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="font-medium text-gray-900 line-clamp-1">{service.name}</span>
                                      {service.category_name && service.category_name !== 'Allgemein' && (
                                        <span className="text-xs text-gray-500">{service.category_name}</span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right w-full sm:w-auto">
                                    {service.price ? (
                                      <span className="font-semibold text-primary-600">
                                        {formatCurrency(
                                          typeof service.price === 'string'
                                            ? parseFloat(service.price)
                                            : Number(service.price)
                                        )}
                                        {priceTypeSuffixGerman(parseEffectivePriceType(service.price_type))}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-400">Kein Preis</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                              {formatTravelCostGerman(
                                resolveTravelCostConfig(
                                  profile?.travel_cost_config,
                                  profile?.services_with_categories ?? []
                                )
                              ) && (
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border gap-3 bg-orange-50 border-orange-200">
                                  <div className="flex items-center gap-3">
                                    <div className="w-4 h-4 rounded border-2 border-orange-300 bg-orange-100 flex items-center justify-center shrink-0">
                                      <Check className="w-3 h-3 text-orange-600" />
                                    </div>
                                    <span className="font-medium text-gray-900">Anfahrtskosten</span>
                                  </div>
                                  <div className="text-right w-full sm:w-auto">
                                    <span className="font-semibold text-primary-600">
                                      {formatTravelCostGerman(
                                        resolveTravelCostConfig(
                                          profile?.travel_cost_config,
                                          profile?.services_with_categories ?? []
                                        )
                                      )}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <span className="text-gray-400">Keine Leistungen angegeben</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tierarten */}
                      <div className="mb-2">
                        <span className="font-semibold text-gray-900">Tierarten:</span>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {(profile?.animal_types && profile.animal_types.length > 0) ? (profile.animal_types as string[]).map((a: string) => (
                            <span key={a} className="bg-primary-100 text-primary-700 border border-primary-300 px-2 py-1 rounded text-xs">{a}</span>
                          )) : <span className="text-gray-400">Keine Angaben</span>}
                        </div>
                      </div>
                    </>
                  ) : (
                    // Edit-Modus-Leistungen
                    <form onSubmit={e => { e.preventDefault(); handleSaveServices(); }} className="space-y-6">
                      {/* Vordefinierte Dienstleistungen für die eigene Kategorie */}
                      <div>
                        <label className="block text-sm font-medium mb-4">Dienstleistungen</label>
                        <div className="space-y-3">
                          {defaultServices.map((service) => (
                            <div key={service} className="flex items-center gap-4 p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3 flex-1">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                  checked={servicesDraft.services.includes(service)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      const defaultPt = defaultPriceTypeFromHint(servicePriceHints[service]);
                                      setServicesDraft(d => ({
                                        ...d,
                                        services: [...d.services, service],
                                        servicesWithCategories: d.servicesWithCategories.some(
                                          s => s.name === service
                                        )
                                          ? d.servicesWithCategories
                                          : [
                                              ...d.servicesWithCategories,
                                              {
                                                name: service,
                                                category_id: 8,
                                                category_name: 'Allgemein',
                                                price_type: defaultPt,
                                              },
                                            ],
                                      }));
                                    } else {
                                      const newPrices = { ...servicesDraft.prices };
                                      delete newPrices[service];
                                      setServicesDraft(d => ({
                                        ...d,
                                        services: d.services.filter((s: string) => s !== service),
                                        prices: newPrices,
                                        servicesWithCategories: d.servicesWithCategories.filter(
                                          s => s.name !== service
                                        ),
                                      }));
                                    }
                                  }}
                                />
                                <span className="font-medium text-gray-700">{service}</span>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 justify-end">
                                <ServicePriceTypeSelect
                                  className={`input w-36 text-sm ${!servicesDraft.services.includes(service) ? 'opacity-50 bg-gray-100' : ''}`}
                                  value={priceTypeSelectValue(
                                    servicesDraft.servicesWithCategories.find(s => s.name === service)
                                      ?.price_type
                                  )}
                                  onChange={pt => handleServicePriceTypeChange(service, pt)}
                                  disabled={!servicesDraft.services.includes(service)}
                                />
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className={`input w-24 ${!servicesDraft.services.includes(service) ? 'opacity-50 bg-gray-100' : ''}`}
                                  placeholder="€"
                                  value={servicesDraft.prices[service] || ''}
                                  onChange={e => handlePriceChange(service, e.target.value)}
                                  disabled={!servicesDraft.services.includes(service)}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Zusätzliche Leistungen */}
                      <div>
                        <label className="block text-sm font-medium mb-3">Zusätzliche Leistungen</label>
                        <div className="space-y-3">
                          {Object.entries(servicesDraft.prices)
                            .filter(([k, _]) => !defaultServices.includes(k) && k !== 'Anfahrkosten')
                            .map(([k, v], index) => {
                            // Finde die Kategorie für diesen Service
                            const serviceCategory = servicesDraft.servicesWithCategories.find(service =>
                              service.name === k
                            );
                            const currentCategoryId = serviceCategory?.category_id || 8;

                            return (
                              <div key={`custom-price-${index}`} className="flex gap-2 items-center p-3 border rounded-lg">
                                <input
                                  className="input flex-1"
                                  placeholder="Leistungsname"
                                  defaultValue={k.startsWith('custom_') ? '' : k}
                                  onBlur={e => {
                                    const newKey = e.target.value.trim();
                                    if (newKey === '' || newKey === k) return;

                                    // Update prices
                                    const newPrices = { ...servicesDraft.prices };
                                    const priceVal = newPrices[k];
                                    delete newPrices[k];
                                    newPrices[newKey] = priceVal;

                                    // Update servicesWithCategories
                                    const updatedServices = servicesDraft.servicesWithCategories.map(service => {
                                      if (service.name === k) {
                                        return {
                                          ...service,
                                          name: newKey
                                        };
                                      }
                                      return service;
                                    });

                                    setServicesDraft(d => ({
                                      ...d,
                                      prices: newPrices,
                                      servicesWithCategories: updatedServices
                                    }));
                                  }}
                                />
                                <select
                                  className="input w-32"
                                  defaultValue={currentCategoryId}
                                  onChange={e => {
                                    const categoryId = parseInt(e.target.value);
                                    const category = serviceCategories.find(cat => cat.id === categoryId);
                                    if (category) {
                                      // Aktualisiere die servicesWithCategories
                                      const updatedServices = servicesDraft.servicesWithCategories.map(service => {
                                        if (service.name === k) {
                                          return {
                                            ...service,
                                            category_id: categoryId,
                                            category_name: category.name
                                          };
                                        }
                                        return service;
                                      });
                                      setServicesDraft(d => ({ ...d, servicesWithCategories: updatedServices }));
                                    }
                                  }}
                                >
                                  {serviceCategories.map((category: any) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                                <ServicePriceTypeSelect
                                  value={priceTypeSelectValue(
                                    servicesDraft.servicesWithCategories.find(s => s.name === k)?.price_type
                                  )}
                                  onChange={pt => handleServicePriceTypeChange(k, pt)}
                                />
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  className="input w-24"
                                  placeholder="€"
                                  value={String(v)}
                                  onChange={e => handlePriceChange(k, e.target.value)}
                                />
                                <button
                                  type="button"
                                  className="text-red-500 hover:bg-red-50 rounded p-2"
                                  onClick={() => handleRemovePrice(k)}
                                  title="Entfernen"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            );
                          })}
                          <button
                            type="button"
                            className="text-primary-600 hover:bg-primary-50 rounded px-3 py-2 text-sm border border-dashed border-primary-300 w-full"
                            onClick={handleAddPrice}
                          >
                            + Zusätzliche Leistung hinzufügen
                          </button>
                        </div>
                      </div>

                      {/* Anfahrkosten (€/km, optional Frei‑km) */}
                      <div>
                        <label className="block text-sm font-medium mb-3">{travelCostsLabel}</label>
                        <div className="flex flex-wrap items-center gap-4 p-3 border rounded-lg">
                          <span className="font-medium text-gray-700 flex-1 min-w-[120px]">Anfahrtskosten</span>
                          <div className="flex flex-wrap gap-3 items-center">
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                              €/km
                              <input
                                type="text"
                                inputMode="decimal"
                                className="input w-28"
                                placeholder="z.B. 0,30"
                                value={servicesDraft.travelCostDraft.pricePerKm}
                                onChange={e => handleTravelCostDraftChange('pricePerKm', e.target.value)}
                              />
                            </label>
                            <label className="flex items-center gap-2 text-sm text-gray-600">
                              erste km frei
                              <input
                                type="text"
                                inputMode="numeric"
                                className="input w-20"
                                placeholder="0"
                                value={servicesDraft.travelCostDraft.freeKm}
                                onChange={e => handleTravelCostDraftChange('freeKm', e.target.value)}
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* Tierarten */}
                      <div>
                        <label className="block text-sm font-medium mb-1">Tierarten</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {defaultAnimals.map((a: string) => (
                            <label key={a} className={`px-2 py-1 rounded text-xs cursor-pointer border ${servicesDraft.animal_types.includes(a) ? 'bg-primary-100 text-primary-700 border-primary-300' : 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                              <input type="checkbox" className="mr-1" checked={servicesDraft.animal_types.includes(a)} onChange={e => handleServicesChange('animal_types', e.target.checked ? [...servicesDraft.animal_types, a] : servicesDraft.animal_types.filter((x: string) => x !== a))} />
                              {a}
                            </label>
                          ))}
                          {servicesDraft.animal_types.filter((a: string) => !defaultAnimals.includes(a)).map((a: string) => (
                            <span key={a} className="flex items-center px-2 py-1 rounded text-xs bg-primary-100 text-primary-700 border border-primary-300">
                              {a}
                              <button type="button" className="ml-1 text-gray-400 hover:text-red-500" onClick={() => handleServicesChange('animal_types', servicesDraft.animal_types.filter((x: string) => x !== a))} title="Entfernen">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </span>
                          ))}
                        </div>
                        <div className="space-y-3">
                          {newAnimal.trim() && (
                            <div className="flex gap-2 items-center p-3 border rounded-lg">
                              <input
                                className="input flex-1"
                                placeholder="Neue Tierart"
                                value={newAnimal}
                                onChange={e => setNewAnimal(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && newAnimal.trim()) {
                                    handleServicesChange('animal_types', [...servicesDraft.animal_types, newAnimal.trim()]);
                                    setNewAnimal('');
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="text-green-600 hover:bg-green-100 rounded p-2"
                                disabled={!newAnimal.trim()}
                                onClick={() => {
                                  handleServicesChange('animal_types', [...servicesDraft.animal_types, newAnimal.trim()]);
                                  setNewAnimal('');
                                }}
                                title="Hinzufügen"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className="text-gray-400 hover:text-red-500 rounded p-2"
                                onClick={() => setNewAnimal('')}
                                title="Abbrechen"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                          <button
                            type="button"
                            className="text-primary-600 hover:bg-primary-50 rounded px-3 py-2 text-sm border border-dashed border-primary-300 w-full"
                            onClick={() => setNewAnimal('Neue Tierart')}
                          >
                            + Neue Tierart hinzufügen
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm">Speichern</button>
                        <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm" onClick={handleCancelServices}>Abbrechen</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>

              {/* Qualifikationen */}
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 mb-2"><Shield className="w-5 h-5" /> Qualifikationen</h2>
                <div className="bg-white rounded-xl shadow p-6 relative">
                  {!editQualifications && (
                    <button className="absolute top-4 right-4 p-2 text-gray-400 hover:text-primary-600" onClick={() => setEditQualifications(true)} title="Bearbeiten">
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {!editQualifications ? (
                    <>
                      <div className="mb-4">
                        <span className="font-semibold text-gray-900">Qualifikationen:</span>
                        <div className="mt-2 space-y-2">
                          {profile.qualifications?.length > 0 ? (
                            profile.qualifications.map((q: string) => (
                              <div key={q} className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-4 h-4 rounded border-2 border-primary-600 bg-primary-600 flex items-center justify-center">
                                    <Check className="w-3 h-3 text-white" />
                                  </div>
                                  <span className="font-medium text-gray-900">{q}</span>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <span className="text-gray-400">Keine Qualifikationen angegeben</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Sprachen */}
                      <div className="mb-4">
                        <span className="font-semibold text-gray-900">Sprachen:</span>
                        <div className="mt-2 space-y-2">
                          {profile.languages?.length ? profile.languages.map((lang: string) => (
                            <div key={lang} className="flex items-center p-3 bg-purple-50 border border-purple-200 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="w-4 h-4 rounded border-2 border-purple-300 bg-purple-100 flex items-center justify-center">
                                  <Check className="w-3 h-3 text-purple-600" />
                                </div>
                                <span className="font-medium text-gray-900">{lang}</span>
                              </div>
                            </div>
                          )) : (
                            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                              <span className="text-gray-400">Keine Sprachen angegeben</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Erfahrung */}
                      <div className="mb-4">
                        <span className="font-semibold text-gray-900">Erfahrung:</span>
                        <div className="mt-2">
                          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                            <div className="text-gray-700 text-sm whitespace-pre-line">
                              {profile.experience_description || <span className="text-gray-400">Keine Erfahrung angegeben</span>}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Commercial Information */}
                      {profile.is_commercial && (
                        <div className="mb-4">
                          <span className="font-semibold text-gray-900">Gewerblicher Betreuer:</span>
                          <div className="mt-2 space-y-2">
                            {profile.company_name && (
                              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <span className="font-medium text-gray-900">Firmenname</span>
                                <span className="font-semibold text-primary-600">{profile.company_name}</span>
                              </div>
                            )}
                            {profile.tax_number && (
                              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <span className="font-medium text-gray-900">Steuernummer</span>
                                <span className="font-semibold text-primary-600">{profile.tax_number}</span>
                              </div>
                            )}
                            {profile.vat_id && (
                              <div className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                                <span className="font-medium text-gray-900">USt-IdNr.</span>
                                <span className="font-semibold text-primary-600">{profile.vat_id}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    // Edit-Modus-Qualifikationen
                    <form onSubmit={e => { e.preventDefault(); handleSaveQualifications(); }} className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Qualifikationen</label>
                        <div className="flex flex-wrap gap-2 mb-2">
                          {/* Qualifikationen als Chips */}
                          {qualificationsDraft.qualifications.map((q: string) => (
                            <span key={q} className="flex items-center px-2 py-1 rounded text-xs bg-primary-100 text-primary-700 border border-primary-300">
                              {q}
                              <button type="button" className="ml-1 text-gray-400 hover:text-red-500" onClick={() => handleQualificationsChange('qualifications', qualificationsDraft.qualifications.filter((x: string) => x !== q))} title="Entfernen">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                              </button>
                            </span>
                          ))}
                        </div>
                        {newQualification !== null && (
                          <div className="space-y-2 mt-2">
                            <div className="flex gap-2 items-center p-3 border border-primary-200 rounded-lg bg-primary-50/30">
                              <input
                                className="input flex-1"
                                placeholder="z.B. Erste-Hilfe Kurs, Hundetrainer-Zertifikat..."
                                value={newQualification}
                                autoFocus
                                onChange={e => setNewQualification(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && newQualification.trim()) {
                                    handleQualificationsChange('qualifications', [...qualificationsDraft.qualifications, newQualification.trim()]);
                                    setNewQualification('');
                                  }
                                  if (e.key === 'Escape') {
                                    setNewQualification(null);
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className="text-green-600 hover:bg-green-100 rounded p-2"
                                disabled={!newQualification.trim()}
                                onClick={() => {
                                  if (newQualification.trim()) {
                                    handleQualificationsChange('qualifications', [...qualificationsDraft.qualifications, newQualification.trim()]);
                                    setNewQualification(null);
                                  }
                                }}
                                title="Hinzufügen"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                className="text-gray-400 hover:text-red-500 rounded p-2"
                                onClick={() => setNewQualification(null)}
                                title="Abbrechen"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                        {newQualification === null && (
                          <button
                            type="button"
                            className="text-primary-600 hover:bg-primary-50 rounded px-3 py-2 text-sm border border-dashed border-primary-300 w-full mt-2"
                            onClick={() => setNewQualification('')}
                          >
                            + Neue Qualifikation hinzufügen
                          </button>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Sprachen</label>
                        <LanguageSelector
                          selectedLanguages={qualificationsDraft.languages}
                          onChange={(languages) => handleQualificationsChange('languages', languages)}
                        />
                      </div>
                      <div>
                        <CommercialInfoInput
                          isCommercial={qualificationsDraft.isCommercial}
                          companyName={qualificationsDraft.companyName}
                          taxNumber={qualificationsDraft.taxNumber}
                          vatId={qualificationsDraft.vatId}
                          onIsCommercialChange={(value) => {
                            handleQualificationsChange('isCommercial', value);
                            if (!value) {
                              handleQualificationsChange('companyName', '');
                              handleQualificationsChange('taxNumber', '');
                              handleQualificationsChange('vatId', '');
                            }
                          }}
                          onCompanyNameChange={(value) => handleQualificationsChange('companyName', value)}
                          onTaxNumberChange={(value) => handleQualificationsChange('taxNumber', value)}
                          onVatIdChange={(value) => handleQualificationsChange('vatId', value)}
                          errors={{
                            taxNumber: qualificationsDraft.isCommercial && !qualificationsDraft.taxNumber.trim() && !qualificationsDraft.vatId.trim() ? `Steuernummer oder USt-IdNr. ist bei gewerblichen ${isCaretakerUser ? 'Betreuern' : 'Dienstleistern'} erforderlich` : undefined
                          }}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Erfahrung</label>
                        <textarea
                          className="input w-full min-h-[60px]"
                          value={qualificationsDraft.experience_description}
                          onChange={e => handleQualificationsChange('experience_description', e.target.value)}
                          placeholder={isCaretakerUser
                            ? "Erzähle den Tierhaltern von deiner Erfahrung mit Tieren, inkl. beruflicher Erfahrung oder eigenen Tieren"
                            : "Erzähle den Tierhaltern von deiner Erfahrung, inkl. beruflicher Qualifikationen und Expertise"}
                        />
                      </div>
                      <div className="flex gap-2 pt-2">
                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded hover:bg-primary-700 text-sm">Speichern</button>
                        <button type="button" className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm" onClick={handleCancelQualifications}>Abbrechen</button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'verfuegbarkeit' && isCaretakerUser && (
            <div className="space-y-8 mb-8">
              <div>
                <h2 className="text-xl font-semibold mb-2 flex items-center gap-2 text-gray-900"><Calendar className="w-5 h-5" /> Verfügbarkeit</h2>
                <div className="bg-white rounded-xl shadow p-6">
                  <AvailabilityScheduler
                    availability={availability}
                    onAvailabilityChange={handleSaveAvailability}
                  />
                </div>
              </div>
              <div>
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 mb-2"><Moon className="w-5 h-5" /> Übernachtungen</h2>
                <div className="bg-white rounded-xl shadow p-6">
                  <OvernightAvailabilitySelector
                    overnightAvailability={overnightAvailability}
                    onOvernightAvailabilityChange={handleOvernightAvailabilityChange}
                  />
                </div>
              </div>
            </div>
          )}
          {activeTab === 'verfuegbarkeit' && !isCaretakerUser && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                <Clock className="w-5 h-5" /> Öffnungszeiten
              </h2>
              <div className="bg-white rounded-xl shadow p-6">
                {openingHours === null ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 mb-4">Noch keine Öffnungszeiten hinterlegt.</p>
                    <Button
                      onClick={() => {
                        // Initialisiere mit Standardwerten für alle Tage
                        const defaultHours: Record<string, { open: string; close: string; closed: boolean }> = {
                          Mo: { open: '09:00', close: '18:00', closed: false },
                          Di: { open: '09:00', close: '18:00', closed: false },
                          Mi: { open: '09:00', close: '18:00', closed: false },
                          Do: { open: '09:00', close: '18:00', closed: false },
                          Fr: { open: '09:00', close: '18:00', closed: false },
                          Sa: { open: '09:00', close: '13:00', closed: false },
                          So: { open: '09:00', close: '13:00', closed: true },
                        };
                        setOpeningHours(defaultHours);
                      }}
                      variant="primary"
                    >
                      Öffnungszeiten hinzufügen
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(openingHours).map(([day, hours]) => {
                      const dayNames: Record<string, string> = {
                        'Mo': 'Montag',
                        'Di': 'Dienstag',
                        'Mi': 'Mittwoch',
                        'Do': 'Donnerstag',
                        'Fr': 'Freitag',
                        'Sa': 'Samstag',
                        'So': 'Sonntag'
                      };
                      return (
                        <div key={day} className="flex items-center gap-4 p-3 border rounded-lg">
                          <div className="w-24 font-medium text-gray-700">{dayNames[day] || day}</div>
                          <label className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!hours.closed}
                              onChange={(e) => {
                                const newHours = { ...openingHours };
                                newHours[day] = { ...hours, closed: !e.target.checked };
                                setOpeningHours(newHours);
                              }}
                              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <span className="text-sm text-gray-600">Geöffnet</span>
                          </label>
                          {!hours.closed && (
                            <>
                              <input
                                type="time"
                                value={hours.open}
                                onChange={(e) => {
                                  const newHours = { ...openingHours };
                                  newHours[day] = { ...hours, open: e.target.value };
                                  setOpeningHours(newHours);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                              <span className="text-gray-500">bis</span>
                              <input
                                type="time"
                                value={hours.close}
                                onChange={(e) => {
                                  const newHours = { ...openingHours };
                                  newHours[day] = { ...hours, close: e.target.value };
                                  setOpeningHours(newHours);
                                }}
                                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                              />
                            </>
                          )}
                          {hours.closed && (
                            <span className="text-sm text-gray-400">Geschlossen</span>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex justify-between pt-4 border-t">
                      <Button
                        onClick={() => {
                          if (confirm('Möchten Sie die Öffnungszeiten wirklich entfernen?')) {
                            handleOpeningHoursChange(null);
                          }
                        }}
                        variant="outline"
                      >
                        Öffnungszeiten entfernen
                      </Button>
                      <Button
                        onClick={() => handleOpeningHoursChange(openingHours)}
                        variant="primary"
                      >
                        Öffnungszeiten speichern
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'fotos' && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900">
                  <Upload className="w-5 h-5" />
                  {isCaretakerUser ? 'Umgebungsbilder' : 'Portfolio'}
                </h2>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs">
                    {photos.length}/{maxEnvironmentImages()} Bilder
                  </span>
                </div>
              </div>

              {/* Subscription Gate for Non-Professional Users */}
              {maxEnvironmentImages() === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Lock className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-yellow-800 mb-1">
                        Professional-Mitgliedschaft erforderlich
                      </h3>
                      <p className="text-yellow-700 text-sm mb-3">
                        {isCaretakerUser
                          ? 'Umgebungsbilder sind nur für Professional-Mitglieder verfügbar. Zeige deine Betreuungsumgebung und gewinne das Vertrauen von Tierhaltern.'
                          : 'Portfolio-Bilder sind nur für Professional-Mitglieder verfügbar. Zeige deine Arbeit und gewinne das Vertrauen von Tierhaltern.'}
                      </p>
                      <button
                        onClick={() => setActiveTab('mitgliedschaften')}
                        className="inline-flex items-center px-3 py-1 bg-yellow-600 text-white text-sm rounded hover:bg-yellow-700 transition-colors"
                      >
                        Jetzt upgraden
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl shadow p-6">
                <div
                  className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors mb-4 ${maxEnvironmentImages() === 0 || photos.length >= maxEnvironmentImages()
                    ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                    : 'border-gray-300 cursor-pointer hover:bg-gray-50'
                    }`}
                  onClick={() => {
                    if (maxEnvironmentImages() === 0 || photos.length >= maxEnvironmentImages()) return;
                    fileInputRefFotos.current?.click();
                  }}
                  onDrop={async e => {
                    e.preventDefault();
                    if (maxEnvironmentImages() === 0 || photos.length >= maxEnvironmentImages()) return;
                    await handleAddPhotos(e.dataTransfer.files);
                  }}
                  onDragOver={handleDragOverFotos}
                >
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    ref={fileInputRefFotos}
                    onChange={async e => { if (e.target.files) await handleAddPhotos(e.target.files); }}
                  />
                  <div className="flex flex-col items-center justify-center gap-2">
                    {maxEnvironmentImages() === 0 ? (
                      <Lock className="w-8 h-8 text-gray-400 mb-1" />
                    ) : photos.length >= maxEnvironmentImages() ? (
                      <Lock className="w-8 h-8 text-gray-400 mb-1" />
                    ) : (
                      <Upload className="w-8 h-8 text-primary-400 mb-1" />
                    )}

                    <span className={`font-medium ${maxEnvironmentImages() === 0 || photos.length >= maxEnvironmentImages()
                      ? 'text-gray-500'
                      : 'text-gray-700'
                      }`}>
                      {maxEnvironmentImages() === 0
                        ? 'Professional-Mitgliedschaft erforderlich'
                        : photos.length >= maxEnvironmentImages()
                          ? `Limit erreicht (${maxEnvironmentImages()} Bilder)`
                          : 'Bilder hierher ziehen oder klicken, um hochzuladen'
                      }
                    </span>

                    {maxEnvironmentImages() === 0 || photos.length >= maxEnvironmentImages() ? (
                      <span className="text-xs text-gray-400">
                        {maxEnvironmentImages() === 0
                          ? `Upgrade auf Professional für ${isCaretakerUser ? 'Umgebungsbilder' : 'Portfolio-Bilder'}`
                          : 'Professional-Mitglieder können bis zu 6 Bilder hochladen'
                        }
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">JPG, PNG, max. 5MB pro Bild</span>
                    )}
                  </div>
                  {photoUploading && <div className="mt-2 text-primary-600 text-sm">Bilder werden hochgeladen...</div>}
                  {photoError && <div className="mt-2 text-red-500 text-sm">{photoError}</div>}
                </div>
                <div className="flex flex-wrap gap-2">
                  {photos.length ? photos.map((fileOrUrl, idx) => {
                    const url = typeof fileOrUrl === 'string' ? fileOrUrl : URL.createObjectURL(fileOrUrl);
                    return (
                      <div key={idx} className="relative group">
                        <img src={url} alt={isCaretakerUser ? "Wohnungsfoto" : "Portfolio-Bild"} className="h-24 w-24 object-cover rounded border" />
                        <button
                          type="button"
                          className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow text-gray-400 hover:text-red-500"
                          onClick={() => handleDeletePhoto(idx)}
                          title="Foto entfernen"
                          disabled={photoUploading}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  }) : <span className="text-gray-400">Keine Fotos hochgeladen</span>}
                </div>
              </div>
            </div>
          )}
          {activeTab === 'texte' && (
            <div className="mb-8">
              {/* Kurze Erfahrung */}
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 mb-2"><Info className="w-5 h-5" /> Kurze Erfahrung</h2>
              <div className="bg-white rounded-xl shadow p-6 mb-8 relative">
                {!editShortDesc && (
                  <button className="absolute top-4 right-4 p-2 text-gray-400 hover:text-primary-600" onClick={() => { setEditShortDesc(true); setShortDescDraft(shortDescription); }} title="Bearbeiten">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                )}
                {!editShortDesc ? (
                  <div className="text-gray-700 min-h-[32px] whitespace-pre-wrap break-words">
                    {shortDescription ? (
                      <span>{shortDescription}</span>
                    ) : (
                      <span className="text-gray-400">Noch keine Erfahrung hinterlegt.</span>
                    )}
                  </div>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); handleSaveShortDescription(shortDescDraft); }}>
                    <textarea
                      className="input w-full min-h-[48px]"
                      maxLength={maxShortDesc}
                      value={shortDescDraft}
                      onChange={e => setShortDescDraft(e.target.value)}
                      placeholder="Fasse dich kurz – z.B. 'Erfahrene Hundesitterin aus Berlin, liebevoll & zuverlässig.'"
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${shortDescDraft.length > maxShortDesc ? 'text-red-500' : 'text-gray-400'}`}>{shortDescDraft.length}/{maxShortDesc} Zeichen</span>
                      <div className="flex gap-2">
                        <button type="submit" className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs" disabled={shortDescDraft.length > maxShortDesc}>Speichern</button>
                        <button type="button" className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs" onClick={() => {
                          setEditShortDesc(false);
                          setShortDescDraft(shortDescription);
                          // Cleanup sessionStorage
                          sessionStorage.removeItem('editShortDesc');
                        }}>Abbrechen</button>
                      </div>
                    </div>
                  </form>
                )}
              </div>

              {/* Über mich */}
              <h2 className="text-xl font-semibold flex items-center gap-2 text-gray-900 mb-2"><User className="w-5 h-5" /> Über mich</h2>
              <div className="bg-white rounded-xl shadow p-6 mb-8 relative">
                {!editAboutMe && (
                  <button className="absolute top-4 right-4 p-2 text-gray-400 hover:text-primary-600" onClick={() => { setEditAboutMe(true); setAboutMeDraft(aboutMe); }} title="Bearbeiten">
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                )}
                {!editAboutMe ? (
                  <div className="text-gray-700 min-h-[32px] whitespace-pre-wrap break-words">
                    {aboutMe ? (
                      <span>{aboutMe}</span>
                    ) : (
                      <span className="text-gray-400">Noch kein Text hinterlegt.</span>
                    )}
                  </div>
                ) : (
                  <form onSubmit={e => { e.preventDefault(); handleSaveAboutMe(aboutMeDraft); }}>
                    <textarea
                      className="input w-full min-h-[160px]"
                      value={aboutMeDraft}
                      onChange={e => setAboutMeDraft(e.target.value)}
                      minLength={minAboutMe}
                      placeholder={isCaretakerUser
                        ? "Erzähle mehr über dich, deine Motivation, Erfahrung und was dich als Betreuer:in auszeichnet. Mindestens 540 Zeichen."
                        : "Erzähle mehr über dich, deine Motivation, Erfahrung und was dich als Dienstleister:in auszeichnet. Mindestens 540 Zeichen."}
                      autoFocus
                    />
                    <div className="flex items-center justify-between mt-2">
                      <span className={`text-xs ${aboutMeDraft.length < minAboutMe ? 'text-red-500' : 'text-gray-400'}`}>{aboutMeDraft.length} Zeichen (min. {minAboutMe})</span>
                      <div className="flex gap-2">
                        <button type="submit" className="px-3 py-1 bg-primary-600 text-white rounded hover:bg-primary-700 text-xs" disabled={aboutMeDraft.length < minAboutMe}>Speichern</button>
                        <button type="button" className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs" onClick={() => {
                          setEditAboutMe(false);
                          setAboutMeDraft(aboutMe);
                          // Cleanup sessionStorage
                          sessionStorage.removeItem('editAboutMe');
                        }}>Abbrechen</button>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}
          {activeTab === 'kunden' && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                <Shield className="h-5 w-5" />
                Kunden
              </h2>

              {clientsLoading ? (
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="text-gray-500">Kunden werden geladen ...</div>
                </div>
              ) : clientsError ? (
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="text-red-500">{clientsError}</div>
                </div>
              ) : clients.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-8 text-center">
                  <Shield className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <div className="text-gray-500">
                    <h3 className="font-medium text-lg mb-2">Noch keine Kunden vorhanden</h3>
                    <p className="text-sm">
                      Kunden erscheinen hier automatisch, wenn sie dich {isCaretakerUser ? 'als Betreuer' : 'als Dienstleister'} speichern.<br />
                      Teile dein Profil mit Tierhaltern oder werde über die Suche gefunden!
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-gray-600 mb-4 text-sm">
                    Hier siehst du alle Tierhalter, die dich {isCaretakerUser ? 'als Betreuer' : 'als Dienstleister'} gespeichert haben.
                    Klicke auf einen Namen, um die freigegebenen Informationen zu sehen.
                  </p>
                  <ClientDetailsAccordion clients={clients} onDeleteClient={handleDeleteClient} />
                </div>
              )}
            </div>
          )}
          {activeTab === 'bewertungen' && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900"><Star className="w-5 h-5" /> Bewertungen</h2>
              <div className="bg-white rounded-xl shadow p-6">
                {reviewsLoading ? (
                  <div className="text-gray-400">Bewertungen werden geladen...</div>
                ) : reviews.length === 0 ? (
                  <div className="text-gray-400">Noch keine Bewertungen vorhanden.</div>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((r) => (
                      <div key={r.id} className="border-b last:border-b-0 pb-4 mb-4 last:mb-0">
                        {/* Bewertung */}
                        <div className="flex flex-col sm:flex-row sm:items-start gap-2 mb-3">
                          <div className="flex items-center gap-1 mb-1 sm:mb-0">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Star key={i} className={`w-5 h-5 ${i <= r.rating ? 'text-yellow-400 fill-yellow-300' : 'text-gray-300'}`} fill={i <= r.rating ? 'currentColor' : 'none'} />
                            ))}
                          </div>
                          <div className="flex-1">
                            <div className="text-gray-800 font-medium">{r.users?.first_name || ''} {r.users?.last_name || ''}</div>
                            <div className="text-gray-600 text-sm whitespace-pre-line">{r.comment || <span className="text-gray-400">(Kein Kommentar)</span>}</div>
                          </div>
                          <div className="text-xs text-gray-400 ml-auto sm:text-right">{r.created_at ? new Date(r.created_at).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}</div>
                        </div>

                        {/* Caretaker Antwort */}
                        {r.caretaker_response && (
                          <div className="ml-4 pl-4 border-l-2 border-primary-200 bg-primary-50 rounded-r-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-sm font-medium text-primary-800">Deine Antwort:</div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setResponseText(r.caretaker_response || '');
                                    setRespondingToReview(r.id);
                                  }}
                                  className="text-xs text-primary-600 hover:text-primary-800"
                                >
                                  Bearbeiten
                                </button>
                                <button
                                  onClick={() => handleDeleteResponse(r.id)}
                                  className="text-xs text-red-600 hover:text-red-800"
                                >
                                  Löschen
                                </button>
                              </div>
                            </div>
                            <div className="text-sm text-primary-700 whitespace-pre-line">{r.caretaker_response}</div>
                            <div className="text-xs text-primary-500 mt-1">
                              {r.caretaker_response_created_at ? new Date(r.caretaker_response_created_at).toLocaleDateString('de-DE', { year: 'numeric', month: 'short', day: 'numeric' }) : ''}
                            </div>
                          </div>
                        )}

                        {/* Antwort-Formular */}
                        {respondingToReview === r.id && (
                          <div className="ml-4 pl-4 border-l-2 border-primary-200 bg-primary-50 rounded-r-lg p-3 mt-3">
                            <div className="mb-2">
                              <label className="block text-sm font-medium text-primary-800 mb-1">
                                {r.caretaker_response ? 'Antwort bearbeiten:' : 'Antwort schreiben:'}
                              </label>
                              <textarea
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                className="w-full p-2 border border-primary-300 rounded text-sm"
                                rows={3}
                                placeholder="Antworte höflich und professionell auf die Bewertung..."
                                maxLength={500}
                              />
                              <div className="text-xs text-gray-500 mt-1">
                                {responseText.length}/500 Zeichen
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => r.caretaker_response ? handleEditResponse(r.id) : handleRespondToReview(r.id)}
                                disabled={!responseText.trim()}
                                className="px-3 py-1 bg-primary-600 text-white text-sm rounded hover:bg-primary-700 disabled:opacity-50"
                              >
                                {r.caretaker_response ? 'Aktualisieren' : 'Antworten'}
                              </button>
                              <button
                                onClick={() => {
                                  setResponseText('');
                                  setRespondingToReview(null);
                                }}
                                className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                              >
                                Abbrechen
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Antwort-Button (nur wenn keine Antwort vorhanden) */}
                        {!r.caretaker_response && respondingToReview !== r.id && (
                          <div className="ml-4 pl-4">
                            <button
                              onClick={() => setRespondingToReview(r.id)}
                              className="text-sm text-primary-600 hover:text-primary-800 font-medium"
                            >
                              Auf diese Bewertung antworten
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'sicherheit' && (
            <div className="space-y-8">
              {/* E-Mail-Adresse ändern */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900"><Mail className="w-5 h-5" /> E-Mail-Adresse ändern</h2>
                <div className="bg-white rounded-xl shadow p-6">

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setEmailChangeError(null);
                      setEmailChangeSuccess(null);
                      setEmailChangeLoading(true);
                      // Validierung
                      if (!newEmail.trim() || !currentPasswordForEmail.trim()) {
                        setEmailChangeError('Bitte fülle alle Felder aus.');
                        setEmailChangeLoading(false);
                        return;
                      }
                      if (!validateEmail(newEmail)) {
                        setEmailChangeError('Bitte gib eine gültige E-Mail-Adresse ein.');
                        setEmailChangeLoading(false);
                        return;
                      }
                      if (newEmail.trim() === (user?.email || '')) {
                        setEmailChangeError('Die neue E-Mail-Adresse muss sich von der aktuellen unterscheiden.');
                        setEmailChangeLoading(false);
                        return;
                      }
                      // Passwort prüfen und E-Mail ändern
                      try {
                        // 1. Passwort prüfen
                        const { error: signInError } = await supabase.auth.signInWithPassword({
                          email: user?.email || '',
                          password: currentPasswordForEmail
                        });
                        if (signInError) {
                          setEmailChangeError('Das aktuelle Passwort ist nicht korrekt.');
                          setEmailChangeLoading(false);
                          return;
                        }
                        // 2. E-Mail ändern
                        const { error: updateError } = await supabase.auth.updateUser({
                          email: newEmail.trim()
                        });
                        if (updateError) {
                          setEmailChangeError('Fehler beim Ändern der E-Mail-Adresse: ' + updateError.message);
                          setEmailChangeLoading(false);
                          return;
                        }
                        setEmailChangeSuccess('E-Mail-Änderung eingeleitet! Bitte bestätige die Änderung über den Link, der an deine alte E-Mail-Adresse gesendet wurde.');
                        setNewEmail('');
                        setCurrentPasswordForEmail('');
                      } catch (err: any) {
                        setEmailChangeError('Ein unerwarteter Fehler ist aufgetreten.');
                      } finally {
                        setEmailChangeLoading(false);
                      }
                    }}
                    className="space-y-6"
                  >
                    {/* Hinweis in gelblicher Box */}
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3 flex-shrink-0" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">Wichtiger Hinweis</p>
                          <p>
                            Die Bestätigung der Änderung wird an deine <strong>alte E-Mail-Adresse</strong> gesendet
                            und muss dort bestätigt werden, bevor die neue E-Mail-Adresse aktiv wird.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Links: Aktuelle E-Mail */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Aktuelle E-Mail</h3>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            E-Mail-Adresse
                          </label>
                          <input
                            type="email"
                            className="input w-full bg-gray-100 cursor-not-allowed"
                            value={user?.email || ''}
                            disabled
                          />
                        </div>
                      </div>

                      {/* Rechts: Neue E-Mail + Passwort */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Neue E-Mail</h3>
                        <div className="space-y-4">
                          {/* Neue E-Mail */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Neue E-Mail-Adresse <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="email"
                              className="input w-full"
                              value={newEmail}
                              onChange={e => setNewEmail(e.target.value)}
                              placeholder="neue@email.de"
                              required
                            />
                          </div>

                          {/* Aktuelles Passwort */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Aktuelles Passwort <span className="text-red-500">*</span>
                            </label>
                            <input
                              type="password"
                              className="input w-full"
                              value={currentPasswordForEmail}
                              onChange={e => setCurrentPasswordForEmail(e.target.value)}
                              placeholder="Dein aktuelles Passwort"
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fehler und Erfolg */}
                    {emailChangeError && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {emailChangeError}
                      </div>
                    )}

                    {emailChangeSuccess && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <Check className="h-4 w-4" />
                        {emailChangeSuccess}
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-start">
                      <button
                        type="submit"
                        className="btn-primary py-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={emailChangeLoading}
                      >
                        {emailChangeLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Wird geändert...
                          </div>
                        ) : (
                          'E-Mail ändern'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Passwort ändern */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900"><KeyRound className="w-5 h-5" /> Passwort ändern</h2>
                <div className="bg-white rounded-xl shadow p-6">

                  <form onSubmit={handlePasswordChange} className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Links: Aktuelles Passwort */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Aktuelles Passwort</h3>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Aktuelles Passwort <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.current ? 'text' : 'password'}
                              className="input pr-10 w-full"
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                              placeholder="Dein aktuelles Passwort"
                              disabled={passwordLoading}
                              required
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                              tabIndex={-1}
                            >
                              {showPasswords.current ? (
                                <EyeOff className="h-5 w-5 text-gray-400" />
                              ) : (
                                <Eye className="h-5 w-5 text-gray-400" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Rechts: Neues Passwort */}
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 mb-4">Neues Passwort</h3>
                        <div className="space-y-4">
                          {/* Neues Passwort */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Neues Passwort <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.new ? 'text' : 'password'}
                                className="input pr-10 w-full"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                                placeholder="Mindestens 8 Zeichen"
                                disabled={passwordLoading}
                                required
                                minLength={8}
                              />
                              <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                                tabIndex={-1}
                              >
                                {showPasswords.new ? (
                                  <EyeOff className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <Eye className="h-5 w-5 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Passwort bestätigen */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Neues Passwort bestätigen <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.confirm ? 'text' : 'password'}
                                className="input pr-10 w-full"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                                placeholder="Neues Passwort wiederholen"
                                disabled={passwordLoading}
                                required
                              />
                              <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                                tabIndex={-1}
                              >
                                {showPasswords.confirm ? (
                                  <EyeOff className="h-5 w-5 text-gray-400" />
                                ) : (
                                  <Eye className="h-5 w-5 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Fehler und Erfolg */}
                    {passwordError && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        {passwordError}
                      </div>
                    )}

                    {passwordSuccess && (
                      <div className="flex items-center gap-2 text-green-600 text-sm">
                        <Check className="h-4 w-4" />
                        Passwort erfolgreich geändert!
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="flex justify-start">
                      <button
                        type="submit"
                        className="btn-primary py-2 px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={passwordLoading}
                      >
                        {passwordLoading ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Wird geändert...
                          </div>
                        ) : (
                          'Passwort ändern'
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Konto löschen */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-red-900"><Trash2 className="w-5 h-5" /> Gefährlicher Bereich</h2>
                <div className="bg-red-50 border border-red-200 rounded-xl p-6">

                  <div className="mb-6">
                    <h3 className="text-lg font-medium text-red-900 mb-2">Konto löschen</h3>
                    <p className="text-red-700 text-sm mb-4">
                      ⚠️ <strong>Warnung:</strong> Wenn du dein Konto löschst, werden alle deine Daten unwiderruflich gelöscht.
                      Dies umfasst dein Profil, alle Nachrichten, Kundendaten und alle anderen mit deinem Konto verbundenen Informationen.
                    </p>

                    <div className="bg-red-100 border border-red-200 rounded-lg p-4 mb-4">
                      <h4 className="font-medium text-red-900 mb-2">Was wird gelöscht:</h4>
                      <ul className="text-red-800 text-sm space-y-1">
                        <li>• Dein komplettes Betreuer-Profil</li>
                        <li>• Alle Nachrichten und Konversationen</li>
                        <li>• Alle gespeicherten Kundendaten</li>
                        <li>• Alle Bewertungen und Feedback</li>
                        <li>• Alle hochgeladenen Fotos</li>
                        <li>• Dein Benutzerkonto und Login-Daten</li>
                      </ul>
                    </div>

                    {!showDeleteConfirmation ? (
                      <button
                        onClick={() => setShowDeleteConfirmation(true)}
                        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm font-medium"
                      >
                        Konto löschen
                      </button>
                    ) : (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-red-900 mb-2">
                            Um dein Konto zu löschen, gib <strong>"KONTO LÖSCHEN"</strong> in das Feld ein:
                          </label>
                          <input
                            type="text"
                            className="input w-full max-w-xs border-red-300 focus:border-red-500 focus:ring-red-500"
                            value={deleteAccountConfirmation}
                            onChange={(e) => setDeleteAccountConfirmation(e.target.value)}
                            placeholder="KONTO LÖSCHEN"
                            disabled={deleteAccountLoading}
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={handleDeleteAccount}
                            disabled={deleteAccountConfirmation !== 'KONTO LÖSCHEN' || deleteAccountLoading}
                            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {deleteAccountLoading ? (
                              <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Wird gelöscht...
                              </div>
                            ) : (
                              'Konto endgültig löschen'
                            )}
                          </button>

                          <button
                            onClick={() => {
                              setShowDeleteConfirmation(false);
                              setDeleteAccountConfirmation('');
                            }}
                            disabled={deleteAccountLoading}
                            className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 transition-colors text-sm font-medium"
                          >
                            Abbrechen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
          {activeTab === 'affiliate' && (
            <RefGrowDashboard email={user?.email || ''} />
          )}
          {activeTab === 'kontaktdaten' && (
            <CaretakerContactTab />
          )}

          {/* Partner Tab */}
          {activeTab === 'partner' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900">
                  <Heart className="w-5 h-5" />
                  Partner
                </h2>

                {partnersLoading ? (
                  <div className="text-gray-500">Partner werden geladen ...</div>
                ) : partnersError ? (
                  <div className="text-red-500">{partnersError}</div>
                ) : partners.length === 0 ? (
                  <div className="text-gray-500">
                    Noch keine Partner gespeichert.
                    <br />
                    <span className="text-sm">Verwende das Herz-Symbol auf Dienstleister- oder Betreuer-Profilen, um Partner zu speichern.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {partners.map((partner: any) => (
                      <div key={`partner-${partner.id}`} className="bg-white rounded-xl shadow-sm p-4 flex gap-4 items-center relative min-h-[110px] border border-primary-100">
                        {/* Action Icons oben rechts */}
                        <div className="absolute top-4 right-4 flex gap-2">
                          {/* Partner-Herz (klickbar zum Entfernen) */}
                          <button
                            type="button"
                            className="text-primary-500 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Partner entfernen"
                            onClick={(e) => handleRemovePartner(partner, e)}
                            disabled={removingPartnerId === partner.id}
                          >
                            {removingPartnerId === partner.id ? (
                              <div className="w-3.5 h-3.5 border border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                              <Heart className="h-3.5 w-3.5 fill-current" />
                            )}
                          </button>
                          {/* Profil ansehen */}
                          <Link
                            to={partner.user_type && ['hundetrainer', 'tierarzt', 'tierfriseur', 'physiotherapeut', 'ernaehrungsberater', 'tierfotograf', 'sonstige'].includes(partner.user_type)
                              ? `/dienstleister/${partner.id}`
                              : `/betreuer/${partner.id}`}
                            className="text-gray-400 hover:text-primary-600 transition-colors"
                            title="Profil ansehen"
                          >
                            <User className="h-3.5 w-3.5" />
                          </Link>
                        </div>

                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          <img
                            src={partner.avatar}
                            alt={partner.name}
                            className="w-16 h-16 rounded-full object-cover border-2 border-primary-200"
                          />
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{partner.name}</h3>
                          <p className="text-sm text-gray-600 truncate">{partner.location}</p>
                          {partner.rating > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                              <span className="text-sm font-medium text-gray-700">{partner.rating.toFixed(1)}</span>
                              {partner.reviewCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  ({partner.reviewCount} {partner.reviewCount === 1 ? 'Bewertung' : 'Bewertungen'})
                                </span>
                              )}
                            </div>
                          )}
                          {partner.hourlyRate > 0 && (
                            <p className="text-sm text-primary-600 font-medium mt-1">
                              ab €{partner.hourlyRate}/Std.
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verifizierung Tab */}
          {activeTab === 'verifizierung' && (
            <div className="space-y-8">
              {/* Verifizierungsstatus */}
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900"><Shield className="w-5 h-5" /> Verifizierungsstatus</h2>
                <div className="bg-white rounded-xl shadow p-6">

                  {verificationLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <LoadingSpinner />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                      <div className={`${getVerificationStatusColor(verificationStatus)}`}>
                        {getVerificationStatusIcon(verificationStatus)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          Status: {getVerificationStatusText(verificationStatus)}
                        </p>
                        {verificationRequest?.admin_comment && (
                          <p className="text-sm text-gray-600 mt-1">
                            Admin-Kommentar: {verificationRequest.admin_comment}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Dokument-Upload */}
              {verificationStatus === 'not_submitted' || verificationStatus === 'rejected' ? (
                <div>
                  <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900"><Upload className="w-5 h-5" /> Dokumente hochladen</h2>
                  <div className="bg-white rounded-xl shadow p-6">

                    <div className="space-y-6">
                      {/* Ausweis Upload (Pflichtfeld) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Ausweis (Pflichtfeld) *
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileSelect(e.target.files, 'ausweis')}
                            className="hidden"
                            id="ausweis-upload"
                          />
                          <label
                            htmlFor="ausweis-upload"
                            className="cursor-pointer flex flex-col items-center"
                          >
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">
                              {ausweisFile ? ausweisFile.name : 'Ausweis hochladen (PDF, JPG, PNG)'}
                            </span>
                            <span className="text-xs text-gray-500 mt-1">Max. 10MB</span>
                          </label>
                        </div>
                      </div>

                      {/* Zertifikate Upload (Optional) */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Zertifikate (Optional)
                        </label>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary-400 transition-colors">
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            multiple
                            onChange={(e) => handleFileSelect(e.target.files, 'zertifikat')}
                            className="hidden"
                            id="zertifikat-upload"
                          />
                          <label
                            htmlFor="zertifikat-upload"
                            className="cursor-pointer flex flex-col items-center"
                          >
                            <Upload className="h-8 w-8 text-gray-400 mb-2" />
                            <span className="text-sm text-gray-600">
                              {zertifikatFiles.length > 0
                                ? `${zertifikatFiles.length} Zertifikat(e) ausgewählt`
                                : 'Zertifikate hochladen (PDF, JPG, PNG)'
                              }
                            </span>
                            <span className="text-xs text-gray-500 mt-1">Max. 10MB pro Datei</span>
                          </label>
                        </div>
                        {zertifikatFiles.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {zertifikatFiles.map((file, index) => (
                              <div key={index} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                                {file.name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Submit Button */}
                      <div className="flex justify-end">
                        <Button
                          onClick={handleSubmitVerification}
                          disabled={!ausweisFile || uploadingDocuments}
                          className="flex items-center gap-2"
                        >
                          {uploadingDocuments ? (
                            <>
                              <LoadingSpinner />
                              Wird hochgeladen...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4" />
                              Verifizierung einreichen
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Bereits eingereicht */
                <div className="bg-white rounded-xl shadow p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <h2 className="text-xl font-semibold text-gray-900">Verifizierung eingereicht</h2>
                  </div>

                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Deine Verifizierungsanfrage wurde am{' '}
                      {verificationRequest?.created_at && new Date(verificationRequest.created_at).toLocaleDateString('de-DE')}
                      {' '}eingereicht und wird von unserem Team überprüft.
                    </p>

                    {verificationRequest?.zertifikate_urls && verificationRequest.zertifikate_urls.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">
                          Hochgeladene Zertifikate: {verificationRequest.zertifikate_urls.length}
                        </p>
                      </div>
                    )}

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm text-blue-800">
                            <strong>Hinweis:</strong> Die Überprüfung kann 1-3 Werktage dauern.
                            Du erhältst eine E-Mail-Benachrichtigung, sobald die Überprüfung abgeschlossen ist.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Mitgliedschaften Tab */}
          {activeTab === 'mitgliedschaften' && (
            <div className="space-y-8">
              {isPremiumUser ? (
                <>
                  {/* Premium Status Card */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <Crown className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">Premium Mitgliedschaft</h2>
                          <p className="text-sm text-gray-600">Aktiv seit {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString('de-DE') : 'Unbekannt'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                          <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                          Aktiv
                        </div>
                        {subscription?.plan_expires_at && (
                          <p className="text-xs text-gray-500 mt-1">
                            Verlängert sich am {new Date(subscription.plan_expires_at).toLocaleDateString('de-DE')}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="text-center p-4 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-blue-600">Unlimited</div>
                        <div className="text-sm text-gray-600">Kontaktanfragen</div>
                      </div>
                      <div className="text-center p-4 bg-white rounded-lg border">
                        <div className="text-2xl font-bold text-green-600">Werbefrei</div>
                        <div className="text-sm text-gray-600">Erfahrung</div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button
                        variant="primary"
                        onClick={() => {
                          // Öffne Stripe Customer Portal
                          void openStripeBillingPortal();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Settings className="w-4 h-4" />
                        Mitgliedschaft verwalten
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {

                          window.location.href = '/mitgliedschaften';
                        }}
                        className="flex items-center gap-2"
                      >
                        <Star className="w-4 h-4" />
                        Plan-Details ansehen
                      </Button>
                    </div>
                  </div>

                  {/* Premium Features Overview */}
                  <div className="bg-white rounded-xl border p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Deine Premium Features</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-gray-700">Unlimited Kontaktanfragen von Tierhaltern</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <div className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-gray-700">Erweiterte Profiloptionen verwenden</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-gray-700">Bewertungen von Tierhaltern erhalten</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-gray-700">Werbefreie Nutzung der Plattform</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-gray-700">Premium Badge im Profil</span>
                      </div>
                      <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                        <Check className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-gray-700">Prioritärer Kundenservice</span>
                      </div>
                    </div>
                  </div>

                  {/* Billing History Preview */}
                  <div className="bg-white rounded-xl border p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Rechnungshistorie</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          void openStripeBillingPortal();
                        }}
                      >
                        Alle Rechnungen anzeigen
                      </Button>
                    </div>
                    <div className="text-center py-8 text-gray-500">
                      <Briefcase className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>Detaillierte Rechnungshistorie verfügbar im</p>
                      <p className="font-medium">Stripe Kundenportal</p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Basic Status Card */}
                  <div>
                    <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-gray-900"><Star className="w-5 h-5" /> Basic Mitgliedschaft</h2>
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-400 rounded-full flex items-center justify-center">
                            <Star className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <p className="text-sm text-gray-600">Kostenlose Version mit Einschränkungen</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                            <div className="w-2 h-2 bg-gray-400 rounded-full mr-2"></div>
                            Basic
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-gray-600">3</div>
                          <div className="text-sm text-gray-600">Kontaktanfragen/Monat</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-gray-600">Eingeschränkt</div>
                          <div className="text-sm text-gray-600">Profiloptionen</div>
                        </div>
                        <div className="text-center p-4 bg-white rounded-lg border">
                          <div className="text-2xl font-bold text-gray-600">Mit Werbung</div>
                          <div className="text-sm text-gray-600">Erfahrung</div>
                        </div>
                      </div>

                      <div className="flex gap-4">
                        <button
                          onClick={() => {

                            window.location.href = '/mitgliedschaften';
                          }}
                          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                        >
                          <Star className="w-4 h-4 mr-2" />
                          Jetzt Premium werden
                        </button>
                        <Button
                          variant="outline"
                          onClick={() => {

                            window.location.href = '/mitgliedschaften';
                          }}
                          className="flex items-center gap-2"
                        >
                          <Info className="w-4 h-4" />
                          Plan-Details ansehen
                        </Button>
                      </div>
                    </div>

                    {/* Premium Features Preview */}
                    <div className="bg-white rounded-xl border p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Mit Premium erhältst du:</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-gray-700">Unlimited Kontaktanfragen von Tierhaltern</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-gray-700">Erweiterte Profiloptionen verwenden</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-gray-700">Bewertungen von Tierhaltern erhalten</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-gray-700">Werbefreie Nutzung der Plattform</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-gray-700">Premium Badge im Profil</span>
                        </div>
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <Check className="w-5 h-5 text-green-600" />
                          <span className="text-sm text-gray-700">Prioritärer Kundenservice</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Ende Content-Bereich */}
        </section>
      </div>

      {/* Payment Success Modal */}
      <PaymentSuccessModal
        isOpen={paymentSuccess.isOpen}
        onClose={closeModal}
        planType={paymentSuccess.planType}
        userType={paymentSuccess.userType}
        sessionData={paymentSuccess.sessionData}
      />

      {/* Registration Onboarding Modal */}
      <RegistrationSuccessModal
        isOpen={showOnboarding}
        userType="caretaker"
        userName={onboardingUserName}
        categoryName={onboardingCategoryName}
        specificUserType={onboardingSpecificUserType}
        onComplete={dismissCaretakerOnboarding}
        onSkip={dismissCaretakerOnboarding}
      />

      {/* Profilbild Editor Modal */}
      {showImageCropper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Profilbild bearbeiten</h2>
                <button
                  onClick={() => setShowImageCropper(false)}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <ProfileImageCropper
                photoUrl={avatarUrl}
                onImageSave={handleCroppedImageSave}
                uploading={avatarUploading}
                error={avatarError}
                infoText={"Lade bitte ein nettes Profilbild von Dir hoch – das schafft Vertrauen! 😊\n\nWichtig für Deine Freischaltung: Ein echtes Portrait (Gesicht gut erkennbar). Bitte keine KI-Bilder, Avatare, Sonnenbrillen oder weitere Personen."}
                className="w-full"
              />
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} />
      <DashboardReleaseTeaser />
    </div>
  );
}

export default CaretakerDashboardPage;