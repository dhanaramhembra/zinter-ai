'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import {
  UserCircle,
  Copy,
  Check,
  MessageSquare,
  Calendar,
  Hash,
  Loader2,
  Save,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth-store';
import { AVATAR_OPTIONS } from '@/lib/avatars';

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

  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [nameSaving, setNameSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Sync edit name when user changes
  useEffect(() => {
    if (user?.name) {
      setEditName(user.name);
    }
  }, [user?.name]);

  // Fetch stats when sheet opens
  useEffect(() => {
    if (open) {
      setStatsLoading(true);
      fetch('/api/chat/stats')
        .then((res) => {
          if (!res.ok) throw new Error('Stats fetch failed');
          return res.json();
        })
        .then((data) => {
          if (data.totalConversations !== undefined) {
            setStats(data);
          }
        })
        .catch(() => {
          // silently fail
        })
        .finally(() => setStatsLoading(false));
    }
  }, [open]);

  const copyToClipboard = useCallback((text: string, field: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopiedField(null), 2000);
    });
  }, []);

  const handleSaveName = useCallback(async () => {
    const trimmed = editName.trim();
    if (!trimmed) {
      toast.error('Name cannot be empty');
      return;
    }
    if (trimmed.length > 50) {
      toast.error('Name must be 50 characters or less');
      return;
    }
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
          useAuthStore.getState().updateUser({
            name: data.user.name,
            createdAt: data.user.createdAt,
            updatedAt: data.user.updatedAt,
          });
          toast.success('Name updated');
        }
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to update name');
      }
    } catch {
      toast.error('Failed to update name');
    } finally {
      setNameSaving(false);
    }
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
          useAuthStore.getState().updateUser({
            avatar: data.user.avatar,
            createdAt: data.user.createdAt,
            updatedAt: data.user.updatedAt,
          });
          toast.success('Avatar updated');
        }
      } else {
        toast.error('Failed to update avatar');
      }
    } catch {
      toast.error('Failed to update avatar');
    } finally {
      setAvatarSaving(false);
    }
  }, [user?.avatar]);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const shortenId = (id: string) => {
    return `${id.slice(0, 4)}...${id.slice(-4)}`;
  };

  const avatarGradient = user?.avatar
    ? AVATAR_OPTIONS.find((a) => a.id === user.avatar)?.gradient || 'bg-gradient-to-br from-emerald-500 to-teal-600'
    : 'bg-gradient-to-br from-emerald-500 to-teal-600';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <UserCircle className="w-4 h-4 text-white" />
            </div>
            Your Profile
          </SheetTitle>
          <SheetDescription>Manage your account settings</SheetDescription>
        </SheetHeader>

        {user && (
          <div className="space-y-6 mt-2">
            {/* Profile Card Section */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="flex flex-col items-center text-center p-5 rounded-xl bg-gradient-to-b from-emerald-500/5 to-transparent border border-emerald-500/10"
            >
              {/* Avatar with online status */}
              <div className="relative mb-3">
                <div className={cn(
                  'w-20 h-20 rounded-full text-white flex items-center justify-center text-3xl font-bold shadow-lg',
                  avatarGradient
                )}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {/* Online status dot */}
                <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-[3px] border-background" />
              </div>

              {/* Name */}
              <h3 className="font-semibold text-lg text-foreground">{user.name}</h3>

              {/* Email with copy */}
              <div className="flex items-center gap-1.5 mt-1">
                <p className="text-sm text-muted-foreground">{user.email}</p>
                <button
                  onClick={() => copyToClipboard(user.email, 'email')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Copy email"
                >
                  {copiedField === 'email' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Member since */}
              <p className="text-xs text-muted-foreground/70 mt-1.5">
                Member since {formatDate(user.createdAt)}
              </p>

              {/* Account ID with copy */}
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-[10px] text-muted-foreground/50 font-mono">
                  ID: {shortenId(user.id)}
                </span>
                <button
                  onClick={() => copyToClipboard(user.id, 'id')}
                  className="text-muted-foreground/50 hover:text-foreground transition-colors"
                  title="Copy account ID"
                >
                  {copiedField === 'id' ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </motion.div>

            {/* Stats Section */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              {statsLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-500" />
                </div>
              ) : stats ? (
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 rounded-xl bg-muted/40 border border-border/40">
                    <MessageSquare className="w-4 h-4 text-emerald-500 mb-1.5" />
                    <span className="text-lg font-bold text-foreground tabular-nums">
                      {stats.totalConversations}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">Chats</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-xl bg-muted/40 border border-border/40">
                    <Hash className="w-4 h-4 text-teal-500 mb-1.5" />
                    <span className="text-lg font-bold text-foreground tabular-nums">
                      {stats.totalMessages}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">Messages</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-xl bg-muted/40 border border-border/40">
                    <Calendar className="w-4 h-4 text-amber-500 mb-1.5" />
                    <span className="text-sm font-bold text-foreground">
                      {formatDate(user.createdAt) !== 'N/A'
                        ? new Date(user.createdAt!).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
                        : 'N/A'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-medium">Joined</span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-3 rounded-xl bg-muted/40 border border-border/40">
                    <MessageSquare className="w-4 h-4 text-emerald-500 mb-1.5" />
                    <span className="text-lg font-bold text-foreground tabular-nums">0</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Chats</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-xl bg-muted/40 border border-border/40">
                    <Hash className="w-4 h-4 text-teal-500 mb-1.5" />
                    <span className="text-lg font-bold text-foreground tabular-nums">0</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Messages</span>
                  </div>
                  <div className="flex flex-col items-center p-3 rounded-xl bg-muted/40 border border-border/40">
                    <Calendar className="w-4 h-4 text-amber-500 mb-1.5" />
                    <span className="text-sm font-bold text-foreground">N/A</span>
                    <span className="text-[10px] text-muted-foreground font-medium">Joined</span>
                  </div>
                </div>
              )}
            </motion.div>

            <Separator className="bg-border/40" />

            {/* Edit Name Section */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              className="space-y-3"
            >
              <label className="text-sm font-medium text-foreground flex items-center gap-2">
                Display Name
              </label>
              <div className="flex items-center gap-2">
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveName();
                  }}
                  placeholder="Enter your name"
                  maxLength={50}
                  className="flex-1"
                  disabled={nameSaving}
                />
                <Button
                  size="icon"
                  className="h-9 w-9 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleSaveName}
                  disabled={nameSaving || editName.trim() === user.name}
                  title="Save name"
                >
                  {nameSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {editName.length}/50 characters
              </p>
            </motion.div>

            <Separator className="bg-border/40" />

            {/* Avatar Picker Section */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="space-y-3"
            >
              <label className="text-sm font-medium text-foreground">Choose Avatar</label>
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
                      user.avatar === avatar.id
                        ? 'border-emerald-500 bg-emerald-500/10 shadow-sm shadow-emerald-500/10'
                        : 'border-transparent bg-muted/50 hover:bg-muted/80'
                    )}
                  >
                    {user.avatar === avatar.id && (
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
                    <div className={cn(
                      'w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-bold shadow-md',
                      avatar.gradient
                    )}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-medium leading-tight">{avatar.label}</span>
                  </motion.button>
                ))}
              </div>
              {avatarSaving && (
                <div className="flex items-center gap-2 justify-center">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-500" />
                  <span className="text-xs text-muted-foreground">Saving...</span>
                </div>
              )}
            </motion.div>

            <Separator className="bg-border/40" />

            {/* Account Section */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.25 }}
              className="text-center py-3 space-y-1"
            >
              <p className="text-xs font-medium text-muted-foreground">
                Zinter AI v1.0
              </p>
              <p className="text-[11px] text-muted-foreground/60">
                Built with ❤️ using AI
              </p>
            </motion.div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
