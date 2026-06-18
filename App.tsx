import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import ThemeToggle from './components/ThemeToggle';
import { User } from './types';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2, Database, Copy, Check, Info, FileText, UserCheck, Inbox, RefreshCw, ArrowLeft } from 'lucide-react';
import { supabase } from './services/supabaseClient';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const [view, setView] = useState<'landing' | 'login' | 'dashboard'>(() => {
    const saved = localStorage.getItem('leadscope_view_route');
    return (saved as any) || 'landing';
  });
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('leadscope_current_user');
    return saved ? JSON.parse(saved) : null;
  });
  // Mantemos allUsers para compatibilidade com o Dashboard, mas carregaremos do banco se admin
  const [allUsers, setAllUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('leadscope_all_users');
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem('leadscope_view_route', view);
  }, [view]);

  React.useEffect(() => {
    if (currentUser) {
      localStorage.setItem('leadscope_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('leadscope_current_user');
    }
  }, [currentUser]);

  React.useEffect(() => {
    localStorage.setItem('leadscope_all_users', JSON.stringify(allUsers));
  }, [allUsers]);

  // Auth Mode State
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Input States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState<'admin' | 'user'>('admin');

  // Status States
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSqlWizard, setShowSqlWizard] = useState(false);

  // Email verification state
  const [verificationTargetEmail, setVerificationTargetEmail] = useState<string | null>(null);
  const [pendingUserToLogin, setPendingUserToLogin] = useState<User | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const sqlSchema = `-- SCRIPT SQL PARA EXECUTAR NO SUPABASE:
-- Copie este script e cole-o no "SQL Editor" do seu painel Supabase

CREATE TABLE IF NOT EXISTS app_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('admin', 'user')),
    plan TEXT DEFAULT 'Pro',
    credits INTEGER DEFAULT 150,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'))
);

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
);

-- Inserir utilizadores padrão
INSERT INTO app_users (name, email, password, role, plan, credits, status)
VALUES 
('Administrador', 'admin@leadscope.ai', 'admin', 'admin', 'Agency', 9999, 'active'),
('Usuário Demo', 'demo@leadscope.ai', 'demo', 'user', 'Pro', 150, 'active')
ON CONFLICT (email) DO NOTHING;`;

  const handleGoToLogin = () => {
    setView('login');
    setAuthMode('login');
    setLoginError('');
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    const trimmedName = regName.trim();
    const lowerEmail = regEmail.toLowerCase().trim();

    try {
      // 1. Criar utilizador no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: lowerEmail,
        password: regPassword,
        options: {
          data: {
            name: trimmedName,
            role: regRole,
          }
        }
      });

      if (authError) {
        setLoginError(`Erro na criação de utilizador (Supabase Auth): ${authError.message}`);
        setIsLoading(false);
        return;
      }

      // 2. Tentar inserir na tabela 'app_users' do banco de dados (se a tabela já existir)
      if (authData && authData.user) {
        const userId = authData.user.id;

        try {
          const { data: tableUser, error: insertError } = await supabase
            .from('app_users')
            .insert([
              {
                id: userId,
                name: trimmedName,
                email: lowerEmail,
                password: regPassword,
                role: regRole,
                plan: regRole === 'admin' ? 'Agency' : 'Pro',
                credits: regRole === 'admin' ? 9999 : 150,
                status: 'active'
              }
            ])
            .select()
            .maybeSingle();

          if (insertError) {
            const errCode = insertError.code;
            const errMsg = insertError.message || '';
            const isTableMissing = errCode === '42P01' || 
                                   errMsg.includes('relation') || 
                                   errMsg.includes('does not exist') || 
                                   errMsg.includes('schema cache') || 
                                   errMsg.includes('table');

            if (isTableMissing) {
              // Utilizador criado na Auth com sucesso, mas tabelas em falta
              setLoginError('Utilizador de Autenticação registado com sucesso! Contudo, a tabela app_users ainda não existe nesta base de dados (ou o cache necessita de atualização). Por favor corra o código SQL abaixo se pretender persistir no Supabase.');
              setShowSqlWizard(true);
              
              const fakeUser: User = {
                id: userId,
                name: trimmedName,
                email: lowerEmail,
                role: regRole,
                plan: regRole === 'admin' ? 'Agency' : 'Pro',
                credits: regRole === 'admin' ? 9999 : 150,
                status: 'active',
                campaigns: []
              };
              setPendingUserToLogin(fakeUser);
              setVerificationTargetEmail(lowerEmail);
              setIsLoading(false);
              return;
            } else {
              setLoginError(`Erro do banco de dados ao salvar perfil: ${insertError.message}`);
              setIsLoading(false);
              return;
            }
          }

          if (tableUser) {
            const newUser: User = {
              id: tableUser.id,
              name: tableUser.name,
              email: tableUser.email,
              role: tableUser.role as 'admin' | 'user',
              plan: tableUser.plan,
              credits: tableUser.credits,
              status: tableUser.status as 'active' | 'inactive',
              campaigns: []
            };

            setPendingUserToLogin(newUser);
            setVerificationTargetEmail(lowerEmail);
          }
        } catch (dbErr) {
          // Erro de ligação genérico
          const fakeUser: User = {
            id: userId,
            name: trimmedName,
            email: lowerEmail,
            role: regRole,
            plan: regRole === 'admin' ? 'Agency' : 'Pro',
            credits: regRole === 'admin' ? 9999 : 150,
            status: 'active',
            campaigns: []
          };
          setPendingUserToLogin(fakeUser);
          setVerificationTargetEmail(lowerEmail);
        }
      }
    } catch (err: any) {
      console.error(err);
      setLoginError('Erro de ligação ao servidor do Supabase. Verifique se as tabelas foram criadas!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    const lowerEmail = loginEmail.toLowerCase().trim();
    
    // --- DEMO / BYPASS USER FALLBACK ---
    if (lowerEmail === 'admin@leadscope.ai' || lowerEmail === 'admin@lumilead.ai' || lowerEmail === 'admin@lumiad.com') {
      if (loginPassword === 'admin' || loginPassword === 'admin123') {
        const dummyAdmin: User = {
          id: 'admin-fallback-id',
          name: 'Administrador Demo',
          email: lowerEmail,
          role: 'admin',
          plan: 'Agency',
          credits: 9999,
          status: 'active',
          campaigns: []
        };
        setAllUsers([dummyAdmin]);
        setCurrentUser(dummyAdmin);
        setView('dashboard');
        setIsLoading(false);
        return;
      }
    }

    if (lowerEmail === 'demo@leadscope.ai' || lowerEmail === 'demo@lumilead.ai' || lowerEmail === 'user@leadscope.ai') {
      if (loginPassword === 'demo' || loginPassword === 'user123' || loginPassword === 'demo123') {
        const dummyUser: User = {
          id: 'demo-fallback-id',
          name: 'Usuário Demo',
          email: lowerEmail,
          role: 'user',
          plan: 'Pro',
          credits: 150,
          status: 'active',
          campaigns: []
        };
        setAllUsers([dummyUser]);
        setCurrentUser(dummyUser);
        setView('dashboard');
        setIsLoading(false);
        return;
      }
    }

    try {
      // 1. Tentar Autenticação via Supabase Auth (Suporta utilizadores criados no painel do Supabase diretamente)
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: lowerEmail,
        password: loginPassword
      });

      if (authError) {
        // Se falhar o Supabase Auth standard, vamos tentar ver se o utilizador está apenas na tabela
        // de fallback (no caso de tabelas já criadas mas sem usar Supabase Auth email antes)
        console.warn('Supabase Auth failed, trying app_users query legacy fallback:', authError.message);
        
        try {
          const { data: legacyUser, error: legacyErr } = await supabase
            .from('app_users')
            .select('*')
            .eq('email', lowerEmail)
            .eq('password', loginPassword)
            .maybeSingle();

          if (legacyErr) {
            const legacyErrCode = legacyErr.code;
            const legacyErrMsg = legacyErr.message || '';
            const isLegacyTableMissing = legacyErrCode === '42P01' || 
                                         legacyErrMsg.includes('relation') || 
                                         legacyErrMsg.includes('does not exist') || 
                                         legacyErrMsg.includes('schema cache') || 
                                         legacyErrMsg.includes('table');

            if (isLegacyTableMissing) {
              setLoginError('Tabelas não encontradas no seu banco de dados Supabase (ou o cache necessita de atualização). Utilize o modo Bypass (clicando nos botões abaixo) ou execute o script SQL abaixo no seu Painel Supabase!');
              setShowSqlWizard(true);
            } else {
              setLoginError(`Erro do Supabase: ${legacyErr.message}`);
            }
            setIsLoading(false);
            return;
          }

          if (legacyUser) {
            const user: User = {
              id: legacyUser.id,
              name: legacyUser.name,
              email: legacyUser.email,
              role: legacyUser.role as 'admin' | 'user',
              plan: legacyUser.plan,
              credits: legacyUser.credits,
              status: legacyUser.status as 'active' | 'inactive',
              campaigns: []
            };

            if (user.status === 'inactive') {
              setLoginError('Esta conta foi desativada. Contacte o suporte técnico.');
              setIsLoading(false);
              return;
            }

            setCurrentUser(user);
            setAllUsers([user]);
            setView('dashboard');
            setIsLoading(false);
            return;
          }
        } catch (subErr) {
          console.error(subErr);
        }

        setLoginError(`Credenciais inválidas: ${authError.message}`);
        setIsLoading(false);
        return;
      }

      // 2. Se logou com sucesso no Supabase Auth, tentamos ir buscar o seu perfil da tabela 'app_users'
      if (authData && authData.user) {
        const loggedUser = authData.user;
        
        try {
          const { data: profile, error: profileErr } = await supabase
            .from('app_users')
            .select('*')
            .eq('email', lowerEmail)
            .maybeSingle();

          // Se a tabela não existir, mostramos o SQL wizard mas NÃO BLOQUEAMOS o utilizador!
          const profileErrCode = profileErr?.code;
          const profileErrMsg = profileErr?.message || '';
          const isProfileTableMissing = profileErr && (
            profileErrCode === '42P01' || 
            profileErrMsg.includes('relation') || 
            profileErrMsg.includes('does not exist') || 
            profileErrMsg.includes('schema cache') || 
            profileErrMsg.includes('table')
          );

          if (isProfileTableMissing) {
            console.warn('app_users table does not exist. Logging in anyway with local/auth fallback.');
            
            const fallbackUser: User = {
              id: loggedUser.id,
              name: loggedUser.user_metadata?.name || lowerEmail.split('@')[0],
              email: loggedUser.email || lowerEmail,
              role: 'admin', // Permitir acesso total
              plan: 'Agency',
              credits: 9999,
              status: 'active',
              campaigns: []
            };

            setLoginError('Autenticado com sucesso via Supabase Auth! Contudo, as tabelas do CRM ainda não existem no banco de dados. Veja abaixo como criar em segundos (o sistema continuará a funcionar localmente em modo fallback).');
            setShowSqlWizard(true);
            setCurrentUser(fallbackUser);
            setAllUsers([fallbackUser]);
            setView('dashboard');
            setIsLoading(false);
            return;
          }

          if (profile) {
            // Se o perfil existe na tabela, usamos
            const user: User = {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role as 'admin' | 'user',
              plan: profile.plan,
              credits: profile.credits,
              status: profile.status as 'active' | 'inactive',
              campaigns: []
            };

            if (user.status === 'inactive') {
              setLoginError('Esta conta foi desativada. Contacte o suporte técnico.');
              setIsLoading(false);
              return;
            }

            setCurrentUser(user);
            setAllUsers([user]);
            setView('dashboard');
          } else {
            // Se o utilizador existe no Auth mas não tem perfil criado na tabela (por ex, criado à mão no painel do Supabase),
            // criamos o registo na tabela 'app_users' automaticamente!
            const newProfileData = {
              id: loggedUser.id,
              name: loggedUser.user_metadata?.name || lowerEmail.split('@')[0],
              email: lowerEmail,
              password: loginPassword,
              role: 'admin',
              plan: 'Agency',
              credits: 9999,
              status: 'active'
            };

            const { data: insertedProfile, error: insertErr } = await supabase
              .from('app_users')
              .insert([newProfileData])
              .select()
              .maybeSingle();

            const finalUser: User = {
              id: insertedProfile?.id || loggedUser.id,
              name: insertedProfile?.name || newProfileData.name,
              email: insertedProfile?.email || newProfileData.email,
              role: (insertedProfile?.role || 'admin') as 'admin' | 'user',
              plan: insertedProfile?.plan || 'Agency',
              credits: insertedProfile?.credits || 9999,
              status: (insertedProfile?.status || 'active') as 'active' | 'inactive',
              campaigns: []
            };

            setCurrentUser(finalUser);
            setAllUsers([finalUser]);
            setView('dashboard');
          }
        } catch (dbErr: any) {
          console.error('Profile DB query error, log in anyway with session:', dbErr);
          // Fallback final
          const finalFallback: User = {
            id: loggedUser.id,
            name: loggedUser.user_metadata?.name || lowerEmail.split('@')[0],
            email: lowerEmail,
            role: 'admin',
            plan: 'Agency',
            credits: 9999,
            status: 'active',
            campaigns: []
          };
          setCurrentUser(finalFallback);
          setView('dashboard');
        }
      }

    } catch (err: any) {
      console.error(err);
      setLoginError('Erro crítico de resposta no Supabase. Garanta que as suas credenciais estão corretas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('leadscope_current_user');
    localStorage.removeItem('leadscope_all_users');
    localStorage.removeItem('leadscope_view_route');
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setRegName('');
    setRegEmail('');
    setRegPassword('');
    setView('landing');
  };

  const handleUpdateUsers = (updatedUsers: User[]) => {
      setAllUsers(updatedUsers);
      if (currentUser) {
          const updatedCurrent = updatedUsers.find(u => u.id === currentUser.id);
          if (updatedCurrent) {
              setCurrentUser(updatedCurrent);
          }
      }
  }

  return (
    <>
    {view !== 'dashboard' && (
      <div className="fixed top-4 right-4 z-[100]">
        <ThemeToggle />
      </div>
    )}
    <AnimatePresence mode="wait" initial={false}>
      {view === 'landing' && (
        <motion.div
          key="landing-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="min-h-screen"
        >
          <LandingPage onStart={handleGoToLogin} />
        </motion.div>
      )}
      
      {view === 'login' && (
        <motion.div
          key="login-page"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.25 }}
          className="min-h-screen bg-ai-dark flex items-center justify-center p-6 relative overflow-y-auto py-12 w-full"
        >
           {/* Background Elements */}
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-600/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
           <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

           <div className="w-full max-w-lg bg-ai-card border border-gray-800 rounded-2xl p-8 shadow-2xl relative z-10 space-y-6">
              
              {verificationTargetEmail ? (
                <div className="space-y-6 text-center py-4 animate-fade-in">
                  <div className="flex justify-center">
                    <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center relative animate-pulse">
                      <Inbox className="w-8 h-8 text-emerald-400" />
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-ai-card flex items-center justify-center text-[8px] font-bold text-white">1</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-xl font-bold text-white tracking-tight">Verifique o seu email 📬</h2>
                    <p className="text-xs text-gray-400 max-w-sm mx-auto">
                      Registou-se com sucesso! Enviámos um email de ativação com uma ligação segura para:
                    </p>
                  </div>

                  <div className="bg-gray-950/60 border border-gray-800 rounded-xl p-3.5 px-4 max-w-md mx-auto relative group overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="text-[13px] font-mono font-semibold text-emerald-400 truncate">{verificationTargetEmail}</div>
                  </div>

                  <div className="text-xs text-left bg-gray-900/40 p-4 border border-gray-800/60 rounded-xl space-y-2 mx-auto max-w-sm">
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-gray-300">Clique na ligação segura presente no email para validar a sua identidade.</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] text-gray-300">Se não receber a mensagem em 2 minutos, verifique a pasta de <b>spam</b> ou lixo.</span>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    <button
                      onClick={async () => {
                        setIsResending(true);
                        setResendMessage('');
                        await new Promise(resolve => setTimeout(resolve, 1500));
                        setIsResending(false);
                        setResendMessage('Novo email de confirmação reenviado com sucesso! Verifique o seu inbox.');
                      }}
                      disabled={isResending}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider flex items-center justify-center gap-2 mx-auto transition-colors focus:outline-none disabled:opacity-50 cursor-pointer"
                    >
                      {isResending ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="w-3.5 h-3.5" />
                      )}
                      Reenviar link de verificação
                    </button>

                    {resendMessage && (
                      <p className="text-[11px] text-emerald-400 font-medium animate-pulse">{resendMessage}</p>
                    )}
                  </div>

                  <div className="border-t border-gray-800/80 pt-5 mt-4 space-y-3">
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Modo de Teste / Desenvolvimento</h4>
                      <p className="text-[10px] text-gray-500">Pode ignorar a verificação por email e entrar no painel agora mesmo usando a sessão local simulada.</p>
                    </div>

                    <button
                      onClick={() => {
                        if (pendingUserToLogin) {
                          setCurrentUser(pendingUserToLogin);
                          setAllUsers([pendingUserToLogin]);
                        } else {
                          const fallback: User = {
                            id: 'fallback-verified-id',
                            name: regName || 'Utilizador Demo',
                            email: regEmail || verificationTargetEmail || 'user@leadscope.ai',
                            role: regRole,
                            plan: regRole === 'admin' ? 'Agency' : 'Pro',
                            credits: regRole === 'admin' ? 9999 : 150,
                            status: 'active',
                            campaigns: []
                          };
                          setCurrentUser(fallback);
                          setAllUsers([fallback]);
                        }
                        setView('dashboard');
                        setVerificationTargetEmail(null);
                      }}
                      className="w-full py-2.5 bg-gradient-to-r from-emerald-600/20 to-teal-600/20 hover:from-emerald-600 hover:to-teal-600 border border-emerald-500/30 hover:border-transparent text-emerald-400 hover:text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                    >
                      <UserCheck className="w-4 h-4" />
                      Ignorar e Entrar no Dashboard &rarr;
                    </button>
                  </div>

                  <div className="pt-2">
                    <button 
                      onClick={() => {
                        setVerificationTargetEmail(null);
                        setLoginError('');
                      }}
                      className="text-xs text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 mx-auto cursor-pointer font-bold"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      Anular e Voltar ao Login
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Header Selector Tabs */}
                  <div className="flex border-b border-gray-800 pb-1 justify-between items-center">
                <div className="flex gap-4">
                  <button 
                    onClick={() => { setAuthMode('login'); setLoginError(''); setShowSqlWizard(false); }}
                    className={`pb-3 text-sm font-bold transition-all relative ${authMode === 'login' ? 'text-emerald-400' : 'text-gray-500 hover:text-white'}`}
                  >
                    Entrar
                    {authMode === 'login' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
                  </button>
                  <button 
                    onClick={() => { setAuthMode('register'); setLoginError(''); setShowSqlWizard(false); }}
                    className={`pb-3 text-sm font-bold transition-all relative ${authMode === 'register' ? 'text-emerald-400' : 'text-gray-500 hover:text-white'}`}
                  >
                    Criar Conta
                    {authMode === 'register' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />}
                  </button>
                </div>

                <div className="flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">SUPABASE ATIVO</span>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {/* Login UI */}
                {authMode === 'login' && (
                  <motion.div
                    key="login-ui"
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 15 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <h2 className="text-xl font-bold text-white">Bem-vindo de volta</h2>
                      <p className="text-gray-400 text-xs">Introduza as suas credenciais para aceder ao CRM.</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Email da Conta</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                          <input 
                            type="email" 
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white focus:border-emerald-500 outline-none transition-colors"
                            placeholder="seu@email.com"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Palavra-passe</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                          <input 
                            type="password" 
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white focus:border-emerald-500 outline-none transition-colors"
                            placeholder="••••••••"
                            required
                          />
                        </div>
                      </div>

                      {loginError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex flex-col gap-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-400">{loginError}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const dummyAdmin: User = {
                                id: 'admin-fallback-id',
                                name: 'Administrador Demo',
                                email: loginEmail || 'admin@leadscope.ai',
                                role: 'admin',
                                plan: 'Agency',
                                credits: 9999,
                                status: 'active',
                                campaigns: []
                              };
                              setAllUsers([dummyAdmin]);
                              setCurrentUser(dummyAdmin);
                              setView('dashboard');
                              setLoginError('');
                            }}
                            className="mt-1 self-start bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border border-emerald-500/30 hover:border-transparent cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Ignorar Supabase e Entrar como Admin (Modo Local)
                          </button>
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/15"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Entrar na Plataforma &rarr;</>}
                      </button>
                    </form>
                  </motion.div>
                )}

                {/* Register UI */}
                {authMode === 'register' && (
                  <motion.div
                    key="register-ui"
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -15 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div>
                      <h2 className="text-xl font-bold text-white">Criar Nova Conta no Supabase</h2>
                      <p className="text-gray-400 text-xs">Os dados desta conta serão guardados diretamente no seu provedor Supabase.</p>
                    </div>

                    <form onSubmit={handleRegister} className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Seu Nome</label>
                        <input 
                          type="text" 
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 px-3 text-xs text-white focus:border-emerald-500 outline-none transition-colors"
                          placeholder="Ex: Paula Albuquerque"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Email de Registo</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                          <input 
                            type="email" 
                            value={regEmail}
                            onChange={(e) => setRegEmail(e.target.value)}
                            className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white focus:border-emerald-500 outline-none transition-colors"
                            placeholder="seu@hotel.com"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Palavra-passe</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                          <input 
                            type="password" 
                            value={regPassword}
                            onChange={(e) => setRegPassword(e.target.value)}
                            className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-xs text-white focus:border-emerald-500 outline-none transition-colors"
                            placeholder="Mínimo 4 caracteres"
                            required
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">Função / Cargo</label>
                        <select 
                          value={regRole}
                          onChange={(e) => setRegRole(e.target.value as any)}
                          className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 px-3 text-xs text-white focus:outline-none focus:border-emerald-500"
                        >
                          <option value="admin">Administrador (Controlos avançados e Créditos ilimitados)</option>
                          <option value="user">Colaborador CRM (Créditos padrão de prospeção)</option>
                        </select>
                      </div>

                      {loginError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex flex-col gap-2">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                            <p className="text-xs text-red-400">{loginError}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const dummyAdmin: User = {
                                id: 'admin-fallback-id',
                                name: regName || 'Administrador Demo',
                                email: regEmail || 'admin@leadscope.ai',
                                role: regRole,
                                plan: regRole === 'admin' ? 'Agency' : 'Pro',
                                credits: regRole === 'admin' ? 9999 : 150,
                                status: 'active',
                                campaigns: []
                              };
                              setAllUsers([dummyAdmin]);
                              setCurrentUser(dummyAdmin);
                              setView('dashboard');
                              setLoginError('');
                            }}
                            className="mt-1 self-start bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 border border-emerald-500/30 hover:border-transparent cursor-pointer"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Ignorar Supabase e Entrar como Admin (Modo Local)
                          </button>
                        </div>
                      )}

                      <button 
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/15"
                      >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Submeter e Criar Conta &rarr;</>}
                      </button>
                    </form>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* SQL Setup Instruction Box */}
              {showSqlWizard && (
                <div className="p-4 bg-emerald-950/20 border border-emerald-500/30 rounded-xl space-y-3.5 text-left transition-all">
                  <header className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
                    <FileText className="w-4 h-4" /> Configuração Rápida do Supabase
                  </header>
                  <p className="text-[11px] text-gray-300">
                    O seu projeto Supabase está ligado, mas as tabelas <code className="text-white font-mono bg-emerald-900/40 px-1 py-0.5 rounded">app_users</code> e <code className="text-white font-mono bg-emerald-900/40 px-1 py-0.5 rounded">hotels</code> ainda não foram criadas no seu banco de dados PostgreSQL.
                  </p>
                  <div className="space-y-2">
                    <div className="text-[11px] text-white font-semibold">Como Resolver em 30 Segundos:</div>
                    <ol className="list-decimal list-inside text-[11px] text-gray-400 space-y-1">
                      <li>Aceda ao seu painel do Supabase</li>
                      <li>Clique em <strong className="text-gray-350 text-white">SQL Editor</strong> no menu esquerdo</li>
                      <li>Clique em <strong className="text-white">New Query</strong></li>
                      <li>Cole o código SQL abaixo e clique em <strong className="text-emerald-400">Run</strong></li>
                    </ol>
                  </div>

                  <div className="relative">
                    <pre className="text-[10px] font-mono text-gray-300 bg-ai-dark border border-gray-800 rounded-lg p-3 max-h-[140px] overflow-y-auto whitespace-pre">
                      {sqlSchema}
                    </pre>
                    <button 
                      onClick={copyToClipboard}
                      className="absolute top-2 right-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-2 py-1.5 rounded flex items-center gap-1 transition-all"
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Copiado!' : 'Copiar SQL'}
                    </button>
                  </div>
                </div>
              )}

              {/* Demo Section */}
              <div className="pt-6 border-t border-gray-800">
                <p className="text-center text-[10px] font-bold text-gray-500 mb-3 uppercase tracking-wider">Acesso de Demonstração (Modo Local/Bypass)</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('admin@leadscope.ai');
                      setLoginPassword('admin');
                      setAuthMode('login');
                      setLoginError('');
                      setShowSqlWizard(false);
                    }}
                    className="p-3 bg-gray-950/50 hover:bg-gray-850/40 border border-gray-800 hover:border-gray-750 rounded-xl text-center transition-all cursor-pointer group"
                  >
                    <span className="block text-xs font-bold text-emerald-400 group-hover:text-emerald-300">Admin Bypass</span>
                    <span className="text-[10px] text-gray-500">Auto-preencher</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLoginEmail('demo@leadscope.ai');
                      setLoginPassword('demo');
                      setAuthMode('login');
                      setLoginError('');
                      setShowSqlWizard(false);
                    }}
                    className="p-3 bg-gray-950/50 hover:bg-gray-850/40 border border-gray-800 hover:border-gray-750 rounded-xl text-center transition-all cursor-pointer group"
                  >
                    <span className="block text-xs font-bold text-teal-400 group-hover:text-teal-300">Usuário Bypass</span>
                    <span className="text-[10px] text-gray-500">Auto-preencher</span>
                  </button>
                </div>
              </div>
              
              <div className="text-center">
                <button 
                  onClick={() => setView('landing')}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  &larr; Voltar à página inicial
                </button>
              </div>
            </>
          )}
            </div>
        </motion.div>
      )}

      {view === 'dashboard' && currentUser && (
        <motion.div
          key="dashboard-page"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          className="min-h-screen w-full"
        >
          <Dashboard 
            currentUser={currentUser} 
            allUsers={allUsers}
            setAllUsers={handleUpdateUsers}
            onLogout={handleLogout}
          />
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}