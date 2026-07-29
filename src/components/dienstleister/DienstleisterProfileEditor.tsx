import { useState, useEffect, useMemo } from 'react';
import { Save, X, Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import { supabase } from '../../lib/supabase/client';
import { useToast } from '../../hooks/useToast';
import {
  type CategorizedService,
  type TravelCostConfig,
  DEFAULT_SERVICE_CATEGORIES,
  type ServiceCategory,
} from '../../lib/types/service-categories';
import { getCheapestPricedService, normalizePriceTypeForSave, priceTypeSelectValue, type StoredPriceType } from '../../lib/pricing/servicePricing';
import ServicePriceTypeSelect from '../pricing/ServicePriceTypeSelect';

interface DienstleisterKategorie {
  id: number;
  name: string;
  beschreibung: string;
  icon: string;
}

interface DienstleisterProfileEditorProps {
  userId: string;
  initialData: {
    kategorie_id?: number;
    spezialisierungen?: string[];
    behandlungsmethoden?: string[];
    fachgebiete?: string[];
    beratungsarten?: string[];
    freie_dienstleistung?: string;
    notfall_bereitschaft?: boolean;
    portfolio_urls?: string[];
    stil_beschreibung?: string;
    services_with_categories?: CategorizedService[];
    travel_cost_config?: TravelCostConfig | null;
    hourly_rate?: number | null;
  };
  onSave: (data: any) => void;
  onCancel: () => void;
}

interface PricingRowDraft {
  reactKey: string;
  categorized: CategorizedService;
  priceStr: string;
}

function validatePriceInput(value: string): string {
  let cleanValue = String(value ?? '').trim();
  if (cleanValue === '') return '';

  cleanValue = cleanValue.replace(',', '.');
  const parts = cleanValue.split('.');
  if (parts.length > 2) {
    cleanValue = parts[0] + '.' + parts.slice(1).join('');
  }
  if (parts.length === 2 && parts[1].length > 2) {
    cleanValue = parts[0] + '.' + parts[1].substring(0, 2);
  }
  return cleanValue;
}

function rowsFromServices(
  services: CategorizedService[] | undefined
): PricingRowDraft[] {
  if (!services?.length) return [];
  return services
    .filter(s => s.name && s.name !== 'Anfahrkosten')
    .map((s, idx) => ({
      reactKey: `row_${idx}_${s.name}`,
      categorized: {
        name: s.name,
        category_id: s.category_id ?? 8,
        category_name: s.category_name ?? 'Allgemein',
        price_type: normalizePriceTypeForSave(s.price_type),
      },
      priceStr:
        s.price != null && String(s.price).trim() !== ''
          ? String(s.price).replace('.', ',')
          : '',
    }));
}

function travelDraftFromSources(
  services: CategorizedService[] | undefined,
  tc: TravelCostConfig | null | undefined
): { pricePerKm: string; freeKm: string } {
  if (tc && typeof tc === 'object') {
    return {
      pricePerKm:
        tc.price_per_km != null && tc.price_per_km !== ''
          ? String(tc.price_per_km).replace('.', ',')
          : '',
      freeKm:
        tc.free_km != null && tc.free_km !== ''
          ? String(tc.free_km)
          : '',
    };
  }
  const leg = services?.find(s => s.name === 'Anfahrkosten' && s.price != null);
  if (leg?.price != null && String(leg.price).trim() !== '') {
    return { pricePerKm: String(leg.price).replace('.', ','), freeKm: '' };
  }
  return { pricePerKm: '', freeKm: '' };
}

export default function DienstleisterProfileEditor({
  userId,
  initialData,
  onSave,
  onCancel,
}: DienstleisterProfileEditorProps) {
  const { showSuccess, showError } = useToast();
  const [loading, setLoading] = useState(false);
  const [kategorien, setKategorien] = useState<DienstleisterKategorie[]>([]);
  const [serviceCategories] = useState<ServiceCategory[]>(
    DEFAULT_SERVICE_CATEGORIES as unknown as ServiceCategory[]
  );

  const swcInitKey = useMemo(
    () => JSON.stringify(initialData.services_with_categories ?? []),
    [initialData.services_with_categories]
  );
  const tcInitKey = useMemo(
    () => JSON.stringify(initialData.travel_cost_config ?? null),
    [initialData.travel_cost_config]
  );

  const [pricingRows, setPricingRows] = useState<PricingRowDraft[]>(() =>
    rowsFromServices(initialData.services_with_categories)
  );
  const [travelDraft, setTravelDraft] = useState(() =>
    travelDraftFromSources(
      initialData.services_with_categories,
      initialData.travel_cost_config
    )
  );

  useEffect(() => {
    setPricingRows(rowsFromServices(initialData.services_with_categories));
    setTravelDraft(
      travelDraftFromSources(
        initialData.services_with_categories,
        initialData.travel_cost_config
      )
    );
  }, [swcInitKey, tcInitKey]);

  // Form states
  const [selectedKategorie, setSelectedKategorie] = useState<number>(initialData.kategorie_id || 1);
  const [spezialisierungen, setSpezialisierungen] = useState<string[]>(initialData.spezialisierungen || []);
  const [behandlungsmethoden, setBehandlungsmethoden] = useState<string[]>(initialData.behandlungsmethoden || []);
  const [fachgebiete, setFachgebiete] = useState<string[]>(initialData.fachgebiete || []);
  const [beratungsarten, setBeratungsarten] = useState<string[]>(initialData.beratungsarten || []);
  const [freieDialenstleistung, setFreieDialenstleistung] = useState<string>(initialData.freie_dienstleistung || '');
  const [notfallBereitschaft, setNotfallBereitschaft] = useState<boolean>(initialData.notfall_bereitschaft || false);
  const [portfolioUrls, setPortfolioUrls] = useState<string[]>(initialData.portfolio_urls || []);
  const [stilBeschreibung, setStilBeschreibung] = useState<string>(initialData.stil_beschreibung || '');

  // Input states for adding new items
  const [newSpezialisierung, setNewSpezialisierung] = useState('');
  const [newBehandlungsmethode, setNewBehandlungsmethode] = useState('');
  const [newFachgebiet, setNewFachgebiet] = useState('');
  const [newBeratungsart, setNewBeratungsart] = useState('');
  const [newPortfolioUrl, setNewPortfolioUrl] = useState('');

  // Load kategorien
  useEffect(() => {
    const loadKategorien = async () => {
      try {
        const { data, error } = await supabase
          .from('dienstleister_kategorien' as any)
          .select('*')
          .eq('is_active', true)
          .order('sortierung');

        if (error) throw error;
        setKategorien((data as unknown as DienstleisterKategorie[]) || []);
      } catch (error) {
        console.error('Error loading kategorien:', error);
        showError('Fehler beim Laden der Kategorien');
      }
    };

    loadKategorien();
  }, [showError]);

  const handleAddItem = (
    items: string[],
    setItems: (items: string[]) => void,
    newItem: string,
    setNewItem: (item: string) => void
  ) => {
    if (newItem.trim() && !items.includes(newItem.trim())) {
      setItems([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemoveItem = (
    items: string[],
    setItems: (items: string[]) => void,
    index: number
  ) => {
    setItems(items.filter((_, i) => i !== index));
  };

  function addPricingRow() {
    const newKey = `custom_${Date.now()}`;
    setPricingRows(rows => [
      ...rows,
      {
        reactKey: `nk_${Date.now()}_${rows.length}`,
        categorized: {
          name: newKey,
          category_id: 8,
          category_name: 'Allgemein',
          price_type: 'per_hour',
        },
        priceStr: '',
      },
    ]);
  }

  function removePricingRow(reactKey: string) {
    setPricingRows(rows => rows.filter(r => r.reactKey !== reactKey));
  }

  function updateRowPrice(reactKey: string, priceStr: string) {
    setPricingRows(rows =>
      rows.map(r =>
        r.reactKey === reactKey ? { ...r, priceStr: validatePriceInput(priceStr) } : r
      )
    );
  }

  function updateRowName(reactKey: string, name: string) {
    setPricingRows(rows =>
      rows.map(r =>
        r.reactKey === reactKey ? { ...r, categorized: { ...r.categorized, name } } : r
      )
    );
  }

  function updateRowCategory(reactKey: string, categoryId: number) {
    const category = serviceCategories.find(c => c.id === categoryId);
    if (!category) return;
    setPricingRows(rows =>
      rows.map(r =>
        r.reactKey === reactKey
          ? {
              ...r,
              categorized: {
                ...r.categorized,
                category_id: categoryId,
                category_name: category.name,
              },
            }
          : r
      )
    );
  }

  function updateRowPriceType(reactKey: string, priceType: StoredPriceType) {
    setPricingRows(rows =>
      rows.map(r =>
        r.reactKey === reactKey
          ? { ...r, categorized: { ...r.categorized, price_type: priceType } }
          : r
      )
    );
  }

  function handleTravelDraftChange(field: 'pricePerKm' | 'freeKm', value: string) {
    const next =
      field === 'freeKm' ? value.replace(/[^0-9]/g, '') : validatePriceInput(value);
    setTravelDraft(d => ({ ...d, [field]: next }));
  }

  const handleSave = async () => {
    try {
      setLoading(true);

      const allActiveServices: CategorizedService[] = pricingRows
        .filter(row => row.categorized.name.trim() !== '')
        .map(row => {
          const raw = row.priceStr.replace(',', '.').trim();
          const parsed =
            raw === '' || Number.isNaN(Number.parseFloat(raw)) ? NaN : Number.parseFloat(raw);
          const priced = !Number.isNaN(parsed) && parsed > 0;
          return {
            name: row.categorized.name.trim(),
            category_id: row.categorized.category_id,
            category_name: row.categorized.category_name,
            ...(priced
              ? { price: parsed, price_type: normalizePriceTypeForSave(row.categorized.price_type) }
              : {}),
          };
        });

      const pkRaw = travelDraft.pricePerKm.replace(',', '.').trim();
      const fkRaw = travelDraft.freeKm.trim();
      const pk = pkRaw === '' ? NaN : Number.parseFloat(pkRaw);
      const fk = fkRaw === '' ? NaN : Number.parseInt(fkRaw, 10);

      let travelCostConfigPayload: TravelCostConfig | null = null;
      if (!Number.isNaN(pk) && pk > 0) {
        travelCostConfigPayload = { price_per_km: pk };
        if (!Number.isNaN(fk) && fk > 0) travelCostConfigPayload.free_km = fk;
      } else if (!Number.isNaN(fk) && fk > 0) {
        travelCostConfigPayload = { free_km: fk };
      }

      const minFromServices =
        getCheapestPricedService(
          allActiveServices.filter(s => s.price != null && (s.price as number) > 0)
        )?.price ?? null;

      const updateData = {
        kategorie_id: selectedKategorie,
        spezialisierungen,
        behandlungsmethoden,
        fachgebiete,
        beratungsarten,
        freie_dienstleistung: freieDialenstleistung || null,
        notfall_bereitschaft: notfallBereitschaft,
        portfolio_urls: portfolioUrls.filter(url => url.trim()),
        stil_beschreibung: stilBeschreibung || null,
        services_with_categories: allActiveServices,
        travel_cost_config: travelCostConfigPayload,
        hourly_rate: minFromServices,
      };

      const { error } = await supabase.from('caretaker_profiles').update(updateData as any).eq('id', userId);

      if (error) throw error;

      showSuccess('Profil erfolgreich aktualisiert');
      onSave(updateData);
    } catch (error) {
      console.error('Error saving profile:', error);
      showError('Fehler beim Speichern des Profils');
    } finally {
      setLoading(false);
    }
  };

  const ArrayInput = ({
    label,
    items,
    setItems,
    newItem,
    setNewItem,
    placeholder
  }: {
    label: string;
    items: string[];
    setItems: (items: string[]) => void;
    newItem: string;
    setNewItem: (item: string) => void;
    placeholder: string;
  }) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={index} className="flex items-center space-x-2">
            <span className="flex-1 px-3 py-2 bg-gray-50 rounded-md text-sm">
              {item}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveItem(items, setItems, index)}
              className="p-1 text-red-500 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        ))}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder={placeholder}
            className="flex-1 input"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddItem(items, setItems, newItem, setNewItem);
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleAddItem(items, setItems, newItem, setNewItem)}
            disabled={!newItem.trim()}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Dienstleister-Profil bearbeiten
        </h3>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={loading}
          >
            <X className="w-4 h-4 mr-2" />
            Abbrechen
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={loading}
          >
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Speichern...' : 'Speichern'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Kategorie */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kategorie *
            </label>
            <select
              value={selectedKategorie}
              onChange={(e) => setSelectedKategorie(Number(e.target.value))}
              className="input w-full"
            >
              {kategorien.map((kategorie) => (
                <option key={kategorie.id} value={kategorie.id}>
                  {kategorie.name}
                </option>
              ))}
            </select>
          </div>

          {/* Spezialisierungen */}
          <ArrayInput
            label="Spezialisierungen"
            items={spezialisierungen}
            setItems={setSpezialisierungen}
            newItem={newSpezialisierung}
            setNewItem={setNewSpezialisierung}
            placeholder="Neue Spezialisierung hinzufügen..."
          />

          {/* Fachgebiete */}
          <ArrayInput
            label="Fachgebiete"
            items={fachgebiete}
            setItems={setFachgebiete}
            newItem={newFachgebiet}
            setNewItem={setNewFachgebiet}
            placeholder="Neues Fachgebiet hinzufügen..."
          />

          {/* Freie Dienstleistung */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Freie Dienstleistung
            </label>
            <textarea
              value={freieDialenstleistung}
              onChange={(e) => setFreieDialenstleistung(e.target.value)}
              placeholder="Beschreiben Sie Ihre individuellen Dienstleistungen..."
              className="input w-full"
              rows={3}
            />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Behandlungsmethoden */}
          <ArrayInput
            label="Behandlungsmethoden"
            items={behandlungsmethoden}
            setItems={setBehandlungsmethoden}
            newItem={newBehandlungsmethode}
            setNewItem={setNewBehandlungsmethode}
            placeholder="Neue Behandlungsmethode hinzufügen..."
          />

          {/* Beratungsarten */}
          <ArrayInput
            label="Beratungsarten"
            items={beratungsarten}
            setItems={setBeratungsarten}
            newItem={newBeratungsart}
            setNewItem={setNewBeratungsart}
            placeholder="Neue Beratungsart hinzufügen..."
          />

          {/* Portfolio URLs */}
          <ArrayInput
            label="Portfolio URLs"
            items={portfolioUrls}
            setItems={setPortfolioUrls}
            newItem={newPortfolioUrl}
            setNewItem={setNewPortfolioUrl}
            placeholder="https://beispiel.com/portfolio"
          />

          {/* Notfall-Verfügbarkeit */}
          <div>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={notfallBereitschaft}
                onChange={(e) => setNotfallBereitschaft(e.target.checked)}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Notfall-Service verfügbar
              </span>
            </label>
            <p className="text-xs text-gray-500 mt-1">
              Ich bin auch außerhalb der regulären Zeiten für Notfälle erreichbar
            </p>
          </div>
        </div>
      </div>

      {/* Preise & Anfahrt (Caretaker-Profillogik für Dienstleister) */}
      <div className="border rounded-xl border-gray-200 bg-gray-50/80 p-4 space-y-4">
        <h4 className="text-md font-semibold text-gray-900">Preise &amp; Anfahrt</h4>
        <p className="text-xs text-gray-600">
          Pro Leistung: Stunde (€/h), Pauschal oder Anzahl (pro); Anfahrt separat in €/km (optional erste km frei).
        </p>

        <div className="space-y-3">
          {pricingRows.map(row => (
            <div
              key={row.reactKey}
              className="flex flex-wrap items-center gap-2 p-3 border rounded-lg bg-white border-gray-200"
            >
              <input
                type="text"
                className="input flex-1 min-w-[140px]"
                value={row.categorized.name}
                onChange={e => updateRowName(row.reactKey, e.target.value)}
                placeholder="Leistungsbezeichnung"
              />
              <select
                className="input w-40 shrink-0"
                value={row.categorized.category_id}
                onChange={e => updateRowCategory(row.reactKey, Number.parseInt(e.target.value, 10))}
              >
                {serviceCategories.map(cat => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <ServicePriceTypeSelect
                value={priceTypeSelectValue(row.categorized.price_type)}
                onChange={pt => updateRowPriceType(row.reactKey, pt)}
              />
              <input
                type="text"
                inputMode="decimal"
                className="input w-24 shrink-0"
                placeholder="€"
                value={row.priceStr}
                onChange={e => updateRowPrice(row.reactKey, e.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="p-2 text-red-500 shrink-0"
                onClick={() => removePricingRow(row.reactKey)}
                title="Entfernen"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full border-dashed"
            onClick={addPricingRow}
          >
            <Plus className="w-4 h-4 mr-2" />
            Leistung hinzufügen
          </Button>
        </div>

        <div className="border-t border-gray-200 pt-4 space-y-2">
          <span className="block text-sm font-medium text-gray-700">Anfahrtskosten</span>
          <div className="flex flex-wrap gap-4 items-center">
            <label className="flex items-center gap-2 text-sm text-gray-600">
              €/km
              <input
                type="text"
                inputMode="decimal"
                className="input w-28"
                placeholder="z. B. 0,30"
                value={travelDraft.pricePerKm}
                onChange={e => handleTravelDraftChange('pricePerKm', e.target.value)}
              />
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600">
              erste km frei
              <input
                type="text"
                inputMode="numeric"
                className="input w-20"
                placeholder="optional"
                value={travelDraft.freeKm}
                onChange={e => handleTravelDraftChange('freeKm', e.target.value)}
              />
            </label>
          </div>
        </div>
      </div>

      {/* Stil & Arbeitsweise */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Stil & Arbeitsweise
        </label>
        <textarea
          value={stilBeschreibung}
          onChange={(e) => setStilBeschreibung(e.target.value)}
          placeholder="Beschreiben Sie Ihren Arbeitsstil und Ihre Philosophie..."
          className="input w-full"
          rows={4}
        />
        <p className="text-xs text-gray-500 mt-1">
          Erzählen Sie potenziellen Kunden, wie Sie arbeiten und was Sie auszeichnet
        </p>
      </div>
    </div>
  );
}
