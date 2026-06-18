import { supabase, isSupabaseConfigured } from './supabaseClient';
import {
  CrmActivity,
  CrmCloseReason,
  CrmContact,
  CrmMaterial,
  CrmObjection,
  CrmScheduleSlot,
  CrmScript,
  CrmSeller
} from '../types';

const LS_CLOSE_REASONS_KEY = 'leadscope_crm_close_reasons';
const LS_SELLERS_KEY = 'leadscope_crm_sellers';
const LS_CONTACTS_KEY = 'leadscope_crm_contacts';
const LS_ACTIVITIES_KEY = 'leadscope_crm_activities';
const LS_SCHEDULE_KEY = 'leadscope_crm_schedule_slots';
const LS_SCRIPTS_KEY = 'leadscope_crm_scripts';
const LS_OBJECTIONS_KEY = 'leadscope_crm_objections';
const LS_MATERIALS_KEY = 'leadscope_crm_materials';

const defaultCloseReasons: CrmCloseReason[] = [
  { id: 'reason-existing-system-no-interest', name: 'Ja tem sistema e nao quer ouvir', category: 'lost', requiresFollowUp: false, active: true },
  { id: 'reason-existing-system-future', name: 'Ja tem sistema, mas aceitou futuro contacto', category: 'future_follow_up', requiresFollowUp: true, defaultFollowUpDays: 90, active: true },
  { id: 'reason-no-budget', name: 'Sem orcamento', category: 'lost', requiresFollowUp: false, active: true },
  { id: 'reason-too-small', name: 'Hotel pequeno demais', category: 'invalid', requiresFollowUp: false, active: true },
  { id: 'reason-wrong-data', name: 'Nao e hotel / dado errado', category: 'invalid', requiresFollowUp: false, active: true },
  { id: 'reason-do-not-call', name: 'Pediu para nao ligar mais', category: 'do_not_contact', requiresFollowUp: false, active: true },
  { id: 'reason-no-decision-maker', name: 'Nao conseguimos decisor', category: 'future_follow_up', requiresFollowUp: true, defaultFollowUpDays: 30, active: true },
  { id: 'reason-wrong-number', name: 'Numero errado', category: 'invalid', requiresFollowUp: false, active: true },
  { id: 'reason-no-need', name: 'Nao ve necessidade', category: 'lost', requiresFollowUp: false, active: true },
  { id: 'reason-paper-whatsapp-no-change', name: 'Usa papel/WhatsApp, mas nao quer mudar', category: 'lost', requiresFollowUp: false, active: true },
  { id: 'reason-after-high-season', name: 'Interessado, mas so depois da epoca alta', category: 'future_follow_up', requiresFollowUp: true, defaultFollowUpDays: 90, active: true },
  { id: 'reason-hotel-closed', name: 'Hotel encerrado', category: 'invalid', requiresFollowUp: false, active: true },
  { id: 'reason-duplicate', name: 'Lead duplicado', category: 'duplicate', requiresFollowUp: false, active: true }
];

const defaultObjections: CrmObjection[] = [
  { id: 'obj-whatsapp', objection: 'Ja usamos WhatsApp', suggestedResponse: 'O WhatsApp ajuda no inicio, mas nao cria historico, auditoria, prioridades nem relatorios. O SOL organiza a operacao sem complicar a equipa.', category: 'ferramenta', active: true },
  { id: 'obj-budget', objection: 'Nao temos orcamento', suggestedResponse: 'A ideia do SOL e ser acessivel para hoteis pequenos e medios, evitando ferramentas enterprise caras.', category: 'preco', active: true },
  { id: 'obj-tech', objection: 'A equipa nao usa tecnologia', suggestedResponse: 'O SOL foi pensado para equipas operacionais: interface simples, mobile-first e multilingue para staff de chao.', category: 'adocao', active: true },
  { id: 'obj-has-system', objection: 'Ja temos um sistema', suggestedResponse: 'Perfeito. A conversa pode ser para perceber se o sistema atual cobre housekeeping, manutencao, auditoria e comunicacao em tempo real.', category: 'concorrencia', active: true },
  { id: 'obj-no-time', objection: 'Estamos sem tempo agora', suggestedResponse: 'Sem problema. Sao apenas 15 a 20 minutos para mostrar na pratica. Prefere amanha de manha ou ao final do dia?', category: 'tempo', active: true }
];

const defaultScripts: CrmScript[] = [
  { id: 'script-reception', name: 'Abertura - Recepcao', targetRole: 'reception', language: 'PT', country: 'Portugal', content: 'Ola, bom dia. O meu nome e [NOME] e falo da SOL. Gostava de perceber com quem posso falar sobre a organizacao das limpezas e manutencao do hotel - normalmente o gerente ou a governanta.', active: true },
  { id: 'script-manager', name: 'Pitch - Gerente', targetRole: 'manager', language: 'PT', country: 'Portugal', content: 'Desenvolvemos uma plataforma simples para coordenar housekeeping, recepcao e manutencao: mapa de quartos em tempo real, checklists, tickets e relatorios. A ideia e marcar uma apresentacao rapida de 15 a 20 minutos.', active: true },
  { id: 'script-housekeeper', name: 'Pitch - Governanta', targetRole: 'housekeeper', language: 'PT', country: 'Portugal', content: 'O SOL ajuda a sua equipa a saber que quartos limpar primeiro, registar inspecoes e abrir pedidos de manutencao sem depender de papel ou WhatsApp. Posso mostrar como funciona na pratica?', active: true }
];

const defaultMaterials: CrmMaterial[] = [
  { id: 'mat-map', title: 'Mapa de quartos em tempo real', materialType: 'image', description: 'Recepcao e governanta veem quais quartos estao sujos, em limpeza, inspecionados ou prontos.', targetStage: 'demo', active: true },
  { id: 'mat-tasks', title: 'Tarefas de housekeeping', materialType: 'image', description: 'Distribuicao automatica de quartos por camareira, com prioridades e estado ao vivo.', targetStage: 'demo', active: true },
  { id: 'mat-checklist', title: 'Checklist de limpeza', materialType: 'image', description: 'Padronizacao da limpeza e inspecao, sem depender de memoria ou papel.', targetStage: 'demo', active: true },
  { id: 'mat-tickets', title: 'Tickets de manutencao', materialType: 'image', description: 'Pedidos de reparacao criados na hora, com foto, responsavel e historico.', targetStage: 'demo', active: true },
  { id: 'mat-dashboard', title: 'Dashboard da governanta', materialType: 'image', description: 'Visao geral de carga, atrasos e produtividade da equipa.', targetStage: 'demo', active: true },
  { id: 'mat-mobile', title: 'App mobile multilingue', materialType: 'image', description: 'Staff de chao usa no telemovel, em varios idiomas, sem formacao complexa.', targetStage: 'demo', active: true }
];

const readLocal = <T>(key: string, fallback: T[]): T[] => {
  const stored = localStorage.getItem(key);
  return stored ? JSON.parse(stored) : fallback;
};

const writeLocal = <T>(key: string, rows: T[]) => {
  localStorage.setItem(key, JSON.stringify(rows));
};

export const crmDb = {
  // ----- Scripts (M28) -----
  async getScripts(): Promise<CrmScript[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('crm_scripts').select('*').order('name');
      if (!error && data) return data.map(this.mapScriptFromDb);
      console.warn('Supabase scripts query failed, using local fallback:', error);
    }
    return readLocal<CrmScript>(LS_SCRIPTS_KEY, defaultScripts);
  },

  async saveScript(script: CrmScript): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('crm_scripts').upsert(this.mapScriptToDb(script), { onConflict: 'id' });
      if (!error) return true;
      console.warn('Supabase script save failed, using local fallback:', error);
    }
    const rows = readLocal<CrmScript>(LS_SCRIPTS_KEY, defaultScripts);
    const idx = rows.findIndex((item) => item.id === script.id);
    if (idx >= 0) rows[idx] = script; else rows.push(script);
    writeLocal(LS_SCRIPTS_KEY, rows);
    return true;
  },

  // ----- Objeccoes (M28) -----
  async getObjections(): Promise<CrmObjection[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('crm_objections').select('*').order('objection');
      if (!error && data) return data.map(this.mapObjectionFromDb);
      console.warn('Supabase objections query failed, using local fallback:', error);
    }
    return readLocal<CrmObjection>(LS_OBJECTIONS_KEY, defaultObjections);
  },

  async saveObjection(objection: CrmObjection): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('crm_objections').upsert(this.mapObjectionToDb(objection), { onConflict: 'id' });
      if (!error) return true;
      console.warn('Supabase objection save failed, using local fallback:', error);
    }
    const rows = readLocal<CrmObjection>(LS_OBJECTIONS_KEY, defaultObjections);
    const idx = rows.findIndex((item) => item.id === objection.id);
    if (idx >= 0) rows[idx] = objection; else rows.push(objection);
    writeLocal(LS_OBJECTIONS_KEY, rows);
    return true;
  },

  // ----- Materiais (M28) -----
  async getMaterials(): Promise<CrmMaterial[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase.from('crm_materials').select('*').order('title');
      if (!error && data) return data.map(this.mapMaterialFromDb);
      console.warn('Supabase materials query failed, using local fallback:', error);
    }
    return readLocal<CrmMaterial>(LS_MATERIALS_KEY, defaultMaterials);
  },

  async saveMaterial(material: CrmMaterial): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('crm_materials').upsert(this.mapMaterialToDb(material), { onConflict: 'id' });
      if (!error) return true;
      console.warn('Supabase material save failed, using local fallback:', error);
    }
    const rows = readLocal<CrmMaterial>(LS_MATERIALS_KEY, defaultMaterials);
    const idx = rows.findIndex((item) => item.id === material.id);
    if (idx >= 0) rows[idx] = material; else rows.push(material);
    writeLocal(LS_MATERIALS_KEY, rows);
    return true;
  },

  async getCloseReasons(): Promise<CrmCloseReason[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('crm_close_reasons')
        .select('*')
        .eq('active', true)
        .order('name');

      if (!error && data) return data.map(this.mapCloseReasonFromDb);
      console.warn('Supabase close reasons query failed, using local fallback:', error);
    }

    return readLocal<CrmCloseReason>(LS_CLOSE_REASONS_KEY, defaultCloseReasons);
  },

  async getSellers(): Promise<CrmSeller[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('crm_sellers')
        .select('*')
        .order('name');

      if (!error && data) return data.map(this.mapSellerFromDb);
      console.warn('Supabase sellers query failed, using local fallback:', error);
    }

    return readLocal<CrmSeller>(LS_SELLERS_KEY, []);
  },

  async saveSeller(seller: CrmSeller): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('crm_sellers')
        .upsert(this.mapSellerToDb(seller), { onConflict: 'id' });

      if (!error) return true;
      console.warn('Supabase seller save failed, using local fallback:', error);
    }

    const sellers = readLocal<CrmSeller>(LS_SELLERS_KEY, []);
    const idx = sellers.findIndex((item) => item.id === seller.id);
    if (idx >= 0) sellers[idx] = seller;
    else sellers.push(seller);
    writeLocal(LS_SELLERS_KEY, sellers);
    return true;
  },

  /**
   * Cria ou atualiza a conta de login do vendedor via Supabase Auth (no servidor,
   * com service role) e devolve o id (app_users.id == auth user id) para ligar
   * em crm_sellers.user_id. A password fica gerida pelo Supabase Auth (com hash).
   */
  async upsertSellerLogin(params: { name: string; email: string; password: string }): Promise<string | null> {
    const email = params.email.trim().toLowerCase();
    if (!email || !params.password) return null;
    try {
      const resp = await fetch('/api/sellers/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: params.name, email, password: params.password })
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}));
        console.warn('Falha ao criar conta de login do vendedor:', data.error || resp.status);
        return null;
      }
      const data = await resp.json();
      return data.userId || null;
    } catch (err) {
      console.warn('Falha ao contactar o servidor para criar conta de login:', err);
      return null;
    }
  },

  async getContactsByLead(leadId: string): Promise<CrmContact[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('crm_contacts')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at');

      if (!error && data) return data.map(this.mapContactFromDb);
      console.warn('Supabase contacts query failed, using local fallback:', error);
    }

    return readLocal<CrmContact>(LS_CONTACTS_KEY, []).filter((contact) => contact.leadId === leadId);
  },

  async saveContact(contact: CrmContact): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('crm_contacts')
        .upsert(this.mapContactToDb(contact), { onConflict: 'id' });

      if (!error) return true;
      console.warn('Supabase contact save failed, using local fallback:', error);
    }

    const contacts = readLocal<CrmContact>(LS_CONTACTS_KEY, []);
    const idx = contacts.findIndex((item) => item.id === contact.id);
    if (idx >= 0) contacts[idx] = contact;
    else contacts.push(contact);
    writeLocal(LS_CONTACTS_KEY, contacts);
    return true;
  },

  async getActivitiesByLead(leadId: string): Promise<CrmActivity[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('crm_activities')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (!error && data) return data.map(this.mapActivityFromDb);
      console.warn('Supabase activities query failed, using local fallback:', error);
    }

    return readLocal<CrmActivity>(LS_ACTIVITIES_KEY, [])
      .filter((activity) => activity.leadId === leadId)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  },

  async createActivity(activity: CrmActivity): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('crm_activities')
        .insert([this.mapActivityToDb(activity)]);

      if (!error) return true;
      console.warn('Supabase activity insert failed, using local fallback:', error);
    }

    const activities = readLocal<CrmActivity>(LS_ACTIVITIES_KEY, []);
    activities.push(activity);
    writeLocal(LS_ACTIVITIES_KEY, activities);
    return true;
  },

  async getScheduleSlots(sellerId: string, fromIso: string, toIso: string): Promise<CrmScheduleSlot[]> {
    if (isSupabaseConfigured()) {
      const { data, error } = await supabase
        .from('crm_schedule_slots')
        .select('*')
        .eq('seller_id', sellerId)
        .gte('slot_start', fromIso)
        .lte('slot_start', toIso)
        .order('slot_start');

      if (!error && data) return data.map(this.mapScheduleSlotFromDb);
      console.warn('Supabase schedule query failed, using local fallback:', error);
    }

    return readLocal<CrmScheduleSlot>(LS_SCHEDULE_KEY, [])
      .filter((slot) => slot.sellerId === sellerId && slot.slotStart >= fromIso && slot.slotStart <= toIso)
      .sort((a, b) => a.slotStart.localeCompare(b.slotStart));
  },

  async saveScheduleSlot(slot: CrmScheduleSlot): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase
        .from('crm_schedule_slots')
        .upsert(this.mapScheduleSlotToDb(slot), { onConflict: 'id' });

      if (!error) return true;
      console.warn('Supabase schedule save failed, using local fallback:', error);
    }

    const slots = readLocal<CrmScheduleSlot>(LS_SCHEDULE_KEY, []);
    const idx = slots.findIndex((item) => item.id === slot.id);
    if (idx >= 0) slots[idx] = slot;
    else slots.push(slot);
    writeLocal(LS_SCHEDULE_KEY, slots);
    return true;
  },

  async deleteScheduleSlot(id: string): Promise<boolean> {
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('crm_schedule_slots').delete().eq('id', id);
      if (!error) return true;
      console.warn('Supabase schedule delete failed, using local fallback:', error);
    }

    const slots = readLocal<CrmScheduleSlot>(LS_SCHEDULE_KEY, []).filter((item) => item.id !== id);
    writeLocal(LS_SCHEDULE_KEY, slots);
    return true;
  },

  mapScriptFromDb(row: any): CrmScript {
    return {
      id: row.id,
      name: row.name,
      targetRole: row.target_role || undefined,
      language: row.language || undefined,
      country: row.country || undefined,
      content: row.content || '',
      active: row.active ?? true,
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined
    };
  },

  mapScriptToDb(script: CrmScript) {
    return {
      id: script.id,
      name: script.name,
      target_role: script.targetRole || null,
      language: script.language || null,
      country: script.country || null,
      content: script.content,
      active: script.active,
      updated_at: new Date().toISOString()
    };
  },

  mapObjectionFromDb(row: any): CrmObjection {
    return {
      id: row.id,
      objection: row.objection,
      suggestedResponse: row.suggested_response || '',
      fullResponse: row.full_response || undefined,
      followUpQuestion: row.follow_up_question || undefined,
      recommendedMaterial: row.recommended_material || undefined,
      nextAction: row.next_action || undefined,
      category: row.category || undefined,
      active: row.active ?? true,
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined
    };
  },

  mapObjectionToDb(objection: CrmObjection) {
    return {
      id: objection.id,
      objection: objection.objection,
      suggested_response: objection.suggestedResponse,
      full_response: objection.fullResponse || null,
      follow_up_question: objection.followUpQuestion || null,
      recommended_material: objection.recommendedMaterial || null,
      next_action: objection.nextAction || null,
      category: objection.category || null,
      active: objection.active,
      updated_at: new Date().toISOString()
    };
  },

  mapMaterialFromDb(row: any): CrmMaterial {
    return {
      id: row.id,
      title: row.title,
      materialType: row.material_type || 'text',
      url: row.url || undefined,
      description: row.description || undefined,
      targetStage: row.target_stage || undefined,
      active: row.active ?? true,
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined
    };
  },

  mapMaterialToDb(material: CrmMaterial) {
    return {
      id: material.id,
      title: material.title,
      material_type: material.materialType,
      url: material.url || null,
      description: material.description || null,
      target_stage: material.targetStage || null,
      active: material.active,
      updated_at: new Date().toISOString()
    };
  },

  mapCloseReasonFromDb(row: any): CrmCloseReason {
    return {
      id: row.id,
      name: row.name,
      category: row.category,
      requiresFollowUp: row.requires_follow_up,
      defaultFollowUpDays: row.default_follow_up_days || undefined,
      active: row.active
    };
  },

  mapSellerFromDb(row: any): CrmSeller {
    return {
      id: row.id,
      userId: row.user_id || undefined,
      name: row.name,
      photoUrl: row.photo_url || undefined,
      email: row.email,
      phone: row.phone || undefined,
      languages: row.languages || [],
      assignedRegions: row.assigned_regions || [],
      workSchedule: row.work_schedule || undefined,
      dailyContactGoal: row.daily_contact_goal || 20,
      weeklyDemoGoal: row.weekly_demo_goal || 5,
      role: row.role || 'seller',
      status: row.status || 'active',
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined
    };
  },

  mapSellerToDb(seller: CrmSeller) {
    return {
      id: seller.id,
      user_id: seller.userId || null,
      name: seller.name,
      photo_url: seller.photoUrl || null,
      email: seller.email,
      phone: seller.phone || null,
      languages: seller.languages || [],
      assigned_regions: seller.assignedRegions || [],
      work_schedule: seller.workSchedule || null,
      daily_contact_goal: seller.dailyContactGoal,
      weekly_demo_goal: seller.weeklyDemoGoal,
      role: seller.role,
      status: seller.status,
      updated_at: new Date().toISOString()
    };
  },

  mapContactFromDb(row: any): CrmContact {
    return {
      id: row.id,
      leadId: row.lead_id,
      name: row.name || undefined,
      role: row.role || undefined,
      contactType: row.contact_type || 'other',
      phone: row.phone || undefined,
      email: row.email || undefined,
      status: row.status || 'unknown',
      isPrimaryDecisionMaker: row.is_primary_decision_maker || false,
      notes: row.notes || undefined,
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined
    };
  },

  mapContactToDb(contact: CrmContact) {
    return {
      id: contact.id,
      lead_id: contact.leadId,
      name: contact.name || null,
      role: contact.role || null,
      contact_type: contact.contactType,
      phone: contact.phone || null,
      email: contact.email || null,
      status: contact.status,
      is_primary_decision_maker: contact.isPrimaryDecisionMaker,
      notes: contact.notes || null,
      updated_at: new Date().toISOString()
    };
  },

  mapActivityFromDb(row: any): CrmActivity {
    return {
      id: row.id,
      leadId: row.lead_id,
      sellerId: row.seller_id || undefined,
      contactId: row.contact_id || undefined,
      activityType: row.activity_type,
      outcome: row.outcome || undefined,
      notes: row.notes || undefined,
      objections: row.objections || [],
      interestLevel: row.interest_level || undefined,
      nextActionType: row.next_action_type || undefined,
      nextActionAt: row.next_action_at || undefined,
      createdAt: row.created_at || undefined
    };
  },

  mapActivityToDb(activity: CrmActivity) {
    return {
      id: activity.id,
      lead_id: activity.leadId,
      seller_id: activity.sellerId || null,
      contact_id: activity.contactId || null,
      activity_type: activity.activityType,
      outcome: activity.outcome || null,
      notes: activity.notes || null,
      objections: activity.objections || [],
      interest_level: activity.interestLevel || null,
      next_action_type: activity.nextActionType || null,
      next_action_at: activity.nextActionAt || null
    };
  },

  mapScheduleSlotFromDb(row: any): CrmScheduleSlot {
    return {
      id: row.id,
      sellerId: row.seller_id,
      leadId: row.lead_id || undefined,
      slotStart: row.slot_start,
      slotEnd: row.slot_end,
      slotType: row.slot_type || 'call',
      status: row.status || 'scheduled',
      notes: row.notes || undefined,
      createdAt: row.created_at || undefined,
      updatedAt: row.updated_at || undefined
    };
  },

  mapScheduleSlotToDb(slot: CrmScheduleSlot) {
    return {
      id: slot.id,
      seller_id: slot.sellerId,
      lead_id: slot.leadId || null,
      slot_start: slot.slotStart,
      slot_end: slot.slotEnd,
      slot_type: slot.slotType,
      status: slot.status,
      notes: slot.notes || null,
      updated_at: new Date().toISOString()
    };
  }
};
