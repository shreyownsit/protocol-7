import React from 'react';
import { FileText, ArrowRight, Sparkles, Clock } from 'lucide-react';
import { DocumentItem } from '@/types/document';
import { RiskBadge } from '@/components/common/RiskBadge';
import { DocumentActionsMenu } from '@/components/overlays/DocumentActionsMenu';

interface FeaturedDocumentCardProps {
  document: DocumentItem;
  onOpen?: (doc: DocumentItem) => void;
  onRename?: (doc: DocumentItem) => void;
  onExport?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
}

export const FeaturedDocumentCard: React.FC<FeaturedDocumentCardProps> = ({
  document,
  onOpen,
  onRename,
  onExport,
  onDelete,
}) => {
  return (
    <section aria-labelledby="featured-doc-heading" className="w-full">
      {/* Editorial Headline */}
      <div className="flex items-center justify-between mb-3">
        <h2
          id="featured-doc-heading"
          className="text-lg md:text-xl font-secondary italic text-[var(--color-text-secondary)] font-normal flex items-center gap-2"
        >
          <Sparkles size={16} className="text-[var(--color-warning)] not-italic" />
          Continue where you left off
        </h2>
        <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
          <Clock size={13} />
          <span>Last active {document.lastAnalyzed}</span>
        </span>
      </div>

      {/* Hero Featured Card */}
      <div
        onClick={() => onOpen?.(document)}
        className="group relative bg-[var(--color-surface-primary)] border-2 border-[var(--color-border-strong)] hover:border-[var(--color-primary-dark)] rounded-2xl p-6 md:p-7 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden"
        role="region"
        aria-label={`Featured document: ${document.name}`}
      >
        {/* Subtle decorative risk accent gradient at top */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[var(--color-critical)] via-[var(--color-warning)] to-[var(--color-information)] opacity-80" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Main Document Details */}
          <div className="space-y-3.5 flex-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Neutral "Latest" pill */}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border)]">
                Latest Document
              </span>
              <span className="text-xs text-[var(--color-text-muted)]">
                {document.type} · Uploaded {document.uploadedDate}
              </span>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-primary)] shrink-0 mt-0.5">
                <FileText size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg md:text-xl font-bold text-[var(--color-text-primary)] tracking-tight line-clamp-1 group-hover:text-[var(--color-primary-dark)]">
                  {document.name}
                </h3>
                {document.topFindingExcerpt && (
                  <p className="mt-1 text-sm text-[var(--color-text-secondary)] line-clamp-2 leading-relaxed">
                    <span className="font-medium text-[var(--color-text-primary)]">Key Finding: </span>
                    {document.topFindingExcerpt}
                  </p>
                )}
              </div>
            </div>

            {/* Badges & Metrics Row */}
            <div className="flex items-center gap-3.5 flex-wrap pt-1">
              <RiskBadge level={document.riskLevel} size="default" />
              <div className="text-xs font-medium text-[var(--color-text-secondary)] bg-[var(--color-surface-secondary)] px-2.5 py-1 rounded-md border border-[var(--color-border)]">
                {document.issueCount} {document.issueCount === 1 ? 'critical issue' : 'critical issues'} identified
              </div>
              <div className="text-xs font-medium text-[var(--color-critical)] bg-[#C7333310] px-2.5 py-1 rounded-md border border-[#C7333330]">
                {document.complianceText}
              </div>
            </div>
          </div>

          {/* Action Column */}
          <div className="flex sm:flex-row lg:flex-col items-center lg:items-end justify-between gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-[var(--color-border)] shrink-0">
            <div className="flex items-center gap-2">
              <DocumentActionsMenu
                document={document}
                onRename={onRename}
                onExport={onExport}
                onDelete={onDelete}
              />
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpen?.(document);
              }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary-dark)] text-[var(--color-surface-primary)] text-sm font-semibold hover:bg-black/80 transition-all shadow-xs group-hover:gap-3 cursor-pointer"
            >
              <span>Open Workspace</span>
              <ArrowRight size={15} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
