import React, { useState } from 'react';
import { Lead } from '../types';
import { ChevronDown, ChevronUp, Globe, Mail, Phone, ExternalLink, Smartphone, AlertTriangle, Eye, Video, Instagram, Facebook, Linkedin, Youtube, CheckCircle, Flame, Snowflake, Scale, ScanEye, Star, Clock, Tag, MessageSquare, MapPin, FileText, Bot, Briefcase, Code, Share2 } from 'lucide-react';

interface LeadResultsProps {
  leads: Lead[];
  onInvestigate: (id: string) => void;
  onGenerateProposal: (lead: Lead) => void;
  onAskAI: (lead: Lead) => void;
  onGenerateSite: (lead: Lead) => void;
}

const PotentialBadge: React.FC<{ potential: 'Hot' | 'Medium' | 'Cold' }> = ({ potential }) => {
    if (potential === 'Hot') {
        return <span className="flex items-center gap-1 px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-xs font-bold uppercase"><Flame className="w-3 h-3" /> Quente</span>;
    }
    if (potential === 'Medium') {
        return <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded text-xs font-bold uppercase"><Scale className="w-3 h-3" /> Médio</span>;
    }
    return <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded text-xs font-bold uppercase"><Snowflake className="w-3 h-3" /> Frio</span>;
};

const SocialIcon: React.FC<{ network: string, url: string }> = ({ network, url }) => {
    let Icon = Globe;
    let color = "text-gray-400";
    
    if (network === 'instagram') { Icon = Instagram; color = "text-pink-500"; }
    if (network === 'facebook') { Icon = Facebook; color = "text-blue-500"; }
    if (network === 'linkedin') { Icon = Linkedin; color = "text-blue-400"; }
    if (network === 'youtube') { Icon = Youtube; color = "text-red-500"; }
    if (network === 'tiktok') { Icon = Video; color = "text-black bg-white rounded-full p-0.5"; }

    return (
        <a href={url} target="_blank" rel="noopener noreferrer" className={`hover:scale-110 transition-transform ${color}`}>
            <Icon className="w-4 h-4" />
        </a>
    );
};

const LeadCard: React.FC<{ 
    lead: Lead, 
    onInvestigate: (id: string) => void,
    onGenerateProposal: (lead: Lead) => void,
    onAskAI: (lead: Lead) => void,
    onGenerateSite: (lead: Lead) => void
}> = ({ lead, onInvestigate, onGenerateProposal, onAskAI, onGenerateSite }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="bg-ai-card border border-gray-700 rounded-lg overflow-hidden hover:border-ai-accent/50 transition-all group">
      <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center gap-4 flex-1">
          {/* Main Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg text-white group-hover:text-ai-accent transition-colors">{lead.companyName}</h3>
                <PotentialBadge potential={lead.potential} />
                {(lead.mapsRating ?? 0) > 0 && (
                   <span className="flex items-center gap-1 text-xs text-yellow-400 ml-2 bg-yellow-400/10 px-1.5 py-0.5 rounded border border-yellow-400/20">
                     <Star className="w-3 h-3 fill-yellow-400" /> {lead.mapsRating} ({lead.mapsReviews})
                   </span>
                )}
            </div>
            
            <div className="flex flex-wrap gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {lead.location}</span>
                {lead.phone ? (
                    <span className="flex items-center gap-1 text-white font-mono"><Phone className="w-3 h-3 text-green-400" /> {lead.phone}</span>
                ) : (
                    <span className="flex items-center gap-1 text-red-400"><Phone className="w-3 h-3" /> Sem telefone</span>
                )}
                
                {lead.socials.length > 0 && (
                    <div className="flex items-center gap-2 pl-2 border-l border-gray-700">
                        {lead.socials.map((s, i) => <SocialIcon key={i} network={s.network} url={s.url} />)}
                    </div>
                )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
             {/* New Action Buttons */}
             <button 
                onClick={(e) => { e.stopPropagation(); onAskAI(lead); }}
                className="p-2 bg-gray-800 hover:bg-purple-600/50 text-purple-400 hover:text-white border border-gray-700 rounded-lg transition-all"
                title="Perguntar à IA sobre este Lead"
             >
                <Bot className="w-4 h-4" />
             </button>

             <button 
                onClick={(e) => { e.stopPropagation(); onGenerateSite(lead); }}
                className="p-2 bg-gray-800 hover:bg-green-600/50 text-green-400 hover:text-white border border-gray-700 rounded-lg transition-all"
                title="Gerar Landing Page"
             >
                <Code className="w-4 h-4" />
             </button>

             <button 
                onClick={(e) => { e.stopPropagation(); onGenerateProposal(lead); }}
                className="p-2 bg-gray-800 hover:bg-blue-600/50 text-blue-400 hover:text-white border border-gray-700 rounded-lg transition-all"
                title="Gerar Proposta Comercial"
             >
                <FileText className="w-4 h-4" />
             </button>

             {/* Storefront Investigation Button */}
            {!lead.storefront.analyzed ? (
                <button 
                    onClick={(e) => { e.stopPropagation(); onInvestigate(lead.id); }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white border border-purple-500/50 rounded text-xs font-bold transition-all"
                >
                    <ScanEye className="w-4 h-4" /> Fachada
                </button>
            ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded border border-gray-700">
                    {lead.storefront.needsLedUpgrade ? 
                        <span className="text-green-400 text-xs font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Precisa de LEDs</span> :
                        <span className="text-gray-400 text-xs font-bold">Fachada OK</span>
                    }
                </div>
            )}

            <button onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
                {expanded ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
        </div>
      </div>

      {expanded && (
        <div className="p-6 bg-black/20 border-t border-gray-800 grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-2 cursor-default">
            {/* Left Column: Core Data & Services */}
            <div className="space-y-6">
                <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Dados de Contacto & Digital</h4>
                    <div className="space-y-2 text-sm text-gray-300">
                        <p className="flex items-center gap-2"><Globe className="w-4 h-4 text-ai-accent"/> <strong>Website:</strong> {lead.website ? <a href={lead.website} target="_blank" className="text-blue-400 hover:underline">{lead.website}</a> : "Não tem (Oportunidade!)"}</p>
                        <p className="flex items-center gap-2"><Smartphone className="w-4 h-4 text-green-500"/> <strong>Telefones:</strong> {lead.allPhones.join(', ') || "Nenhum extra"}</p>
                        <p className="flex items-center gap-2"><Mail className="w-4 h-4 text-yellow-500"/> <strong>Email:</strong> {lead.email || "Não público"}</p>
                        
                        {/* Improved NIF and CAE Display */}
                        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-700/50">
                            <div className="flex items-center gap-2 bg-gray-800/50 px-2 py-1 rounded border border-gray-700 shadow-sm">
                                <FileText className="w-3 h-3 text-ai-accent" />
                                <span className="text-xs text-gray-500 font-bold uppercase">NIF:</span>
                                <span className="font-mono text-white text-xs tracking-wide">{lead.nif || "N/A"}</span>
                            </div>
                            <div className="flex items-center gap-2 bg-gray-800/50 px-2 py-1 rounded border border-gray-700 shadow-sm">
                                <Briefcase className="w-3 h-3 text-purple-400" />
                                <span className="text-xs text-gray-500 font-bold uppercase">CAE:</span>
                                <span className="font-mono text-white text-xs tracking-wide">{lead.cae || "N/A"}</span>
                            </div>
                        </div>

                         {/* Social Analysis Report */}
                         {lead.socialSummary && (
                             <div className="mt-4 bg-gray-800/30 p-3 rounded border border-gray-700">
                                 <h5 className="text-[10px] font-bold text-purple-400 uppercase mb-1 flex items-center gap-1">
                                     <Share2 className="w-3 h-3"/> Relatório Social
                                 </h5>
                                 <p className="text-xs text-gray-400 italic leading-relaxed">"{lead.socialSummary}"</p>
                             </div>
                         )}
                    </div>
                </div>

                {lead.servicesOffered && lead.servicesOffered.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                        <Tag className="w-3 h-3" /> Serviços Identificados
                    </h4>
                    <div className="flex flex-wrap gap-2">
                        {lead.servicesOffered.map((service, i) => (
                            <span key={i} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300">
                                {service}
                            </span>
                        ))}
                    </div>
                  </div>
                )}
                
                 {lead.businessHours && lead.businessHours.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Horário de Funcionamento
                    </h4>
                    <div className="text-xs text-gray-400 bg-gray-800/50 p-2 rounded border border-gray-800">
                        {lead.businessHours.map((hour, i) => (
                            <div key={i}>{hour}</div>
                        ))}
                    </div>
                  </div>
                )}
            </div>

            {/* Right Column: Visual, Potential & Reviews */}
            <div className="space-y-6">
                <div>
                    <h4 className="text-xs font-bold text-purple-400 uppercase mb-3">Análise de Potencial</h4>
                    <div className="space-y-3 text-sm">
                         {/* Classification Reasoning */}
                         <div className={`p-3 rounded border ${lead.potential === 'Hot' ? 'bg-red-900/10 border-red-500/30 text-red-300' : lead.potential === 'Cold' ? 'bg-blue-900/10 border-blue-500/30 text-blue-300' : 'bg-yellow-900/10 border-yellow-500/30 text-yellow-300'}`}>
                            <p className="text-xs font-bold uppercase mb-1 flex items-center gap-2">
                                <Bot className="w-3 h-3" /> Motivo da Classificação:
                            </p>
                            <p className="italic">"{lead.potentialReasoning}"</p>
                        </div>

                        {lead.storefront.analyzed ? (
                           <div className="space-y-2 mt-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="bg-gray-800 p-2 rounded">
                                        <span className="block text-[10px] text-gray-500 uppercase">Estado Placa</span>
                                        <span className="font-bold text-white">{lead.storefront.signageCondition}</span>
                                    </div>
                                    <div className="bg-gray-800 p-2 rounded">
                                        <span className="block text-[10px] text-gray-500 uppercase">Upgrade LED?</span>
                                        <span className={`font-bold ${lead.storefront.needsLedUpgrade ? 'text-green-400' : 'text-red-400'}`}>
                                            {lead.storefront.needsLedUpgrade ? "SIM (Prioridade)" : "Não urgente"}
                                        </span>
                                    </div>
                                </div>
                                {/* Address Found */}
                                {lead.storefront.address && (
                                    <div className="bg-gray-800/50 p-2 rounded border border-gray-700">
                                        <span className="block text-[10px] text-gray-500 uppercase flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> Endereço Visual
                                        </span>
                                        <span className="text-xs text-gray-300">{lead.storefront.address}</span>
                                    </div>
                                )}
                            </div>
                        ) : (
                             <p className="text-gray-500 text-sm italic">Clique em "Fachada" para analisar o potencial físico.</p>
                        )}
                    </div>
                </div>

                {lead.reviewsList && lead.reviewsList.length > 0 && (
                    <div>
                         <h4 className="text-xs font-bold text-yellow-500 uppercase mb-2 flex items-center gap-2">
                            <MessageSquare className="w-3 h-3" /> Reviews Recentes
                        </h4>
                        <div className="space-y-2">
                            {lead.reviewsList.slice(0, 2).map((review, i) => (
                                <div key={i} className="bg-gray-800 p-2 rounded border border-gray-700 text-xs">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="font-bold text-white">{review.author}</span>
                                        <span className="flex text-yellow-400"><Star className="w-3 h-3 fill-yellow-400"/> {review.rating}</span>
                                    </div>
                                    <p className="text-gray-400 italic line-clamp-2">"{review.text}"</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
      )}
    </div>
  );
};

const LeadResults: React.FC<LeadResultsProps> = ({ leads, onInvestigate, onGenerateProposal, onAskAI, onGenerateSite }) => {
  return (
    <div className="space-y-4">
      {leads.map(lead => (
        <LeadCard 
            key={lead.id} 
            lead={lead} 
            onInvestigate={onInvestigate} 
            onGenerateProposal={onGenerateProposal}
            onAskAI={onAskAI}
            onGenerateSite={onGenerateSite}
        />
      ))}
    </div>
  );
};

export default LeadResults;