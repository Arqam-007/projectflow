import React, { useState, useEffect } from 'react';
import {
  Layers,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { ThreeDWorkflowCanvas } from './ThreeDWorkflowCanvas.js';

interface AuthScreenProps {
  onLogin: (email: string, pass: string) => Promise<void>;
  onRegister: (name: string, email: string, pass: string) => Promise<void>;
  authSubmitting: boolean;
  authError: string | null;
  authSuccessMsg: string | null;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  onLogin,
  onRegister,
  authSubmitting,
  authError,
  authSuccessMsg,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [clientError, setClientError] = useState<string | null>(null);

  // Clear sensitive password states on component unmount
  useEffect(() => {
    return () => {
      setPassword('');
      setConfirmPassword('');
    };
  }, []);

  const handleModeChange = (newMode: 'login' | 'register') => {
    setMode(newMode);
    // Instantly wipe all password states when switching between Sign In and Register
    setPassword('');
    setConfirmPassword('');
    setShowPass(false);
    setShowConfirmPass(false);
    setClientError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setClientError(null);

    if (mode === 'register') {
      if (password.length < 8) {
        setClientError('Password must be at least 8 characters long');
        setPassword('');
        setConfirmPassword('');
        return;
      }
      if (password !== confirmPassword) {
        setClientError('Passwords do not match');
        setPassword('');
        setConfirmPassword('');
        return;
      }
    }

    // Capture temporary reference for the in-flight request
    const passToSubmit = password;

    // Immediately clear password from React component state
    setPassword('');
    setConfirmPassword('');

    try {
      if (mode === 'login') {
        await onLogin(email.trim(), passToSubmit);
      } else {
        await onRegister(name.trim(), email.trim(), passToSubmit);
      }
    } finally {
      // Guaranteed wipe of password values regardless of whether request succeeded or failed
      setPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030407] flex flex-col lg:flex-row text-[#F5F7FA] relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-[#1558C9]/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[400px] h-[400px] bg-[#D4FF24]/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Left Column: Visual Brand & 3D Core Experience */}
      <div className="flex-1 flex flex-col justify-between p-8 lg:p-16 relative z-10 border-b lg:border-b-0 lg:border-r border-white/[0.08]">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-[#1558C9] to-[#0c3175] border border-[#1558C9]/50 shadow-[0_0_20px_rgba(21,88,201,0.4)]">
            <Layers className="w-5 h-5 text-white" />
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#D4FF24] ring-2 ring-[#030407]" />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white">ProjectFlow</span>
            <p className="text-[11px] text-[#9299A8]">Enterprise Workflow & Task Engine</p>
          </div>
        </div>

        {/* 3D Visual Centerpiece */}
        <div className="my-10 flex flex-col items-center text-center space-y-6">
          <ThreeDWorkflowCanvas size={280} className="drop-shadow-[0_20px_50px_rgba(21,88,201,0.35)]" />

          <div className="max-w-md space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1558C9]/15 border border-[#1558C9]/35 text-[#F5F7FA] text-xs font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D4FF24]" />
              <span>Full-Stack Enterprise Architecture</span>
            </div>
            <h2 className="text-2xl lg:text-3xl font-extrabold text-white tracking-tight">
              Precision Workflows for Mission-Critical Engineering
            </h2>
            <p className="text-xs text-[#9299A8] leading-relaxed">
              Multi-tenant workspace isolation, row-locking concurrency, strict state machines, and real-time executive dashboard intelligence.
            </p>
          </div>
        </div>

        {/* Footer Feature Badges */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-white/[0.06] text-center">
          <div className="p-3 rounded-xl bg-[#0B0E14] border border-white/[0.06]">
            <p className="text-[10px] text-[#9299A8] uppercase tracking-wider">Security</p>
            <p className="text-xs font-semibold text-white mt-0.5">JWT & Token Version</p>
          </div>
          <div className="p-3 rounded-xl bg-[#0B0E14] border border-white/[0.06]">
            <p className="text-[10px] text-[#9299A8] uppercase tracking-wider">Database</p>
            <p className="text-xs font-semibold text-[#D4FF24] mt-0.5">PostgreSQL 16</p>
          </div>
          <div className="p-3 rounded-xl bg-[#0B0E14] border border-white/[0.06]">
            <p className="text-[10px] text-[#9299A8] uppercase tracking-wider">Access</p>
            <p className="text-xs font-semibold text-[#1558C9] mt-0.5">4-Tier RBAC</p>
          </div>
        </div>
      </div>

      {/* Right Column: Authentication Card & 1-Click Demo Logins */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-16 relative z-10">
        <div className="w-full max-w-md space-y-6">
          {/* Form Card */}
          <div className="p-8 rounded-2xl bg-[#0B0E14] border border-white/[0.08] shadow-2xl space-y-6">
            {/* Mode Switcher Tabs */}
            <div className="flex items-center p-1 rounded-xl bg-[#111722] border border-white/[0.06]">
              <button
                type="button"
                onClick={() => handleModeChange('login')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'login'
                    ? 'bg-[#1558C9] text-white shadow-md'
                    : 'text-[#9299A8] hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleModeChange('register')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  mode === 'register'
                    ? 'bg-[#1558C9] text-white shadow-md'
                    : 'text-[#9299A8] hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>

            <div>
              <h3 className="text-xl font-extrabold text-white">
                {mode === 'login' ? 'Sign in to ProjectFlow' : 'Create an Account'}
              </h3>
              <p className="text-xs text-[#9299A8] mt-1">
                {mode === 'login'
                  ? 'Access your workspaces, projects, and active Kanban sprints.'
                  : 'Get started with a dedicated workspace and team.'}
              </p>
            </div>

            {/* Error or Success Banner */}
            {(clientError || authError) && (
              <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-in fade-in duration-150">
                {clientError || authError}
              </div>
            )}
            {authSuccessMsg && (
              <div className="p-3.5 rounded-xl bg-[#D4FF24]/15 border border-[#D4FF24]/30 text-[#D4FF24] text-xs">
                {authSuccessMsg}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-[#F5F7FA]">Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9299A8]" />
                    <input
                      type="text"
                      required
                      name="name"
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Rivera"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none transition-colors"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#F5F7FA]">Work Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9299A8]" />
                  <input
                    type="email"
                    required
                    name="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-[#F5F7FA]">Password</label>
                  {mode === 'register' && (
                    <span className="text-[10px] text-[#9299A8]">Min. 8 chars (letters + numbers)</span>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9299A8]" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    name="password"
                    autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                    data-1p-ignore="true"
                    data-lpignore="true"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none transition-colors font-mono"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9299A8] hover:text-white transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div className="space-y-1.5 animate-in fade-in duration-150">
                  <label className="text-xs font-medium text-[#F5F7FA]">Confirm Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9299A8]" />
                    <input
                      type={showConfirmPass ? 'text' : 'password'}
                      required
                      name="confirmPassword"
                      autoComplete="new-password"
                      data-1p-ignore="true"
                      data-lpignore="true"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[#111722] border border-white/[0.08] focus:border-[#1558C9] text-white text-xs outline-none transition-colors font-mono"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirmPass(!showConfirmPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9299A8] hover:text-white transition-colors"
                    >
                      {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#1558C9] hover:bg-[#1e6bf2] disabled:opacity-50 text-white text-xs font-bold shadow-[0_4px_20px_rgba(21,88,201,0.4)] transition-all hover:scale-[1.01]"
              >
                <span>{authSubmitting ? 'Authenticating...' : mode === 'login' ? 'Sign In to Workspace' : 'Create Account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
