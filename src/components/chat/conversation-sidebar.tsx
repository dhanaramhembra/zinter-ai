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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  MessageSquarePlus,
  Search,
  Trash2,
  MessageSquare,
  Settings,
  LogOut,
  Moon,
  Sun,
  Sparkles,
  X,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ConversationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ConversationSidebar({ isOpen, onClose }: ConversationSidebarProps) {
  const {
    conversations,
    activeConversationId,
    setActiveConversationId,
    deleteConversation,
  } = useChatStore();
  const { user, logout } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const mounted = true;

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    logout();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await fetch(`/api/chat/${deleteTarget}/messages`, { method: 'DELETE' });
      deleteConversation(deleteTarget);
      setDeleteTarget(null);
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (days === 1) return 'Yesterday';
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' });
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

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
        {/* Header */}
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-semibold text-lg">NexusAI</span>
            </div>
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}>
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search conversations..."
              className="pl-9 h-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1" ref={scrollRef}>
          <div className="p-2">
            <AnimatePresence>
              {filteredConversations.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p className="text-sm">No conversations yet</p>
                  <p className="text-xs mt-1">Start a new chat to begin</p>
                </div>
              ) : (
                filteredConversations.map((conv) => (
                  <ConversationItem
                    key={conv.id}
                    conversation={conv}
                    isActive={conv.id === activeConversationId}
                    onClick={() => {
                      setActiveConversationId(conv.id);
                      onClose();
                    }}
                    onDelete={() => setDeleteTarget(conv.id)}
                  />
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-3 border-t border-border space-y-1">
          {user && (
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
          <div className="flex items-center gap-1">
            {mounted && (
              <Button
                variant="ghost"
                size="sm"
                className="flex-1 justify-start gap-2 text-muted-foreground"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              >
                {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                <span className="text-xs">
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 justify-start gap-2 text-destructive hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOut className="w-4 h-4" />
              <span className="text-xs">Logout</span>
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
    </>
  );
}

function ConversationItem({
  conversation,
  isActive,
  onClick,
  onDelete,
}: {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="group relative"
    >
      <button
        onClick={onClick}
        className={cn(
          'w-full text-left p-3 rounded-lg text-sm transition-all duration-150',
          'hover:bg-accent',
          isActive && 'bg-accent text-accent-foreground'
        )}
      >
        <div className="flex items-start gap-3">
          <MessageSquare className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{conversation.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {conversation.messages.length > 0
                ? conversation.messages[conversation.messages.length - 1].content.slice(0, 40) + (conversation.messages[conversation.messages.length - 1].content.length > 40 ? '...' : '')
                : 'No messages yet'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatTime(conversation.updatedAt)} · {conversation.messages.length} messages
            </p>
          </div>
        </div>
      </button>

      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
      >
        <Trash2 className="w-3.5 h-3.5 text-destructive" />
      </Button>
    </motion.div>
  );
}
