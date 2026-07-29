import type { CategorizedService, TravelCostConfig } from '../types/service-categories';

/** Name des Pseudo-Eintrags für Anfahrt (Legacy in services_with_categories) */
export const ANFAHRT_SERVICE_NAME = 'Anfahrkosten';

export function isExcludedFromAbPrice(serviceName: string | undefined): boolean {
  if (!serviceName) return true;
  if (serviceName === ANFAHRT_SERVICE_NAME) return true;
  const n = serviceName.toLowerCase();
  return n.includes('anfahrt') || n.includes('anfahrkosten');
}

/** Werte, die beim Speichern in services_with_categories geschrieben werden */
export type StoredPriceType = 'per_hour' | 'flat' | 'per_unit';

/** Anzeige / Vergleich (Legacy wird auf flat gemappt) */
export type EffectivePriceType = StoredPriceType;

const LEGACY_FLAT_TYPES = new Set(['per_visit', 'per_day', 'flat']);

/** Liest Preistyp aus JSON; Legacy ohne Feld → per_hour */
export function parseEffectivePriceType(raw: unknown): EffectivePriceType {
  if (raw === 'flat' || raw === 'per_visit' || raw === 'per_day') return 'flat';
  if (raw === 'per_unit') return 'per_unit';
  return 'per_hour';
}

/** Wert für <select> (inkl. Legacy → flat) */
export function priceTypeSelectValue(raw: unknown): StoredPriceType {
  return parseEffectivePriceType(raw);
}

/** Beim Speichern: nur per_hour | flat | per_unit */
export function normalizePriceTypeForSave(raw: unknown): StoredPriceType {
  return parseEffectivePriceType(raw);
}

export const PER_UNIT_PRICE_TITLE =
  'Preis pro Leistungseinheit (z. B. pro Fütterung, pro Medikament)';

export function priceDisplayTitleForType(type: EffectivePriceType): string | undefined {
  if (type === 'per_unit') return PER_UNIT_PRICE_TITLE;
  return undefined;
}

export function priceTypeSuffixGerman(type: EffectivePriceType): string {
  switch (type) {
    case 'flat':
      return ' pauschal';
    case 'per_unit':
      return ' pro';
    default:
      return '/h';
  }
}

export function priceTypeSelectOptionsGerman(): { value: StoredPriceType; label: string }[] {
  return [
    { value: 'per_hour', label: 'Stunde (€/h)' },
    { value: 'flat', label: 'Pauschal' },
    { value: 'per_unit', label: 'Anzahl (pro)' },
  ];
}

/** Default anhand früherer UI-Hinweise (€/Tag, €/Stunde, …) */
export function defaultPriceTypeFromHint(hint: string | undefined): StoredPriceType {
  if (!hint) return 'per_hour';
  const h = hint.toLowerCase();
  if (
    h.includes('/tag') ||
    h.includes('/nacht') ||
    h.includes('/besuch') ||
    h.includes('/termin') ||
    h.includes('/kurs') ||
    h.includes('/plan') ||
    h.includes('/shooting') ||
    h.includes('/event') ||
    h.includes('/einsatz')
  ) {
    return 'flat';
  }
  if (h.includes('/bild') || h.includes('/analyse')) {
    return 'per_unit';
  }
  return 'per_hour';
}

export function parsePositiveNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null;
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(',', '.'));
  if (Number.isNaN(n) || n <= 0) return null;
  return n;
}

/** Günstigste Leistung (ohne Anfahrt); für konsistentes „ab“-Label */
export function getCheapestPricedService(
  services: CategorizedService[] | null | undefined
): { price: number; priceType: EffectivePriceType } | null {
  if (!services || !Array.isArray(services)) return null;

  let best: { price: number; priceType: EffectivePriceType } | null = null;

  for (const s of services) {
    if (isExcludedFromAbPrice(s.name)) continue;
    const price = parsePositiveNumber(s.price);
    if (price === null) continue;
    const priceType = parseEffectivePriceType(s.price_type);
    if (!best || price < best.price) {
      best = { price, priceType };
    }
  }

  return best;
}

/** Preiskarte aus SWC ohne Anfahrt (z. B. für getBestPrice-Maps) */
export function priceRecordFromServicesExcludingTravel(
  services: CategorizedService[] | unknown[] | null | undefined
): Record<string, number> {
  if (!services || !Array.isArray(services)) return {};
  const out: Record<string, number> = {};
  for (const raw of services) {
    const s = raw as CategorizedService;
    if (!s?.name || isExcludedFromAbPrice(s.name)) continue;
    const p = parsePositiveNumber(s.price);
    if (p !== null) out[s.name] = p;
  }
  return out;
}

/** Minimum aller Zahlen ohne Anfahrts-Schlüssel */
export function minNumericPriceExcludingTravel(
  prices: Record<string, number | string> | null | undefined
): number {
  if (!prices || typeof prices !== 'object') return 0;
  const nums = Object.entries(prices)
    .filter(([key]) => !isExcludedFromAbPrice(key))
    .map(([, v]) => {
      const n = typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'));
      return Number.isNaN(n) ? 0 : n;
    })
    .filter(n => n > 0);
  return nums.length > 0 ? Math.min(...nums) : 0;
}

/** Parst services_with_categories falls API/View JSON als String liefert */
export function parseServicesWithCategoriesJson(raw: unknown): CategorizedService[] {
  if (Array.isArray(raw)) return raw as CategorizedService[];
  if (typeof raw === 'string') {
    const t = raw.trim();
    if (!t) return [];
    try {
      const p = JSON.parse(t);
      return Array.isArray(p) ? (p as CategorizedService[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function legacyTravelServiceMatch(name: string): boolean {
  const t = name.trim();
  if (!t) return false;
  const low = t.toLowerCase();
  if (
    t === ANFAHRT_SERVICE_NAME ||
    low === 'anfahrtskosten' ||
    low === 'anfahrt'
  ) {
    return true;
  }
  if (low.includes('anfahrkosten')) return true;
  if (
    low.includes('anfahrt') &&
    !low.includes('keine ') &&
    !low.startsWith('keine ')
  ) {
    return true;
  }
  return false;
}

/** travel_cost_config aus Profil oder Legacy-Anfahrkosten-Eintrag */
export function resolveTravelCostConfig(
  travelCostConfigRaw: unknown,
  services: CategorizedService[] | unknown[] | null | undefined
): TravelCostConfig | null {
  let travel: unknown = travelCostConfigRaw;
  if (typeof travel === 'string') {
    const t = travel.trim();
    if (t) {
      try {
        travel = JSON.parse(t);
      } catch {
        travel = null;
      }
    } else {
      travel = null;
    }
  }

  if (travel && typeof travel === 'object' && !Array.isArray(travel)) {
    const o = travel as Record<string, unknown>;
    const pricePerKm = parsePositiveNumber(o.price_per_km ?? o.pricePerKm);
    const freeKmRaw = o.free_km ?? o.freeKm;
    const freeKm =
      freeKmRaw === null || freeKmRaw === undefined || freeKmRaw === ''
        ? undefined
        : Math.max(0, Math.floor(Number(freeKmRaw)));

    if (pricePerKm !== null || (typeof freeKm === 'number' && freeKm > 0)) {
      const cfg: TravelCostConfig = {};
      if (pricePerKm !== null) cfg.price_per_km = pricePerKm;
      if (typeof freeKm === 'number' && freeKm > 0) cfg.free_km = freeKm;
      return Object.keys(cfg).length > 0 ? cfg : null;
    }
  }

  const list = Array.isArray(services) ? services : parseServicesWithCategoriesJson(services);
  if (list.length > 0) {
    for (const raw of list) {
      const s = raw as CategorizedService;
      const n = s?.name;
      if (!n) continue;
      if (legacyTravelServiceMatch(n)) {
        const p = parsePositiveNumber(s.price);
        if (p !== null) return { price_per_km: p, free_km: undefined };
      }
    }
  }

  return null;
}

export function formatTravelCostGerman(config: TravelCostConfig | null): string | null {
  if (!config) return null;
  const rateNum = parsePositiveNumber(config.price_per_km as unknown);
  const hasRate = rateNum !== null;
  let freeKm = 0;
  if (config.free_km != null && config.free_km !== '') {
    const fk = Math.max(0, Math.floor(Number(config.free_km)));
    if (!Number.isNaN(fk) && fk > 0) freeKm = fk;
  }

  if (!hasRate && freeKm <= 0) return null;

  const rateStr = hasRate && rateNum !== null ? `${String(rateNum).replace('.', ',')} €/km` : null;

  if (rateStr && freeKm > 0) {
    return `${rateStr} (erste ${freeKm} km frei)`;
  }
  if (rateStr) return rateStr;
  if (freeKm > 0) return `erste ${freeKm} km frei`;
  return null;
}

export { getCheapestPricedService as getCheapestServiceDisplay };

/** @deprecated intern – Legacy-Erkennung */
export function isLegacyFlatPriceType(raw: unknown): boolean {
  return typeof raw === 'string' && LEGACY_FLAT_TYPES.has(raw);
}
