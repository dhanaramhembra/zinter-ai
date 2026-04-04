'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KeyboardShortcutsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SHORTCUTS = [
  {
    keys: ['Ctrl', 'N'],
    description: 'New Chat',
  },
  {
    keys: ['Ctrl', 'F'],
    description: 'Search Messages',
  },
  {
    keys: ['Enter'],
    description: 'Send Message',
  },
  {
    keys: ['Shift', 'Enter'],
    description: 'New Line',
  },
  {
    keys: ['Escape'],
    description: 'Close Dialog / Exit Search',
  },
] as const;

export function KeyboardShortcutsDialog({
  open,
  onOpenChange,
}: KeyboardShortcutsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2.5 text-lg">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20">
              <Keyboard className="w-4 h-4" />
            </div>
            Keyboard Shortcuts
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Quick actions to speed up your workflow
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border border-border/60 overflow-hidden mt-1">
          <div className="divide-y divide-border/60">
            {SHORTCUTS.map((shortcut, index) => (
              <div
                key={index}
                className={cn(
                  'flex items-center justify-between px-4 py-3',
                  index % 2 === 0 ? 'bg-muted/30' : 'bg-transparent'
                )}
              >
                <span className="text-sm text-foreground">{shortcut.description}</span>
                <div className="flex items-center gap-1">
                  {shortcut.keys.map((key, keyIndex) => (
                    <span key={keyIndex} className="flex items-center gap-1">
                      {keyIndex > 0 && (
                        <span className="text-xs text-muted-foreground/50">+</span>
                      )}
                      <kbd
                        className={cn(
                          'kbd inline-flex items-center justify-center h-6 min-w-[28px] px-2',
                          'rounded-md border border-border bg-muted/70 text-xs font-medium',
                          'text-foreground shadow-[0_1px_0_1px_var(--border)]',
                          'transition-colors duration-150'
                        )}
                      >
                        {key}
                      </kbd>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground/60 text-center mt-1">
          Press <kbd className="kbd inline-flex items-center justify-center h-5 min-w-[24px] px-1.5 rounded border border-border bg-muted/70 text-[10px] font-medium shadow-[0_1px_0_1px_var(--border)]">Ctrl</kbd> + <kbd className="kbd inline-flex items-center justify-center h-5 min-w-[24px] px-1.5 rounded border border-border bg-muted/70 text-[10px] font-medium shadow-[0_1px_0_1px_var(--border)]">/</kbd> to toggle this dialog
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;
