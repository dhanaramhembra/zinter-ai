'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, Mail, Lock, User, Sparkles, Moon, Sun, X, Zap } from 'lucide-react';
import { ZinterLogo } from '@/components/zinter-logo';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function getPasswordStrength(password: string): { label: string; score: number; color: string; glowColor: string } {
  if (!password) return { label: '', score: 0, color: '', glowColor: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak', score: 1, color: 'bg-red-500', glowColor: 'shadow-red-500/50' };
  if (score <= 2) return { label: 'Fair', score: 2, color: 'bg-orange-500', glowColor: 'shadow-orange-500/50' };
  if (score <= 3) return { label: 'Good', score: 3, color: 'bg-yellow-500', glowColor: 'shadow-yellow-500/50' };
  return { label: 'Strong', score: 4, color: 'bg-emerald-500', glowColor: 'shadow-emerald-500/50' };
}

function FloatingDots() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const dots = useMemo(() => {
    const items = [];
    for (let i = 0; i < 24; i++) {
      const size = Math.random() * 5 + 2;
      const left = Math.random() * 100;
      const delay = Math.random() * 15;
      const duration = Math.random() * 20 + 18;
      const opacity = Math.random() * 0.12 + 0.04;
      const sway = Math.random() * 40 + 10;
      items.push(
        <div
          key={i}
          className="absolute rounded-full bg-emerald-500"
          style={{
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            bottom: `-${size}px`,
            opacity,
            animation: `float-up ${duration}s ${delay}s infinite linear`,
            '--sway': `${sway}px`,
          } as React.CSSProperties}
        />
      );
    }
    return items;
  }, []);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) translateX(0) scale(0.8);
            opacity: 0;
          }
          5% {
            opacity: var(--dot-opacity, 0.1);
            transform: scale(1);
          }
          50% {
            transform: translateY(-50vh) translateX(calc(var(--sway, 20px) * 0.5));
          }
          95% {
            opacity: var(--dot-opacity, 0.1);
            transform: translateY(-100vh) translateX(var(--sway, 20px));
          }
          100% {
            transform: translateY(-100vh) translateX(var(--sway, 20px));
            opacity: 0;
          }
        }
      `}</style>
      {dots}
    </div>
  );
}

function ErrorMessage({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="flex items-start gap-2 p-3 text-sm text-destructive bg-destructive/10 rounded-lg"
    >
      <span className="flex-1">{message}</span>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 shrink-0 -mt-0.5 -mr-1 text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={onClose}
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </motion.div>
  );
}

function SocialLoginDivider() {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
      <span className="text-xs text-muted-foreground/70 whitespace-nowrap">or continue with</span>
      <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="9" fill="#4285F4" />
      <text x="9" y="13.5" textAnchor="middle" fill="white" fontSize="12" fontWeight="bold" fontFamily="Arial, sans-serif">G</text>
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="9" r="9" fill="#24292f" />
      <text x="9" y="12.5" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold" fontFamily="Arial, sans-serif">GH</text>
    </svg>
  );
}

function SocialLoginButtons() {
  // Redirect to real Google OAuth flow
  const handleGoogleSignIn = () => {
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="flex gap-3">
      <Button
        type="button"
        variant="outline"
        className="flex-1 h-10 gap-2 border-border/60 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        onClick={handleGoogleSignIn}
      >
        <GoogleIcon />
        <span className="text-sm">Google</span>
      </Button>
      <Button
        type="button"
        variant="outline"
        className="flex-1 h-10 gap-2 border-border/60 hover:border-emerald-500/40 hover:bg-emerald-500/5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
        onClick={() => toast('Coming soon!', { description: 'GitHub sign-in will be available soon.' })}
      >
        <GitHubIcon />
        <span className="text-sm">GitHub</span>
      </Button>
    </div>
  );
}

export default function AuthPage() {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [rememberMe, setRememberMe] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const { setUser } = useAuthStore();
  const { theme, setTheme } = useTheme();

  const passwordStrength = useMemo(
    () => getPasswordStrength(signupData.password),
    [signupData.password]
  );

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUser(data.user);
            return;
          }
        }
      } catch {
        // Session check failed, show auth page
      } finally {
        setIsCheckingSession(false);
      }
    };
    checkSession();
  }, [setUser]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Login failed' }));
        setError(data.error || 'Login failed');
        return;
      }
      const data = await res.json();

      setUser(data.user);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signupData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupData.name,
          email: signupData.email,
          password: signupData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Signup failed' }));
        setError(data.error || 'Signup failed');
        return;
      }
      const data = await res.json();

      setUser(data.user);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check for Google OAuth errors in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = params.get('google_error');
    if (googleError) {
      // Clean URL and show error
      window.history.replaceState({}, '', '/');
      const errorMessages: Record<string, string> = {
        'access_denied': 'Google sign-in was cancelled',
        'no_credentials': 'Google sign-in is not configured. Contact the administrator.',
        'invalid_state': 'Security error. Please try again.',
        'token_exchange_failed': 'Google sign-in failed. Please try again.',
        'userinfo_failed': 'Failed to get your Google profile. Please try again.',
        'invalid_user_data': 'Invalid Google account data. Please try again.',
        'server_error': 'Something went wrong. Please try again.',
        'missing_params': 'Invalid Google response. Please try again.',
      };
      toast.error(errorMessages[googleError] || `Google sign-in failed: ${googleError}`);
    }
  }, []);

  return (
    <div className="min-h-[100dvh] min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50 relative overflow-hidden">
      {/* Animated mesh gradient background */}
      <div className="mesh-gradient">
        <div className="mesh-gradient-extra" />
      </div>

      {/* Noise texture overlay */}
      <div className="noise-texture absolute inset-0 pointer-events-none" />

      {/* Animated floating dots with parallax-like sway */}
      <FloatingDots />

      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/3 rounded-full blur-3xl" />
      </div>

      {/* Theme toggle with smooth icon rotation */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-50 rounded-full hover:bg-muted/60"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        suppressHydrationWarning
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-transform duration-500 dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-transform duration-500 dark:rotate-0 dark:scale-100" />
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isCheckingSession ? 0 : 1, y: isCheckingSession ? 20 : 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo/Brand with breathing glow */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="mb-4"
          >
            <ZinterLogo variant="full" size={isCheckingSession ? 'lg' : 'xl'} className={cn(isCheckingSession && 'animate-pulse')} />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="text-2xl sm:text-3xl font-bold tracking-tight gradient-text"
          >
            Zinter AI
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="text-muted-foreground mt-2"
          >
            Chat with AI, generate images, and more
          </motion.p>
        </div>

        {/* Card with gradient border and enhanced glassmorphism */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className={cn(
            'relative rounded-xl p-[1px] bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-emerald-500/10 shadow-2xl shadow-emerald-500/5 hover:shadow-emerald-500/15 transition-all duration-500',
            isCheckingSession && 'animate-breathing-glow'
          )}
        >
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-2xl rounded-[11px] noise-texture border border-white/10 dark:border-white/5">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'login' | 'signup'); setError(''); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-transparent p-0 h-auto relative">
                {/* Sliding indicator */}
                <motion.div
                  className="absolute bottom-0 h-[2px] bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-500 rounded-full shadow-sm shadow-emerald-500/30"
                  animate={{
                    left: activeTab === 'login' ? '0%' : '50%',
                    width: '50%',
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
                <TabsTrigger
                  value="login"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-medium transition-colors data-[state=active]:text-foreground text-muted-foreground"
                >
                  Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none py-3 font-medium transition-colors data-[state=active]:text-foreground text-muted-foreground"
                >
                  Sign Up
                </TabsTrigger>
              </TabsList>

                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleLogin}>
                    <CardHeader className="pb-4">
                      <CardTitle>Welcome back</CardTitle>
                      <CardDescription>Sign in to continue your conversations</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <AnimatePresence>
                        {error && (
                          <ErrorMessage message={error} onClose={() => setError('')} />
                        )}
                      </AnimatePresence>
                      <div className="space-y-2">
                        <Label htmlFor="login-email" className="transition-colors duration-200 [&:has(+_div_input:focus)]:text-emerald-600 dark:[&:has(+_div_input:focus)]:text-emerald-400">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors duration-200 [&~input:focus_~&]:text-emerald-500" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            className="pl-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 focus-ring-emerald"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password" className="transition-colors duration-200 [&:has(+_div_input:focus)]:text-emerald-600 dark:[&:has(+_div_input:focus)]:text-emerald-400">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors duration-200" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="Enter your password"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            className="pl-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50 focus-ring-emerald"
                            required
                          />
                        </div>
                        {/* Forgot Password link */}
                        <div className="flex justify-end">
                          <button
                            type="button"
                            className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors duration-200 hover:underline underline-offset-2"
                            onClick={() => toast('Coming soon!', { description: 'Password reset will be available soon.' })}
                          >
                            Forgot password?
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="remember-me"
                          checked={rememberMe}
                          onCheckedChange={(checked) => setRememberMe(checked === true)}
                          className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                        />
                        <Label
                          htmlFor="remember-me"
                          className="text-sm text-muted-foreground cursor-pointer select-none"
                        >
                          Remember me
                        </Label>
                      </div>

                      {/* Social Login Divider */}
                      <SocialLoginDivider />

                      {/* Social Login Buttons */}
                      <SocialLoginButtons />
                    </CardContent>
                    <CardFooter>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 active:scale-[0.98] hover:brightness-110 transition-all duration-300 hover-lift-sm"
                        disabled={isLoading || isCheckingSession}
                      >
                        {(isLoading || isCheckingSession) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Signing in...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-0">
                  <form onSubmit={handleSignup}>
                    <CardHeader className="pb-4">
                      <CardTitle>Create an account</CardTitle>
                      <CardDescription>Get started with Zinter AI for free</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <AnimatePresence>
                        {error && (
                          <ErrorMessage message={error} onClose={() => setError('')} />
                        )}
                      </AnimatePresence>
                      <div className="space-y-2">
                        <Label htmlFor="signup-name" className="transition-colors duration-200 [&:has(+_div_input:focus)]:text-emerald-600 dark:[&:has(+_div_input:focus)]:text-emerald-400">Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors duration-200" />
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="Your name"
                            value={signupData.name}
                            onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                            className="pl-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email" className="transition-colors duration-200 [&:has(+_div_input:focus)]:text-emerald-600 dark:[&:has(+_div_input:focus)]:text-emerald-400">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors duration-200" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={signupData.email}
                            onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                            className="pl-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password" className="transition-colors duration-200 [&:has(+_div_input:focus)]:text-emerald-600 dark:[&:has(+_div_input:focus)]:text-emerald-400">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors duration-200" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="Min. 6 characters"
                            value={signupData.password}
                            onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                            className="pl-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                            required
                            minLength={6}
                          />
                        </div>
                        {/* Enhanced Password strength indicator */}
                        <AnimatePresence>
                          {signupData.password.length > 0 && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              className="space-y-1.5"
                            >
                              <div className="flex gap-1">
                                {[1, 2, 3, 4].map((level) => (
                                  <div
                                    key={level}
                                    className={cn(
                                      'h-1.5 flex-1 rounded-full transition-all duration-300',
                                      passwordStrength.score >= level
                                        ? cn(passwordStrength.color, 'shadow-sm', passwordStrength.glowColor)
                                        : 'bg-muted'
                                    )}
                                  />
                                ))}
                              </div>
                              <p className={cn(
                                'text-xs font-medium transition-colors duration-300',
                                passwordStrength.score <= 1 && 'text-red-500',
                                passwordStrength.score === 2 && 'text-orange-500',
                                passwordStrength.score === 3 && 'text-yellow-500',
                                passwordStrength.score >= 4 && 'text-emerald-500',
                              )}>
                                {passwordStrength.label}
                              </p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-confirm-password" className="transition-colors duration-200 [&:has(+_div_input:focus)]:text-emerald-600 dark:[&:has(+_div_input:focus)]:text-emerald-400">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground transition-colors duration-200" />
                          <Input
                            id="signup-confirm-password"
                            type="password"
                            placeholder="Repeat your password"
                            value={signupData.confirmPassword}
                            onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                            className="pl-10 focus-visible:ring-emerald-500/30 focus-visible:border-emerald-500/50"
                            required
                            minLength={6}
                          />
                        </div>
                      </div>

                      {/* Terms of Service Checkbox */}
                      <div className="flex items-start gap-2">
                        <Checkbox
                          id="terms"
                          checked={termsAccepted}
                          onCheckedChange={(checked) => setTermsAccepted(checked === true)}
                          className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500 mt-0.5"
                        />
                        <Label
                          htmlFor="terms"
                          className="text-xs text-muted-foreground cursor-pointer select-none leading-relaxed"
                        >
                          I agree to the{' '}
                          <button
                            type="button"
                            className="text-emerald-500 hover:text-emerald-400 transition-colors duration-200 hover:underline underline-offset-2"
                            onClick={(e) => {
                              e.preventDefault();
                              toast('Coming soon!', { description: 'Terms of Service will be available soon.' });
                            }}
                          >
                            Terms of Service
                          </button>
                          {' '}and{' '}
                          <button
                            type="button"
                            className="text-emerald-500 hover:text-emerald-400 transition-colors duration-200 hover:underline underline-offset-2"
                            onClick={(e) => {
                              e.preventDefault();
                              toast('Coming soon!', { description: 'Privacy Policy will be available soon.' });
                            }}
                          >
                            Privacy Policy
                          </button>
                        </Label>
                      </div>

                      {/* Social Login Divider */}
                      <SocialLoginDivider />

                      {/* Social Login Buttons */}
                      <SocialLoginButtons />
                    </CardContent>
                    <CardFooter>
                      <Button
                        type="submit"
                        className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-md shadow-emerald-500/25 hover:shadow-lg hover:shadow-emerald-500/35 active:scale-[0.98] hover:brightness-110 transition-all duration-300 hover-lift-sm"
                        disabled={isLoading || isCheckingSession}
                      >
                        {(isLoading || isCheckingSession) ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Creating account...
                          </>
                        ) : (
                          'Create Account'
                        )}
                      </Button>
                    </CardFooter>
                  </form>
                </TabsContent>
              </Tabs>
          </Card>
        </motion.div>

        {/* "Powered by AI" badge */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.4 }}
          className="flex justify-center mt-4 sm:mt-6"
        >
          <div className="badge-emerald flex items-center gap-1.5">
            <Zap className="w-3 h-3" />
            <span>Powered by AI</span>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="text-center text-xs text-muted-foreground/60 mt-3"
        >
          By continuing, you agree to our Terms of Service and Privacy Policy
        </motion.p>
      </motion.div>

      {/* Glow pulse keyframes for checking session */}
      <style jsx>{`
        @keyframes glow-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 4px rgba(16, 185, 129, 0.3));
          }
          50% {
            filter: drop-shadow(0 0 12px rgba(16, 185, 129, 0.7));
          }
        }
      `}</style>
    </div>
  );
}
