import { supabase, isSupabaseConfigured, SUPABASE_URL, SUPABASE_ANON_KEY } from './supabaseClient';
import { Lead } from '../types';

// Localstorage fallback keys
const LS_HOTELS_KEY = 'leadscope_saved_hotels';

export const hotelDb = {
  /**
   * Get all hotels in the CRM Database
   */
  async getAllHotels(): Promise<Lead[]> {
    if (isSupabaseConfigured()) {
      try {
        console.log('--- Tentando buscar hotéis do Supabase ---');
        console.log('URL:', SUPABASE_URL);
        console.log('KEY (prefixo):', SUPABASE_ANON_KEY.substring(0, 10));
        const { data, error } = await supabase
          .from('hotels')
          .select('*');

        if (error) {
          console.error('--- ERRO Supabase ao buscar hotéis ---', error);
          throw new Error(`Erro do Supabase (${error.code || 'sem código'}): ${error.message}`);
        }
        console.log('--- Dados Supabase recebidos ---', data);
        if (data) {
          return data.map((d: any) => this.mapDbToLead(d));
        }
      } catch (err) {
        console.warn('Falha na consulta ao Supabase:', err);
        throw err;
      }
    }

    console.log('--- Supabase não configurado ou offline, caindo para LocalStorage ---');
    const stored = localStorage.getItem(LS_HOTELS_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  /**
   * Save or insert a hotel in the database
   */
  async saveHotel(hotel: Lead): Promise<boolean> {
    const dbHotel = this.mapLeadToDb(hotel);

    if (isSupabaseConfigured()) {
      try {
        // Find if hotel already exists
        const { data: existing } = await supabase
          .from('hotels')
          .select('id')
          .eq('company_name', hotel.companyName)
          .maybeSingle();

        let error;
        if (existing) {
          const { error: err } = await supabase
            .from('hotels')
            .update(dbHotel)
            .eq('id', existing.id);
          error = err;
        } else {
          const { error: err } = await supabase
            .from('hotels')
            .insert([dbHotel]);
          error = err;
        }

        if (!error) return true;
        if (this.isMissingCrmColumnError(error)) {
          console.warn('Supabase CRM columns are not migrated yet, retrying legacy hotel write:', error);
          const legacyHotel = this.mapLeadToLegacyDb(hotel);

          if (existing) {
            const { error: legacyError } = await supabase
              .from('hotels')
              .update(legacyHotel)
              .eq('id', existing.id);
            if (!legacyError) return true;
            console.warn('Supabase legacy update error, falling back to localStorage:', legacyError);
          } else {
            const { error: legacyError } = await supabase
              .from('hotels')
              .insert([legacyHotel]);
            if (!legacyError) return true;
            console.warn('Supabase legacy insert error, falling back to localStorage:', legacyError);
          }
        }
        console.warn('Supabase write error, falling back to localStorage:', error);
      } catch (err) {
        console.warn('Supabase write failed, falling back to localStorage:', err);
      }
    }

    // Fallback: LocalStorage
    const stored = localStorage.getItem(LS_HOTELS_KEY);
    const hotels: Lead[] = stored ? JSON.parse(stored) : [];
    const idx = hotels.findIndex((h) => h.id === hotel.id || h.companyName.toLowerCase().trim() === hotel.companyName.toLowerCase().trim());

    if (idx >= 0) {
      hotels[idx] = { ...hotels[idx], ...hotel };
    } else {
      hotels.push(hotel);
    }
    localStorage.setItem(LS_HOTELS_KEY, JSON.stringify(hotels));
    return true;
  },

  /**
   * Targeted patch — only updates the given columns (phone/website) for one row.
   * Matches by row ID, falling back to company_name. Returns true only if a row
   * was actually written in Supabase. Avoids the CRM-column failures of saveHotel
   * that silently fell back to localStorage.
   */
  async patchHotelFields(
    id: string,
    companyName: string,
    fields: { phone?: string; website?: string }
  ): Promise<boolean> {
    const patch: Record<string, string | null> = {};
    if ('phone' in fields) patch.phone = fields.phone ?? null;
    if ('website' in fields) patch.website = fields.website ?? null;
    if (Object.keys(patch).length === 0) return true;

    if (isSupabaseConfigured()) {
      try {
        // 1) tentar por id
        const byId = await supabase
          .from('hotels')
          .update(patch)
          .eq('id', id)
          .select('id');
        if (byId.error) {
          console.error('patchHotelFields error (by id):', byId.error);
        } else if (byId.data && byId.data.length > 0) {
          return true;
        }

        // 2) fallback por company_name (caso o id local nao bata com o da BD)
        const byName = await supabase
          .from('hotels')
          .update(patch)
          .eq('company_name', companyName)
          .select('id');
        if (byName.error) {
          console.error('patchHotelFields error (by name):', byName.error);
        } else if (byName.data && byName.data.length > 0) {
          return true;
        }

        console.warn('patchHotelFields: nenhuma linha correspondente na BD para', { id, companyName });
        return false;
      } catch (err) {
        console.error('patchHotelFields failed:', err);
        return false;
      }
    }

    // Sem Supabase configurado: localStorage
    const stored = localStorage.getItem(LS_HOTELS_KEY);
    const hotels: Lead[] = stored ? JSON.parse(stored) : [];
    const idx = hotels.findIndex((h) => h.id === id || h.companyName === companyName);
    if (idx >= 0) {
      if ('phone' in fields) hotels[idx].phone = fields.phone;
      if ('website' in fields) hotels[idx].website = fields.website;
      localStorage.setItem(LS_HOTELS_KEY, JSON.stringify(hotels));
    }
    return true;
  },

  /**
   * Add a phone WITHOUT overwriting the existing one.
   * - If the lead has no primary phone yet, the number becomes the primary.
   * - Otherwise it is appended to additional_phones (deduped).
   * Returns where it was stored, or 'duplicate' if already present.
   */
  async addPhone(
    id: string,
    companyName: string,
    newPhone: string
  ): Promise<{ ok: boolean; position: 'primary' | 'additional' | 'duplicate' }> {
    const norm = (p: string) => (p || '').replace(/\s+/g, '').trim();
    const target = norm(newPhone);
    if (!target) return { ok: false, position: 'duplicate' };

    if (isSupabaseConfigured()) {
      try {
        // ler estado atual (por id, com fallback por nome)
        let { data: row } = await supabase
          .from('hotels')
          .select('id, phone, additional_phones')
          .eq('id', id)
          .maybeSingle();
        if (!row) {
          const byName = await supabase
            .from('hotels')
            .select('id, phone, additional_phones')
            .eq('company_name', companyName)
            .maybeSingle();
          row = byName.data || null;
        }
        if (!row) {
          console.warn('addPhone: lead nao encontrado na BD', { id, companyName });
          return { ok: false, position: 'duplicate' };
        }

        const primary = norm(row.phone || '');
        const extras: string[] = Array.isArray(row.additional_phones) ? row.additional_phones : [];
        const extrasNorm = extras.map(norm);

        if (target === primary || extrasNorm.includes(target)) {
          return { ok: true, position: 'duplicate' };
        }

        if (!primary) {
          const { error } = await supabase.from('hotels').update({ phone: newPhone }).eq('id', row.id);
          if (error) { console.error('addPhone primary error:', error); return { ok: false, position: 'duplicate' }; }
          return { ok: true, position: 'primary' };
        }

        const updatedExtras = [...extras, newPhone];
        const { error } = await supabase.from('hotels').update({ additional_phones: updatedExtras }).eq('id', row.id);
        if (error) { console.error('addPhone additional error:', error); return { ok: false, position: 'duplicate' }; }
        return { ok: true, position: 'additional' };
      } catch (err) {
        console.error('addPhone failed:', err);
        return { ok: false, position: 'duplicate' };
      }
    }

    // localStorage fallback
    const stored = localStorage.getItem(LS_HOTELS_KEY);
    const hotels: Lead[] = stored ? JSON.parse(stored) : [];
    const idx = hotels.findIndex((h) => h.id === id || h.companyName === companyName);
    if (idx < 0) return { ok: false, position: 'duplicate' };
    const h = hotels[idx];
    const primary = norm(h.phone || '');
    const extras = h.additionalPhones || [];
    if (target === primary || extras.map(norm).includes(target)) return { ok: true, position: 'duplicate' };
    if (!primary) { h.phone = newPhone; }
    else { h.additionalPhones = [...extras, newPhone]; }
    localStorage.setItem(LS_HOTELS_KEY, JSON.stringify(hotels));
    return { ok: true, position: primary ? 'additional' : 'primary' };
  },

  /**
   * Delete hotel from database
   */
  async deleteHotel(id: string, companyName: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('hotels')
          .delete()
          .eq('id', id);
        if (!error) return true;
      } catch (err) {
        console.error('Supabase delete failed:', err);
      }
    }

    // Fallback: LocalStorage
    const stored = localStorage.getItem(LS_HOTELS_KEY);
    if (stored) {
      const hotels: Lead[] = JSON.parse(stored);
      const filtered = hotels.filter((h) => h.id !== id && h.companyName !== companyName);
      localStorage.setItem(LS_HOTELS_KEY, JSON.stringify(filtered));
    }
    return true;
  },

  /**
   * Refresh callback lists
   */
  async updateCallback(hotelId: string, scheduledAt: string | undefined, status: 'pending' | 'completed' | 'canceled'): Promise<boolean> {
    if (isSupabaseConfigured()) {
      try {
        const { error } = await supabase
          .from('hotels')
          .update({
            callback_scheduled_at: scheduledAt || null,
            callback_status: status
          })
          .eq('id', hotelId);
        if (!error) return true;
      } catch (err) {
        console.error('Supabase callback update failed:', err);
      }
    }

    // Local Storage
    const stored = localStorage.getItem(LS_HOTELS_KEY);
    if (stored) {
      const hotels: Lead[] = JSON.parse(stored);
      const idx = hotels.findIndex((h) => h.id === hotelId);
      if (idx >= 0) {
        hotels[idx].callbackScheduledAt = scheduledAt;
        hotels[idx].callbackStatus = status;
        localStorage.setItem(LS_HOTELS_KEY, JSON.stringify(hotels));
      }
    }
    return true;
  },

  /**
   * Helper Mapper: Lead to Database schema row
   */
  mapLeadToDb(lead: Lead) {
    return {
      id: lead.id,
      company_name: lead.companyName,
      location: lead.location,
      city: lead.city || null,
      country: lead.country || null,
      niche: lead.niche || 'Hotelaria',
      segment: lead.segment || null,
      estimated_rooms: lead.estimatedRooms || null,
      website: lead.website || null,
      email: lead.email || null,
      phone: lead.phone || null,
      additional_phones: lead.additionalPhones || [],
      contact_person: lead.contactPerson || null,
      contact_notes: lead.contactNotes || null,
      callback_scheduled_at: lead.callbackScheduledAt || null,
      callback_status: lead.callbackStatus || 'pending',
      potential: lead.potential || 'Medium',
      maps_rating: lead.mapsRating || null,
      maps_reviews: lead.mapsReviews || null,
      commercial_status: lead.commercialStatus || 'new',
      responsible_seller_id: lead.responsibleSellerId || null,
      priority: lead.priority || 'medium',
      lead_score: lead.leadScore || 0,
      source: lead.source || null,
      next_action_type: lead.nextActionType || null,
      next_action_at: lead.nextActionAt || null,
      close_reason_id: lead.closeReasonId || null,
      close_notes: lead.closeNotes || null,
      do_not_contact: lead.doNotContact || false,
      last_activity_at: lead.lastActivityAt || null,
      qualification: lead.qualification || null,
      followup_sequence: lead.followupSequence || null,
      created_at: new Date().toISOString()
    };
  },

  mapLeadToLegacyDb(lead: Lead) {
    return {
      id: lead.id,
      company_name: lead.companyName,
      location: lead.location,
      niche: lead.niche || 'Hotelaria',
      website: lead.website || null,
      email: lead.email || null,
      phone: lead.phone || null,
      contact_person: lead.contactPerson || null,
      contact_notes: lead.contactNotes || null,
      callback_scheduled_at: lead.callbackScheduledAt || null,
      callback_status: lead.callbackStatus || 'pending',
      potential: lead.potential || 'Medium',
      maps_rating: lead.mapsRating || null,
      maps_reviews: lead.mapsReviews || null,
      created_at: new Date().toISOString()
    };
  },

  isMissingCrmColumnError(error: any): boolean {
    const message = `${error?.message || ''} ${error?.details || ''}`.toLowerCase();
    return (
      error?.code === 'PGRST204' ||
      error?.code === '42703' ||
      message.includes('column') ||
      message.includes('schema cache')
    );
  },

  /**
   * Helper Mapper: Database schema row to Lead object
   */
  mapDbToLead(row: any): Lead {
    return {
      id: row.id || row.company_name,
      companyName: row.company_name,
      location: row.location || 'Portugal',
      city: row.city || undefined,
      country: row.country || undefined,
      niche: row.niche || 'Hotelaria',
      segment: row.segment || undefined,
      estimatedRooms: row.estimated_rooms || undefined,
      website: row.website || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      additionalPhones: Array.isArray(row.additional_phones) ? row.additional_phones : [],
      allPhones: [row.phone, ...(Array.isArray(row.additional_phones) ? row.additional_phones : [])].filter(Boolean) as string[],
      socials: [],
      nif: '',
      cae: '',
      hasWebsite: !!row.website,
      isProfessionalEmail: false,
      websiteScore: row.website ? 8 : 0,
      status: 'completed',
      potential: (row.potential as 'Hot' | 'Medium' | 'Cold') || 'Medium',
      potentialReasoning: 'Análise de housekeeping sincronizada.',
      contactPerson: row.contact_person || undefined,
      contactNotes: row.contact_notes || undefined,
      callbackScheduledAt: row.callback_scheduled_at || undefined,
      callbackStatus: row.callback_status || 'pending',
      commercialStatus: row.commercial_status || 'new',
      responsibleSellerId: row.responsible_seller_id || undefined,
      priority: row.priority || 'medium',
      leadScore: row.lead_score || 0,
      source: row.source || undefined,
      nextActionType: row.next_action_type || undefined,
      nextActionAt: row.next_action_at || undefined,
      closeReasonId: row.close_reason_id || undefined,
      closeNotes: row.close_notes || undefined,
      doNotContact: row.do_not_contact || false,
      lastActivityAt: row.last_activity_at || undefined,
      qualification: row.qualification || undefined,
      followupSequence: row.followup_sequence || undefined,
      storefront: {
        analyzed: true,
        signageCondition: 'Unknown',
        visualAppeal: 'Medium',
        needsLedUpgrade: false,
        description: 'Estrutura e operações de limpeza do hotel.',
        address: row.location || 'Portugal'
      },
      diagnosis: row.contact_notes || 'Pronto a contactar.',
      proposal: null,
      emailSequence: [],
      generatedSiteCode: null
    };
  }
};
