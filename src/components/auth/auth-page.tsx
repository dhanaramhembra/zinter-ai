'use client';

import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { useAuthStore } from '@/store/auth-store';
import { Loader2, Mail, Lock, User, Sparkles, Moon, Sun, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

function getPasswordStrength(password: string): { label: string; score: number; color: string } {
  if (!password) return { label: '', score: 0, color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: 'Weak', score: 1, color: 'bg-red-500' };
  if (score <= 2) return { label: 'Fair', score: 2, color: 'bg-orange-500' };
  if (score <= 3) return { label: 'Good', score: 3, color: 'bg-yellow-500' };
  return { label: 'Strong', score: 4, color: 'bg-emerald-500' };
}

function FloatingDots() {
  const dots = useMemo(() => {
    const items = [];
    for (let i = 0; i < 20; i++) {
      const size = Math.random() * 6 + 2;
      const left = Math.random() * 100;
      const delay = Math.random() * 15;
      const duration = Math.random() * 20 + 15;
      const opacity = Math.random() * 0.15 + 0.05;
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
          }}
        />
      );
    }
    return items;
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">
      <style jsx>{`
        @keyframes float-up {
          0% {
            transform: translateY(0) translateX(0);
            opacity: 0;
          }
          5% {
            opacity: var(--dot-opacity, 0.1);
          }
          95% {
            opacity: var(--dot-opacity, 0.1);
          }
          100% {
            transform: translateY(-100vh) translateX(30px);
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

export default function AuthPage() {
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [signupData, setSignupData] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [rememberMe, setRememberMe] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
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

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

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

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Signup failed');
        return;
      }

      setUser(data.user);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-background to-muted/50 relative overflow-hidden">
      {/* Animated floating dots */}
      <FloatingDots />

      {/* Background decorative elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-teal-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/3 rounded-full blur-3xl" />
      </div>

      {/* Theme toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="fixed top-4 right-4 z-50 rounded-full"
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: isCheckingSession ? 0 : 1, y: isCheckingSession ? 20 : 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className={cn(
              'inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary text-primary-foreground mb-4 shadow-lg',
              isCheckingSession && 'animate-pulse'
            )}
            style={isCheckingSession ? { boxShadow: '0 0 30px rgba(16, 185, 129, 0.4)' } : undefined}
          >
            <Sparkles
              className="w-8 h-8"
              style={isCheckingSession ? {
                filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.6))',
                animation: 'glow-pulse 2s ease-in-out infinite',
              } : undefined}
            />
          </motion.div>
          <h1 className="text-3xl font-bold tracking-tight">NexusAI</h1>
          <p className="text-muted-foreground mt-2">
            Chat with AI, generate images, and more
          </p>
        </div>

        {/* Card with gradient border */}
        <div className="relative rounded-xl p-[1px] bg-gradient-to-br from-emerald-500/30 via-teal-500/20 to-emerald-500/10 shadow-2xl shadow-emerald-500/5">
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-xl rounded-[11px]">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'login' | 'signup'); setError(''); }} className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-none border-b bg-transparent p-0 h-auto relative">
                {/* Sliding indicator */}
                <motion.div
                  className="absolute bottom-0 h-0.5 bg-primary rounded-full"
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

              <AnimatePresence mode="wait">
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
                        <Label htmlFor="login-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-email"
                            type="email"
                            placeholder="you@example.com"
                            value={loginData.email}
                            onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="login-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="login-password"
                            type="password"
                            placeholder="Enter your password"
                            value={loginData.password}
                            onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                            className="pl-10"
                            required
                          />
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
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
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
                      <CardDescription>Get started with NexusAI for free</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <AnimatePresence>
                        {error && (
                          <ErrorMessage message={error} onClose={() => setError('')} />
                        )}
                      </AnimatePresence>
                      <div className="space-y-2">
                        <Label htmlFor="signup-name">Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-name"
                            type="text"
                            placeholder="Your name"
                            value={signupData.name}
                            onChange={(e) => setSignupData({ ...signupData, name: e.target.value })}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-email"
                            type="email"
                            placeholder="you@example.com"
                            value={signupData.email}
                            onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                            className="pl-10"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-password"
                            type="password"
                            placeholder="Min. 6 characters"
                            value={signupData.password}
                            onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                            className="pl-10"
                            required
                            minLength={6}
                          />
                        </div>
                        {/* Password strength indicator */}
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
                                        ? passwordStrength.color
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
                        <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="signup-confirm-password"
                            type="password"
                            placeholder="Repeat your password"
                            value={signupData.confirmPassword}
                            onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                            className="pl-10"
                            required
                            minLength={6}
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? (
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
              </AnimatePresence>
            </Tabs>
          </Card>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
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
