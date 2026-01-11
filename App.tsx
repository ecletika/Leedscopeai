import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import { User } from './types';
import { Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

// Mock database inicial com credenciais
const MOCK_USERS: User[] = [
  {
    id: '1',
    name: 'Maurício Junior',
    email: 'mauricio.junior@ecletika.com',
    password: 'Portugal@130568', // Senha Admin
    role: 'admin',
    plan: 'Agency',
    credits: 999,
    campaigns: [],
    status: 'active'
  },
  {
    id: '2',
    name: 'Cliente Exemplo',
    email: 'cliente@teste.pt',
    password: '123', // Senha simples para teste
    role: 'user',
    plan: 'Pro',
    credits: 10, // Começa com 10 créditos de pesquisa
    campaigns: [],
    status: 'active'
  }
];

export default function App() {
  const [view, setView] = useState<'landing' | 'login' | 'dashboard'>('landing');
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Login State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleGoToLogin = () => {
    setView('login');
    setLoginError('');
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setLoginError('');

    // Simulação de delay de rede
    setTimeout(() => {
      const user = users.find(u => u.email.toLowerCase() === loginEmail.toLowerCase() && u.password === loginPassword);
      
      if (user) {
        if (user.status === 'inactive') {
          setLoginError('Esta conta foi desativada. Contacte o suporte.');
        } else {
          setCurrentUser(user);
          setView('dashboard');
        }
      } else {
        setLoginError('Credenciais inválidas. Verifique o email e a senha.');
      }
      setIsLoading(false);
    }, 800);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setView('landing');
  };

  const handleUpdateUsers = (updatedUsers: User[]) => {
      setUsers(updatedUsers);
      // Se o usuário atual foi atualizado, reflete no estado local
      if (currentUser) {
          const updatedCurrent = updatedUsers.find(u => u.id === currentUser.id);
          if (updatedCurrent) {
              setCurrentUser(updatedCurrent);
          }
      }
  }

  return (
    <>
      {view === 'landing' && <LandingPage onStart={handleGoToLogin} />}
      
      {view === 'login' && (
        <div className="min-h-screen bg-ai-dark flex items-center justify-center p-6 relative overflow-hidden">
           {/* Background Elements */}
           <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-ai-accent/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
           <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

           <div className="w-full max-w-md bg-ai-card border border-gray-800 rounded-2xl p-8 shadow-2xl relative z-10">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo de volta</h2>
                <p className="text-gray-400 text-sm">Aceda à sua conta LeadScope AI</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input 
                      type="email" 
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-ai-accent outline-none transition-colors"
                      placeholder="seu@email.com"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">Palavra-passe</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                    <input 
                      type="password" 
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-ai-accent outline-none transition-colors"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>

                {loginError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-400">{loginError}</p>
                  </div>
                )}

                <button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-ai-accent hover:bg-blue-600 text-white font-bold rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Entrar <ArrowRight className="w-4 h-4" /></>}
                </button>
              </form>
              
              <div className="mt-6 text-center">
                <button 
                  onClick={() => setView('landing')}
                  className="text-xs text-gray-500 hover:text-white transition-colors"
                >
                  &larr; Voltar à página inicial
                </button>
              </div>
           </div>
        </div>
      )}

      {view === 'dashboard' && currentUser && (
        <Dashboard 
          currentUser={currentUser} 
          allUsers={users}
          setAllUsers={handleUpdateUsers}
          onLogout={handleLogout}
        />
      )}
    </>
  );
}