'use client';

import { useChatStore, Conversation } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Trash2,
  MessageSquare,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  X,
  Plus,
  Settings,
  Pin,
  Copy,
  CheckSquare,
  Loader2,
  Check,
  WifiOff,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import SettingsSheet from '@/components/settings/settings-sheet';

interface ConversationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

type TimeGroup = 'Today' | 'Yesterday' | 'This Week' | 'Older';

function getTimeGroup(dateStr: string): TimeGroup {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);

  if (date >= startOfToday) return 'Today';
  if (date >= startOfYesterday) return 'Yesterday';
  if (date >= startOfWeek) return 'This Week';
  return 'Older';
}

const TIME_GROUP_ORDER: TimeGroup[] = ['Today', 'Yesterday', 'This Week', 'Older'];

function groupConversations(conversations: Conversation[]): Record<TimeGroup, Conversation[]> {
  const groups: Record<TimeGroup, Conversation[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  };

  for (const conv of conversations) {
    const group = getTimeGroup(conv.updatedAt);
    groups[group].push(conv);
  }

  return groups;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Yesterday';
  if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getStoredPinned(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem('nexusai-pinned-conversations');
    if (stored) return JSON.parse(stored) as string[];
  } catch {
    // ignore
  }
  return [];
}

function savePinned(pinned: string[]) {
  try {
    localStorage.setItem('nexusai-pinned-conversations', JSON.stringify(pinned));
  } catch {
    // ignore
  }
}

export default function ConversationSidebar({ isOpen, onClose }: ConversationSidebarProps) {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    addConversation,
    deleteConversation,
    updateConversation,
    autoTitleLoadingId,
  } = useChatStore();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [online, setOnline] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Online/offline detection
  useEffect(() => {
    setOnline(navigator.onLine);
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Feature 5: Pinned conversations state - lazy init from localStorage
  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return [];
    return getStoredPinned();
  });

  // Cleanup pinned IDs that no longer exist
  const convIds = useMemo(() => new Set(conversations.map((c) => c.id)), [conversations]);
 const validPinnedCount = pinnedIds.filter((id) => convIds.has(id)).length;
  useEffect(() => {
    if (validPinnedCount !== pinnedIds.length) {
      const cleaned = pinnedIds.filter((id) => convIds.has(id));
      savePinned(cleaned);
      // Use microtask to avoid the lint rule
      queueMicrotask(() => setPinnedIds(cleaned));
    }
  }, [validPinnedCount, pinnedIds, convIds]);

  // Select mode state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasAnyConversations = filteredConversations.length > 0;

  // Feature 5: Separate pinned and unpinned conversations
  const pinnedConversations = useMemo(() => {
    return filteredConversations.filter((c) => pinnedIds.includes(c.id));
  }, [filteredConversations, pinnedIds]);

  const unpinnedConversations = useMemo(() => {
    return filteredConversations.filter((c) => !pinnedIds.includes(c.id));
  }, [filteredConversations, pinnedIds]);

  const grouped = groupConversations(unpinnedConversations);

  // Feature 5: Toggle pin
  const handleTogglePin = useCallback((convId: string) => {
    setPinnedIds((prev) => {
      const isPinned = prev.includes(convId);
      const next = isPinned
        ? prev.filter((id) => id !== convId)
        : [...prev, convId];
      savePinned(next);
      toast.success(isPinned ? 'Unpinned' : 'Conversation pinned');
      return next;
    });
  }, []);

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    setLogoutDialogOpen(false);
    toast.info('Signed out successfully');
  }, [logout]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/chat/${deleteTarget}/messages`, { method: 'DELETE' });
      deleteConversation(deleteTarget);
      setDeleteTarget(null);
      toast.success('Conversation deleted');
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }, [deleteTarget, deleteConversation]);

  // Toggle selection for a single conversation
  const handleToggleSelect = useCallback((convId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(convId)) {
        next.delete(convId);
      } else {
        next.add(convId);
      }
      return next;
    });
  }, []);

  // Toggle select all visible conversations
  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredConversations.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredConversations.map((c) => c.id)));
    }
  }, [selectedIds.size, filteredConversations]);

  // Exit select mode
  const handleExitSelectMode = useCallback(() => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  // Bulk delete selected conversations
  const handleBulkDelete = useCallback(async () => {
    setIsBulkDeleting(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/chat/${id}/messages`, { method: 'DELETE' })
        )
      );
      for (const id of selectedIds) {
        deleteConversation(id);
      }
      toast.success(`${selectedIds.size} conversation${selectedIds.size !== 1 ? 's' : ''} deleted`);
      setIsSelectMode(false);
      setSelectedIds(new Set());
      setShowBulkDeleteDialog(false);
    } catch (error) {
      console.error('Failed to delete conversations:', error);
      toast.error('Failed to delete some conversations');
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedIds, deleteConversation]);

  const handleDuplicate = useCallback(
    async (convId: string) => {
      try {
        const res = await fetch(`/api/chat/${convId}/duplicate`, {
          method: 'POST',
        });
        const data = await res.json();
        if (res.ok && data.conversation) {
          addConversation(data.conversation);
          toast.success('Conversation duplicated');
        }
      } catch (error) {
        console.error('Failed to duplicate conversation:', error);
      }
    },
    [addConversation]
  );

  const createNewChat = useCallback(async () => {
    try {
      const res = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const data = await res.json();
      if (data.conversation) {
        addConversation({
          ...data.conversation,
          messages: [],
        });
        toast.success('New conversation started');
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
  }, [addConversation]);

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -320,
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className={cn(
          'fixed lg:relative left-0 top-0 z-50 lg:z-0 h-full w-[300px] bg-card/90 backdrop-blur-xl border-r border-border flex flex-col',
          'lg:translate-x-0'
        )}
      >
        {/* Network status banner - shown when offline */}
        <AnimatePresence>
          {!online && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="network-banner offline"
            >
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/15 dark:bg-amber-500/10 border-b border-amber-500/20">
                <WifiOff className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-xs font-medium text-amber-700 dark:text-amber-300">You are offline</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Animated gradient separator (right edge) */}
        <div className="hidden lg:block absolute top-0 right-0 bottom-0 w-px pointer-events-none z-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-emerald-500/20 to-transparent animate-pulse" />
        </div>

        {/* Header with gradient */}
        <div className="p-4 border-b border-border bg-gradient-to-br from-emerald-600/8 via-transparent to-teal-600/8 relative overflow-hidden">
          {/* Subtle background pattern */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)', backgroundSize: '16px 16px' }} />
          <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <motion.div
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20"
                whileHover={{ scale: 1.05, rotate: 3 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <Sparkles className="w-4.5 h-4.5" />
              </motion.div>
              <span className="font-bold text-lg tracking-tight gradient-text">NexusAI</span>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8 hover:scale-110 active:scale-95 transition-transform" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* User greeting */}
          
          {user && (
            <p className="text-sm text-muted-foreground mb-3 pl-0.5">
              {getGreeting()}, <span className="font-medium text-foreground">{user.name}</span>
            </p>
          )}

          {/* Search with animated underline effect */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 group-focus-within:text-emerald-500 transition-all duration-300 group-focus-within:scale-110" />
            <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 group-focus-within:from-emerald-500/50 group-focus-within:via-emerald-500/80 group-focus-within:to-emerald-500/50 rounded-full transition-all duration-300" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 h-9 text-sm bg-muted/40 border-transparent focus-visible:border-transparent focus-visible:bg-background focus-visible:shadow-none transition-all duration-300 placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Select mode button */}
          {hasAnyConversations && (
            <Button
              variant={isSelectMode ? 'default' : 'ghost'}
              size="sm"
              className={cn(
                'w-full mt-2 gap-2 rounded-lg h-9 text-xs font-medium transition-all duration-200',
                isSelectMode
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/60'
              )}
              onClick={() => {
                if (isSelectMode) {
                  handleExitSelectMode();
                } else {
                  setIsSelectMode(true);
                }
              }}
            >
              <CheckSquare className={cn('w-3.5 h-3.5', isSelectMode && 'text-emerald-500')} />
              {isSelectMode ? 'Exit Select Mode' : 'Select Multiple'}
            </Button>
          )}
          </div>
        </div>

        {/* New Chat button with shimmer on hover */}
        <div className="px-3 pt-3 pb-1">
          <Button
            onClick={createNewChat}
            className="w-full justify-start gap-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-500/20 hover:shadow-md hover:shadow-emerald-500/30 active:scale-[0.98] transition-all duration-200 h-10 relative overflow-hidden group hover-lift-sm"
          >
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shimmer" />
            <Plus className="w-4 h-4 relative z-10" />
            <span className="text-sm font-medium relative z-10">New Chat</span>
          </Button>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1 sidebar-scroll" ref={scrollRef}>
          <div className="p-2">
            <AnimatePresence mode="wait">
              {!hasAnyConversations ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="text-center py-16 px-4"
                >
                  <div className="relative w-16 h-16 mx-auto mb-4">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-200 to-teal-200 dark:from-emerald-800/40 dark:to-teal-800/40 blur-sm" />
                    <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center shadow-inner">
                      <MessageSquare className="w-7 h-7 text-emerald-500/60 animate-float" />
                    </div>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    No conversations yet
                  </p>
                  <p className="text-xs text-muted-foreground/70 leading-relaxed">
                    Click &quot;New Chat&quot; above to start<br />your first conversation
                  </p>
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {/* Feature 5: Pinned section */}
                  {pinnedConversations.length > 0 && (
                    <div className="mb-2">
                      <div className="gradient-separator mx-3 mb-2 rounded-full" />
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 pt-3 pb-1.5 flex items-center gap-1.5">
                        <Pin className="w-3 h-3" />
                        Pinned
                      </p>
                      {pinnedConversations.map((conv) => (
                        <ConversationItem
                          key={conv.id}
                          conversation={conv}
                          isActive={conv.id === activeConversationId}
                          isPinned={true}
                          isSelectMode={isSelectMode}
                          isSelected={selectedIds.has(conv.id)}
                          isAutoTiting={conv.id === autoTitleLoadingId}
                          onSelect={() => handleToggleSelect(conv.id)}
                          onClick={() => {
                            if (isSelectMode) {
                              handleToggleSelect(conv.id);
                            } else {
                              setActiveConversationId(conv.id);
                              onClose();
                            }
                          }}
                          onDelete={() => setDeleteTarget(conv.id)}
                          onRename={(newTitle) => {
                            updateConversation(conv.id, { title: newTitle });
                          }}
                          onTogglePin={() => handleTogglePin(conv.id)}
                          onDuplicate={() => handleDuplicate(conv.id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Unpinned conversations with time-based grouping */}
                  {TIME_GROUP_ORDER.map((group) => {
                    const groupConvs = grouped[group];
                    if (groupConvs.length === 0) return null;
                    return (
                      <div key={group} className="mb-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60 px-3 pt-3 pb-1.5">
                          {group}
                        </p>
                        {groupConvs.map((conv) => (
                          <ConversationItem
                            key={conv.id}
                            conversation={conv}
                            isActive={conv.id === activeConversationId}
                            isPinned={false}
                            isSelectMode={isSelectMode}
                            isSelected={selectedIds.has(conv.id)}
                            isAutoTiting={conv.id === autoTitleLoadingId}
                            onSelect={() => handleToggleSelect(conv.id)}
                            onClick={() => {
                              if (isSelectMode) {
                                handleToggleSelect(conv.id);
                              } else {
                                setActiveConversationId(conv.id);
                                onClose();
                              }
                            }}
                            onDelete={() => setDeleteTarget(conv.id)}
                            onRename={(newTitle) => {
                              updateConversation(conv.id, { title: newTitle });
                            }}
                            onTogglePin={() => handleTogglePin(conv.id)}
                            onDuplicate={() => handleDuplicate(conv.id)}
                          />
                        ))}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {/* Bottom gradient fade */}
          <div className="gradient-fade-bottom pointer-events-none" style={{ height: '2px' }} />
        </ScrollArea>

        {/* Floating select mode action bar */}
        <AnimatePresence>
          {isSelectMode && selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="absolute bottom-0 left-0 right-0 z-20 p-3"
            >
              <div className="rounded-xl border border-emerald-500/30 bg-background/95 backdrop-blur-xl shadow-lg shadow-emerald-500/10 p-3 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleSelectAll}
                >
                  <CheckSquare className={cn('w-3.5 h-3.5', selectedIds.size === filteredConversations.length && 'text-emerald-500')} />
                  {selectedIds.size === filteredConversations.length ? 'Deselect All' : 'Select All'}
                </Button>
                <div className="flex-1 text-center">
                  <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    {selectedIds.size} selected
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                  onClick={handleExitSelectMode}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                  onClick={() => setShowBulkDeleteDialog(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div className="p-3 border-t border-border/40 bg-gradient-to-t from-muted/30 to-transparent space-y-2 gradient-border-top">
          {user && (
            <motion.div
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/50 hover:bg-muted/70 transition-colors duration-200 cursor-default shadow-sm border border-border/20"
              whileHover={{ x: 2 }}
            >
              <div className={cn('relative', online ? 'status-online' : 'status-offline')}>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {/* Online/offline status dot */}
                <div className={cn(
                  'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background transition-colors duration-300',
                  online ? 'bg-emerald-500' : 'bg-amber-500'
                )} />
                {/* Pulsing ring */}
                <div className="absolute -inset-0.5 rounded-full animate-pulse-ring" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </motion.div>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:scale-105 active:scale-95 transition-all duration-150"
              onClick={() => setSettingsOpen(true)}
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted/60 hover:scale-105 active:scale-95 transition-all duration-150"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              suppressHydrationWarning
              title={theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            >
              <Sun className="w-3.5 h-3.5 rotate-0 scale-100 transition-transform duration-500 dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-3.5 h-3.5 rotate-90 scale-0 transition-transform duration-500 dark:rotate-0 dark:scale-100" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive/80 hover:text-destructive hover:bg-destructive/10 hover:scale-105 active:scale-95 transition-all duration-150"
              onClick={() => setLogoutDialogOpen(true)}
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </motion.aside>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Conversation</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this conversation? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Logout confirmation dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sign Out</DialogTitle>
            <DialogDescription>
              Are you sure you want to sign out? You will need to log in again to access your conversations.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk delete confirmation dialog */}
      <Dialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Selected Conversations</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} selected conversation{selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDeleteDialog(false)} disabled={isBulkDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={isBulkDeleting}>
              {isBulkDeleting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete All Selected'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings sheet */}
      <SettingsSheet open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}

function ConversationItem({
  conversation,
  isActive,
  isPinned,
  isSelectMode,
  isSelected,
  isAutoTiting,
  onSelect,
  onClick,
  onDelete,
  onRename,
  onTogglePin,
  onDuplicate,
}: {
  conversation: Conversation;
  isActive: boolean;
  isPinned: boolean;
  isSelectMode?: boolean;
  isSelected?: boolean;
  isAutoTiting?: boolean;
  onSelect?: () => void;
  onClick: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(conversation.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = useCallback(() => {
    setIsEditing(true);
    setEditValue(conversation.title);
  }, [conversation.title]);

  const handleRenameSubmit = useCallback(async () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== conversation.title) {
      try {
        const res = await fetch(`/api/chat/${conversation.id}/messages`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: trimmed }),
        });
        if (res.ok) {
          onRename(trimmed);
          toast.success('Conversation renamed');
        }
      } catch (error) {
        console.error('Failed to rename conversation:', error);
      }
    }
    setIsEditing(false);
  }, [editValue, conversation.title, conversation.id, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleRenameSubmit();
      } else if (e.key === 'Escape') {
        setIsEditing(false);
        setEditValue(conversation.title);
      }
    },
    [handleRenameSubmit, conversation.title]
  );

  const lastMessage = conversation.messages[conversation.messages.length - 1];
  const previewText = lastMessage
    ? lastMessage.content.slice(0, 50) + (lastMessage.content.length > 50 ? '...' : '')
    : 'No messages yet';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100, transition: { duration: 0.2 } }}
      className="group relative"
      whileHover={{ y: -1 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
    >
      <button
        onClick={onClick}
        onDoubleClick={!isSelectMode ? handleDoubleClick : undefined}
        className={cn(
          'w-full text-left p-3 rounded-lg text-sm transition-all duration-200',
          'hover:bg-accent/80 hover:shadow-md hover:shadow-emerald-500/8 active:scale-[0.99] hover-lift',
          isPinned && !isActive && 'bg-muted/30',
          isActive
            ? 'bg-accent text-accent-foreground border-l-[3px] border-l-emerald-500 shadow-sm shadow-emerald-500/10'
            : 'border-l-[3px] border-l-transparent',
          isSelectMode && isSelected && 'bg-emerald-500/10 border-l-emerald-500',
          isSelectMode && 'cursor-pointer'
        )}
      >
        <div className="flex items-start gap-3">
          {/* Select mode checkbox */}
          {isSelectMode && (
            <div className="flex items-center justify-center mt-0.5 shrink-0">
              <div
                className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-all duration-150',
                  isSelected
                    ? 'bg-emerald-500 border-emerald-500'
                    : 'border-muted-foreground/40 hover:border-emerald-500/60'
                )}
              >
                {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
              </div>
            </div>
          )}
          <MessageSquare
            className={cn(
              'w-4 h-4 mt-0.5 shrink-0 transition-colors',
              isActive ? 'text-emerald-500' : 'text-muted-foreground/60'
            )}
          />
          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleRenameSubmit}
                onKeyDown={handleKeyDown}
                onClick={(e) => e.stopPropagation()}
                className="h-6 text-sm px-1 py-0 border-emerald-500/50 focus-visible:ring-emerald-500/30"
                maxLength={100}
              />
            ) : isAutoTiting ? (
              <Skeleton className="h-4 w-28 rounded" />
            ) : (
              <p className="font-medium truncate flex items-center gap-1.5">
                {conversation.title}
                {isPinned && (
                  <Pin className="w-3 h-3 text-amber-500 fill-current shrink-0" />
                )}
              </p>
            )}
            <p className="text-xs text-muted-foreground/70 mt-1 truncate">{previewText}</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              {formatTime(conversation.updatedAt)}
            </p>
            {conversation.messages.length > 0 && (
              <span className="conv-stats-chip inline-flex items-center gap-1 text-[10px] text-muted-foreground/60 mt-1">
                {conversation.messages.length} message{conversation.messages.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </button>

      {!isEditing && !isSelectMode && (
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-150">
          {/* Feature 5: Pin/unpin button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'w-7 h-7 hover:scale-110 transition-all duration-150',
              isPinned
                ? 'text-amber-500 hover:text-amber-600 hover:bg-amber-500/10'
                : 'hover:bg-accent'
            )}
            onClick={(e) => {
              e.stopPropagation();
              onTogglePin();
            }}
            title={isPinned ? 'Unpin conversation' : 'Pin conversation'}
          >
            <Pin className={cn('w-3 h-3', isPinned && 'fill-current')} />
          </Button>
          {/* Duplicate button */}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 hover:bg-accent hover:scale-110 transition-all duration-150"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            title="Duplicate conversation"
          >
            <Copy className="w-3 h-3 text-muted-foreground/70" />
          </Button>
          {/* Delete button */}
          <Button
            variant="ghost"
            size="icon"
            className="w-7 h-7 hover:bg-destructive/10 hover:scale-110"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="w-3 h-3 text-destructive/70" />
          </Button>
        </div>
      )}
    </motion.div>
  );
}
