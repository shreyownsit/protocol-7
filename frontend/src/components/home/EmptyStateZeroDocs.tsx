import React from 'react';
import { Upload, FileCode, Shield, Sparkles } from 'lucide-react';

interface EmptyStateZeroDocsProps {
  onUploadClick: () => void;
}

export const EmptyStateZeroDocs: React.FC<EmptyStateZeroDocsProps> = ({ onUploadClick }) => {
  return (
    <div className="w-full py-16 px-6 md:px-12 flex flex-col items-center justify-center text-center max-w-2xl mx-auto my-6 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-2xl shadow-xs">
      {/* Visual Glyph Badge */}
      <div className="w-16 h-16 rounded-2xl bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary-dark)] mb-6 shadow-xs">
        <FileCode size={30} strokeWidth={1.75} />
      </div>

      {/* Typographic Headline */}
      <h2 className="text-2xl md:text-3xl font-secondary italic text-[var(--color-text-primary)] font-normal tracking-tight">
        Transform complex legal contracts into clear, structured intelligence.
      </h2>

      <p className="mt-3 text-sm md:text-base text-[var(--color-text-secondary)] leading-relaxed max-w-lg">
        Upload your first agreement to instantly extract critical liabilities, detect regulatory non-compliance, and simulate commercial exposure.
      </p>

      {/* Primary Action Button */}
      <div className="mt-8 flex flex-col sm:flex-row items-center gap-3.5 w-full sm:w-auto">
        <button
          type="button"
          onClick={onUploadClick}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl bg-[var(--color-primary-dark)] text-[var(--color-surface-primary)] text-sm font-semibold hover:bg-black/85 transition-all shadow-sm hover:shadow-md cursor-pointer"
        >
          <Upload size={16} />
          <span>Upload your first contract</span>
        </button>
      </div>

      {/* Feature Value Props */}
      <div className="mt-12 pt-8 border-t border-[var(--color-border)] grid grid-cols-1 sm:grid-cols-3 gap-6 w-full text-left">
        <div className="space-y-1">
          <div className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <Shield size={13} className="text-[var(--color-critical)]" />
            <span>Risk Scoring</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)] leading-normal">
            Automated multi-tier liability exposure ratings.
          </p>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <Sparkles size={13} className="text-[var(--color-warning)]" />
            <span>AI Negotiation</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)] leading-normal">
            Simulate 3-party redlines and counter-clauses.
          </p>
        </div>

        <div className="space-y-1">
          <div className="text-xs font-bold text-[var(--color-text-primary)] flex items-center gap-1.5">
            <FileCode size={13} className="text-[var(--color-information)]" />
            <span>Clause Extraction</span>
          </div>
          <p className="text-[11px] text-[var(--color-text-secondary)] leading-normal">
            Side-by-side verification with full provenance.
          </p>
        </div>
      </div>
    </div>
  );
};
