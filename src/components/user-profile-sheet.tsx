'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  UserCircle,
  Copy,
  Check,
  MessageSquare,
  Calendar,
  Hash,
  Loader2,
  Save,
  Sun,
  Moon,
  Monitor,
  Sparkles,
  Palette,
  Type,
  Wallpaper,
  Clock,
  Trash2,
  Brain,
  FileDown,
  Keyboard,
  Info,
  BarChart3,
  TrendingUp,
  BookOpen,
  Shield,
  Bell,
  Globe,
  Zap,
  Eye,
  EyeOff,
  Mail,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore, BACKGROUND_THEMES, ChatBackground } from '@/store/chat-store';
import { useTheme } from 'next-themes';
import { AVATAR_OPTIONS } from '@/lib/avatars';

type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_MAP: Record<FontSize, { label: string; cssClass: string; iconSize: string }> = {
  small: { label: 'Small', cssClass: 'text-xs', iconSize: 'w-3.5 h-3.5' },
  medium: { label: 'Medium', cssClass: 'text-sm', iconSize: 'w-4 h-4' },
  large: { label: 'Large', cssClass: 'text-base', iconSize: 'w-5 h-5' },
};

const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'N'], description: 'New chat' },
  { keys: ['Ctrl', 'F'], description: 'Search messages' },
  { keys: ['Enter'], description: 'Send message' },
  { keys: ['Shift', 'Enter'], description: 'New line' },
  { keys: ['Esc'], description: 'Close search/dialogs' },
  { keys: ['Ctrl', '/'], description: 'Keyboard shortcuts' },
];

interface UserProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface UserStats {
  totalConversations: number;
  totalMessages: number;
  avgMessagesPerConv: number;
  mostActiveDay: string;
}

export default function UserProfileSheet({ open, onOpenChange }: UserProfileSheetProps) {
  const user = useAuthStore((state) => state.user);
  const { conversations, setConversations, clearAll, selectedBackground, setSelectedBackground, showTimestamps, setShowTimestamps, useCustomSystemPrompt, customSystemPrompt, setUseCustomSystemPrompt, setCustomSystemPrompt } = useChatStore();
  const { theme, setTheme } = useTheme();

  // Profile state
  const [editName, setEditName] = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showEmail, setShowEmail] = useState(true);

  // Stats
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Font size
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  // Clear all
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState('profile');

  // Sync name when user changes
  useEffect(() => {
    if (user?.name) setEditName(user.name);
  }, [user?.name]);

  // Load font size from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nexusai-font-size') as FontSize | null;
      if (stored && ['small', 'medium', 'large'].includes(stored)) {
        setFontSize(stored);
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch stats when sheet opens
  useEffect(() => {
    if (open) {
      setStatsLoading(true);
      fetch('/api/chat/stats')
        .then((res) => { if (!res.ok) throw new Error(); return res.json(); })
        .then((data) => { if (data.totalConversations !== undefined) setStats(data); })
        .catch(() => { /* silent */ })
        .finally(() => setStatsLoading(false));
    }
  }, [open]);

  // Computed stats from store
  const localStats = useMemo(() => {
    const totalConversations = conversations.length;
    const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
    const totalWords = conversations.reduce((acc, c) =>
      acc + c.messages.reduce((msgAcc, msg) => msgAcc + msg.content.split(/\s+/).filter(Boolean).length, 0), 0);
    const avgMessagesPerConv = totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : '0';
    const dayCounts: Record<string, number> = {};
    for (const conv of conversations) {
      for (const msg of conv.messages) {
        const date = new Date(msg.createdAt);
        const dayKey = date.toLocaleDateString([], { weekday: 'long' });
        dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1;
      }
    }
    let mostActiveDay = 'N/A';
    let maxCount = 0;
    for (const [day, count] of Object.entries(dayCounts)) {
      if (count > maxCount) { maxCount = count; mostActiveDay = day; }
    }
    return { totalConversations, totalMessages, totalWords, avgMessagesPerConv, mostActiveDay };
  }, [conversations]);

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    });
  }, []);

  const handleSaveName = useCallback(async () => {
    const trimmed = editName.trim();
    if (!trimmed) { toast.error('Name cannot be empty'); return; }
    if (trimmed.length > 50) { toast.error('Name must be 50 characters or less'); return; }
    if (trimmed === user?.name) return;
    setNameSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          useAuthStore.getState().updateUser({ name: data.user.name, createdAt: data.user.createdAt, updatedAt: data.user.updatedAt });
          toast.success('Name updated');
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update name');
      }
    } catch { toast.error('Failed to update name'); }
    finally { setNameSaving(false); }
  }, [editName, user?.name]);

  const handleSaveAvatar = useCallback(async (avatarId: string) => {
    if (avatarId === user?.avatar) return;
    setAvatarSaving(true);
    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avatar: avatarId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          useAuthStore.getState().updateUser({ avatar: data.user.avatar, createdAt: data.user.createdAt, updatedAt: data.user.updatedAt });
          toast.success('Avatar updated');
        }
      } else { toast.error('Failed to update avatar'); }
    } catch { toast.error('Failed to update avatar'); }
    finally { setAvatarSaving(false); }
  }, [user?.avatar]);

  const handleFontSizeChange = useCallback((size: FontSize) => {
    setFontSize(size);
    try { localStorage.setItem('nexusai-font-size', size); } catch { /* ignore */ }
  }, []);

  const handleBackgroundChange = useCallback((bg: ChatBackground) => {
    setSelectedBackground(bg);
    try { localStorage.setItem('nexusai-chat-background', bg); } catch { /* ignore */ }
  }, [setSelectedBackground]);

  const handleShowTimestampsChange = useCallback((checked: boolean) => {
    setShowTimestamps(checked);
    try { localStorage.setItem('nexusai-show-timestamps', String(checked)); } catch { /* ignore */ }
  }, [setShowTimestamps]);

  const handleClearAll = useCallback(async () => {
    setIsClearing(true);
    try {
      await Promise.all(conversations.map((conv) => fetch(`/api/chat/${conv.id}/messages`, { method: 'DELETE' })));
      clearAll();
      setConversations([]);
      setShowClearDialog(false);
      toast.success('All conversations deleted');
    } catch (error) {
      console.error('Failed to clear conversations:', error);
      toast.error('Failed to delete some conversations');
    } finally { setIsClearing(false); }
  }, [conversations, clearAll, setConversations]);

  const handleExportBookmarks = useCallback(() => {
    try {
      const favoritesJson = localStorage.getItem('nexusai-favorites');
      const favorites: string[] = favoritesJson ? JSON.parse(favoritesJson) : [];
      if (favorites.length === 0) { toast.error('No bookmarks to export'); return; }
      const bookmarkedMessages: Array<{ conversationTitle: string; content: string; date: string; role: string }> = [];
      for (const conv of conversations) {
        for (const msg of conv.messages) {
          if (favorites.includes(msg.id)) {
            const cleaned = msg.content.replace(/```[\s\S]*?```/g, '[Code Block]').replace(/`([^`]+)`/g, '$1').replace(/^#{1,6}\s+/gm, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image]').replace(/\[([^\]]*)\]\([^)]+\)/g, '$1').replace(/^[-*+]\s+/gm, '• ').replace(/^\d+\.\s+/gm, '• ').replace(/^>\s+/gm, '').replace(/---+/g, '').replace(/\n{3,}/g, '\n\n').trim();
            bookmarkedMessages.push({ conversationTitle: conv.title, content: cleaned, date: new Date(msg.createdAt).toLocaleString(), role: msg.role === 'assistant' ? 'Zinter AI' : 'You' });
          }
        }
      }
      if (bookmarkedMessages.length === 0) { toast.error('No bookmarks found in current conversations'); return; }
      let markdown = '# Zinter AI Bookmarks\n\n';
      markdown += `*Exported on ${new Date().toLocaleString()} — ${bookmarkedMessages.length} bookmark${bookmarkedMessages.length !== 1 ? 's' : ''}*\n\n---\n\n`;
      let currentConv = '';
      for (const bm of bookmarkedMessages) {
        if (bm.conversationTitle !== currentConv) { currentConv = bm.conversationTitle; markdown += `## ${currentConv}\n\n`; }
        markdown += `**${bm.role}** — ${bm.date}\n\n${bm.content}\n\n---\n\n`;
      }
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'zinter-ai-bookmarks.md'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
      toast.success(`Exported ${bookmarkedMessages.length} bookmarks`);
    } catch (error) {
      console.error('Export bookmarks error:', error);
      toast.error('Failed to export bookmarks');
    }
  }, [conversations]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const shortenId = (id: string) => `${id.slice(0, 4)}...${id.slice(-4)}`;

  const avatarGradient = user?.avatar
    ? AVATAR_OPTIONS.find((a) => a.id === user.avatar)?.gradient || 'bg-gradient-to-br from-emerald-500 to-teal-600'
    : 'bg-gradient-to-br from-emerald-500 to-teal-600';

  const hasConversations = conversations.length > 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          {/* Gradient header background */}
          <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-transparent pointer-events-none" />
          <SheetHeader className="p-5 pb-0 relative">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <UserCircle className="w-5 h-5" />
              </div>
              <div>
                <SheetTitle className="text-lg">Profile & Settings</SheetTitle>
                <SheetDescription className="text-xs">Manage your account and preferences</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Profile Card (above tabs) */}
          {user && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="px-5 pt-3"
            >
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-muted/60 to-muted/30 border border-border/50 shadow-sm">
                {/* Avatar */}
                <div className="relative shrink-0">
                  <div className={cn('w-14 h-14 rounded-full text-white flex items-center justify-center text-xl font-bold shadow-lg', avatarGradient)}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-[2.5px] border-background" />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{user.name}</h3>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                    {showEmail ? (
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    ) : (
                      <p className="text-xs text-muted-foreground truncate">{'•'.repeat(user.email.length)}</p>
                    )}
                    <button
                      onClick={() => setShowEmail(!showEmail)}
                      className="text-muted-foreground/60 hover:text-foreground transition-colors shrink-0"
                      title={showEmail ? 'Hide email' : 'Show email'}
                    >
                      {showEmail ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">
                    Member since {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-3">
            <div className="px-5">
              <TabsList className="w-full h-10 bg-muted/60 p-1">
                <TabsTrigger value="profile" className="flex-1 gap-1.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <User className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Profile</span>
                </TabsTrigger>
                <TabsTrigger value="appearance" className="flex-1 gap-1.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Palette className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Look</span>
                </TabsTrigger>
                <TabsTrigger value="chat" className="flex-1 gap-1.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Chat</span>
                </TabsTrigger>
                <TabsTrigger value="about" className="flex-1 gap-1.5 text-xs font-medium data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Info className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">About</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="h-[calc(100vh-260px)] sidebar-scroll mt-2">
              {/* ==================== PROFILE TAB ==================== */}
              <TabsContent value="profile" className="m-0 p-5 space-y-5">
                {/* Stats Section */}
                <SectionWrapper icon={BarChart3} title="Your Stats" description="Activity at a glance" delay={0.05}>
                  {statsLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                      <MiniStatCard icon={MessageSquare} label="Chats" value={localStats.totalConversations.toString()} color="emerald" />
                      <MiniStatCard icon={Hash} label="Messages" value={localStats.totalMessages.toString()} color="teal" />
                      <MiniStatCard icon={Calendar} label="Joined" value={user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'N/A'} small color="amber" />
                    </div>
                  )}
                </SectionWrapper>

                <Divider />

                {/* Edit Display Name */}
                <SectionWrapper icon={User} title="Display Name" description="Change how others see you" delay={0.1}>
                  <div className="flex items-center gap-2">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
                      placeholder="Enter your name"
                      maxLength={50}
                      className="flex-1 h-9 text-sm"
                      disabled={nameSaving}
                    />
                    <Button
                      size="icon"
                      className="h-9 w-9 shrink-0 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm"
                      onClick={handleSaveName}
                      disabled={nameSaving || editName.trim() === user?.name}
                      title="Save name"
                    >
                      {nameSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </Button>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-1.5">{editName.length}/50 characters</p>
                </SectionWrapper>

                <Divider />

                {/* Avatar Picker */}
                <SectionWrapper icon={UserCircle} title="Choose Avatar" description="Pick your preferred avatar style" delay={0.15}>
                  <div className="grid grid-cols-5 gap-2">
                    {AVATAR_OPTIONS.map((avatar) => (
                      <motion.button
                        key={avatar.id}
                        type="button"
                        whileHover={{ scale: 1.08 }}
                        whileTap={{ scale: 0.92 }}
                        disabled={avatarSaving}
                        onClick={() => handleSaveAvatar(avatar.id)}
                        className={cn(
                          'relative flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all duration-200 cursor-pointer',
                          'hover:border-foreground/20',
                          user?.avatar === avatar.id
                            ? 'border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/10'
                            : 'border-transparent bg-muted/50 hover:bg-muted/80'
                        )}
                      >
                        {user?.avatar === avatar.id && (
                          <motion.div
                            layoutId="profile-avatar-check"
                            className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                          >
                            <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                          </motion.div>
                        )}
                        <div className={cn('w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-md', avatar.gradient)}>
                          {user?.name.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <span className="text-[10px] text-muted-foreground font-medium leading-tight">{avatar.label}</span>
                      </motion.button>
                    ))}
                  </div>
                  {avatarSaving && (
                    <div className="flex items-center gap-2 justify-center mt-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                      <span className="text-xs text-muted-foreground">Saving...</span>
                    </div>
                  )}
                </SectionWrapper>

                <Divider />

                {/* Account Information */}
                <SectionWrapper icon={Shield} title="Account Information" description="Your account details" delay={0.2}>
                  <div className="space-y-2.5">
                    <InfoRow
                      label="Email"
                      value={user?.email || ''}
                      copyValue={user?.email || ''}
                      copiedField={copiedField}
                      onCopy={copyToClipboard}
                      icon={Mail}
                    />
                    <InfoRow
                      label="Account ID"
                      value={shortenId(user?.id || '')}
                      copyValue={user?.id || ''}
                      copiedField={copiedField}
                      onCopy={copyToClipboard}
                      icon={Hash}
                      mono
                    />
                    <InfoRow
                      label="Member Since"
                      value={formatDate(user?.createdAt)}
                      icon={Calendar}
                    />
                    <InfoRow
                      label="Last Updated"
                      value={formatDate(user?.updatedAt)}
                      icon={Clock}
                    />
                  </div>
                </SectionWrapper>

                <div className="h-4" />
              </TabsContent>

              {/* ==================== APPEARANCE TAB ==================== */}
              <TabsContent value="appearance" className="m-0 p-5 space-y-5">
                {/* Theme */}
                <SectionWrapper icon={Sun} title="Theme" description="Choose your preferred color scheme" delay={0.05}>
                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { value: 'light', label: 'Light', icon: Sun, desc: 'Clean & bright' },
                      { value: 'dark', label: 'Dark', icon: Moon, desc: 'Easy on eyes' },
                      { value: 'system', label: 'System', icon: Monitor, desc: 'Auto detect' },
                    ].map(({ value, label, icon: Icon, desc }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3.5 rounded-xl border-2 transition-all duration-200',
                          theme === value
                            ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10'
                            : 'border-border hover:border-border/80 hover:bg-muted/50 text-muted-foreground'
                        )}
                        suppressHydrationWarning
                      >
                        <Icon className={cn('w-5 h-5 transition-colors', theme === value ? 'text-emerald-500' : 'text-muted-foreground/70')} />
                        <span className="text-xs font-semibold">{label}</span>
                        <span className="text-[10px] text-muted-foreground/60">{desc}</span>
                      </button>
                    ))}
                  </div>
                </SectionWrapper>

                <Divider />

                {/* Font Size */}
                <SectionWrapper icon={Type} title="Font Size" description="Adjust text size in chat messages" delay={0.1}>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(Object.keys(FONT_SIZE_MAP) as FontSize[]).map((size) => (
                      <button
                        key={size}
                        onClick={() => handleFontSizeChange(size)}
                        className={cn(
                          'flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all duration-200',
                          fontSize === size
                            ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 shadow-sm shadow-emerald-500/10'
                            : 'border-border hover:border-border/80 hover:bg-muted/50 text-muted-foreground'
                        )}
                      >
                        <Type className={cn('transition-colors', FONT_SIZE_MAP[size].iconSize, fontSize === size ? 'text-emerald-500' : 'text-muted-foreground/70')} />
                        <span className="text-xs font-semibold">{FONT_SIZE_MAP[size].label}</span>
                      </button>
                    ))}
                  </div>
                  {/* Preview */}
                  <div className="mt-3 p-3 rounded-xl bg-muted/30 space-y-2">
                    <p className="text-[10px] text-muted-foreground/50 mb-2 font-medium uppercase tracking-wider">Preview</p>
                    <div className="flex flex-col gap-2">
                      <div className={cn('chat-bubble-user self-end px-3 py-2 max-w-[80%] rounded-xl', FONT_SIZE_MAP[fontSize].cssClass)}>
                        <p>Hello! How are you?</p>
                      </div>
                      <div className={cn('chat-bubble-assistant self-start px-3 py-2 max-w-[80%] rounded-xl shadow-sm', FONT_SIZE_MAP[fontSize].cssClass)}>
                        <p>I&apos;m doing great! How can I help you today?</p>
                      </div>
                    </div>
                  </div>
                </SectionWrapper>

                <Divider />

                {/* Chat Background */}
                <SectionWrapper icon={Wallpaper} title="Chat Background" description="Personalize your chat wallpaper" delay={0.15}>
                  <div className="grid grid-cols-5 gap-2">
                    {BACKGROUND_THEMES.map((bgTheme) => (
                      <button
                        key={bgTheme.id}
                        onClick={() => handleBackgroundChange(bgTheme.id)}
                        className={cn('flex flex-col items-center gap-1.5 transition-all duration-200 group', selectedBackground === bgTheme.id && 'scale-105')}
                      >
                        <div className={cn(
                          'w-full aspect-square rounded-lg border-2 transition-all duration-200 hover:shadow-md',
                          selectedBackground === bgTheme.id
                            ? 'border-emerald-500 shadow-md shadow-emerald-500/20'
                            : 'border-border hover:border-border/80',
                          bgTheme.previewClass,
                          bgTheme.id === 'default' && 'dot-grid',
                          bgTheme.id === 'dots' && 'bg-dots-pattern',
                          bgTheme.id === 'gradient' && 'bg-chat-gradient',
                          bgTheme.id === 'minimal' && 'bg-minimal-chat',
                          bgTheme.id === 'warm' && 'bg-warm-chat',
                        )}>
                          {selectedBackground === bgTheme.id && (
                            <div className="w-full h-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
                            </div>
                          )}
                        </div>
                        <span className={cn('text-[10px] font-medium leading-tight', selectedBackground === bgTheme.id ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground')}>
                          {bgTheme.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </SectionWrapper>

                <Divider />

                {/* Show Timestamps */}
                <SectionWrapper icon={Clock} title="Timestamps" description="Control message time display" delay={0.2}>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Show Timestamps</p>
                        <p className="text-[11px] text-muted-foreground/60">Display exact time below each message</p>
                      </div>
                    </div>
                    <Switch checked={showTimestamps} onCheckedChange={handleShowTimestampsChange} />
                  </div>
                </SectionWrapper>

                <div className="h-4" />
              </TabsContent>

              {/* ==================== CHAT TAB ==================== */}
              <TabsContent value="chat" className="m-0 p-5 space-y-5">
                {/* Custom Persona */}
                <SectionWrapper icon={Brain} title="Custom Persona" description="Override the AI's system prompt" delay={0.05}>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 rounded-xl bg-muted/30">
                      <div>
                        <p className="text-sm font-medium">Use Custom Prompt</p>
                        <p className="text-[11px] text-muted-foreground/60">Override the selected persona's system prompt</p>
                      </div>
                      <Switch checked={useCustomSystemPrompt} onCheckedChange={(checked) => setUseCustomSystemPrompt(checked)} />
                    </div>
                    <AnimatePresence>
                      {useCustomSystemPrompt && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-2"
                        >
                          <Textarea
                            value={customSystemPrompt}
                            onChange={(e) => { if (e.target.value.length <= 500) setCustomSystemPrompt(e.target.value); }}
                            placeholder="Enter your custom system prompt..."
                            className="min-h-[100px] text-sm resize-none"
                            rows={4}
                            maxLength={500}
                          />
                          <div className="flex items-center justify-between">
                            <p className="text-[11px] text-muted-foreground/50">Define how the AI should behave</p>
                            <p className={cn('text-[11px]', customSystemPrompt.length >= 450 ? 'text-amber-500' : 'text-muted-foreground/40')}>
                              {customSystemPrompt.length}/500
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </SectionWrapper>

                <Divider />

                {/* Data Management */}
                <SectionWrapper icon={FileDown} title="Data Management" description="Export and manage your chat data" delay={0.1}>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full h-9 gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200"
                      onClick={handleExportBookmarks}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Export Bookmarks
                    </Button>
                    <p className="text-[11px] text-muted-foreground/60">Download all bookmarked messages as Markdown</p>
                  </div>
                </SectionWrapper>

                <Divider />

                {/* Keyboard Shortcuts */}
                <SectionWrapper icon={Keyboard} title="Keyboard Shortcuts" description="Speed up your workflow" delay={0.15}>
                  <div className="rounded-xl border border-border/60 overflow-hidden shadow-sm">
                    <table className="w-full text-sm">
                      <tbody>
                        {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                          <tr
                            key={index}
                            className={cn('border-b border-border/40 last:border-b-0 transition-colors duration-150 hover:bg-emerald-500/5', index % 2 === 0 && 'bg-muted/30')}
                          >
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-1">
                                {shortcut.keys.map((key, keyIndex) => (
                                  <span key={keyIndex} className="flex items-center gap-1">
                                    <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded bg-background border border-border text-[11px] font-mono font-medium text-foreground shadow-[0_1px_2px_oklch(0_0_0/8%)]">
                                      {key}
                                    </kbd>
                                    {keyIndex < shortcut.keys.length - 1 && (
                                      <span className="text-muted-foreground/50 text-[10px]">+</span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-xs text-muted-foreground text-right">{shortcut.description}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </SectionWrapper>

                <Divider />

                {/* Clear All Conversations */}
                <SectionWrapper icon={Trash2} title="Danger Zone" description="Permanently delete your chat history" delay={0.2}>
                  <Button
                    variant="outline"
                    className={cn('w-full h-9 gap-2 text-destructive/80 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all duration-200', !hasConversations && 'opacity-50 cursor-not-allowed')}
                    onClick={() => hasConversations && setShowClearDialog(true)}
                    disabled={!hasConversations}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Conversations
                  </Button>
                  {hasConversations && (
                    <p className="text-[11px] text-destructive/60 mt-1.5">
                      {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} will be permanently deleted
                    </p>
                  )}
                </SectionWrapper>

                <div className="h-4" />
              </TabsContent>

              {/* ==================== ABOUT TAB ==================== */}
              <TabsContent value="about" className="m-0 p-5 space-y-5">
                {/* About the App */}
                <SectionWrapper icon={Sparkles} title="Zinter AI" description="Your AI-powered assistant" delay={0.05}>
                  <div className="rounded-xl border border-border/60 p-5 bg-gradient-to-b from-emerald-500/5 to-transparent shadow-sm">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-bold text-base">Zinter AI</p>
                        <p className="text-xs text-muted-foreground">v2.0 — AI Chat Platform</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                      A comprehensive AI chat platform with real-time conversations, image generation, voice support, and a beautiful responsive UI.
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {['Next.js', 'AI', 'SQLite', 'TypeScript'].map((tag) => (
                        <span key={tag} className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          {tag}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-3">
                      Built with Next.js, AI, and ❤️
                    </p>
                  </div>
                </SectionWrapper>

                <Divider />

                {/* Detailed Statistics */}
                <SectionWrapper icon={BarChart3} title="Detailed Statistics" description="Your complete usage breakdown" delay={0.1}>
                  <div className="grid grid-cols-2 gap-2.5">
                    <StatCard icon={MessageSquare} label="Conversations" value={localStats.totalConversations.toString()} accent="emerald" />
                    <StatCard icon={MessageSquare} label="Total Messages" value={localStats.totalMessages.toString()} accent="teal" />
                    <StatCard icon={Calendar} label="Most Active Day" value={localStats.mostActiveDay} small accent="amber" />
                    <StatCard icon={TrendingUp} label="Avg Msgs / Conv" value={localStats.avgMessagesPerConv} small accent="emerald" />
                    <StatCard icon={BookOpen} label="Total Words Written" value={localStats.totalWords.toLocaleString()} accent="teal" className="col-span-2" />
                  </div>
                </SectionWrapper>

                <Divider />

                {/* Quick Info */}
                <SectionWrapper icon={Globe} title="Quick Info" description="Helpful tips and features" delay={0.15}>
                  <div className="space-y-2.5">
                    <QuickInfoItem icon={Zap} title="Smart Auto-Titles" desc="Conversations are auto-titled by AI" />
                    <QuickInfoItem icon={Bell} title="Streaming Responses" desc="AI replies appear in real-time" />
                    <QuickInfoItem icon={Brain} title="Multiple Personas" desc="Pro, Creative, Code Expert, Friendly" />
                    <QuickInfoItem icon={FileDown} title="Export Bookmarks" desc="Save your favorite messages" />
                  </div>
                </SectionWrapper>

                <div className="h-4" />
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Clear all conversations dialog */}
      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Conversations</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all {conversations.length} conversation{conversations.length !== 1 ? 's' : ''}?
              This action cannot be undone. All messages and chat history will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearAll}
              disabled={isClearing}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {isClearing ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Deleting...</>
              ) : (
                'Delete All'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ==================== Sub-components ==================== */

function SectionWrapper({
  icon: Icon,
  title,
  description,
  delay = 0,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  delay?: number;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay }}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/10">
          <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[11px] text-muted-foreground leading-tight">{description}</p>
        </div>
      </div>
      {children}
    </motion.div>
  );
}

function MiniStatCard({
  icon: Icon,
  label,
  value,
  small,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  small?: boolean;
  color: 'emerald' | 'teal' | 'amber';
}) {
  const colorClasses = {
    emerald: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
    teal: 'text-teal-600 dark:text-teal-400 bg-teal-500/10',
    amber: 'text-amber-600 dark:text-amber-400 bg-amber-500/10',
  };
  return (
    <div className="flex flex-col items-center p-3 rounded-xl bg-muted/40 border border-border/40">
      <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-1.5', colorClasses[color])}>
        <Icon className="w-3.5 h-3.5" />
      </div>
      <span className={cn('font-bold text-foreground tabular-nums', small ? 'text-xs' : 'text-lg')}>{value}</span>
      <span className="text-[10px] text-muted-foreground font-medium">{label}</span>
    </div>
  );
}

function InfoRow({
  label,
  value,
  copyValue,
  copiedField,
  onCopy,
  icon: Icon,
  mono,
}: {
  label: string;
  value: string;
  copyValue?: string;
  copiedField?: string | null;
  onCopy?: (text: string, field: string) => void;
  icon: React.ComponentType<{ className?: string }>;
  mono?: boolean;
}) {
  const fieldName = label.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30">
      <div className="flex items-center gap-2.5 min-w-0">
        <Icon className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wider">{label}</p>
          <p className={cn('text-xs text-foreground truncate', mono && 'font-mono')}>{value || 'N/A'}</p>
        </div>
      </div>
      {copyValue && onCopy && (
        <button
          onClick={() => onCopy(copyValue, fieldName)}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0 ml-2"
          title={`Copy ${label.toLowerCase()}`}
        >
          {copiedField === fieldName ? (
            <Check className="w-3.5 h-3.5 text-emerald-500" />
          ) : (
            <Copy className="w-3.5 h-3.5" />
          )}
        </button>
      )}
    </div>
  );
}

function QuickInfoItem({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors duration-150">
      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
        <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div>
        <p className="text-xs font-semibold">{title}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'emerald',
  small,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent?: 'emerald' | 'teal' | 'amber';
  small?: boolean;
  className?: string;
}) {
  const accentClasses = {
    emerald: { icon: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10', value: 'text-emerald-600 dark:text-emerald-400' },
    teal: { icon: 'text-teal-600 dark:text-teal-400 bg-teal-500/10', value: 'text-teal-600 dark:text-teal-400' },
    amber: { icon: 'text-amber-600 dark:text-amber-400 bg-amber-500/10', value: 'text-amber-600 dark:text-amber-400' },
  };
  return (
    <div className={cn('rounded-xl border border-border/60 p-3.5 bg-muted/20 shadow-sm', className)}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn('flex items-center justify-center w-6 h-6 rounded-md', accentClasses[accent].icon)}>
          <Icon className="w-3.5 h-3.5" />
        </div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
      <p className={cn('font-bold', small ? 'text-sm' : 'text-lg', accentClasses[accent].value)}>{value}</p>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />;
}
