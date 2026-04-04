'use client';

import { useState, useEffect, useCallback } from 'react';
import { KeyboardShortcutsDialog } from '@/components/keyboard-shortcuts-dialog';

export function KeyboardShortcutsWrapper() {
  const [open, setOpen] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.ctrlKey && e.key === '/') {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return (
    <KeyboardShortcutsDialog open={open} onOpenChange={setOpen} />
  );
}

export default KeyboardShortcutsWrapper;
