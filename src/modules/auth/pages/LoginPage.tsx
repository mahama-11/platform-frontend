import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'

import { useSessionStore } from '@/app/store/sessionStore'
import { useToastStore } from '@/app/store/toastStore'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const login = useSessionStore(state => state.login)
  const pushToast = useToastStore(state => state.push)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || '/overview'

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      await login(email.trim(), password)
      pushToast({ tone: 'success', title: 'Signed in successfully', description: 'Platform session is ready.' })
      navigate(from, { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      setError(message)
      pushToast({ tone: 'error', title: 'Sign in failed', description: message })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10 bg-[var(--bg)] relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sky-900/20 via-[var(--bg)] to-[var(--bg)] pointer-events-none" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="glass-panel w-full max-w-md rounded-2xl p-8 relative z-10 shadow-xl border-[var(--border-strong)]"
      >
        <p className="text-xs uppercase tracking-widest font-medium text-[var(--text-soft)]">V Platform</p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">{t('topbar.title')}</h1>
        <p className="mt-2 text-sm text-[var(--text-muted)] leading-relaxed">{t('topbar.subtitle')}</p>
        <p className="mt-3 text-sm text-[var(--text-muted)]">Use an existing platform account from the current platform database.</p>

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">Email</span>
            <input 
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-[var(--text)] outline-none focus:border-[var(--primary-soft)] focus:ring-1 focus:ring-[var(--primary-soft)] transition-all placeholder:text-[var(--text-soft)]" 
              placeholder="you@company.com" 
              value={email} 
              onChange={event => setEmail(event.target.value)} 
            />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-medium text-[var(--text-muted)]">Password</span>
            <input 
              className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg)] px-4 py-2.5 text-[var(--text)] outline-none focus:border-[var(--primary-soft)] focus:ring-1 focus:ring-[var(--primary-soft)] transition-all placeholder:text-[var(--text-soft)]" 
              type="password" 
              placeholder="Enter your password" 
              value={password} 
              onChange={event => setPassword(event.target.value)} 
            />
          </label>
          
          {error ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-md px-3 py-2">
              {error}
            </motion.p>
          ) : null}
          
          <button 
            type="submit" 
            disabled={submitting} 
            className="w-full rounded-lg bg-[var(--text)] hover:bg-white text-[var(--bg)] px-4 py-2.5 font-medium transition-all disabled:opacity-60 mt-2"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
