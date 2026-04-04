'use client';

import { useChatStore, Conversation } from '@/store/chat-store';
import { useAuthStore } from '@/store/auth-store';
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
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

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

export default function ConversationSidebar({ isOpen, onClose }: ConversationSidebarProps) {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    addConversation,
    deleteConversation,
    updateConversation,
  } = useChatStore();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = groupConversations(filteredConversations);
  const hasAnyConversations = filteredConversations.length > 0;

  const handleLogout = useCallback(async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
    setLogoutDialogOpen(false);
  }, [logout]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/chat/${deleteTarget}/messages`, { method: 'DELETE' });
      deleteConversation(deleteTarget);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  }, [deleteTarget, deleteConversation]);

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
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
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
          'fixed lg:relative left-0 top-0 z-50 lg:z-0 h-full w-[300px] bg-card border-r border-border flex flex-col',
          'lg:translate-x-0'
        )}
      >
        {/* Header with gradient */}
        <div className="p-4 border-b border-border bg-gradient-to-br from-emerald-600/5 via-transparent to-teal-600/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-500/20">
                <Sparkles className="w-4.5 h-4.5" />
              </div>
              <span className="font-bold text-lg tracking-tight">NexusAI</span>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* User greeting */}
          {user && (
            <p className="text-sm text-muted-foreground mb-3 pl-0.5">
              {getGreeting()}, <span className="font-medium text-foreground">{user.name}</span>
            </p>
          )}

          {/* Search */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/70 group-focus-within:text-emerald-500 transition-colors" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 h-9 text-sm bg-muted/40 border-transparent focus-visible:border-emerald-500/50 focus-visible:bg-background transition-all placeholder:text-muted-foreground/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* New Chat button */}
        <div className="px-3 pt-3 pb-1">
          <Button
            onClick={createNewChat}
            className="w-full justify-start gap-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-sm shadow-emerald-500/20 transition-all duration-200 h-10"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Chat</span>
          </Button>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1" ref={scrollRef}>
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
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 flex items-center justify-center">
                    <MessageSquare className="w-7 h-7 text-emerald-500/60" />
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
                            onClick={() => {
                              setActiveConversationId(conv.id);
                              onClose();
                            }}
                            onDelete={() => setDeleteTarget(conv.id)}
                            onRename={(newTitle) => {
                              updateConversation(conv.id, { title: newTitle });
                            }}
                          />
                        ))}
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-2">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              suppressHydrationWarning
            >
              <Sun className="w-3.5 h-3.5 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute w-3.5 h-3.5 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
              <span className="text-xs" suppressHydrationWarning>
                {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2 text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
              onClick={() => setLogoutDialogOpen(true)}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="text-xs">Sign Out</span>
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
    </>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
  onRename,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: (newTitle: string) => void;
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
    >
      <button
        onClick={onClick}
        onDoubleClick={handleDoubleClick}
        className={cn(
          'w-full text-left p-3 rounded-lg text-sm transition-all duration-200',
          'hover:bg-accent/80',
          isActive
            ? 'bg-accent text-accent-foreground border-l-[3px] border-l-emerald-500 shadow-sm'
            : 'border-l-[3px] border-l-transparent'
        )}
      >
        <div className="flex items-start gap-3">
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
            ) : (
              <p className="font-medium truncate">{conversation.title}</p>
            )}
            <p className="text-xs text-muted-foreground/70 mt-1 truncate">{previewText}</p>
            <p className="text-[11px] text-muted-foreground/50 mt-0.5">
              {formatTime(conversation.updatedAt)} · {conversation.messages.length} msg{conversation.messages.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </button>

      {!isEditing && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 opacity-0 group-hover:opacity-100 transition-opacity duration-150 hover:bg-destructive/10"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-3 h-3 text-destructive/70" />
        </Button>
      )}
    </motion.div>
  );
}
