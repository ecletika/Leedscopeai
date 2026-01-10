import React from 'react';
import { CheckCircle, Zap, Target, Mail, Globe, ArrowRight, ShieldCheck } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
}

const PricingCard: React.FC<{
  title: string;
  price: string;
  features: string[];
  recommended?: boolean;
  onSelect: () => void;
}> = ({ title, price, features, recommended, onSelect }) => (
  <div className={`relative p-8 rounded-2xl border ${recommended ? 'border-ai-accent bg-ai-card shadow-2xl shadow-blue-900/20' : 'border-gray-800 bg-ai-dark/50'} flex flex-col`}>
    {recommended && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-ai-accent text-white text-xs font-bold rounded-full uppercase tracking-wider">
        Mais Popular
      </div>
    )}
    <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
    <div className="flex items-baseline gap-1 mb-6">
      <span className="text-3xl font-bold text-white">{price}</span>
      <span className="text-gray-500 text-sm">/mês</span>
    </div>
    <ul className="space-y-4 mb-8 flex-1">
      {features.map((feat, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-gray-300">
          <CheckCircle className="w-4 h-4 text-ai-success shrink-0 mt-0.5" />
          {feat}
        </li>
      ))}
    </ul>
    <button 
      onClick={onSelect}
      className={`w-full py-3 rounded-lg font-bold text-sm transition-all ${recommended ? 'bg-ai-accent hover:bg-blue-600 text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}
    >
      Começar Teste Grátis
    </button>
  </div>
);

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="min-h-screen bg-ai-dark text-white selection:bg-ai-accent selection:text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800 bg-ai-dark/50 backdrop-blur fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-ai-accent rounded-lg flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">LeadScope AI</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={onStart} className="text-sm text-gray-400 hover:text-white transition-colors">Entrar</button>
            <button 
              onClick={onStart}
              className="px-5 py-2 bg-white text-ai-dark font-bold text-sm rounded-lg hover:bg-gray-200 transition-colors"
            >
              Começar Agora
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-ai-accent/10 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ai-accent/10 border border-ai-accent/20 text-ai-accent text-xs font-bold mb-6">
            <Zap className="w-3 h-3" />
            <span>Prospeção B2B com IA</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
            Gere clientes todos os dias com IA <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-ai-accent to-purple-500">sem chamadas frias.</span>
          </h1>
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto">
            Encontre empresas com sites fracos, gere propostas automáticas e envie emails prontos para fechar negócios em minutos.
          </p>
          <div className="flex items-center justify-center gap-4">
            <button 
              onClick={onStart}
              className="px-8 py-4 bg-ai-accent hover:bg-blue-600 text-white font-bold rounded-xl text-lg transition-all shadow-lg shadow-blue-900/30 flex items-center gap-2"
            >
              Começar Grátis <ArrowRight className="w-5 h-5" />
            </button>
          </div>
          <p className="mt-6 text-xs text-gray-500 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4" /> Sem cartão de crédito • 14 dias de teste
          </p>
        </div>
      </section>

      {/* Value Prop */}
      <section className="py-20 bg-black/20 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4 text-ai-accent">
                <Globe className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Prospeção Automática</h3>
              <p className="text-gray-400 text-sm">Defina o nicho e a freguesia. A nossa IA encontra empresas locais automaticamente.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4 text-ai-success">
                <Target className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Diagnóstico Instantâneo</h3>
              <p className="text-gray-400 text-sm">Identificamos sites fracos, emails amadores e falhas de SEO em segundos.</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto mb-4 text-purple-500">
                <Mail className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-2">Outreach Pronto</h3>
              <p className="text-gray-400 text-sm">Receba uma sequência de 4 emails personalizados para copiar e enviar.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Escolha o plano ideal para a sua agência</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard 
              title="Starter"
              price="29€"
              features={['30 Leads / mês', 'Diagnóstico básico', 'Emails gerados', '1 Utilizador']}
              onSelect={onStart}
            />
            <PricingCard 
              title="Pro"
              price="79€"
              features={['150 Leads / mês', 'Diagnóstico Avançado', 'Propostas Automáticas', 'Exportação CSV', 'Preview do Construtor Web']}
              recommended={true}
              onSelect={onStart}
            />
            <PricingCard 
              title="Agency"
              price="199€"
              features={['Leads Ilimitadas', 'Multi-Nicho', 'Relatórios White-label', 'Acesso API', 'Suporte Prioritário']}
              onSelect={onStart}
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-gray-800 text-center text-gray-500 text-sm">
        <p>&copy; 2024 LeadScope AI. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
};

export default LandingPage;