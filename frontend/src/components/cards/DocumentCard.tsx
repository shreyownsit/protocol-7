import React from 'react';
import { 
  FileText, 
  ArrowRight, 
  RefreshCw, 
  Loader2, 
  AlertOctagon
} from 'lucide-react';
import { DocumentItem } from '@/types/document';
import { RiskBadge } from '@/components/common/RiskBadge';
import { DocumentActionsMenu } from '@/components/overlays/DocumentActionsMenu';

interface DocumentCardProps {
  document?: DocumentItem;
  variant?: 'grid' | 'list-row' | 'featured';
  isLoading?: boolean;
  onOpen?: (doc: DocumentItem) => void;
  onRetry?: (doc: DocumentItem) => void;
  onRename?: (doc: DocumentItem) => void;
  onExport?: (doc: DocumentItem) => void;
  onDelete?: (doc: DocumentItem) => void;
  className?: string;
}

export const DocumentCard: React.FC<DocumentCardProps> = ({
  document,
  variant = 'grid',
  isLoading = false,
  onOpen,
  onRetry,
  onRename,
  onExport,
  onDelete,
  className = '',
}) => {
  // Skeleton Loading State
  if (isLoading || !document) {
    if (variant === 'list-row') {
      return (
        <div 
          className="w-full bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-4 flex items-center justify-between gap-4 animate-pulse"
          aria-busy="true"
          aria-label="Loading document"
        >
          <div className="flex items-center gap-3.5 flex-1">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-secondary)]" />
            <div className="space-y-2 flex-1 max-w-sm">
              <div className="h-4 bg-[var(--color-surface-secondary)] rounded w-3/4" />
              <div className="h-3 bg-[var(--color-surface-secondary)] rounded w-1/2" />
            </div>
          </div>
          <div className="w-20 h-6 bg-[var(--color-surface-secondary)] rounded-full" />
          <div className="w-24 h-4 bg-[var(--color-surface-secondary)] rounded" />
          <div className="w-16 h-4 bg-[var(--color-surface-secondary)] rounded" />
        </div>
      );
    }

    return (
      <div 
        className="w-full bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 flex flex-col justify-between h-[250px] animate-pulse"
        aria-busy="true"
        aria-label="Loading document"
      >
        <div>
          <div className="flex justify-between items-start mb-4">
            <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-secondary)]" />
            <div className="w-6 h-6 rounded bg-[var(--color-surface-secondary)]" />
          </div>
          <div className="space-y-2 mb-4">
            <div className="h-4 bg-[var(--color-surface-secondary)] rounded w-4/5" />
            <div className="h-3 bg-[var(--color-surface-secondary)] rounded w-1/2" />
          </div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-16 h-5 bg-[var(--color-surface-secondary)] rounded-full" />
            <div className="w-20 h-4 bg-[var(--color-surface-secondary)] rounded" />
          </div>
        </div>
        <div className="pt-3 border-t border-[var(--color-border)] flex justify-between items-center">
          <div className="w-24 h-3 bg-[var(--color-surface-secondary)] rounded" />
          <div className="w-16 h-4 bg-[var(--color-surface-secondary)] rounded" />
        </div>
      </div>
    );
  }

  const isProcessing = document.status === 'processing';
  const isFailed = document.status === 'failed';

  // Severity top border color mapping (subtle 2px top accent)
  const severityBorderColors = {
    critical: 'border-t-[var(--color-critical)]',
    high: 'border-t-[var(--color-high)]',
    moderate: 'border-t-[var(--color-moderate)]',
    low: 'border-t-[var(--color-low)]',
  };

  const getComplianceColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return 'text-[var(--color-success)]';
      case 'warning':
        return 'text-[var(--color-warning)]';
      case 'violations':
        return 'text-[var(--color-critical)]';
      default:
        return 'text-[var(--color-text-secondary)]';
    }
  };

  // --- LIST ROW VARIANT ---
  if (variant === 'list-row') {
    return (
      <div
        onClick={() => onOpen?.(document)}
        className={`group relative w-full bg-[var(--color-surface-primary)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] rounded-xl px-5 py-4 flex items-center justify-between gap-4 transition-all duration-150 hover:shadow-xs cursor-pointer ${className}`}
        role="link"
        tabIndex={0}
        aria-label={`${document.name}, ${document.riskLevel} risk, ${document.issueCount} issues, opens document overview`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onOpen?.(document);
          }
        }}
      >
        <div className="flex items-center gap-3.5 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] flex items-center justify-center shrink-0 border border-[var(--color-border)]">
            <FileText size={18} />
          </div>

          <div className="min-w-0 flex-1">
            <h4 
              className="text-sm font-semibold text-[var(--color-text-primary)] truncate group-hover:text-[var(--color-primary-dark)]"
              title={document.name}
            >
              {document.name}
            </h4>
            <p className="text-xs text-[var(--color-text-secondary)] truncate">
              {document.type} · Uploaded {document.uploadedDate}
            </p>
          </div>
        </div>

        {/* Processing / Failed / Completed Details */}
        {isProcessing ? (
          <div className="flex items-center gap-3 px-3 py-1 bg-[var(--color-surface-secondary)] rounded-lg text-xs text-[var(--color-text-secondary)]">
            <Loader2 size={13} className="animate-spin text-[var(--color-information)]" />
            <span>Analyzing step {document.processingStep} of {document.totalSteps}</span>
          </div>
        ) : isFailed ? (
          <div className="flex items-center gap-2 text-xs text-[var(--color-critical)] font-medium">
            <AlertOctagon size={14} />
            <span>Analysis failed</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2">
              <RiskBadge level={document.riskLevel} size="compact" />
              <span className="text-xs text-[var(--color-text-secondary)]">
                {document.issueCount} {document.issueCount === 1 ? 'issue' : 'issues'}
              </span>
            </div>
            <div className={`text-xs font-medium ${getComplianceColor(document.complianceStatus)}`}>
              {document.complianceText}
            </div>
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="hidden md:inline-block text-xs text-[var(--color-text-muted)] shrink-0">
            {document.lastAnalyzed}
          </span>

          {isFailed ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRetry?.(document);
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-critical)] hover:underline"
            >
              <RefreshCw size={12} />
              <span>Retry</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-transform">
              <span>{isProcessing ? 'View' : 'Open'}</span>
              <ArrowRight size={13} />
            </span>
          )}

          <DocumentActionsMenu
            document={document}
            onRename={onRename}
            onExport={onExport}
            onDelete={onDelete}
          />
        </div>
      </div>
    );
  }

  // --- GRID CARD VARIANT ---
  return (
    <div
      onClick={() => onOpen?.(document)}
      className={`group relative bg-[var(--color-surface-primary)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] rounded-xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer border-t-[3px] ${severityBorderColors[document.riskLevel]} ${className}`}
      role="link"
      tabIndex={0}
      aria-label={`${document.name}, ${document.riskLevel} risk, ${document.issueCount} issues, opens document overview`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen?.(document);
        }
      }}
    >
      <div>
        {/* Header Row: Document Icon + Options */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-secondary)] text-[var(--color-text-secondary)] flex items-center justify-center border border-[var(--color-border)] group-hover:text-[var(--color-text-primary)] transition-colors">
            <FileText size={18} />
          </div>

          <div className="flex items-center gap-1">
            <DocumentActionsMenu
              document={document}
              onRename={onRename}
              onExport={onExport}
              onDelete={onDelete}
            />
          </div>
        </div>

        {/* Filename & Type */}
        <h4
          className="text-sm font-semibold text-[var(--color-text-primary)] line-clamp-2 mb-1 group-hover:text-[var(--color-primary-dark)]"
          title={document.name}
        >
          {document.name}
        </h4>
        <p className="text-xs text-[var(--color-text-secondary)] mb-4">
          {document.type} · {document.uploadedDate}
        </p>

        {/* Dynamic State: Processing vs Failed vs Resolved */}
        {isProcessing ? (
          <div className="space-y-2 py-1">
            <div className="flex items-center justify-between text-xs text-[var(--color-text-secondary)]">
              <span className="flex items-center gap-1.5 font-medium">
                <Loader2 size={12} className="animate-spin text-[var(--color-information)]" />
                Analyzing…
              </span>
              <span className="text-[var(--color-text-muted)] font-mono">
                Step {document.processingStep}/{document.totalSteps}
              </span>
            </div>
            <div className="w-full bg-[var(--color-surface-secondary)] h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-[var(--color-information)] h-full transition-all duration-300 rounded-full"
                style={{ width: `${((document.processingStep || 1) / (document.totalSteps || 5)) * 100}%` }}
              />
            </div>
            <p className="text-[11px] text-[var(--color-text-muted)] truncate">
              {document.currentStepDescription || 'Parsing legal clauses'}
            </p>
          </div>
        ) : isFailed ? (
          <div className="rounded-lg bg-[#C7333310] border border-[#C7333330] p-2.5 text-xs text-[var(--color-critical)] space-y-1">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertOctagon size={13} />
              <span>Analysis Failed</span>
            </div>
            <p className="text-[11px] text-[var(--color-text-secondary)] line-clamp-2">
              {document.failureReason || 'Document could not be processed.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <RiskBadge level={document.riskLevel} size="compact" />
              <span className="text-xs text-[var(--color-text-secondary)] font-medium">
                {document.issueCount} {document.issueCount === 1 ? 'issue' : 'issues'}
              </span>
            </div>
            <p className={`text-xs font-medium truncate ${getComplianceColor(document.complianceStatus)}`}>
              {document.complianceText}
            </p>
          </div>
        )}
      </div>

      {/* Footer Row: Timestamp + Action */}
      <div className="pt-4 mt-4 border-t border-[var(--color-border)] flex items-center justify-between text-xs">
        <span className="text-[var(--color-text-muted)]">
          {isProcessing ? 'In progress' : isFailed ? 'Failed' : `Analyzed ${document.lastAnalyzed}`}
        </span>

        {isFailed ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRetry?.(document);
            }}
            className="inline-flex items-center gap-1 font-semibold text-[var(--color-critical)] hover:underline cursor-pointer"
          >
            <RefreshCw size={12} />
            <span>Retry</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 font-semibold text-[var(--color-text-primary)] group-hover:translate-x-0.5 transition-transform">
            <span>{isProcessing ? 'View progress' : 'Open'}</span>
            <ArrowRight size={13} />
          </span>
        )}
      </div>
    </div>
  );
};
