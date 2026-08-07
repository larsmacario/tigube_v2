// Dienstleister-spezifische TypeScript-Typen

import type { TravelCostConfig } from './service-categories';

export interface DienstleisterKategorie {
  id: number;
  name: string;
  beschreibung: string;
  icon: string;
  sortierung: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DienstleisterLeistung {
  id: number;
  dienstleister_id: string;
  name: string;
  beschreibung?: string;
  preis?: number;
  preis_typ: 'stunde' | 'termin' | 'paket' | 'pauschal';
  dauer_minuten?: number;
  verfuegbar: boolean;
  kategorie_spezifisch?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface CrossServiceEmpfehlung {
  id: number;
  haupt_kategorie_id: number;
  empfohlene_kategorie_id: number;
  empfehlung_text: string;
  prioritaet: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DienstleisterProfil {
  id: string;
  first_name: string;
  last_name: string;
  city: string;
  plz: string;
  street?: string;
  profile_photo_url?: string;
  public_profile_visible: boolean;
  is_suspended: boolean;
  approval_status: string;
  is_verified?: boolean;

  // Dienstleister-spezifische Felder
  kategorie_id: number;
  kategorie_name: string;
  kategorie_icon: string;
  dienstleister_typ: string;
  spezialisierungen?: string[];
  zertifikate?: string[];
  notfall_bereitschaft: boolean;
  portfolio_urls?: string[];
  oeffnungszeiten?: Record<string, any>;
  kontakt_info?: Record<string, any>;
  response_time?: string;

  // Bestehende Betreuer-Felder
  hourly_rate?: number;
  rating?: number;
  services_with_categories?: any[];
  availability?: Record<string, any>;
  short_term_available: boolean;
  overnight_availability?: Record<string, any>;
  experience_years?: number;
  experience_description?: string;
  qualifications?: string[];
  languages?: string[];
  service_radius?: number;
  home_photos?: string[];
  is_commercial: boolean;
  bio?: string;
  short_about_me?: string;
  long_about_me?: string;
  animal_types?: string[];

  // Berechnete Felder
  search_type: 'caretaker' | 'service_provider';
  search_vector?: any;
  travel_cost_config?: TravelCostConfig | null;
}

export interface DienstleisterSucheFilter {
  kategorie_id?: number;
  spezialisierungen?: string[];
  standort?: {
    plz?: string;
    ort?: string;
    radius?: number;
  };
  verfuegbarkeit?: {
    wochentag?: string;
    zeit?: { start: string; ende: string };
    notfall?: boolean;
  };
  preis?: {
    min?: number;
    max?: number;
  };
  bewertung?: {
    min?: number;
  };
  zertifiziert?: boolean;
  notfall_bereitschaft?: boolean;
  dienstleister_typ?: string;
}

export interface DienstleisterSucheErgebnis {
  dienstleister: DienstleisterProfil[];
  kategorien: DienstleisterKategorie[];
  cross_service_empfehlungen?: CrossServiceEmpfehlung[];
  total_count: number;
  has_more: boolean;
}

export interface DienstleisterDashboardTab {
  id: string;
  name: string;
  icon: string;
  kategorie_spezifisch?: boolean;
  kategorien?: number[];
}

export interface DienstleisterRegistrierung {
  kategorie_id: number;
  spezialisierungen?: string[];
  zertifikate?: string[];
  notfall_bereitschaft?: boolean;
  portfolio_urls?: string[];
  oeffnungszeiten?: Record<string, any>;
  kontakt_info?: Record<string, any>;
}





