// Service Category Types
export interface ServiceCategory {
  id: number;
  name: string;
  description: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/** Anfahrtskosten gesondert gespeichert (caretaker_profiles.travel_cost_config) */
export interface TravelCostConfig {
  price_per_km?: number;
  free_km?: number;
}

// Service with Category Information and Price
export interface CategorizedService {
  name: string;
  category_id: number;
  category_name: string;
  price?: number;
  /** per_hour | flat | per_unit; Legacy: per_visit, per_day → Anzeige als pauschal */
  price_type?: 'per_hour' | 'flat' | 'per_unit' | 'per_visit' | 'per_day';
}

// Extended Caretaker Profile Types
export interface CaretakerProfileWithCategories {
  id: string
  services: string[] | null; // Legacy field for backward compatibility (DEPRECATED)
  services_with_categories: CategorizedService[] | null; // Unified services with categories and prices
  animal_types: string[] | null;
  availability: any | null;
  bio: string | null;
  company_name: string | null;
  created_at: string | null;
  experience_description: string | null;
  experience_years: number | null;
  home_photos: string[] | null;
  hourly_rate: number | null;
  is_commercial: boolean | null;
  is_verified: boolean | null;
  short_term_available: boolean | null;
  languages: string[] | null;
  long_about_me: string | null;
  prices: any | null; // Legacy field for backward compatibility (DEPRECATED)
  qualifications: string[] | null;
  rating: number | null;
  review_count: number | null;
  service_radius: number | null;
  short_about_me: string | null;
  tax_number: string | null;
  updated_at: string | null;
  vat_id: string | null;
  travel_cost_config?: TravelCostConfig | null;
}

// Service Management Types for UI
export interface ServiceWithCategory {
  name: string
  categoryId: number;
  categoryName: string;
  price?: number;
  priceType?: 'per_hour' | 'flat' | 'per_unit' | 'per_visit' | 'per_day';
}

// Form data for service management
export interface ServiceFormData {
  name: string;
  categoryId: number;
  price?: number;
  priceType?: 'per_hour' | 'flat' | 'per_unit' | 'per_visit' | 'per_day';
}

// Default Service Categories (matching database)
export const DEFAULT_SERVICE_CATEGORIES = [
  { id: 1, name: 'Ernährung', description: 'Fütterung, Diätberatung und ernährungsbezogene Leistungen' },
  { id: 2, name: 'Zubehör', description: 'Bereitstellung und Pflege von Tierzubehör' },
  { id: 3, name: 'Urlaub mit Tier', description: 'Reisebegleitung und urlaubsbezogene Betreuung' },
  { id: 4, name: 'Gesundheit', description: 'Medizinische Betreuung und Gesundheitsvorsorge' },
  { id: 5, name: 'Züchter', description: 'Zuchtberatung und züchterspezifische Dienstleistungen' },
  { id: 6, name: 'Verein', description: 'Vereinsaktivitäten und Gemeinschaftsbetreuung' },
  { id: 7, name: 'Training', description: 'Ausbildung, Erziehung und Verhaltensschulung' },
  { id: 8, name: 'Allgemein', description: 'Grundlegende Betreuungsleistungen' }
] as const;

// Helper function to extract services as strings from categorized services
export function getServicesAsStrings(servicesWithCategories: CategorizedService[] | null): string[] {
  if (!servicesWithCategories || !Array.isArray(servicesWithCategories)) {
    return [];
  }
  return servicesWithCategories.map(service => service.name).filter(Boolean);
}

// Helper function to extract prices from categorized services
export function getServicesPrices(servicesWithCategories: CategorizedService[] | null): Record<string, number> {
  if (!servicesWithCategories || !Array.isArray(servicesWithCategories)) {
    return {};
  }
  
  const prices: Record<string, number> = {};
  servicesWithCategories.forEach(service => {
    if (service.name && service.price !== undefined) {
      prices[service.name] = service.price;
    }
  });
  
  return prices;
}

// Helper function to get services by category
export function getServicesByCategory(
  servicesWithCategories: CategorizedService[] | null, 
  categoryName: string
): CategorizedService[] {
  if (!servicesWithCategories || !Array.isArray(servicesWithCategories)) {
    return [];
  }
  return servicesWithCategories.filter(service => service.category_name === categoryName);
}