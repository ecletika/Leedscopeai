import { Lead } from '../types';

// Integracao com calendario sem dependencias externas: gera um ficheiro .ics
// que o vendedor importa no Google Calendar / Outlook / Apple Calendar.

const pad = (n: number) => String(n).padStart(2, '0');

const toIcsDate = (d: Date): string =>
  `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;

const escapeIcs = (s: string): string =>
  (s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export interface IcsEvent {
  title: string;
  description?: string;
  location?: string;
  start: Date;
  durationMinutes?: number;
}

export const buildIcs = (e: IcsEvent): string => {
  const end = new Date(e.start.getTime() + (e.durationMinutes || 20) * 60000);
  const uid = `${crypto.randomUUID()}@sol-leadops`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SOL LeadOps//PT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${toIcsDate(new Date())}`,
    `DTSTART:${toIcsDate(e.start)}`,
    `DTEND:${toIcsDate(end)}`,
    `SUMMARY:${escapeIcs(e.title)}`,
    e.description ? `DESCRIPTION:${escapeIcs(e.description)}` : '',
    e.location ? `LOCATION:${escapeIcs(e.location)}` : '',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcs(e.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].filter(Boolean).join('\r\n');
};

const download = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const actionLabel: Record<string, string> = {
  call: 'Chamada', demo: 'Demo', email: 'Email', whatsapp: 'WhatsApp', follow_up: 'Follow-up', proposal: 'Proposta', none: 'Contacto'
};

/** Gera e descarrega um .ics para a proxima accao de um lead. */
export const downloadLeadIcs = (lead: Lead, opts?: { start?: Date; title?: string; durationMinutes?: number }) => {
  const start = opts?.start || (lead.nextActionAt ? new Date(lead.nextActionAt) : new Date());
  const label = actionLabel[lead.nextActionType || 'none'] || 'Contacto';
  const isDemo = (opts?.title || '').toLowerCase().includes('demo') || lead.nextActionType === 'demo';
  const title = opts?.title || `SOL ${label} — ${lead.companyName}`;
  const descParts = [
    lead.contactPerson ? `Contacto: ${lead.contactPerson}` : '',
    lead.phone ? `Tel: ${lead.phone}` : '',
    lead.email ? `Email: ${lead.email}` : '',
    lead.contactNotes ? `Notas: ${lead.contactNotes}` : ''
  ].filter(Boolean);
  download(
    `sol-${lead.companyName.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.ics`,
    buildIcs({ title, description: descParts.join('\n'), location: lead.location, start, durationMinutes: opts?.durationMinutes || (isDemo ? 30 : 20) })
  );
};
