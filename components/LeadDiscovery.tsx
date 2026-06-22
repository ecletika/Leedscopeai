import React, { useState } from 'react';
import { CheckCircle, Globe, Loader2, MapPin, Phone, Plus, Search, Star, Zap } from 'lucide-react';
import { Lead } from '../types';
import { hotelDb } from '../services/hotelDb';

interface PlaceResult {
  placeId: string | null;
  name: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  rating: number | null;
  totalRatings: number | null;
}

interface Usage { used: number; limit: number; warnAt: number; }

interface LeadDiscoveryProps {
  onSaved?: () => void;
}

export default function LeadDiscovery({ onSaved }: LeadDiscoveryProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const runSearch = async () => {
    if (!query.trim() && !location.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    setSaved([]);
    setSearched(true);
    try {
      const res = await fetch('/api/places/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, location })
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erro na busca.'); return; }
      setResults(data.results || []);
      if (data.usage) setUsage(data.usage);
    } catch {
      setError('Nao foi possivel comunicar com o servidor.');
    } finally {
      setLoading(false);
    }
  };

  const saveResult = async (r: PlaceResult) => {
    if (!r.name) return;
    const key = r.placeId || r.name;
    const lead: Lead = {
      id: crypto.randomUUID(),
      companyName: r.name,
      location: r.address || location || 'Portugal',
      niche: 'Hotelaria',
      website: r.website || undefined,
      phone: r.phone || undefined,
      allPhones: r.phone ? [r.phone] : [],
      socials: [],
      nif: '',
      cae: '',
      mapsRating: r.rating || 0,
      mapsReviews: r.totalRatings || 0,
      hasWebsite: !!r.website,
      isProfessionalEmail: false,
      websiteScore: r.website ? 8 : 0,
      status: 'completed',
      commercialStatus: 'new',
      priority: 'medium',
      potential: 'Medium',
      potentialReasoning: 'Encontrado via Google Maps (busca por zona).',
      source: 'google_places',
      storefront: {
        analyzed: true,
        signageCondition: 'Unknown',
        visualAppeal: 'Medium',
        needsLedUpgrade: false,
        description: 'Lead descoberto via Google Maps.',
        address: r.address || location || 'Portugal'
      },
      diagnosis: 'Lead descoberto via Google Maps.',
      proposal: null,
      emailSequence: [],
      generatedSiteCode: null
    };
    const ok = await hotelDb.saveHotel(lead);
    if (ok) {
      setSaved((prev) => [...prev, key]);
      onSaved?.();
    } else {
      alert('Nao foi possivel guardar este lead.');
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-indigo-500/20 bg-indigo-500/[0.04]">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
      >
        <Zap className="h-4 w-4 text-indigo-400" />
        <span className="text-sm font-bold text-white">Descobrir leads (Google Maps)</span>
        <span className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-bold text-indigo-300">Admin</span>
        {usage && (
          <span className={`ml-auto text-[11px] font-bold ${usage.used >= usage.warnAt ? 'text-rose-400' : 'text-gray-500'}`}>
            {usage.used}/{usage.limit} buscas este mes{usage.used >= usage.warnAt ? ' — perto do limite!' : ''}
          </span>
        )}
        <span className="ml-2 text-gray-500">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="border-t border-indigo-500/20 p-4">
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Termo</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="ex.: hoteis, alojamento local, resort"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <label className="flex-1">
              <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-gray-500">Zona</span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && runSearch()}
                placeholder="ex.: Faro, Algarve, Lisboa"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-indigo-500 focus:outline-none"
              />
            </label>
            <button
              onClick={runSearch}
              disabled={loading}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Buscar
            </button>
          </div>

          <p className="mt-2 text-[11px] text-gray-500">
            Cada busca conta como 1 (devolve ate 20 resultados). Use termo + zona para resultados mais certeiros.
          </p>

          {usage && usage.used >= usage.warnAt && (
            <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] font-bold text-rose-300">
              Atencao: {usage.used} de {usage.limit} buscas usadas este mes. Cada busca tem custo na Google.
            </div>
          )}

          {error && <div className="mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-300">{error}</div>}

          {searched && !loading && results.length === 0 && !error && (
            <p className="mt-4 text-center text-[12px] text-gray-500">Nenhum resultado encontrado.</p>
          )}

          {results.length > 0 && (
            <div className="mt-4 space-y-2">
              {results.map((r) => {
                const key = r.placeId || r.name || Math.random().toString();
                const isSaved = saved.includes(r.placeId || r.name || '');
                return (
                  <div key={key} className="flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900/60 p-3">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-bold text-white">{r.name}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
                        {r.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{r.address}</span>}
                        {r.phone && <span className="flex items-center gap-1 font-mono text-emerald-300"><Phone className="h-3 w-3" />{r.phone}</span>}
                        {r.website && <a href={r.website} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-300 hover:underline"><Globe className="h-3 w-3" />{r.website.replace(/^https?:\/\//, '').split('/')[0]}</a>}
                        {r.rating != null && <span className="flex items-center gap-1 text-amber-300"><Star className="h-3 w-3 fill-amber-400 text-amber-400" />{r.rating} ({r.totalRatings})</span>}
                      </div>
                    </div>
                    {isSaved ? (
                      <span className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300">
                        <CheckCircle className="h-3.5 w-3.5" /> Guardado
                      </span>
                    ) : (
                      <button
                        onClick={() => saveResult(r)}
                        className="flex shrink-0 items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 transition hover:bg-emerald-500/20"
                      >
                        <Plus className="h-3.5 w-3.5" /> Guardar na base
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
