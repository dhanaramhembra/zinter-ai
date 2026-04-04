'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useChatStore } from '@/store/chat-store';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

type FontSize = 'small' | 'medium' | 'large';

const FONT_SIZE_MAP: Record<FontSize, { label: string; cssClass: string; iconSize: string }> = {
  small: { label: 'Small', cssClass: 'text-xs', iconSize: 'w-3.5 h-3.5' },
  medium: { label: 'Medium', cssClass: 'text-sm', iconSize: 'w-4 h-4' },
  large: { label: 'Large', cssClass: 'text-base', iconSize: 'w-5 h-5' },
};

const KEYBOARD_SHORTCUTS = [
  { keys: ['Ctrl', 'N'], description: 'New chat' },
  { keys: ['Enter'], description: 'Send message' },
  { keys: ['Shift', 'Enter'], description: 'New line' },
];

interface SettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SettingsSheet({ open, onOpenChange }: SettingsSheetProps) {
  const { user, setUser } = useAuthStore();
  const { conversations, setConversations, clearAll } = useChatStore();
  const { theme, setTheme } = useTheme();

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileUpdated, setProfileUpdated] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Font size
  const [fontSize, setFontSize] = useState<FontSize>('medium');

  // Clear all
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Sync name when user changes
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    }
  }, [user?.name]);

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

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0">
          <SheetHeader className="p-6 pb-0">
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

          <ScrollArea className="flex-1 h-[calc(100vh-100px)]">
            <div className="p-6 space-y-6">
              {/* Profile Section */}
              <SettingsSection icon={User} title="Profile" description="Update your personal information">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl font-bold shadow-md shadow-emerald-500/20">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{user?.name || 'User'}</p>
                    <p className="text-xs text-muted-foreground">{user?.email || ''}</p>
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

              <Separator />

              {/* Appearance Section */}
              <SettingsSection icon={Palette} title="Appearance" description="Customize how NexusAI looks">
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

              <Separator />

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
                    <p className="text-[11px] text-muted-foreground/60 mt-2">
                      Preview: <span className={cn(FONT_SIZE_MAP[fontSize].cssClass)}>This is how messages will look</span>
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

              <Separator />

              {/* Keyboard Shortcuts Section */}
              <SettingsSection icon={Keyboard} title="Keyboard Shortcuts" description="Quick actions to speed up your workflow">
                <div className="rounded-lg border border-border overflow-hidden">
                  <table className="w-full text-sm">
                    <tbody>
                      {KEYBOARD_SHORTCUTS.map((shortcut, index) => (
                        <tr
                          key={index}
                          className={cn(
                            'border-b border-border last:border-b-0',
                            index % 2 === 0 ? 'bg-muted/20' : ''
                          )}
                        >
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              {shortcut.keys.map((key, keyIndex) => (
                                <span key={keyIndex} className="flex items-center gap-1">
                                  <kbd className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded bg-muted border border-border text-[11px] font-mono font-medium text-foreground">
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

              <Separator />

              {/* About Section */}
              <SettingsSection icon={Info} title="About" description="Application information">
                <div className="rounded-lg border border-border p-4 bg-muted/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">NexusAI</p>
                      <p className="text-xs text-muted-foreground">v2.0</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Built with Next.js, AI, and ❤️
                  </p>
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
    <div>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-muted/80">
          <Icon className="w-3.5 h-3.5 text-muted-foreground" />
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
