import React, { useState, useEffect } from 'react'
import LandingPage from './components/LandingPage'
import Dashboard from './components/Dashboard'
import { supabase } from './lib/supabase'
import { User } from '@supabase/supabase-js'
import { Lock, Mail, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'

export default function App() {
  const [view, setView] = useState<'landing' | 'login' | 'dashboard'>('landing')
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  // Login State
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // 🔐 Mantém sessão ativa (refresh / reload)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        setCurrentUser(data.session.user)
        setView('dashboard')
      }
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session?.user) {
          setCurrentUser(session.user)
          setView('dashboard')
        } else {
          setCurrentUser(null)
          setView('landing')
        }
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  const handleGoToLogin = () => {
    setView('login')
    setLoginError('')
  }

  // ✅ LOGIN REAL (SUPABASE)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setLoginError('')

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    })

    if (error) {
      setLoginError(error.message)
      setIsLoading(false)
      return
    }

    setIsLoading(false)
  }

  // ✅ LOGOUT REAL (SUPABASE)
  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <>
      {view === 'landing' && <LandingPage onStart={handleGoToLogin} />}

      {view === 'login' && (
        <div className="min-h-screen bg-ai-dark flex items-center justify-center p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-ai-accent/5 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>

          <div className="w-full max-w-md bg-ai-card border border-gray-800 rounded-2xl p-8 shadow-2xl relative z-10">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-white mb-2">
                Bem-vindo de volta
              </h2>
              <p className="text-gray-400 text-sm">
                Aceda à sua conta LeadScope AI
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-ai-accent outline-none"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase">
                  Palavra-passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-gray-500" />
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-ai-dark border border-gray-700 rounded-lg py-2.5 pl-10 pr-4 text-sm text-white focus:border-ai-accent outline-none"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 mt-0.5" />
                  <p className="text-xs text-red-400">{loginError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-ai-accent hover:bg-blue-600 text-white font-bold rounded-lg flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Entrar <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 text-center">
              <button
                onClick={() => setView('landing')}
                className="text-xs text-gray-500 hover:text-white"
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
          onLogout={handleLogout}
          allUsers={[]}          // ⬅️ mantém compatibilidade
          setAllUsers={() => {}} // ⬅️ pode remover depois
        />
      )}
    </>
  )
}
