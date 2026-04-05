'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore, BACKGROUND_THEMES, ChatBackground } from '@/store/chat-store';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
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
import { AVATAR_OPTIONS } from '@/lib/avatars';
import {
  Sun,
  Moon,
  Monitor,
  Sparkles,
  User,
  Palette,
  MessageSquare,
  Info,
  Keyboard,
  Trash2,
  Loader2,
  Check,
  Type,
  BarChart3,
  Wallpaper,
  Clock,
  MessageCircle,
  Calendar,
  TrendingUp,
  BookOpen,
  Brain,
  FileDown,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

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
];

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { user, setUser } = useAuthStore();
  const { conversations, setConversations, clearAll, selectedBackground, setSelectedBackground, showTimestamps, setShowTimestamps, useCustomSystemPrompt, customSystemPrompt, setUseCustomSystemPrompt, setCustomSystemPrompt } = useChatStore();
  const { theme, setTheme } = useTheme();

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || 'emerald');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileUpdated, setProfileUpdated] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Font size
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  // Clear all
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Statistics
  const stats = useMemo(() => {
    const totalConversations = conversations.length;
    const totalMessages = conversations.reduce((acc, c) => acc + c.messages.length, 0);
    const totalWords = conversations.reduce((acc, c) => {
      return acc + c.messages.reduce((msgAcc, msg) => {
        return msgAcc + msg.content.split(/\s+/).filter(Boolean).length;
      }, 0);
    }, 0);
    const avgMessagesPerConv = totalConversations > 0 ? (totalMessages / totalConversations).toFixed(1) : '0';

    // Most active day - count messages by day of week
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
      if (count > maxCount) {
        maxCount = count;
        mostActiveDay = day;
      }
    }

    return {
      totalConversations,
      totalMessages,
      totalWords,
      avgMessagesPerConv,
      mostActiveDay,
    };
  }, [conversations]);

  // Sync name and avatar when user changes
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
    if (user?.avatar) {
      setSelectedAvatar(user.avatar);
    }
  }, [user?.name, user?.avatar]);

  // Load font size from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('nexusai-font-size') as FontSize | null;
      if (stored && ['small', 'medium', 'large'].includes(stored)) {
        setFontSize(stored);
      }
    } catch {
      // ignore
    }
  }, []);

  const handleAvatarSelect = useCallback((avatarId: string) => {
    setSelectedAvatar(avatarId);
    fetch('/api/auth/me', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ avatar: avatarId }),
    }).then((res) => {
      if (res.ok) return res.json();
    }).then((data) => {
      if (data?.user) setUser(data.user);
      toast.success('Avatar updated');
    }).catch(() => {
    toast.error('Failed to update avatar');
  });
  }, [setUser]);

  const handleUpdateProfile = useCallback(async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setProfileError('Name cannot be empty');
      return;
    }
    if (trimmedName.length > 50) {
      setProfileError('Name must be 50 characters or less');
      return;
    }

    setProfileError('');
    setIsUpdatingProfile(true);
    setProfileUpdated(false);

    try {
      const res = await fetch('/api/auth/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await res.json();

      if (res.ok && data.user) {
        setUser(data.user);
        setProfileUpdated(true);
        setTimeout(() => setProfileUpdated(false), 2000);
      } else {
        setProfileError(data.error || 'Failed to update profile');
      }
    } catch {
      setProfileError('Something went wrong');
    } finally {
      setIsUpdatingProfile(false);
    }
  }, [name, setUser]);

  const handleFontSizeChange = useCallback((size: FontSize) => {
    setFontSize(size);
    try {
      localStorage.setItem('nexusai-font-size', size);
    } catch {
      // ignore
    }
  }, []);

  const handleBackgroundChange = useCallback((bg: ChatBackground) => {
    setSelectedBackground(bg);
    try {
      localStorage.setItem('nexusai-chat-background', bg);
    } catch {
      // ignore
    }
  }, [setSelectedBackground]);

  const handleShowTimestampsChange = useCallback((checked: boolean) => {
    setShowTimestamps(checked);
    try {
      localStorage.setItem('nexusai-show-timestamps', String(checked));
    } catch {
      // ignore
    }
  }, [setShowTimestamps]);

  const handleClearAll = useCallback(async () => {
    setIsClearing(true);
    try {
      // Delete all conversations from the database
      await Promise.all(
        conversations.map((conv) =>
          fetch(`/api/chat/${conv.id}/messages`, { method: 'DELETE' })
        )
      );
      clearAll();
      setConversations([]);
      setShowClearDialog(false);
    } catch (error) {
      console.error('Failed to clear conversations:', error);
    } finally {
      setIsClearing(false);
    }
  }, [conversations, clearAll, setConversations]);

  const hasConversations = conversations.length > 0;

  // Export bookmarks: collect all favorited messages across all conversations
  const handleExportBookmarks = useCallback(() => {
    try {
      const favoritesJson = localStorage.getItem('nexusai-favorites');
      const favorites: string[] = favoritesJson ? JSON.parse(favoritesJson) : [];

      if (favorites.length === 0) {
        toast.error('No bookmarks to export');
        return;
      }

      // Collect bookmarked messages across all conversations
      const bookmarkedMessages: Array<{
        conversationTitle: string;
        content: string;
        date: string;
        role: string;
      }> = [];

      for (const conv of conversations) {
        for (const msg of conv.messages) {
          if (favorites.includes(msg.id)) {
            // Clean markdown for readability
            const cleaned = msg.content
              .replace(/```[\s\S]*?```/g, '[Code Block]')
              .replace(/`([^`]+)`/g, '$1')
              .replace(/^#{1,6}\s+/gm, '')
              .replace(/\*\*(.+?)\*\*/g, '$1')
              .replace(/\*(.+?)\*/g, '$1')
              .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[Image]')
              .replace(/\[([^\]]*)\]\([^)]+\)/g, '$1')
              .replace(/^[-*+]\s+/gm, '• ')
              .replace(/^\d+\.\s+/gm, '• ')
              .replace(/^>\s+/gm, '')
              .replace(/---+/g, '')
              .replace(/\n{3,}/g, '\n\n')
              .trim();

            bookmarkedMessages.push({
              conversationTitle: conv.title,
              content: cleaned,
              date: new Date(msg.createdAt).toLocaleString(),
              role: msg.role === 'assistant' ? 'Zinter AI' : 'You',
            });
          }
        }
      }

      if (bookmarkedMessages.length === 0) {
        toast.error('No bookmarks found in current conversations');
        return;
      }

      // Generate Markdown
      let markdown = '# Zinter AI Bookmarks\n\n';
      markdown += `*Exported on ${new Date().toLocaleString()} — ${bookmarkedMessages.length} bookmark${bookmarkedMessages.length !== 1 ? 's' : ''}*\n\n`;
      markdown += '---\n\n';

      let currentConv = '';
      for (const bm of bookmarkedMessages) {
        if (bm.conversationTitle !== currentConv) {
          currentConv = bm.conversationTitle;
          markdown += `## ${currentConv}\n\n`;
        }
        markdown += `**${bm.role}** — ${bm.date}\n\n`;
        markdown += `${bm.content}\n\n`;
        markdown += '---\n\n';
      }

      // Download
      const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nexusai-bookmarks.md';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success(`Exported ${bookmarkedMessages.length} bookmarks`);
    } catch (error) {
      console.error('Export bookmarks error:', error);
      toast.error('Failed to export bookmarks');
    }
  }, [conversations]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          {/* Gradient header background */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-emerald-500/8 via-teal-500/5 to-transparent pointer-events-none" />
          <SheetHeader className="p-6 pb-0 relative">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <div>
                <SheetTitle className="text-lg">Settings</SheetTitle>
                <SheetDescription className="text-xs">
                  Manage your account and preferences
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1 h-[calc(100vh-100px)] sidebar-scroll">
            <div className="p-6 space-y-6">
              {/* Profile Section */}
              <SettingsSection icon={User} title="Profile" description="Update your personal information">
                <div className="flex items-center gap-4 mb-4 p-3 rounded-xl bg-muted/30">
                  <div className="relative">
                    <div className={cn(
                      'w-14 h-14 rounded-full text-white flex items-center justify-center text-xl font-bold shadow-md transition-all duration-300',
                      (AVATAR_OPTIONS.find(a => a.id === selectedAvatar)?.gradient) || 'bg-gradient-to-br from-emerald-500 to-teal-600'
                    )}>
                      {selectedAvatar ? (AVATAR_OPTIONS.find(a => a.id === selectedAvatar)?.icon || user?.name?.charAt(0).toUpperCase() || 'U') : (user?.name?.charAt(0).toUpperCase() || 'U')}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 border-2 border-background flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
                  </div>
                </div>

                {/* Avatar Picker */}
                <div className="space-y-2 mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Avatar</p>
                  <div className="grid grid-cols-5 gap-2">
                    {AVATAR_OPTIONS.map((option) => (
                      <motion.button
                        key={option.id}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleAvatarSelect(option.id)}
                        className={cn(
                          'w-full aspect-square rounded-full flex items-center justify-center text-sm font-bold text-white shadow-sm transition-all duration-200',
                          option.gradient,
                          selectedAvatar === option.id
                            ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-background scale-105'
                            : 'opacity-70 hover:opacity-100'
                        )}
                      >
                        {option.icon}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-name" className="text-xs">
                      Display Name
                    </Label>
                    <Input
                      id="settings-name"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        setProfileError('');
                        setProfileUpdated(false);
                      }}
                      placeholder="Enter your name"
                      className="h-9 text-sm"
                      maxLength={50}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleUpdateProfile();
                      }}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Email
                    </Label>
                    <Input
                      value={user?.email || ''}
                      disabled
                      className="h-9 text-sm bg-muted/50 text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  {profileError && (
                    <p className="text-xs text-destructive">{profileError}</p>
                  )}

                  <Button
                    onClick={handleUpdateProfile}
                    disabled={isUpdatingProfile || name.trim() === user?.name}
                    className="w-full h-9 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-500/20 transition-all duration-200"
                  >
                    {isUpdatingProfile ? (
                      <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    ) : profileUpdated ? (
                      <Check className="w-3.5 h-3.5 mr-2" />
                    ) : null}
                    {isUpdatingProfile
                      ? 'Updating...'
                      : profileUpdated
                        ? 'Profile Updated!'
                        : 'Update Profile'}
                  </Button>
                </div>
              </SettingsSection>

              {/* Gradient divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

              {/* Appearance Section */}
              <SettingsSection icon={Palette} title="Appearance" description="Customize how Zinter AI looks">
                <div>
                  <Label className="text-xs text-muted-foreground mb-2.5 block">
                    Theme
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                      { value: 'system', label: 'System', icon: Monitor },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setTheme(value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200',
                          theme === value
                            ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                            : 'border-border hover:border-border/80 hover:bg-muted/50 text-muted-foreground'
                        )}
                        suppressHydrationWarning
                      >
                        <Icon
                          className={cn(
                            'w-4 h-4 transition-colors',
                            theme === value
                              ? 'text-emerald-500'
                              : 'text-muted-foreground/70'
                          )}
                        />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </SettingsSection>

              {/* Gradient divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

              {/* Chat Section */}
              <SettingsSection icon={MessageSquare} title="Chat" description="Chat preferences and data management">
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2.5 block">
                      Font Size
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(Object.keys(FONT_SIZE_MAP) as FontSize[]).map((size) => (
                        <button
                          key={size}
                          onClick={() => handleFontSizeChange(size)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 p-3 rounded-lg border-2 transition-all duration-200',
                            fontSize === size
                              ? 'border-emerald-500 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400'
                              : 'border-border hover:border-border/80 hover:bg-muted/50 text-muted-foreground'
                          )}
                        >
                          <Type className={cn(
                            'transition-colors',
                            FONT_SIZE_MAP[size].iconSize,
                            fontSize === size
                              ? 'text-emerald-500'
                              : 'text-muted-foreground/70'
                          )} />
                          <span className="text-xs font-medium">{FONT_SIZE_MAP[size].label}</span>
                        </button>
                      ))}
                    </div>
                    {/* Font size preview with sample chat bubble */}
                    <div className="mt-3 p-3 rounded-xl bg-muted/30 space-y-2">
                      <p className="text-[11px] text-muted-foreground/60 mb-2 font-medium">Preview</p>
                      <div className="flex flex-col gap-2">
                        <div className={cn('chat-bubble-user self-end px-3 py-2 max-w-[80%]', FONT_SIZE_MAP[fontSize].cssClass)}>
                          <p>Hello! How are you?</p>
                        </div>
                        <div className={cn('chat-bubble-assistant self-start px-3 py-2 max-w-[80%] shadow-sm', FONT_SIZE_MAP[fontSize].cssClass)}>
                          <p>I&apos;m doing great! How can I help you today?</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Chat Background */}
                  <div className="pt-2">
                    <Label className="text-xs text-muted-foreground mb-2.5 block">
                      Chat Background
                    </Label>
                    <div className="grid grid-cols-5 gap-2">
                      {BACKGROUND_THEMES.map((theme) => (
                        <button
                          key={theme.id}
                          onClick={() => handleBackgroundChange(theme.id)}
                          className={cn(
                            'flex flex-col items-center gap-1.5 transition-all duration-200 group',
                          selectedBackground === theme.id && 'scale-105'
                          )}
                        >
                          <div
                            className={cn(
                              'w-full aspect-square rounded-lg border-2 transition-all duration-200',
                              'hover:shadow-md',
                              selectedBackground === theme.id
                                ? 'border-emerald-500 shadow-md shadow-emerald-500/20'
                                : 'border-border hover:border-border/80',
                              theme.previewClass,
                              theme.id === 'default' && 'dot-grid',
                              theme.id === 'dots' && 'bg-dots-pattern',
                              theme.id === 'gradient' && 'bg-chat-gradient',
                              theme.id === 'minimal' && 'bg-minimal-chat',
                              theme.id === 'warm' && 'bg-warm-chat',
                            )}
                          >
                            {selectedBackground === theme.id && (
                              <div className="w-full h-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 drop-shadow-sm" />
                              </div>
                            )}
                          </div>
                          <span className={cn(
                            'text-[10px] font-medium leading-tight',
                            selectedBackground === theme.id
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-muted-foreground'
                          )}>
                            {theme.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Show Timestamps */}
                  <div className="pt-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <Label htmlFor="show-timestamps" className="text-sm cursor-pointer">
                          Show Timestamps
                        </Label>
                      </div>
                      <Switch
                        id="show-timestamps"
                        checked={showTimestamps}
                        onCheckedChange={handleShowTimestampsChange}
                      />
                    </div>
                    <p className="text-[11px] text-muted-foreground/60 mt-1 ml-[26px]">
                      Display exact time below each message
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full h-9 gap-2 text-destructive/80 hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30 transition-all duration-200',
                        !hasConversations && 'opacity-50 cursor-not-allowed'
                      )}
                      onClick={() => hasConversations && setShowClearDialog(true)}
                      disabled={!hasConversations}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Clear all conversations
                    </Button>
                    {hasConversations && (
                      <p className="text-[11px] text-muted-foreground/60 mt-1.5">
                        {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} will be permanently deleted
                      </p>
                    )}
                  </div>
                </div>
              </SettingsSection>

              {/* Gradient divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

              {/* Custom Persona Section */}
              <SettingsSection icon={Brain} title="Custom Persona" description="Override the AI's system prompt with your own">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Label htmlFor="use-custom-prompt" className="text-sm cursor-pointer">
                        Use Custom Prompt
                      </Label>
                    </div>
                    <Switch
                      id="use-custom-prompt"
                      checked={useCustomSystemPrompt}
                      onCheckedChange={(checked) => setUseCustomSystemPrompt(checked)}
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 ml-[26px]">
                    When enabled, your custom prompt will override the selected persona's system prompt
                  </p>
                  {useCustomSystemPrompt && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-2"
                    >
                      <div className="space-y-1.5">
                        <Label htmlFor="custom-system-prompt" className="text-xs text-muted-foreground">
                          System Prompt
                        </Label>
                        <Textarea
                          id="custom-system-prompt"
                          value={customSystemPrompt}
                          onChange={(e) => {
                            if (e.target.value.length <= 500) {
                              setCustomSystemPrompt(e.target.value);
                            }
                          }}
                          placeholder="Enter your custom system prompt..."
                          className="min-h-[100px] text-sm resize-none"
                          rows={4}
                          maxLength={500}
                        />
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] text-muted-foreground/50">
                            Define how the AI should behave and respond
                          </p>
                          <p className={cn(
                            'text-[11px]',
                            customSystemPrompt.length >= 450
                              ? 'text-amber-500'
                              : 'text-muted-foreground/40'
                          )}>
                            {customSystemPrompt.length}/500
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </SettingsSection>

              {/* Gradient divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

              {/* Data Management Section */}
              <SettingsSection icon={FileDown} title="Data Management" description="Export and manage your chat data">
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-9 gap-2 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-all duration-200"
                    onClick={handleExportBookmarks}
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    Export Bookmarks
                  </Button>
                  <p className="text-[11px] text-muted-foreground/60">
                    Download all your bookmarked messages as a Markdown file
                  </p>
                </div>
              </SettingsSection>

              {/* Gradient divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

              {/* Keyboard Shortcuts Section */}
              <SettingsSection icon={Keyboard} title="Keyboard Shortcuts" description="Quick actions to speed up your workflow">
                <div className="rounded-lg border border-border/60 overflow-hidden shadow-sm">
                  <table className="w-full text-sm">
                    <tbody>
                      {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                        <tr
                          key={index}
                          className={cn(
                            'border-b border-border/40 last:border-b-0 transition-colors duration-150 hover:bg-emerald-500/5',
                            index % 2 === 0 ? 'bg-muted/30' : ''
                          )}
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
                          <td className="px-3 py-2.5 text-xs text-muted-foreground text-right">
                            {shortcut.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SettingsSection>

              {/* Gradient divider */}
              <div className="h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />

              {/* About Section */}
              <SettingsSection icon={Info} title="About" description="Application information">
                <div className="rounded-lg border border-border/60 p-4 bg-muted/20 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Zinter AI</p>
                      <p className="text-xs text-muted-foreground">v2.0</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Built with Next.js, AI, and ❤️
                  </p>
                </div>
              </SettingsSection>

              {/* Version Info / Statistics Section */}
              <SettingsSection icon={BarChart3} title="Statistics" description="Your usage statistics and activity">
                <div className="grid grid-cols-2 gap-3">
                  <StatCard
                    icon={MessageCircle}
                    label="Conversations"
                    value={stats.totalConversations.toString()}
                    accent="emerald"
                  />
                  <StatCard
                    icon={MessageSquare}
                    label="Total Messages"
                    value={stats.totalMessages.toString()}
                    accent="teal"
                  />
                  <StatCard
                    icon={Calendar}
                    label="Most Active Day"
                    value={stats.mostActiveDay}
                    small
                    accent="emerald"
                  />
                  <StatCard
                    icon={TrendingUp}
                    label="Avg Messages / Conv"
                    value={stats.avgMessagesPerConv}
                    small
                    accent="teal"
                  />
                  <StatCard
                    icon={BookOpen}
                    label="Total Words Written"
                    value={stats.totalWords.toLocaleString()}
                    accent="emerald"
                    className="col-span-2"
                  />
                </div>
              </SettingsSection>

              {/* Bottom spacer */}
              <div className="h-4" />
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* Clear all conversations confirmation dialog */}
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
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Deleting...
                </>
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

function SettingsSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-slide-up">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/10 transition-all duration-200">
          <Icon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          <p className="text-[11px] text-muted-foreground leading-tight">{description}</p>
        </div>
      </div>
      {children}
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
  accent?: 'emerald' | 'teal';
  small?: boolean;
  className?: string;
}) {
  return (
    <div className={cn(
      'rounded-lg border border-border/60 p-3 bg-muted/20 shadow-sm',
      className
    )}>
      <div className="flex items-center gap-2 mb-1.5">
        <div className={cn(
          'flex items-center justify-center w-6 h-6 rounded-md',
          accent === 'emerald' ? 'bg-emerald-500/10' : 'bg-teal-500/10'
        )}>
          <Icon className={cn(
            'w-3.5 h-3.5',
            accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-teal-600 dark:text-teal-400'
          )} />
        </div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
      <p className={cn(
        'font-bold',
        small ? 'text-sm' : 'text-lg',
        accent === 'emerald' ? 'text-emerald-600 dark:text-emerald-400' : 'text-teal-600 dark:text-teal-400'
      )}>
        {value}
      </p>
    </div>
  );
}
