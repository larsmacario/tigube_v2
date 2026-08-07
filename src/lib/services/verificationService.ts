import { supabase } from '../supabase/client';

export interface VerificationDocument {
  id: string;
  user_id: string;
  ausweis_url: string | null;
  zertifikate_urls: string[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  admin_comment: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface VerificationRequest {
  ausweis_url?: string;
  zertifikate_urls?: string[];
}

export interface VerificationStatus {
  status: 'not_submitted' | 'pending' | 'in_review' | 'approved' | 'rejected';
  message?: string;
}

export class VerificationService {
  private static readonly BUCKET_NAME = 'certificates';
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly ALLOWED_FILE_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];

  /**
   * Validiert eine Datei vor dem Upload
   */
  private static validateFile(file: File): { isValid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { isValid: false, error: 'Datei ist zu groß. Maximum: 10MB' };
    }

    if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
      return { isValid: false, error: 'Nur PDF, JPG und PNG Dateien sind erlaubt' };
    }

    return { isValid: true };
  }

  // Verschlüsselung entfernt - Dokumente werden unverschlüsselt gespeichert
  // für bessere Kompatibilität und einfachere Wartung

  /**
   * Lädt eine Datei in den Storage Bucket hoch
   */
  private static async uploadFile(file: File, userId: string, documentType: 'ausweis' | 'zertifikat'): Promise<string> {
    const validation = this.validateFile(file);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    try {
      // Generiere einen eindeutigen Dateinamen
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `${userId}/${documentType}_${timestamp}.${fileExtension}`;

      // Upload zur Supabase Storage (unverschlüsselt für bessere Kompatibilität)
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false
        });

      if (error) {
        throw new Error(`Upload fehlgeschlagen: ${error.message}`);
      }

      // Erstelle öffentliche URL
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Datei-Upload fehlgeschlagen');
    }
  }

  /**
   * Erstellt oder aktualisiert eine Verifizierungsanfrage
   */
  static async submitVerificationRequest(
    userId: string,
    ausweisFile: File,
    zertifikatFiles: File[] = []
  ): Promise<VerificationDocument> {
    try {
      // Upload Ausweis (Pflichtfeld)
      const ausweisUrl = await this.uploadFile(ausweisFile, userId, 'ausweis');

      // Upload Zertifikate (optional)
      const zertifikatUrls: string[] = [];
      for (const file of zertifikatFiles) {
        const url = await this.uploadFile(file, userId, 'zertifikat');
        zertifikatUrls.push(url);
      }

      // Prüfe ob bereits eine Verifizierungsanfrage existiert
      const { data: existingRequest } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .single();

      let verificationData: VerificationDocument;

      if (existingRequest) {
        // Aktualisiere bestehende Anfrage
        const { data, error } = await supabase
          .from('verification_requests')
          .update({
            ausweis_url: ausweisUrl,
            zertifikate_urls: zertifikatUrls,
            status: 'pending',
            updated_at: new Date().toISOString()
          })
          .eq('user_id', userId)
          .select()
          .single();

        if (error) throw error;
        verificationData = data;
      } else {
        // Erstelle neue Anfrage
        const { data, error } = await supabase
          .from('verification_requests')
          .insert({
            user_id: userId,
            ausweis_url: ausweisUrl,
            zertifikate_urls: zertifikatUrls,
            status: 'pending'
          })
          .select()
          .single();

        if (error) throw error;
        verificationData = data;
      }

      // Aktualisiere verification_status in users Tabelle
      await supabase
        .from('users')
        .update({ verification_status: 'pending' })
        .eq('id', userId);

      return verificationData;
    } catch (error) {
      console.error('Error submitting verification request:', error);
      throw new Error('Verifizierungsanfrage konnte nicht eingereicht werden');
    }
  }

  /**
   * Lädt die Verifizierungsanfrage eines Benutzers
   */
  static async getVerificationRequest(userId: string): Promise<VerificationDocument | null> {
    try {
      const { data, error } = await supabase
        .from('verification_requests')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching verification request:', error);
      throw new Error('Verifizierungsanfrage konnte nicht geladen werden');
    }
  }

  /**
   * Lädt den Verifizierungsstatus eines Benutzers
   */
  static async getVerificationStatus(userId: string): Promise<VerificationStatus> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('verification_status')
        .eq('id', userId)
        .single();

      if (error) throw error;

      return {
        status: data.verification_status as VerificationStatus['status']
      };
    } catch (error) {
      console.error('Error fetching verification status:', error);
      throw new Error('Verifizierungsstatus konnte nicht geladen werden');
    }
  }

  /**
   * Admin: Lädt alle Verifizierungsanfragen
   */
  static async getAllVerificationRequests(): Promise<VerificationDocument[]> {
    try {
      // Verwende rpc für Admin-Abfrage um RLS zu umgehen
      const { data, error } = await supabase.rpc('get_all_verification_requests');

      if (error) {
        console.error('RPC error:', error);
        // Fallback: Direkte Abfrage
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('verification_requests')
          .select(`
            *,
            users (
              first_name,
              last_name,
              email
            )
          `)
          .order('created_at', { ascending: false });

        if (fallbackError) {
          console.error('Fallback error:', fallbackError);
          throw fallbackError;
        }
        
        console.log('Fetched verification requests (fallback):', fallbackData);
        return fallbackData || [];
      }
      
      console.log('Fetched verification requests (RPC):', data);
      return data || [];
    } catch (error) {
      console.error('Error fetching all verification requests:', error);
      throw new Error('Verifizierungsanfragen konnten nicht geladen werden');
    }
  }

  /**
   * Admin: Aktualisiert den Status einer Verifizierungsanfrage
   */
  static async updateVerificationStatus(
    requestId: string,
    status: 'pending' | 'in_review' | 'approved' | 'rejected',
    adminComment?: string,
    adminId?: string
  ): Promise<void> {
    try {
      // Aktualisiere verification_requests
      const { error: requestError } = await supabase
        .from('verification_requests')
        .update({
          status,
          admin_comment: adminComment,
          reviewed_at: new Date().toISOString(),
          reviewed_by: adminId,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // Hole user_id für users Tabelle Update
      const { data: requestData, error: fetchError } = await supabase
        .from('verification_requests')
        .select('user_id')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Aktualisiere verification_status in users Tabelle
      const { error: userError } = await supabase
        .from('users')
        .update({ verification_status: status })
        .eq('id', requestData.user_id);

      if (userError) throw userError;

      // caretaker_profiles.is_verified synchron halten
      const { error: profileError } = await supabase
        .from('caretaker_profiles')
        .update({ is_verified: status === 'approved' })
        .eq('id', requestData.user_id);

      if (profileError) throw profileError;
    } catch (error) {
      console.error('Error updating verification status:', error);
      throw new Error('Verifizierungsstatus konnte nicht aktualisiert werden');
    }
  }

  // downloadDocument Funktion entfernt - Dokumente werden direkt über öffentliche URLs angezeigt

  /**
   * Löscht eine Verifizierungsanfrage (nur für Admins)
   */
  static async deleteVerificationRequest(requestId: string): Promise<void> {
    try {
      // Hole die Anfrage-Daten um URLs zu bekommen
      const { data: requestData, error: fetchError } = await supabase
        .from('verification_requests')
        .select('ausweis_url, zertifikate_urls')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Lösche Dateien aus Storage
      const filesToDelete = [
        requestData.ausweis_url,
        ...(requestData.zertifikate_urls || [])
      ].filter(Boolean);

      for (const fileUrl of filesToDelete) {
        if (fileUrl) {
          const fileName = fileUrl.split('/').pop();
          if (fileName) {
            await supabase.storage
              .from(this.BUCKET_NAME)
              .remove([fileName]);
          }
        }
      }

      // Lösche die Anfrage aus der Datenbank
      const { error: deleteError } = await supabase
        .from('verification_requests')
        .delete()
        .eq('id', requestId);

      if (deleteError) throw deleteError;
    } catch (error) {
      console.error('Error deleting verification request:', error);
      throw new Error('Verifizierungsanfrage konnte nicht gelöscht werden');
    }
  }
}
