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

  /**
   * Helper Mapper: Database schema row to Lead object
   */
  mapDbToLead(row: any): Lead {
    return {
      id: row.id || row.company_name,
      companyName: row.company_name,
      location: row.location || 'Portugal',
      niche: row.niche || 'Hotelaria',
      website: row.website || undefined,
      email: row.email || undefined,
      phone: row.phone || undefined,
      allPhones: row.phone ? [row.phone] : [],
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
