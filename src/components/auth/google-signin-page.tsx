'use client';

import { useState, useEffect, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Loader2, CheckCircle2, Mail, User, Shield } from 'lucide-react';
import { toast } from 'sonner';

function getInitials(email: string) {
  return email.charAt(0).toUpperCase();
}

function getAvatarColor(email: string) {
  const colors = [
    'bg-blue-500', 'bg-red-500', 'bg-purple-500', 'bg-amber-500',
    'bg-purple-500', 'bg-pink-500', 'bg-purple-500', 'bg-orange-500',
  ];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function GoogleLogo() {
  return (
    <svg width="75" height="24" viewBox="0 0 75 24" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path fill="#4285F4" d="M9.24 8.19v2.46h5.88c-.18 1.38-.64 2.39-1.34 3.1-.86.86-2.2 1.8-4.54 1.8-3.62 0-6.45-2.92-6.45-6.54s2.83-6.54 6.45-6.54c1.95 0 3.38.77 4.43 1.76L15.4 2.5C13.94 1.08 11.98 0 9.24 0 4.28 0 .11 4.04.11 9s4.17 9 9.13 9c2.68 0 4.7-.88 6.28-2.52 1.62-1.62 2.13-3.91 2.13-5.75 0-.57-.04-1.1-.13-1.54H9.24z"/>
        <path fill="#EA4335" d="M25 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52z"/>
        <path fill="#FBBC05" d="M53.58 7.49h-.09c-.57-.68-1.67-1.3-3.06-1.3C47.53 6.19 45 8.72 45 12c0 3.26 2.53 5.81 5.43 5.81 1.39 0 2.49-.62 3.06-1.32h.09v.81c0 2.22-1.19 3.41-3.1 3.41-1.56 0-2.53-1.12-2.93-2.07l-2.22.92c.64 1.54 2.33 3.43 5.15 3.43 2.99 0 5.52-1.76 5.52-6.05V6.49h-2.42v1zm-2.93 8.03c-1.76 0-3.1-1.5-3.1-3.52 0-2.05 1.34-3.52 3.1-3.52 1.74 0 3.1 1.5 3.1 3.54 0 2.02-1.37 3.5-3.1 3.5z"/>
        <path fill="#4285F4" d="M38 6.19c-3.21 0-5.83 2.44-5.83 5.81 0 3.34 2.62 5.81 5.83 5.81s5.83-2.46 5.83-5.81c0-3.37-2.62-5.81-5.83-5.81zm0 9.33c-1.76 0-3.28-1.45-3.28-3.52 0-2.09 1.52-3.52 3.28-3.52s3.28 1.43 3.28 3.52c0 2.07-1.52 3.52-3.28 3.52z"/>
        <path fill="#34A853" d="M58 .24h2.51v17.57H58z"/>
        <path fill="#EA4335" d="M68.26 15.52c-1.3 0-2.22-.59-2.82-1.76l7.77-3.21-.26-.66c-.48-1.3-1.96-3.7-4.97-3.7-2.99 0-5.48 2.35-5.48 5.81 0 3.26 2.46 5.81 5.76 5.81 2.66 0 4.2-1.63 4.84-2.57l-1.98-1.32c-.66.96-1.56 1.6-2.86 1.6zm-.18-7.15c1.03 0 1.91.53 2.2 1.28l-5.25 2.17c0-2.44 1.73-3.45 3.05-3.45z"/>
      </g>
    </svg>
  );
}

// Step indicators
function StepIndicator({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  return (
    <div className="flex items-center gap-2 justify-center mb-6">
      {Array.from({ length: totalSteps }, (_, i) => (
        <div
          key={i}
          className={`h-1 rounded-full transition-all duration-500 ease-out ${
            i <= currentStep
              ? 'bg-blue-500 w-8'
              : 'bg-gray-200 dark:bg-gray-700 w-4'
          }`}
        />
      ))}
    </div>
  );
}

// Previous accounts (stored in localStorage)
interface SavedAccount {
  email: string;
  name: string;
  avatar?: string;
  lastUsed: number;
}

function GoogleSignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<'choose' | 'email' | 'name' | 'success'>('choose');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Load saved accounts from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('zinter_google_accounts');
      if (saved) {
        const accounts = JSON.parse(saved) as SavedAccount[];
        // Sort by last used
        accounts.sort((a, b) => b.lastUsed - a.lastUsed);
        setSavedAccounts(accounts);
        if (accounts.length === 0) {
          setStep('email');
        }
      } else {
        setStep('email');
      }
    } catch {
      setStep('email');
    }
  }, []);

  // Check if redirected with state param (for security)
  useEffect(() => {
    const state = searchParams.get('state');
    if (!state) {
      // No state param - redirect back to main auth
      router.replace('/');
    }
  }, [searchParams, router]);

  const saveAccountToStorage = (account: SavedAccount) => {
    try {
      const existing = localStorage.getItem('zinter_google_accounts');
      const accounts: SavedAccount[] = existing ? JSON.parse(existing) : [];
      // Remove if already exists
      const filtered = accounts.filter(a => a.email !== account.email);
      // Add with updated timestamp
      filtered.unshift(account);
      // Keep max 5 accounts
      localStorage.setItem('zinter_google_accounts', JSON.stringify(filtered.slice(0, 5)));
    } catch {
      // Ignore storage errors
    }
  };

  const handleSelectAccount = async (account: SavedAccount) => {
    setSelectedAccount(account.email);
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: account.email,
          name: account.name,
          provider: 'google',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Sign in failed' }));
        setError(data.error || 'Sign in failed');
        setSelectedAccount(null);
        setIsLoading(false);
        return;
      }

      // Save to localStorage
      saveAccountToStorage({ ...account, lastUsed: Date.now() });

      setStep('success');
      setTimeout(() => {
        router.replace('/');
      }, 1500);
    } catch {
      setError('Network error. Please try again.');
      setSelectedAccount(null);
      setIsLoading(false);
    }
  };

  const handleUseAnotherAccount = () => {
    setStep('email');
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);

    try {
      // Check if user exists
      const res = await fetch('/api/auth/google/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (data.exists) {
        // User exists - auto sign in
        const signInRes = await fetch('/api/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.toLowerCase().trim(),
            name: data.name || email.split('@')[0],
            provider: 'google',
          }),
        });

        if (!signInRes.ok) {
          setError('Sign in failed. Please try again.');
          setIsLoading(false);
          return;
        }

        // Save to localStorage
        saveAccountToStorage({
          email: email.toLowerCase().trim(),
          name: data.name || email.split('@')[0],
          lastUsed: Date.now(),
        });

        setStep('success');
        setTimeout(() => {
          router.replace('/');
        }, 1500);
      } else {
        // New user - go to name step
        setIsLoading(false);
        setStep('name');
      }
    } catch {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (name.trim().length < 2) {
      setError('Please enter your name');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          name: name.trim(),
          provider: 'google',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Account creation failed' }));
        setError(data.error || 'Account creation failed');
        setIsLoading(false);
        return;
      }

      // Save to localStorage
      saveAccountToStorage({
        email: email.toLowerCase().trim(),
        name: name.trim(),
        lastUsed: Date.now(),
      });

      setStep('success');
      setTimeout(() => {
        router.replace('/');
      }, 1500);
    } catch {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  };

  const handleBackToAuth = () => {
    router.replace('/');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 sm:px-8 sm:py-6">
        <button
          onClick={handleBackToAuth}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg px-3 py-1.5 -ml-3"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="flex-1" />
        <button
          onClick={handleBackToAuth}
          className="text-sm text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950 rounded-lg px-3 py-1.5 transition-colors duration-200"
        >
          English (United States)
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-start justify-center px-4 pt-4 sm:pt-12 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
          className="w-full max-w-[450px]"
        >
          <AnimatePresence mode="wait">
            {/* Step: Choose Account */}
            {step === 'choose' && (
              <motion.div
                key="choose"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                {/* Google Logo */}
                <div className="flex justify-center mb-8">
                  <GoogleLogo />
                </div>

                <h1 className="text-xl sm:text-2xl font-normal text-gray-900 dark:text-gray-100 text-center mb-1">
                  Choose an account
                </h1>
                <p className="text-sm text-gray-500 text-center mb-8">
                  to continue to Zinter AI
                </p>

                {/* Saved Accounts List */}
                <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-3">
                  {savedAccounts.map((account) => (
                    <button
                      key={account.email}
                      onClick={() => handleSelectAccount(account)}
                      disabled={isLoading && selectedAccount === account.email}
                      className="w-full flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150 border-b border-gray-100 dark:border-gray-800 last:border-b-0 disabled:opacity-70"
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm shrink-0 ${getAvatarColor(account.email)}`}>
                        {getInitials(account.email)}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {account.name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {account.email}
                        </p>
                      </div>
                      {(isLoading && selectedAccount === account.email) ? (
                        <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
                      ) : (
                        <ArrowRight className="w-5 h-5 text-gray-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Use another account */}
                <button
                  onClick={handleUseAnotherAccount}
                  className="w-full flex items-center gap-4 px-6 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150 border border-gray-200 dark:border-gray-700 rounded-xl"
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-100 dark:bg-gray-800 shrink-0">
                    <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  </div>
                  <span className="text-sm text-blue-500 font-medium">
                    Use another account
                  </span>
                </button>
              </motion.div>
            )}

            {/* Step: Enter Email */}
            {step === 'email' && (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                {/* Google Logo */}
                <div className="flex justify-center mb-8">
                  <GoogleLogo />
                </div>

                <h1 className="text-xl sm:text-2xl font-normal text-gray-900 dark:text-gray-100 text-center mb-1">
                  Sign in
                </h1>
                <p className="text-sm text-gray-500 text-center mb-1">
                  Use your Google Account
                </p>
                <p className="text-xs text-gray-400 text-center mb-8">
                  Sign in to Zinter AI with your email
                </p>

                <StepIndicator currentStep={0} totalSteps={2} />

                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-lg px-4 py-2.5"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <Mail className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(''); }}
                      placeholder="Email or phone"
                      className="w-full h-14 pl-12 pr-4 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all duration-200"
                      autoFocus
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => savedAccounts.length > 0 ? setStep('choose') : handleBackToAuth()}
                      className="text-sm text-blue-500 hover:text-blue-600 font-medium px-2 py-1 rounded transition-colors duration-200"
                    >
                      {savedAccounts.length > 0 ? 'Back' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || !email.trim()}
                      className="flex items-center gap-1.5 px-8 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-all duration-200 text-sm hover:shadow-md disabled:shadow-none active:scale-[0.98]"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Checking...</span>
                        </>
                      ) : (
                        <>
                          <span>Next</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Info banner */}
                <div className="mt-8 flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-xl">
                  <Shield className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Your account will be securely created and managed by Zinter AI. We respect your privacy and will never share your information.
                  </p>
                </div>
              </motion.div>
            )}

            {/* Step: Enter Name (for new users) */}
            {step === 'name' && (
              <motion.div
                key="name"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.3 }}
              >
                {/* Google Logo */}
                <div className="flex justify-center mb-8">
                  <GoogleLogo />
                </div>

                <h1 className="text-xl sm:text-2xl font-normal text-gray-900 dark:text-gray-100 text-center mb-1">
                  Create your account
                </h1>
                <p className="text-sm text-gray-500 text-center mb-8">
                  Set up your Zinter AI profile
                </p>

                <StepIndicator currentStep={1} totalSteps={2} />

                {/* Email display (read-only) */}
                <div className="mb-5 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 mb-1">Signed in as</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-medium ${getAvatarColor(email)}`}>
                      {getInitials(email)}
                    </div>
                    {email}
                  </p>
                </div>

                <form onSubmit={handleNameSubmit} className="space-y-4">
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/50 rounded-lg px-4 py-2.5"
                    >
                      {error}
                    </motion.div>
                  )}

                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      <User className="w-5 h-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => { setName(e.target.value); setError(''); }}
                      placeholder="Your name"
                      className="w-full h-14 pl-12 pr-4 text-base border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 bg-transparent text-gray-900 dark:text-gray-100 placeholder:text-gray-400 transition-all duration-200"
                      autoFocus
                      required
                    />
                  </div>

                  <p className="text-xs text-gray-400 px-1">
                    Enter your display name for Zinter AI
                  </p>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      type="button"
                      onClick={() => setStep('email')}
                      className="text-sm text-blue-500 hover:text-blue-600 font-medium px-2 py-1 rounded transition-colors duration-200"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading || name.trim().length < 2}
                      className="flex items-center gap-1.5 px-8 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium rounded-lg transition-all duration-200 text-sm hover:shadow-md disabled:shadow-none active:scale-[0.98]"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <span>Create Account</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Step: Success */}
            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
                className="text-center py-12"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
                  className="mb-6"
                >
                  <div className="w-20 h-20 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-10 h-10 text-purple-500" />
                  </div>
                </motion.div>
                <h2 className="text-xl font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Welcome to Zinter AI!
                </h2>
                <p className="text-sm text-gray-500">
                  Redirecting you to the app...
                </p>
                <div className="mt-6 flex justify-center">
                  <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Footer - Google style */}
      <div className="px-4 py-4 sm:px-8">
        <div className="max-w-[450px] mx-auto">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>Help</span>
            <span>Privacy</span>
            <span>Terms</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function GoogleSignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
            <p className="text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      }
    >
      <GoogleSignInContent />
    </Suspense>
  );
}
