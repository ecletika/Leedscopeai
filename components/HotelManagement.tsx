import React, { useState, useEffect } from 'react';
import { Lead } from '../types';
import { hotelDb } from '../services/hotelDb';
import { 
  Plus, Edit, Trash2, Search, Filter, Database, MapPin, 
  User, Phone, Mail, Link, Globe, Calendar, AlertTriangle, 
  CheckCircle, Loader2, X, Clipboard, Check, RefreshCw,
  FileText, Bot
} from 'lucide-react';

interface HotelManagementProps {
  onSelectProposal?: (hotel: Lead) => void;
  onSelectChat?: (hotel: Lead) => void;
}

export default function HotelManagement({ onSelectProposal, onSelectChat }: HotelManagementProps) {
  // DB States
  const [hotels, setHotels] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [potentialFilter, setPotentialFilter] = useState<'all' | 'Hot' | 'Medium' | 'Cold'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed' | 'canceled'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentHotel, setCurrentHotel] = useState<Partial<Lead> | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // SQL Script display for easy Supabase setup
  const [showSqlSetup, setShowSqlSetup] = useState(false);
  const [sqlCopied, setSqlCopied] = useState(false);

  const sqlSchema = `-- SCRIPT SQL PARA CRIAR A TABELA "hotels" NO SUPABASE
-- Cole no SQL Editor do Supabase e carregue em "Run"

CREATE TABLE IF NOT EXISTS hotels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    company_name TEXT NOT NULL,
    location TEXT NOT NULL,
    niche TEXT DEFAULT 'Hotelaria',
    website TEXT,
    email TEXT,
    phone TEXT,
    contact_person TEXT,
    contact_notes TEXT,
    callback_scheduled_at TIMESTAMP WITH TIME ZONE,
    callback_status TEXT DEFAULT 'pending' CHECK (callback_status IN ('pending', 'completed', 'canceled')),
    potential TEXT DEFAULT 'Medium' CHECK (potential IN ('Hot', 'Medium', 'Cold')),
    maps_rating NUMERIC(3,2),
    maps_reviews INTEGER
);`;

  // Fetch hotels from Database
  const fetchHotels = async () => {
    setIsLoading(true);
    setDbError(null);
    try {
      const data = await hotelDb.getAllHotels();
      setHotels(data);
      
      // Let's test if there is a schema error
      // Under the hood, if hotelDb returns empty because of a missing relation error, we can catch or detect it.
      // But we can check specifically if there are zero hotels and let users know they can configure Supabase.
    } catch (err: any) {
      console.error('Erro ao buscar hotéis:', err);
      setDbError(err.message || 'Erro ao comunicar com a Base de Dados.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHotels();
  }, []);

  const copySqlToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 2000);
  };

  const handleOpenAddModal = () => {
    setCurrentHotel({
      companyName: '',
      location: '',
      website: '',
      phone: '',
      email: '',
      contactPerson: '',
      contactNotes: '',
      potential: 'Medium',
      callbackStatus: 'pending',
      callbackScheduledAt: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (hotel: Lead) => {
    setCurrentHotel({
      ...hotel,
      // Format datetime to fit datetime-local input (YYYY-MM-DDThh:mm)
      callbackScheduledAt: hotel.callbackScheduledAt 
        ? new Date(hotel.callbackScheduledAt).toISOString().slice(0, 16) 
        : ''
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Tem a certeza que deseja remover o hotel "${name}" do CRM?`)) {
      try {
        const success = await hotelDb.deleteHotel(id, name);
        if (success) {
          await fetchHotels();
        } else {
          alert('Não foi possível remover o hotel.');
        }
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir hotel.');
      }
    }
  };

  const handleSaveHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentHotel || !currentHotel.companyName || !currentHotel.location) {
      alert('Nome da Empresa e Localização são obrigatórios!');
      return;
    }

    setIsSaving(true);
    try {
      // Re-map variables
      const cleanHotel: Lead = {
        id: currentHotel.id || crypto.randomUUID(),
        companyName: currentHotel.companyName.trim(),
        location: currentHotel.location.trim(),
        niche: currentHotel.niche || 'Hotelaria',
        website: currentHotel.website?.trim() || undefined,
        phone: currentHotel.phone?.trim() || undefined,
        allPhones: currentHotel.phone ? [currentHotel.phone.trim()] : [],
        email: currentHotel.email?.trim() || undefined,
        contactPerson: currentHotel.contactPerson?.trim() || undefined,
        contactNotes: currentHotel.contactNotes?.trim() || undefined,
        callbackScheduledAt: currentHotel.callbackScheduledAt || undefined,
        callbackStatus: currentHotel.callbackStatus as any || 'pending',
        potential: currentHotel.potential as any || 'Medium',
        // Preserve or set defaults
        mapsRating: currentHotel.mapsRating || 0,
        mapsReviews: currentHotel.mapsReviews || 0,
        socials: currentHotel.socials || [],
        nif: currentHotel.nif || '',
        cae: currentHotel.cae || '',
        hasWebsite: !!currentHotel.website,
        isProfessionalEmail: false,
        websiteScore: currentHotel.website ? 8 : 0,
        status: currentHotel.status || 'completed',
        potentialReasoning: currentHotel.potentialReasoning || 'Cadastrado no Gestor do CRM.',
        storefront: currentHotel.storefront || {
          analyzed: true,
          signageCondition: 'Unknown',
          visualAppeal: 'Medium',
          needsLedUpgrade: false,
          description: 'Inserido manualmente via Gestor de CRM.',
          address: currentHotel.location
        },
        diagnosis: currentHotel.contactNotes || 'Pronto a contactar.',
        proposal: currentHotel.proposal || null,
        emailSequence: currentHotel.emailSequence || [],
        generatedSiteCode: currentHotel.generatedSiteCode || null
      };

      const success = await hotelDb.saveHotel(cleanHotel);
      
      if (success) {
        await fetchHotels();
        setIsModalOpen(false);
        setCurrentHotel(null);
      } else {
        // Se falhou por falta de tabelas
        setDbError('Erro ao gravar dados. Tenha a certeza de que as tabelas existem no Supabase!');
        setShowSqlSetup(true);
      }
    } catch (err: any) {
      console.error(err);
      setDbError(err.message || 'Ocorreu um erro ao salvar o hotel.');
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered list
  const filteredHotels = hotels.filter(hotel => {
    const textLower = searchTerm.toLowerCase();
    const matchText = !searchTerm || 
      hotel.companyName.toLowerCase().includes(textLower) ||
      hotel.location.toLowerCase().includes(textLower) ||
      (hotel.contactPerson && hotel.contactPerson.toLowerCase().includes(textLower)) ||
      (hotel.email && hotel.email.toLowerCase().includes(textLower)) ||
      (hotel.phone && hotel.phone.includes(searchTerm));

    const matchPotential = potentialFilter === 'all' || hotel.potential === potentialFilter;
    const matchStatus = statusFilter === 'all' || hotel.callbackStatus === statusFilter;

    return matchText && matchPotential && matchStatus;
  });

  return (
    <div id="hotel-management-root" className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2 text-white">
            <Database className="text-emerald-500 w-5 h-5" /> Gestor de Hotéis CRM
          </h2>
          <p className="text-xs text-gray-400 mt-1">Gira de forma integrada os leads e hotéis guardados na sua base de dados do Supabase.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setShowSqlSetup(!showSqlSetup)}
            className="px-3.5 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-semibold flex items-center gap-2 border border-gray-700 transition"
          >
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Script SQL
          </button>
          
          <button 
            onClick={fetchHotels}
            className="p-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition"
            title="Sincronizar dados"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button 
            onClick={handleOpenAddModal}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-600/10 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Novo Hotel Manual
          </button>
        </div>
      </div>

      {/* Database Quick Setup Banner */}
      {showSqlSetup && (
        <div className="p-5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-4 text-left animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <header className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
              <Database className="w-4 h-4" /> Estrutura SQL do Supabase
            </header>
            <button 
              onClick={() => setShowSqlSetup(false)}
              className="text-gray-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-300 leading-relaxed">
            Se o seu Supabase estiver ligado mas estiver a obter erro de tabelas em falta, copie este script e execute-o na consola do Supabase (<strong className="text-white">SQL Editor</strong> &rarr; <strong className="text-white">New Query</strong> &rarr; <strong className="text-emerald-400">Run</strong>).
          </p>

          <div className="relative">
            <pre className="text-[10px] font-mono text-gray-300 bg-ai-dark border border-gray-800 rounded-lg p-3 max-h-[150px] overflow-y-auto whitespace-pre">
              {sqlSchema}
            </pre>
            <button 
              onClick={copySqlToClipboard}
              className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2.5 py-1.5 rounded flex items-center gap-1.5 transition-all"
            >
              {sqlCopied ? <Check className="w-3 h-3" /> : <Clipboard className="w-3 h-3" />}
              {sqlCopied ? 'Copiado!' : 'Copiar Script SQL'}
            </button>
          </div>
        </div>
      )}

      {dbError && (
        <div className="p-4 bg-red-600/10 border border-red-500/25 rounded-xl flex items-start gap-2.5">
          <AlertTriangle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-bold text-red-400">Problema detectado na Base de Dados</h4>
            <p className="text-[11px] text-red-300/90">{dbError} Certifique-se de executar o script SQL no seu console Supabase para criar a relação 'hotels'.</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-ai-card border border-gray-800 rounded-xl p-4 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-500" />
            <input 
              type="text"
              placeholder="Procurar por hotel, localidade, pessoa ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-ai-dark border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:border-emerald-500 text-white placeholder-gray-500"
            />
          </div>

          {/* Potential Rating Dropdown */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-gray-500 shrink-0" />
            <select 
              value={potentialFilter}
              onChange={(e) => setPotentialFilter(e.target.value as any)}
              className="bg-ai-dark border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Prioridade: Todas</option>
              <option value="Hot">🔥 Alta prioridade (Hot)</option>
              <option value="Medium">⚖️ Média prioridade (Medium)</option>
              <option value="Cold">❄️ Baixa prioridade (Cold)</option>
            </select>
          </div>

          {/* Callback / Follow-up Status Dropdown */}
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-ai-dark border border-gray-700 rounded-lg px-2.5 py-2 text-xs text-gray-300 focus:outline-none focus:border-emerald-500"
          >
            <option value="all">Status: Todos</option>
            <option value="pending">⏳ Chamada Pendente</option>
            <option value="completed">✅ Chamada Concluída</option>
            <option value="canceled">❌ Chamada Cancelada</option>
          </select>
        </div>

        {/* View Mode Toggle & Total Count */}
        <div className="flex items-center justify-between md:justify-end gap-4 border-t md:border-t-0 border-gray-800 pt-3 md:pt-0">
          <div className="flex bg-ai-dark border border-gray-700 rounded-lg p-0.5">
            <button 
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${viewMode === 'grid' ? 'bg-emerald-600/10 text-emerald-400' : 'text-gray-400 hover:text-white'}`}
            >
              Grelha
            </button>
            <button 
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 text-[11px] font-semibold rounded-md transition-all ${viewMode === 'table' ? 'bg-emerald-600/10 text-emerald-400' : 'text-gray-400 hover:text-white'}`}
            >
              Lista/Tabela
            </button>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            Resultados: <strong className="text-white">{filteredHotels.length}</strong> / {hotels.length}
          </span>
        </div>
      </div>

      {/* Main List Rendering */}
      {isLoading ? (
        <div className="bg-ai-card border border-gray-800 rounded-xl p-16 text-center">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-3" />
          <p className="text-xs text-gray-400">A carregar registos do database Supabase...</p>
        </div>
      ) : filteredHotels.length === 0 ? (
        <div className="bg-ai-card border border-gray-800 rounded-xl p-12 text-center text-gray-500">
          <Database className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <h3 className="font-bold text-white text-base">Nenhum hotel encontrado</h3>
          <p className="text-xs text-gray-400 max-w-md mx-auto mt-1">Não existem resultados para os filtros selecionados ou ainda não adicionou hotéis à base de dados.</p>
        </div>
      ) : viewMode === 'grid' ? (
        // CARD GRID VIEW
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHotels.map(hotel => (
            <div key={hotel.id} className="bg-ai-card border border-gray-800 rounded-xl p-5 hover:border-emerald-500/40 transition-all flex flex-col justify-between group">
              <div>
                <header className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-bold text-white group-hover:text-emerald-400 transition-colors text-base line-clamp-1">{hotel.companyName}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    hotel.potential === 'Hot' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                    hotel.potential === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                    'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }`}>
                    {hotel.potential === 'Hot' ? '🔥 QUENTE' : hotel.potential === 'Medium' ? '⚖️ MÉDIO' : '❄️ FRIO'}
                  </span>
                </header>

                <p className="text-xs text-gray-400 flex items-center gap-1.5 mb-3">
                  <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" /> <span className="truncate">{hotel.location}</span>
                </p>

                {/* Contacts Section */}
                <div className="space-y-1.5 text-xs border-y border-gray-800 py-3 my-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Pessoa de Contacto:</span>
                    <span className="text-white font-medium truncate max-w-[155px]">{hotel.contactPerson || <span className="text-gray-600 italic">Não definido</span>}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Telefone:</span>
                    {hotel.phone ? (
                      <a href={`tel:${hotel.phone}`} className="text-emerald-400 font-mono font-semibold hover:underline">{hotel.phone}</a>
                    ) : (
                      <span className="text-gray-600 italic">Sem telefone</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Email:</span>
                    {hotel.email ? (
                      <a href={`mailto:${hotel.email}`} className="text-gray-300 hover:text-emerald-400 hover:underline truncate max-w-[155px]" title={hotel.email}>{hotel.email}</a>
                    ) : (
                      <span className="text-gray-600 italic">Sem email</span>
                    )}
                  </div>
                </div>

                {/* Conversation Notes Preview */}
                <div className="mb-4">
                  <span className="block text-[10px] text-gray-500 font-bold uppercase mb-1">Notas de Conversa:</span>
                  <div className="text-xs text-gray-300 bg-gray-850/50 rounded-lg p-2.5 border border-gray-800 line-clamp-3 min-h-[50px] italic">
                    {hotel.contactNotes || "Sem notas de contacto ou interações registadas."}
                  </div>
                </div>

                {/* Follow-up State */}
                <div className="flex items-center justify-between text-xs py-2 px-2.5 bg-emerald-500/5 rounded-lg border border-emerald-500/10 mb-4">
                  <span className="text-xs text-gray-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-emerald-500" /> Seguimento:
                  </span>
                  <span className="font-semibold text-white">
                    {hotel.callbackScheduledAt ? (
                      <span className="text-emerald-400">
                        {new Date(hotel.callbackScheduledAt).toLocaleString()} ({
                          hotel.callbackStatus === 'pending' ? 'Pendente' : 
                          hotel.callbackStatus === 'completed' ? 'Concluída' : 'Cancelada'
                        })
                      </span>
                    ) : (
                      <span className="text-gray-500 italic">Não agendado</span>
                    )}
                  </span>
                </div>
              </div>

              {/* CRM Card Action Bar */}
              <footer className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-800">
                <button 
                  onClick={() => handleOpenEditModal(hotel)}
                  className="px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/20 hover:border-transparent rounded-lg text-xs font-bold transition-all flex items-center gap-1 flex-1 justify-center cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" /> Editar / Notas
                </button>

                {onSelectProposal && (
                  <button 
                    onClick={() => onSelectProposal(hotel)}
                    className="p-1.5 bg-gray-800 hover:bg-blue-600 border border-gray-700 rounded-lg text-blue-400 hover:text-white transition-all cursor-pointer"
                    title="Ver Proposta Comercial"
                  >
                    <FileText className="w-4 h-4" />
                  </button>
                )}

                {onSelectChat && (
                  <button 
                    onClick={() => onSelectChat(hotel)}
                    className="p-1.5 bg-gray-800 hover:bg-purple-600 border border-gray-700 rounded-lg text-purple-400 hover:text-white transition-all cursor-pointer"
                    title="Converse com IA sobre Lead"
                  >
                    <Bot className="w-4 h-4" />
                  </button>
                )}

                <button 
                  onClick={() => handleDelete(hotel.id, hotel.companyName)}
                  className="p-1.5 bg-gray-800 hover:bg-rose-600/20 text-rose-400 border border-gray-700/50 hover:border-rose-500/20 rounded-lg transition-all cursor-pointer"
                  title="Excluir Hotel"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </footer>
            </div>
          ))}
        </div>
      ) : (
        // LIST TABLE VIEW
        <div className="bg-ai-card border border-gray-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-ai-dark border-b border-gray-800 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="px-5 py-3.5">Hotel / Empresa</th>
                  <th className="px-5 py-3.5">Localização</th>
                  <th className="px-5 py-3.5">Contacto</th>
                  <th className="px-5 py-3.5">Prioridade</th>
                  <th className="px-5 py-3.5">Progresso / Agenda</th>
                  <th className="px-5 py-3.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/80 text-xs">
                {filteredHotels.map(hotel => (
                  <tr key={hotel.id} className="hover:bg-gray-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white text-sm">{hotel.companyName}</div>
                      {hotel.website && (
                        <a href={hotel.website} target="_blank" rel="noopener noreferrer" className="text-gray-500 text-[10px] hover:text-emerald-400 inline-flex items-center gap-1 mt-0.5">
                          <Link className="w-2.5 h-2.5" /> {hotel.website.replace('https://', '').replace('http://', '').split('/')[0]}
                        </a>
                      )}
                    </td>
                    <td className="px-5 py-4 text-gray-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span className="truncate max-w-[140px]">{hotel.location}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="space-y-0.5">
                        <div className="font-medium text-white flex items-center gap-1">
                          <User className="w-3 h-3 text-gray-500" /> {hotel.contactPerson || <span className="text-gray-600 italic">Preencher...</span>}
                        </div>
                        {hotel.phone && (
                          <div className="text-[11px] text-emerald-400 font-mono gap-1 flex items-center">
                            <Phone className="w-2.5 h-2.5 text-gray-500" /> {hotel.phone}
                          </div>
                        )}
                        {hotel.email && (
                          <div className="text-[11px] text-gray-400 gap-1 flex items-center truncate max-w-[180px]">
                            <Mail className="w-2.5 h-2.5 text-gray-500" /> {hotel.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold inline-block ${
                        hotel.potential === 'Hot' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 
                        hotel.potential === 'Medium' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                      }`}>
                        {hotel.potential === 'Hot' ? '🔥 QUENTE' : hotel.potential === 'Medium' ? '⚖️ MÉDIO' : '❄️ FRIO'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-300">
                      {hotel.callbackScheduledAt ? (
                        <div className="space-y-1">
                          <span className="font-mono text-[11px] text-white">
                            {new Date(hotel.callbackScheduledAt).toLocaleString()}
                          </span>
                          <span className={`block text-[9px] font-bold uppercase w-max px-1.5 py-0.5 rounded ${
                            hotel.callbackStatus === 'pending' ? 'bg-amber-500/10 text-amber-400' :
                            hotel.callbackStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                          }`}>
                            {hotel.callbackStatus === 'pending' ? 'Pendente' :
                             hotel.callbackStatus === 'completed' ? 'Concluída' : 'Cancelada'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-600 italic">Sem agendamentos</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <button 
                          onClick={() => handleOpenEditModal(hotel)}
                          className="p-1.5 bg-emerald-600/10 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg transition"
                          title="Editar"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        
                        {onSelectProposal && (
                          <button 
                            onClick={() => onSelectProposal(hotel)}
                            className="p-1.5 bg-gray-800 hover:bg-blue-600 rounded-lg text-blue-400 hover:text-white transition-all"
                            title="Proposta"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button 
                          onClick={() => handleDelete(hotel.id, hotel.companyName)}
                          className="p-1.5 bg-gray-800 hover:bg-rose-600 text-rose-450 hover:text-white rounded-lg transition"
                          title="Excluir"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD / EDIT HOTEL MODAL DIALOG */}
      {isModalOpen && currentHotel && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-ai-card border border-gray-800 rounded-2xl w-full max-w-2xl p-6 relative shadow-2xl animate-in zoom-in-95 duration-255 text-left max-h-[90vh] overflow-y-auto">
            {/* Close */}
            <button 
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <header className="mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="text-emerald-400 w-5 h-5" />
                {currentHotel.id ? 'Editar Dados do Hotel' : 'Adicionar Novo Hotel para Vendas'}
              </h3>
              <p className="text-xs text-gray-400 mt-1">Preencha os dados do hotel para o seu pipeline de propostas no CRM.</p>
            </header>

            {/* Form */}
            <form onSubmit={handleSaveHotel} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Company Name */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Nome do Hotel/Empresa *</label>
                  <input 
                    type="text"
                    required
                    value={currentHotel.companyName || ''}
                    onChange={(e) => setCurrentHotel({...currentHotel, companyName: e.target.value})}
                    placeholder="Ex: Pestana Palace Lisboa"
                    className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Localização/Morada *</label>
                  <input 
                    type="text"
                    required
                    value={currentHotel.location || ''}
                    onChange={(e) => setCurrentHotel({...currentHotel, location: e.target.value})}
                    placeholder="Ex: Lisboa, Portugal"
                    className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Website */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Página Web (URL)</label>
                  <input 
                    type="url"
                    value={currentHotel.website || ''}
                    onChange={(e) => setCurrentHotel({...currentHotel, website: e.target.value})}
                    placeholder="https://pestanapalace.com"
                    className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Contact Person */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Pessoa de Contacto (ex: Governanta, Gerente)</label>
                  <input 
                    type="text"
                    value={currentHotel.contactPerson || ''}
                    onChange={(e) => setCurrentHotel({...currentHotel, contactPerson: e.target.value})}
                    placeholder="Ex: Maria Santos (Governanta Geral)"
                    className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Contacto Telefónico</label>
                  <input 
                    type="tel"
                    value={currentHotel.phone || ''}
                    onChange={(e) => setCurrentHotel({...currentHotel, phone: e.target.value})}
                    placeholder="+351 912 345 678"
                    className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Endereço de Email</label>
                  <input 
                    type="email"
                    value={currentHotel.email || ''}
                    onChange={(e) => setCurrentHotel({...currentHotel, email: e.target.value})}
                    placeholder="geral@pestanapalace.com"
                    className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Potential */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Prioridade / Potencial comercial</label>
                  <select 
                    value={currentHotel.potential || 'Medium'}
                    onChange={(e) => setCurrentHotel({...currentHotel, potential: e.target.value as any})}
                    className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Hot">🔥 Alta prioridade (Necessidade urgente / Hot)</option>
                    <option value="Medium">⚖️ Média prioridade (Alguma abertura / Medium)</option>
                    <option value="Cold">❄️ Baixa prioridade (Fechado / Sem interesse / Cold)</option>
                  </select>
                </div>

                {/* Callback Appointment */}
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data/Hora para Próxima Chamada (Follow-up)</label>
                  <input 
                    type="datetime-local"
                    value={currentHotel.callbackScheduledAt || ''}
                    onChange={(e) => setCurrentHotel({...currentHotel, callbackScheduledAt: e.target.value})}
                    className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  />
                </div>
              </div>

              {/* Callback Status */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status da Chamada Agendada</label>
                <select 
                  value={currentHotel.callbackStatus || 'pending'}
                  onChange={(e) => setCurrentHotel({...currentHotel, callbackStatus: e.target.value as any})}
                  className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="pending">⏳ Aguarda Contacto (Pendente)</option>
                  <option value="completed">✅ Chamada Efetuada / Negociação (Concluída)</option>
                  <option value="canceled">❌ Cancelada / Falas sem Conexão (Cancelada)</option>
                </select>
              </div>

              {/* Conversation Notes */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Notas de Conversa e Histórico de Acordos</label>
                <textarea 
                  rows={4}
                  value={currentHotel.contactNotes || ''}
                  onChange={(e) => setCurrentHotel({...currentHotel, contactNotes: e.target.value})}
                  placeholder="Registe o que foi falado. Ex: 'Liguei no dia 06/06. Falei com a Sra. Paula que demonstrou interesse na gestão automatizada de escalas de housekeeping. Ficou de analisar a proposta de orçamento na terça-feira...'"
                  className="w-full bg-ai-dark border border-gray-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500 font-sans leading-relaxed"
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-800">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-gray-850 hover:bg-gray-800 border border-gray-700 rounded-lg text-xs font-semibold text-gray-300 hover:text-white transition cursor-pointer"
                >
                  Voltar atrás
                </button>
                <button 
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-emerald-500/10 cursor-pointer"
                >
                  {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                  {isSaving ? 'A guardar...' : 'Gravar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
