import React, { useState, useMemo } from 'react';
import { Lead } from '../types';
import { ChevronDown, ChevronUp, Globe, Mail, Phone, ExternalLink, XCircle, CheckCircle, Smartphone, AlertTriangle, Database, Zap, X, Filter, SlidersHorizontal, MonitorPlay, Building2, Briefcase, Star, MapPin, Send, Copy, FileText, Hash, Calendar, Users as UsersIcon, Coins } from 'lucide-react';

interface LeadResultsProps {
  leads: Lead[];
}

const ScoreBadge: React.FC<{ score: number }> = ({ score }) => {
  let color = 'bg-red-500/20 text-red-400 border-red-500/30';
  if (score >= 4) color = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
  if (score >= 7) color = 'bg-green-500/20 text-green-400 border-green-500/30';

  return (
    <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-full border-2 ${color}`}>
      <span className="text-lg font-bold leading-none">{score}</span>
      <span className="text-[8px] uppercase font-bold opacity-80">Score</span>
    </div>
  );
};

const LeadCard: React.FC<{ lead: Lead }> = ({ lead }) => {
  const [expanded, setExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'analysis' | 'email'>('analysis');
  const [emailCopied, setEmailCopied] = useState(false);
  const isDiscarded = lead.status === 'discarded';

  const handleOpenSite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lead.generatedSiteCode) return;
    const blob = new Blob([lead.generatedSiteCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  };

  const copyEmail = () => {
    if (lead.generatedEmail) {
        const text = `Subject: ${lead.generatedEmail.subject}\n\n${lead.generatedEmail.body}`;
        navigator.clipboard.writeText(text);
        setEmailCopied(true);
        setTimeout(() => setEmailCopied(false), 2000);
    }
  };

  return (
    <div className={`border rounded-lg overflow-hidden transition-all ${isDiscarded ? 'bg-ai-dark/50 border-gray-800 opacity-60' : 'bg-ai-card border-gray-700 hover:border-ai-accent/30'}`}>
      <div 
        className="p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-4">
          <ScoreBadge score={lead.websiteScore} />
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`font-bold text-lg ${isDiscarded ? 'text-gray-500 line-through' : 'text-white'}`}>{lead.companyName}</h3>
              <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded border border-gray-700 font-mono">{lead.niche}</span>
              
              {lead.cae && lead.cae !== 'N/A' && (
                <span className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded border border-purple-500/20 font-mono flex items-center gap-1" title="CAE Principal">
                   <Hash className="w-3 h-3" /> {lead.cae}
                </span>
              )}

              {lead.nif && lead.nif !== 'N/A' && (
                <span className="text-xs px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded border border-blue-500/20 font-mono flex items-center gap-1" title="NIF">
                   <FileText className="w-3 h-3" /> {lead.nif}
                </span>
              )}

              {lead.foundationYear && lead.foundationYear !== 'N/A' && (
                <span className="text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-mono flex items-center gap-1" title="Ano de Fundação">
                   <Calendar className="w-3 h-3" /> {lead.foundationYear}
                </span>
              )}

              {isDiscarded && <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded border border-gray-700">DISCARDED</span>}
            </div>
            
            <div className="flex items-center gap-3 text-xs text-ai-muted mt-1">
              <span className="flex items-center gap-1">
                {lead.hasWebsite ? <Globe className="w-3 h-3 text-ai-success" /> : <XCircle className="w-3 h-3 text-ai-danger" />}
                {lead.website || "No Website"}
              </span>
              <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
              <span className="flex items-center gap-1">
                {lead.isProfessionalEmail ? <CheckCircle className="w-3 h-3 text-ai-success" /> : <AlertTriangle className="w-3 h-3 text-ai-warning" />}
                {lead.email || "No Email"}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
           {lead.generatedSiteCode && !isDiscarded && (
             <button 
               onClick={handleOpenSite}
               className="flex items-center gap-2 px-4 py-2 bg-ai-accent hover:bg-blue-600 text-white rounded-lg text-xs font-bold transition-all shadow-lg shadow-blue-900/20"
             >
               <MonitorPlay className="w-4 h-4" />
               PREVIEW SITE
             </button>
           )}
           {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="border-t border-gray-800 bg-black/20 animate-in fade-in slide-in-from-top-2">
            
            {/* Tabs */}
            <div className="flex border-b border-gray-800">
                <button 
                    onClick={() => setActiveTab('analysis')}
                    className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'analysis' ? 'text-ai-accent border-b-2 border-ai-accent bg-ai-accent/5' : 'text-gray-400 hover:text-white'}`}
                >
                    Analysis & Proposal
                </button>
                <button 
                    onClick={() => setActiveTab('email')}
                    className={`px-6 py-3 text-sm font-medium transition-colors flex items-center gap-2 ${activeTab === 'email' ? 'text-ai-accent border-b-2 border-ai-accent bg-ai-accent/5' : 'text-gray-400 hover:text-white'}`}
                >
                    <Mail className="w-4 h-4" /> Outreach Email
                </button>
            </div>

          <div className="p-6">
          {isDiscarded ? (
             <div className="text-center py-4">
                <X className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                <p className="text-gray-500">{lead.diagnosis}</p>
             </div>
          ) : activeTab === 'analysis' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              
              {/* Left Column: Data */}
              <div className="space-y-6">
                
                {/* Company Intelligence Data */}
                <div className="bg-ai-dark/50 border border-gray-700 rounded-lg p-4">
                   <h5 className="text-xs font-bold text-ai-accent uppercase mb-3 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Enrichment Data (Module 3)
                   </h5>
                   <div className="grid grid-cols-1 gap-3">
                      <div className="flex flex-col gap-1">
                         <span className="text-[10px] uppercase text-gray-500 font-bold">Atividade Principal</span>
                         <span className="text-sm text-gray-200 flex items-start gap-2">
                           <Briefcase className="w-4 h-4 text-ai-warning mt-0.5 shrink-0" /> 
                           {lead.businessActivity || "Analyzing..."}
                         </span>
                      </div>
                      
                      {(lead.mapsRating || lead.mapsReviews) && (
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] uppercase text-gray-500 font-bold">Google Maps</span>
                           <span className="text-sm text-yellow-400 flex items-center gap-2">
                             {lead.mapsRating && (
                               <span className="flex items-center gap-1 font-bold">
                                 {lead.mapsRating} <Star className="w-3 h-3 fill-current" />
                               </span>
                             )}
                             {lead.mapsReviews && (
                               <span className="text-gray-400 text-xs">({lead.mapsReviews} reviews)</span>
                             )}
                           </span>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4 border-t border-gray-700/50 pt-3 mt-1">
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] uppercase text-gray-500 font-bold">NIF</span>
                           <span className="text-sm text-gray-200 font-mono tracking-wider">
                              {lead.nif || "N/A"}
                           </span>
                        </div>
                        <div className="flex flex-col gap-1">
                           <span className="text-[10px] uppercase text-gray-500 font-bold">CAE Principal</span>
                           <span className="text-sm text-gray-200 font-mono tracking-wider">
                              {lead.cae || "N/A"}
                           </span>
                        </div>
                      </div>

                      {/* Expanded Financial Data */}
                      <div className="grid grid-cols-3 gap-2 border-t border-gray-700/50 pt-3 mt-1">
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> Fundação
                            </span>
                            <span className="text-xs text-white font-medium">{lead.foundationYear || "N/A"}</span>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1">
                                <Coins className="w-3 h-3" /> Capital
                            </span>
                            <span className="text-xs text-white font-medium">{lead.capitalSocial || "N/A"}</span>
                         </div>
                         <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase text-gray-500 font-bold flex items-center gap-1">
                                <UsersIcon className="w-3 h-3" /> Equipa
                            </span>
                            <span className="text-xs text-white font-medium">{lead.employees || "N/A"}</span>
                         </div>
                      </div>

                      {lead.secondaryCae && lead.secondaryCae.length > 0 && (
                          <div className="flex flex-col gap-1 border-t border-gray-700/50 pt-3 mt-1">
                              <span className="text-[10px] uppercase text-gray-500 font-bold">CAEs Secundários</span>
                              <div className="flex flex-wrap gap-1">
                                  {lead.secondaryCae.map((cae, idx) => (
                                      <span key={idx} className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded border border-gray-700 font-mono">
                                          {cae}
                                      </span>
                                  ))}
                              </div>
                          </div>
                      )}
                   </div>
                </div>

                {/* Diagnosis */}
                <div>
                  <h4 className="text-sm font-bold text-ai-warning uppercase tracking-wider flex items-center gap-2 mb-3">
                    <Smartphone className="w-4 h-4" /> AI Diagnosis
                  </h4>
                  <div className="bg-ai-warning/5 border border-ai-warning/10 p-4 rounded-lg">
                    <div className="space-y-2">
                      <ul className="space-y-1">
                        {lead.proposal?.problems.map((prob, i) => (
                          <li key={i} className="text-sm text-gray-400 flex items-start gap-2">
                             <span className="text-red-400 mt-1">x</span> {prob}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Proposal */}
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold text-ai-accent uppercase tracking-wider flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4" /> Commercial Proposal (Module 4)
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="bg-ai-dark p-4 rounded border border-gray-700">
                      <p className="text-xs font-bold text-ai-success uppercase mb-2">🚀 Proposed Solution</p>
                      <ul className="space-y-2">
                        {lead.proposal?.solutionFeatures.map((feat, idx) => (
                           <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                             <CheckCircle className="w-4 h-4 text-ai-success shrink-0" /> {feat}
                           </li>
                        ))}
                      </ul>
                    </div>

                    <div className="bg-gradient-to-r from-ai-card to-ai-dark p-3 rounded border border-gray-700">
                        <p className="text-xs text-gray-500 mb-1">Visual Identity</p>
                        <p className="text-sm italic text-gray-300">"{lead.proposal?.brandingSuggestion}"</p>
                    </div>

                  </div>
                </div>
              </div>
            </div>
          ) : (
            // Email Tab
            <div className="max-w-3xl mx-auto">
                {lead.generatedEmail ? (
                    <div className="space-y-4">
                        <div className="bg-ai-dark border border-gray-700 rounded-lg p-6">
                            <div className="mb-4 pb-4 border-b border-gray-800">
                                <span className="text-xs text-gray-500 font-bold uppercase">Subject</span>
                                <p className="text-lg font-medium text-white mt-1">{lead.generatedEmail.subject}</p>
                            </div>
                            <div className="whitespace-pre-wrap text-gray-300 text-sm leading-relaxed font-sans">
                                {lead.generatedEmail.body}
                            </div>
                        </div>
                        <div className="flex justify-end gap-3">
                            <button 
                                onClick={copyEmail}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors"
                            >
                                {emailCopied ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                {emailCopied ? "Copied" : "Copy to Clipboard"}
                            </button>
                            <a 
                                href={`mailto:${lead.email}?subject=${encodeURIComponent(lead.generatedEmail.subject)}&body=${encodeURIComponent(lead.generatedEmail.body)}`}
                                className="flex items-center gap-2 px-4 py-2 bg-ai-accent hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20"
                            >
                                <Send className="w-4 h-4" />
                                Send via Email Client
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Generating email strategy...</p>
                    </div>
                )}
            </div>
          )}
          </div>
        </div>
      )}
    </div>
  );
};

const LeadResults: React.FC<LeadResultsProps> = ({ leads }) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'qualified' | 'discarded'>('all');

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      if (statusFilter === 'qualified' && lead.status === 'discarded') return false;
      if (statusFilter === 'discarded' && lead.status !== 'discarded') return false;
      return true;
    });
  }, [leads, statusFilter]);

  if (leads.length === 0) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-800 pb-4">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-ai-accent" />
          <h2 className="text-xl font-bold text-white">Prospects</h2>
          <span className="bg-gray-800 text-gray-300 text-xs font-mono font-bold px-2 py-1 rounded">
            {filteredLeads.length}
          </span>
        </div>

        <div className="flex items-center gap-4">
            <button 
              onClick={() => setStatusFilter('all')}
              className={`text-xs font-medium ${statusFilter === 'all' ? 'text-white' : 'text-gray-500'}`}
            >
              All
            </button>
            <button 
              onClick={() => setStatusFilter('qualified')}
              className={`text-xs font-medium ${statusFilter === 'qualified' ? 'text-ai-success' : 'text-gray-500'}`}
            >
              Qualified
            </button>
             <button 
              onClick={() => setStatusFilter('discarded')}
              className={`text-xs font-medium ${statusFilter === 'discarded' ? 'text-ai-danger' : 'text-gray-500'}`}
            >
              Discarded
            </button>
        </div>
      </div>
      
      <div className="grid gap-4">
        {filteredLeads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} />
        ))}
      </div>
    </div>
  );
};

export default LeadResults;