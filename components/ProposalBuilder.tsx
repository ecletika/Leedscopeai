import React, { useMemo, useState } from 'react';
import { CheckCircle, FileText, Loader2, Printer, X } from 'lucide-react';
import { CrmActivity, Lead, NextActionType } from '../types';
import { hotelDb } from '../services/hotelDb';
import { crmDb } from '../services/crmDb';
import { SALES_PLANS } from '../services/salesCatalog';

interface ProposalBuilderProps {
  lead: Lead;
  onClose: () => void;
  onSaved: () => void;
}

const fieldClass = 'w-full rounded-lg border border-gray-700 bg-ai-dark p-2.5 text-xs text-white focus:border-emerald-500 focus:outline-none';

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));

export default function ProposalBuilder({ lead, onClose, onSaved }: ProposalBuilderProps) {
  const [planId, setPlanId] = useState(SALES_PLANS[1].id);
  const [price, setPrice] = useState('');
  const [setup, setSetup] = useState('');
  const [discount, setDiscount] = useState('');
  const [validityDays, setValidityDays] = useState(15);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const plan = useMemo(() => SALES_PLANS.find((p) => p.id === planId) || SALES_PLANS[0], [planId]);

  const validUntil = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + Number(validityDays || 0));
    return d.toLocaleDateString('pt-PT');
  }, [validityDays]);

  const buildHtml = () => {
    const today = new Date().toLocaleDateString('pt-PT');
    const rooms = lead.estimatedRooms || lead.qualification?.rooms;
    return `<!doctype html><html><head><meta charset="utf-8"><title>Proposta SOL — ${esc(lead.companyName)}</title>
<style>
  *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
  body{margin:0;padding:40px;color:#1a2230}
  .brand{font-size:30px;font-weight:900;background:linear-gradient(90deg,#10b981,#06b6d4);-webkit-background-clip:text;background-clip:text;color:transparent}
  .muted{color:#64748b;font-size:12px}
  h1{font-size:20px;margin:24px 0 4px}
  .grid{display:flex;gap:16px;margin-top:16px}
  .card{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:16px}
  .price{font-size:26px;font-weight:800;color:#0f766e}
  ul{margin:8px 0 0;padding-left:18px}
  li{margin:4px 0;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  td{padding:8px 0;border-bottom:1px solid #eef2f7;font-size:13px}
  td:last-child{text-align:right;font-weight:600}
  .foot{margin-top:32px;font-size:11px;color:#94a3b8}
  @media print{body{padding:24px}}
</style></head><body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div><div class="brand">SOL</div><div class="muted">Operacao de housekeeping em tempo real</div></div>
    <div class="muted" style="text-align:right">Proposta comercial<br>${today}</div>
  </div>
  <h1>Proposta para ${esc(lead.companyName)}</h1>
  <div class="muted">${esc(lead.location || '')}${rooms ? ` · ${rooms} quartos` : ''}${lead.contactPerson ? ` · A/C ${esc(lead.contactPerson)}` : ''}</div>

  <div class="grid">
    <div class="card">
      <div class="muted">Plano recomendado</div>
      <div style="font-size:18px;font-weight:800;margin:4px 0">${esc(plan.name)}</div>
      <div class="muted">${esc(plan.idealFor)}</div>
      <ul>${plan.modules.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
    </div>
    <div class="card">
      <div class="muted">Investimento</div>
      <div class="price">${esc(price || plan.priceHint)}</div>
      <table>
        ${setup ? `<tr><td>Setup</td><td>${esc(setup)}</td></tr>` : ''}
        ${discount ? `<tr><td>Desconto</td><td>${esc(discount)}</td></tr>` : ''}
        <tr><td>Trial</td><td>${esc(plan.trial)}</td></tr>
        <tr><td>Validade da proposta</td><td>${validUntil}</td></tr>
      </table>
    </div>
  </div>

  ${notes ? `<h1 style="font-size:14px">Observacoes</h1><div style="font-size:13px;white-space:pre-wrap">${esc(notes)}</div>` : ''}

  <div class="foot">SOL · Proposta valida ate ${validUntil}. Valores e condicoes sujeitos a confirmacao comercial.</div>
</body></html>`;
  };

  const generatePdf = () => {
    const w = window.open('', '_blank');
    if (!w) { alert('Permita pop-ups para gerar o PDF.'); return; }
    w.document.write(buildHtml());
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  };

  const markSent = async () => {
    setSaving(true);
    try {
      const iso = new Date(Date.now() + 3 * 86400000).toISOString();
      await hotelDb.saveHotel({
        ...lead,
        commercialStatus: 'proposal_sent',
        nextActionType: 'follow_up' as NextActionType,
        nextActionAt: iso,
        callbackScheduledAt: iso,
        callbackStatus: 'pending',
        lastActivityAt: new Date().toISOString()
      });
      const activity: CrmActivity = {
        id: crypto.randomUUID(),
        leadId: lead.id,
        sellerId: lead.responsibleSellerId,
        activityType: 'proposal',
        outcome: `Proposta enviada — plano ${plan.name}${price ? ` (${price})` : ''}`,
        notes: notes || undefined,
        nextActionType: 'follow_up',
        nextActionAt: iso,
        createdAt: new Date().toISOString()
      };
      await crmDb.createActivity(activity);
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-gray-800 bg-ai-card p-6 shadow-2xl">
        <button onClick={onClose} className="absolute right-4 top-4 text-gray-400 hover:text-white"><X className="h-5 w-5" /></button>
        <header className="mb-5">
          <h3 className="flex items-center gap-2 text-base font-bold text-white"><FileText className="h-5 w-5 text-emerald-400" /> Proposta comercial</h3>
          <p className="mt-1 text-xs text-gray-400">{lead.companyName} — gere um PDF e marque o pipeline.</p>
        </header>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Plano</span>
              <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={fieldClass}>
                {SALES_PLANS.map((p) => <option key={p.id} value={p.id}>{p.name} — {p.idealFor}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Preco mensal</span>
              <input value={price} onChange={(e) => setPrice(e.target.value)} className={fieldClass} placeholder="Ex.: 4€/quarto/mes ou 180€/mes" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Setup</span>
              <input value={setup} onChange={(e) => setSetup(e.target.value)} className={fieldClass} placeholder="Incluido / 250€" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Desconto</span>
              <input value={discount} onChange={(e) => setDiscount(e.target.value)} className={fieldClass} placeholder="10% anual" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Validade (dias)</span>
              <input type="number" min="1" value={validityDays} onChange={(e) => setValidityDays(Number(e.target.value))} className={fieldClass} />
            </label>
          </div>

          <div className="rounded-lg border border-gray-800 bg-ai-dark/40 p-3 text-[11px] text-gray-400">
            Modulos incluidos no plano <span className="font-bold text-white">{plan.name}</span>: {plan.modules.join(', ')}.
          </div>

          <label className="block">
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-400">Observacoes</span>
            <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className={`${fieldClass} leading-relaxed`} placeholder="Condicoes, contexto do hotel, proximos passos..." />
          </label>

          <div className="flex items-center justify-end gap-3 border-t border-gray-800 pt-4">
            <button onClick={generatePdf} className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-4 py-2 text-xs font-bold text-gray-200 transition hover:bg-gray-700"><Printer className="h-4 w-4" /> Gerar PDF</button>
            <button onClick={markSent} disabled={saving} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-bold text-white transition hover:bg-emerald-500 disabled:opacity-60">
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle className="h-3.5 w-3.5" />} {saving ? 'A guardar...' : 'Marcar proposta enviada'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
