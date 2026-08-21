import React, { useState, useRef, useEffect } from 'react';
import { MoreVertical, Edit2, Download, Trash2 } from 'lucide-react';
import { DocumentItem } from '@/types/document';

interface DocumentActionsMenuProps {
  document: DocumentItem;
  onRename?: (doc: DocumentItem) => void;
  onExport?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
}

export const DocumentActionsMenu: React.FC<DocumentActionsMenuProps> = ({
  document,
  onRename,
  onExport,
  onDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('mousedown', handleClickOutside);
    }
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors cursor-pointer"
        aria-label="Document options"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-1 w-44 bg-[var(--color-surface-primary)] rounded-lg shadow-lg border border-[var(--color-border)] py-1.5 z-40 animate-in fade-in zoom-in-95 duration-100"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onRename?.(document);
            }}
            className="w-full px-3 py-2 text-xs text-left text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Edit2 size={13} />
            <span>Rename document</span>
          </button>
          
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onExport?.(document);
            }}
            className="w-full px-3 py-2 text-xs text-left text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] flex items-center gap-2.5 transition-colors cursor-pointer"
          >
            <Download size={13} />
            <span>Export audit pack</span>
          </button>

          <div className="my-1 border-t border-[var(--color-border)]" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              onDelete?.(document);
            }}
            className="w-full px-3 py-2 text-xs text-left text-[var(--color-critical)] hover:bg-[#C7333314] flex items-center gap-2.5 transition-colors cursor-pointer font-medium"
          >
            <Trash2 size={13} />
            <span>Delete document</span>
          </button>
        </div>
      )}
    </div>
  );
};
