import React, { useState } from 'react';
import { X, UploadCloud, FileText, Loader2 } from 'lucide-react';
import { DocumentType } from '@/types/document';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (newDoc: {
    name: string;
    type: DocumentType;
    size: string;
  }) => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [docType, setDocType] = useState<DocumentType>('Master Services Agreement');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleStartAnalysis = () => {
    if (!file) return;

    setIsUploading(true);
    let current = 0;
    const interval = setInterval(() => {
      current += 20;
      setUploadProgress(current);
      if (current >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          setIsUploading(false);
          onUploadSuccess({
            name: file.name,
            type: docType,
            size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
          });
          onClose();
          setFile(null);
          setUploadProgress(0);
        }, 500);
      }
    }, 200);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div className="relative w-full max-w-lg bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-2xl shadow-xl p-6 sm:p-7 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-4">
          <div>
            <h3
              id="upload-modal-title"
              className="text-lg font-bold text-[var(--color-text-primary)]"
            >
              Upload New Contract
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">
              Protocol-7 will extract clauses, risk exposures, and compliance rules.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Upload Drop Zone */}
        {!file ? (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
              isDragOver
                ? 'border-[var(--color-primary-dark)] bg-[var(--color-surface-secondary)]'
                : 'border-[var(--color-border)] hover:border-[var(--color-border-strong)] bg-[var(--color-surface-secondary)]/30'
            }`}
            onClick={() => document.getElementById('contract-file-input')?.click()}
          >
            <input
              id="contract-file-input"
              type="file"
              accept=".pdf,.docx,.txt"
              className="hidden"
              onChange={handleFileChange}
            />
            <div className="w-12 h-12 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center mx-auto text-[var(--color-text-secondary)] mb-3">
              <UploadCloud size={24} />
            </div>
            <p className="text-sm font-semibold text-[var(--color-text-primary)]">
              Click to browse or drag and drop
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              Supports PDF, DOCX, TXT up to 25MB
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Selected File Card */}
            <div className="flex items-center justify-between p-3.5 bg-[var(--color-surface-secondary)] rounded-xl border border-[var(--color-border)]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-[var(--color-surface-primary)] border border-[var(--color-border)] flex items-center justify-center text-[var(--color-primary-dark)] shrink-0">
                  <FileText size={18} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                    {file.name}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
              </div>

              {!isUploading && (
                <button
                  type="button"
                  onClick={() => setFile(null)}
                  className="p-1 text-[var(--color-text-muted)] hover:text-[var(--color-critical)] transition-colors cursor-pointer"
                  title="Remove file"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Document Type Selector */}
            <div>
              <label
                htmlFor="doc-type-select"
                className="block text-xs font-semibold text-[var(--color-text-secondary)] mb-1.5"
              >
                Contract Classification
              </label>
              <select
                id="doc-type-select"
                value={docType}
                onChange={(e) => setDocType(e.target.value as DocumentType)}
                disabled={isUploading}
                className="w-full px-3 py-2 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-lg text-xs text-[var(--color-text-primary)] focus:outline-none focus:border-[var(--color-primary-dark)] cursor-pointer"
              >
                <option value="Master Services Agreement">Master Services Agreement (MSA)</option>
                <option value="Non-Disclosure Agreement">Non-Disclosure Agreement (NDA)</option>
                <option value="Employment Agreement">Employment Agreement</option>
                <option value="Commercial Lease">Commercial Lease</option>
                <option value="Software License">Software License / SaaS Agreement</option>
                <option value="Vendor Agreement">Vendor Framework Agreement</option>
                <option value="Investor Rights">Investor Rights Agreement</option>
                <option value="Consulting Agreement">Consulting Agreement</option>
                <option value="Other">Other Legal Contract</option>
              </select>
            </div>

            {/* Progress Bar while uploading */}
            {isUploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-[var(--color-text-secondary)]">
                    <Loader2 size={13} className="animate-spin text-[var(--color-information)]" />
                    <span>Uploading and running OCR pipeline...</span>
                  </span>
                  <span className="font-mono text-[var(--color-text-muted)]">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-[var(--color-surface-secondary)] h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[var(--color-primary-dark)] h-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-semibold text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleStartAnalysis}
            disabled={!file || isUploading}
            className={`inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all ${
              !file || isUploading
                ? 'bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] cursor-not-allowed border border-[var(--color-border)]'
                : 'bg-[var(--color-primary-dark)] text-[var(--color-surface-primary)] hover:bg-black/80 cursor-pointer'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Processing...</span>
              </>
            ) : (
              <span>Start Analysis</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
