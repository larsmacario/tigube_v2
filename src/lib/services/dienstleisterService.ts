// Dienstleister-Service für API-Aufrufe

import { supabase } from '../supabase/client';
import type { 
  DienstleisterProfil, 
  DienstleisterKategorie, 
  DienstleisterSucheFilter, 
  DienstleisterSucheErgebnis,
  DienstleisterLeistung,
  CrossServiceEmpfehlung,
  DienstleisterRegistrierung
} from '../types/dienstleister';

export class DienstleisterService {
  /**
   * Alle Dienstleister-Kategorien laden
   */
  static async getKategorien(): Promise<DienstleisterKategorie[]> {
    const { data, error } = await supabase
      .from('dienstleister_kategorien')
      .select('*')
      .eq('is_active', true)
      .order('sortierung');

    if (error) throw error;
    return data || [];
  }

  /**
   * Dienstleister suchen
   */
  static async searchDienstleister(
    filters: DienstleisterSucheFilter,
    limit: number = 20,
    offset: number = 0
  ): Promise<DienstleisterSucheErgebnis> {
    let query = supabase
      .from('dienstleister_search_view')
      .select('*', { count: 'exact' });

    // Kategorie-Filter
    if (filters.kategorie_id) {
      query = query.eq('kategorie_id', filters.kategorie_id);
    }

    // Dienstleister-Typ-Filter
    if (filters.dienstleister_typ) {
      query = query.eq('dienstleister_typ', filters.dienstleister_typ);
    }

    // Standort-Filter
    if (filters.standort?.plz) {
      query = query.eq('plz', filters.standort.plz);
    }

    if (filters.standort?.ort) {
      query = query.ilike('city', `%${filters.standort.ort}%`);
    }

    // Spezialisierungen-Filter
    if (filters.spezialisierungen && filters.spezialisierungen.length > 0) {
      query = query.overlaps('spezialisierungen', filters.spezialisierungen);
    }

    // Notfall-Bereitschaft-Filter
    if (filters.notfall_bereitschaft !== undefined) {
      query = query.eq('notfall_bereitschaft', filters.notfall_bereitschaft);
    }

    // Bewertungs-Filter
    if (filters.bewertung?.min) {
      query = query.gte('rating', filters.bewertung.min);
    }

    // Preis-Filter
    if (filters.preis?.min) {
      query = query.gte('hourly_rate', filters.preis.min);
    }

    if (filters.preis?.max) {
      query = query.lte('hourly_rate', filters.preis.max);
    }

    // Zertifiziert-Filter
    if (filters.zertifiziert) {
      query = query.not('zertifikate', 'is', null);
    }

    // Pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    // Kategorien laden
    const kategorien = await this.getKategorien();

    // Cross-Service-Empfehlungen laden (nur für Premium-User)
    let crossServiceEmpfehlungen: CrossServiceEmpfehlung[] = [];
    if (filters.kategorie_id) {
      const { data: empfehlungen } = await supabase
        .from('cross_service_empfehlungen')
        .select('*')
        .eq('haupt_kategorie_id', filters.kategorie_id)
        .eq('is_active', true)
        .order('prioritaet');

      crossServiceEmpfehlungen = empfehlungen || [];
    }

    return {
      dienstleister: data || [],
      kategorien,
      cross_service_empfehlungen: crossServiceEmpfehlungen,
      total_count: count || 0,
      has_more: (count || 0) > offset + limit
    };
  }

  /**
   * Dienstleister-Profil laden
   */
  static async getDienstleisterProfil(id: string, viewerId?: string): Promise<DienstleisterProfil | null> {
    try {
      // Prüfe ob der Viewer das eigene Profil ansehen möchte
      const { data: { session } } = await supabase.auth.getSession();
      const isOwnProfile = viewerId ? viewerId === id : (session?.user?.id === id);
      
      let data;
      let error;
      let loadedFromView = false;
      
      if (isOwnProfile) {
        // Für eigenes Profil: Versuche zuerst die View (wenn freigegeben), sonst direkt aus caretaker_profiles
        const { data: viewData, error: viewError } = await supabase
          .from('dienstleister_search_view')
          .select('*')
          .eq('id', id)
          .single();
        
        if (!viewError && viewData) {
          // Profil ist freigegeben und wurde über View geladen
          data = viewData;
          error = null;
          loadedFromView = true;
          console.log('✅ Own Dienstleister profile loaded from view (approved)');
        } else {
          // Profil ist nicht freigegeben oder View-Fehler - lade direkt aus caretaker_profiles
          console.log('⚠️ Own Dienstleister profile not approved or view error, loading directly from caretaker_profiles');
          const { data: profileData, error: profileError } = await supabase
            .from('caretaker_profiles')
            .select(`
              *,
              users!inner(
                id,
                first_name,
                last_name,
                city,
                plz,
                profile_photo_url,
                user_type
              ),
              dienstleister_kategorien:kategorie_id(
                id,
                name,
                icon
              )
            `)
            .eq('id', id)
            .single();
          
          if (profileError) {
            console.error('Fehler beim Laden des Dienstleister-Profils:', profileError);
            return null;
          }
          
          // Transformiere zu DienstleisterProfil-Format
          // Das View-Format wird hier simuliert
          const userData = (profileData as any).users;
          const kategorieData = (profileData as any).dienstleister_kategorien;
          const kategorieId = (profileData as any).kategorie_id;
          
          data = {
            ...profileData,
            first_name: userData?.first_name || '',
            last_name: userData?.last_name || '',
            city: userData?.city || '',
            plz: userData?.plz || '',
            profile_photo_url: userData?.profile_photo_url || null,
            user_type: userData?.user_type || 'dienstleister',
            // Kategorie-Daten
            kategorie_id: kategorieId || null,
            kategorie_name: kategorieData?.name || '',
            kategorie_icon: kategorieData?.icon || '',
            dienstleister_typ: (profileData as any).dienstleister_typ || userData?.user_type || '',
            search_type: (profileData as any).search_type || 'service_provider',
            public_profile_visible: (profileData as any).public_profile_visible ?? true,
            is_suspended: (profileData as any).is_suspended ?? false,
            approval_status: (profileData as any).approval_status || 'not_requested',
            // Erfahrung explizit übernehmen
            experience_years: (profileData as any).experience_years || null,
            experience_description: (profileData as any).experience_description || null,
            // Weitere Felder sicherstellen
            short_term_available: (profileData as any).short_term_available ?? false,
            notfall_bereitschaft: (profileData as any).notfall_bereitschaft ?? false,
            spezialisierungen: (profileData as any).spezialisierungen || [],
            zertifikate: (profileData as any).zertifikate || [],
            portfolio_urls: (profileData as any).portfolio_urls || [],
            oeffnungszeiten: (profileData as any).oeffnungszeiten || null
          } as DienstleisterProfil;
        }
      } else {
        // Für fremde Profile: Nur freigegebene Profile (über View)
        const { data: viewData, error: viewError } = await supabase
          .from('dienstleister_search_view')
          .select('*')
          .eq('id', id)
          .single();
        
        data = viewData;
        error = viewError;
        loadedFromView = true;
      }

      if (error) {
        console.error('Fehler beim Laden des Dienstleister-Profils:', error);
        return null;
      }

      // is_verified: View kann Spalte fehlen — aus caretaker_profiles/users abgleichen
      if (data && (loadedFromView || data.is_verified === undefined)) {
        const [{ data: profilePatch }, { data: userPatch }] = await Promise.all([
          supabase.from('caretaker_profiles').select('is_verified').eq('id', id).maybeSingle(),
          supabase.from('users').select('verification_status').eq('id', id).maybeSingle(),
        ]);
        const isVerified =
          profilePatch?.is_verified === true ||
          userPatch?.verification_status === 'approved';
        data = { ...data, is_verified: isVerified };
      }

      return data;
    } catch (err) {
      console.error('Fehler beim Laden des Dienstleister-Profils:', err);
      return null;
    }
  }

  /**
   * Dienstleister-Leistungen laden
   */
  static async getDienstleisterLeistungen(dienstleisterId: string): Promise<DienstleisterLeistung[]> {
    const { data, error } = await supabase
      .from('dienstleister_leistungen')
      .select('*')
      .eq('dienstleister_id', dienstleisterId)
      .eq('verfuegbar', true)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Dienstleister-Leistung erstellen
   */
  static async createLeistung(leistung: Omit<DienstleisterLeistung, 'id' | 'created_at' | 'updated_at'>): Promise<DienstleisterLeistung> {
    const { data, error } = await supabase
      .from('dienstleister_leistungen')
      .insert(leistung)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Dienstleister-Leistung aktualisieren
   */
  static async updateLeistung(id: number, updates: Partial<DienstleisterLeistung>): Promise<DienstleisterLeistung> {
    const { data, error } = await supabase
      .from('dienstleister_leistungen')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Dienstleister-Leistung löschen
   */
  static async deleteLeistung(id: number): Promise<void> {
    const { error } = await supabase
      .from('dienstleister_leistungen')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Cross-Service-Empfehlungen laden
   */
  static async getCrossServiceEmpfehlungen(kategorieId: number): Promise<CrossServiceEmpfehlung[]> {
    const { data, error } = await supabase
      .from('cross_service_empfehlungen')
      .select(`
        *,
        haupt_kategorie:dienstleister_kategorien!haupt_kategorie_id(name, icon),
        empfohlene_kategorie:dienstleister_kategorien!empfohlene_kategorie_id(name, icon)
      `)
      .eq('haupt_kategorie_id', kategorieId)
      .eq('is_active', true)
      .order('prioritaet');

    if (error) throw error;
    return data || [];
  }

  /**
   * Dienstleister-Profil aktualisieren
   */
  static async updateDienstleisterProfil(
    id: string, 
    updates: Partial<DienstleisterRegistrierung>
  ): Promise<void> {
    const { error } = await supabase
      .from('caretaker_profiles')
      .update(updates)
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Dienstleister-spezifische Dashboard-Tabs laden
   */
  static async getDashboardTabs(kategorieId: number): Promise<any[]> {
    try {
      // Basis-Tabs für alle Dienstleister
      const baseTabs = [
        { id: 'uebersicht', name: 'Übersicht', icon: 'home', kategorie_spezifisch: false },
        { id: 'leistungen', name: 'Leistungen', icon: 'briefcase', kategorie_spezifisch: false },
        { id: 'verfuegbarkeit', name: 'Verfügbarkeit', icon: 'calendar', kategorie_spezifisch: false },
        { id: 'bewertungen', name: 'Bewertungen', icon: 'star', kategorie_spezifisch: false },
        { id: 'einstellungen', name: 'Einstellungen', icon: 'settings', kategorie_spezifisch: false }
      ];

      // Kategorie-spezifische Tabs
      const kategorieSpezifischeTabs: Record<number, any[]> = {
        2: [ // Tierarzt
          { id: 'patienten', name: 'Patienten', icon: 'users', kategorie_spezifisch: true },
          { id: 'termine', name: 'Termine', icon: 'calendar', kategorie_spezifisch: true },
          { id: 'notfaelle', name: 'Notfälle', icon: 'alert-triangle', kategorie_spezifisch: true }
        ],
        3: [ // Hundetrainer
          { id: 'kunden', name: 'Kunden', icon: 'users', kategorie_spezifisch: true },
          { id: 'trainingsplaene', name: 'Trainingspläne', icon: 'clipboard', kategorie_spezifisch: true },
          { id: 'fortschritte', name: 'Fortschritte', icon: 'trending-up', kategorie_spezifisch: true }
        ],
        4: [ // Tierfriseur
          { id: 'buchungen', name: 'Buchungen', icon: 'calendar', kategorie_spezifisch: true },
          { id: 'galerie', name: 'Galerie', icon: 'image', kategorie_spezifisch: true },
          { id: 'services', name: 'Services', icon: 'scissors', kategorie_spezifisch: true }
        ],
        5: [ // Physiotherapeut
          { id: 'patienten', name: 'Patienten', icon: 'users', kategorie_spezifisch: true },
          { id: 'behandlungen', name: 'Behandlungen', icon: 'activity', kategorie_spezifisch: true },
          { id: 'fortschritte', name: 'Fortschritte', icon: 'trending-up', kategorie_spezifisch: true }
        ],
        6: [ // Ernährungsberater
          { id: 'kunden', name: 'Kunden', icon: 'users', kategorie_spezifisch: true },
          { id: 'beratungen', name: 'Beratungen', icon: 'message-circle', kategorie_spezifisch: true },
          { id: 'ernaehrungsplaene', name: 'Ernährungspläne', icon: 'clipboard', kategorie_spezifisch: true }
        ],
        7: [ // Tierfotograf
          { id: 'auftraege', name: 'Aufträge', icon: 'camera', kategorie_spezifisch: true },
          { id: 'portfolio', name: 'Portfolio', icon: 'image', kategorie_spezifisch: true },
          { id: 'galerie', name: 'Galerie', icon: 'images', kategorie_spezifisch: true }
        ]
      };

      const spezifischeTabs = kategorieSpezifischeTabs[kategorieId] || [];
      return [...baseTabs, ...spezifischeTabs];
    } catch (error) {
      console.error('Fehler beim Laden der Dashboard-Tabs:', error);
      return [];
    }
  }
}
