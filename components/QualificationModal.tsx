import React, { useState } from 'react';
import { CheckCircle, ClipboardCheck, Loader2, X } from 'lucide-react';
import { Lead, LeadQualification, LeadPriority } from '../types';
import { hotelDb } from '../services/hotelDb';

interface QualificationModalProps {
  lead: Lead;
  onClose: () => void;
  onSaved: () => void;
}

const fieldClass = 'w-full rounded-lg border border-gray-700 bg-ai-dark p-2.5 text-xs text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none';

export default function QualificationModal({ lead, onClose, onSaved }: QualificationModalProps) {
  const [q, setQ] = useState<LeadQualification>(
    lead.qualification || {
      rooms: lead.estimatedRooms,
      usesPms: 'unknown',
      housekeepingMethod: 'unknown',
      hasGoverness: 'unknown',
      maintenanceTeam: 'unknown',
      mainPain: '',
      interest: 'medium',
      probability: 25,
      bestDemoContact: lead.contactPerson || ''
    }
  );
  const [saving, setSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const priorityByInterest: Record<string, LeadPriority> = { high: 'high', medium: 'medium', low: 'low' };
      const updated: Lead = {
        ...lead,
        qualification: { ...q, qualifiedAt: new Date().toISOString() },
        estimatedRooms: q.rooms ?? lead.estimatedRooms,
        priority: q.interest ? priorityByInterest[q.interest] : lead.priority,
        contactPerson: q.bestDemoContact?.trim() || lead.contactPerson,
        commercialStatus: lead.commercialStatus === 'new' ? 'prepared' : lead.commercialStatus,
        lastActivityAt: new Date().toISOString()
      };
      const ok = await hotelDb.saveHotel(updated);
      if (ok) {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-800 bg-ai-card p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        <header className="mb-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-white"><ClipboardCheck className="h-5 w-5 text-emerald-400" /> Qualificacao do lead</h3>
          <p className="mt-1 text-xs text-gray-400">{lead.companyName} — preencha antes de marcar a demo para priorizar melhor.</p>
        </header>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nº de quartos">
              <input type="number" min="0" value={q.rooms ?? ''} onChange={(e) => setQ({ ...q, rooms: e.target.value ? Number(e.target.value) : undefined })} className={fieldClass} />
            </Field>
            <Field label="Usa PMS?">
              <select value={q.usesPms} onChange={(e) => setQ({ ...q, usesPms: e.target.value as any })} className={fieldClass}>
                <option value="unknown">Nao sabe</option>
                <option value="yes">Sim</option>
                <option value="no">Nao</option>
              </select>
            </Field>
            <Field label="Como gere housekeeping hoje?">
              <select value={q.housekeepingMethod} onChange={(e) => setQ({ ...q, housekeepingMethod: e.target.value as any })} className={fieldClass}>
                <option value="unknown">Nao sabe</option>
                <option value="paper">Papel</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="excel">Excel</option>
                <option value="system">Ja tem sistema</option>
              </select>
            </Field>
            <Field label="Tem governanta?">
              <select value={q.hasGoverness} onChange={(e) => setQ({ ...q, hasGoverness: e.target.value as any })} className={fieldClass}>
                <option value="unknown">Nao sabe</option>
                <option value="yes">Sim</option>
                <option value="no">Nao</option>
              </select>
            </Field>
            <Field label="Equipa de manutencao">
              <select value={q.maintenanceTeam} onChange={(e) => setQ({ ...q, maintenanceTeam: e.target.value as any })} className={fieldClass}>
                <option value="unknown">Nao sabe</option>
                <option value="internal">Interna</option>
                <option value="external">Externa</option>
                <option value="none">Nao tem</option>
              </select>
            </Field>
            <Field label="Melhor pessoa para a demo">
              <input value={q.bestDemoContact || ''} onChange={(e) => setQ({ ...q, bestDemoContact: e.target.value })} className={fieldClass} placeholder="Nome e cargo" />
            </Field>
            <Field label="Interesse">
              <select value={q.interest} onChange={(e) => setQ({ ...q, interest: e.target.value as any })} className={fieldClass}>
                <option value="low">Baixo</option>
                <option value="medium">Medio</option>
                <option value="high">Alto</option>
              </select>
            </Field>
            <Field label="Probabilidade de fecho">
              <select value={q.probability ?? 25} onChange={(e) => setQ({ ...q, probability: Number(e.target.value) })} className={fieldClass}>
                {[10, 25, 50, 75, 90].map((p) => <option key={p} value={p}>{p}%</option>)}
              </select>
            </Field>
          </div>

          <Field label="Dor principal">
            <textarea rows={3} value={q.mainPain || ''} onChange={(e) => setQ({ ...q, mainPain: e.target.value })} className={`${fieldClass} leading-relaxed`} placeholder="Ex.: quartos prontos tarde, comunicacao por WhatsApp, manutencao sem historico..." />
          </Field>

          <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white">Cancelar</button>
            <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} {saving ? 'A guardar...' : 'Guardar qualificacao'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">{label}</span>
      {children}
    </label>
  );
}
