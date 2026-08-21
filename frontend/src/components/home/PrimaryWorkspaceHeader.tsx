import React, { useState } from 'react';
import { 
  Search, 
  X, 
  SlidersHorizontal, 
  ArrowDownUp, 
  LayoutGrid, 
  List, 
  RotateCcw
} from 'lucide-react';
import { RiskLevel, ComplianceStatus, DocumentFilterState } from '@/types/document';
import { FilterChip } from '@/components/common/FilterChip';

interface PrimaryWorkspaceHeaderProps {
  filterState: DocumentFilterState;
  onFilterChange: (updater: (prev: DocumentFilterState) => DocumentFilterState) => void;
  totalDocumentsCount: number;
  attentionCount: number;
  availableTypes: string[];
}

export const PrimaryWorkspaceHeader: React.FC<PrimaryWorkspaceHeaderProps> = ({
  filterState,
  onFilterChange,
  totalDocumentsCount,
  attentionCount,
  availableTypes,
}) => {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const hasActiveFilters =
    filterState.searchQuery.trim().length > 0 ||
    filterState.riskLevels.length > 0 ||
    filterState.complianceStatuses.length > 0 ||
    filterState.documentTypes.length > 0 ||
    filterState.sortBy !== 'recent';

  const clearAllFilters = () => {
    onFilterChange((prev) => ({
      ...prev,
      searchQuery: '',
      riskLevels: [],
      complianceStatuses: [],
      documentTypes: [],
      sortBy: 'recent',
    }));
  };

  const toggleRiskFilter = (level: RiskLevel) => {
    onFilterChange((prev) => {
      const exists = prev.riskLevels.includes(level);
      return {
        ...prev,
        riskLevels: exists
          ? prev.riskLevels.filter((r) => r !== level)
          : [...prev.riskLevels, level],
      };
    });
  };

  const toggleComplianceFilter = (status: ComplianceStatus) => {
    onFilterChange((prev) => {
      const exists = prev.complianceStatuses.includes(status);
      return {
        ...prev,
        complianceStatuses: exists
          ? prev.complianceStatuses.filter((s) => s !== status)
          : [...prev.complianceStatuses, status],
      };
    });
  };

  const toggleTypeFilter = (type: string) => {
    onFilterChange((prev) => {
      const exists = prev.documentTypes.includes(type);
      return {
        ...prev,
        documentTypes: exists
          ? prev.documentTypes.filter((t) => t !== type)
          : [...prev.documentTypes, type],
      };
    });
  };

  return (
    <div className="w-full space-y-5 pt-2 pb-4 border-b border-[var(--color-border)]">
      {/* Top Row: Title + Context Line & View Toggles */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[var(--color-text-primary)] tracking-tight">
            Home
          </h1>
          <p className="mt-1 text-xs md:text-sm text-[var(--color-text-secondary)]">
            <span>{totalDocumentsCount} {totalDocumentsCount === 1 ? 'document' : 'documents'} in library</span>
            {attentionCount > 0 && (
              <>
                <span className="mx-1.5 text-[var(--color-text-muted)]">·</span>
                <span className="text-[var(--color-critical)] font-semibold">
                  {attentionCount} {attentionCount === 1 ? 'needs attention' : 'need attention'}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Action Controls: Search summary + View Switcher */}
        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          {/* Grid / List View Toggle (Desktop/Laptop) */}
          <div className="hidden sm:inline-flex items-center p-1 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-lg">
            <button
              type="button"
              onClick={() => onFilterChange((prev) => ({ ...prev, viewMode: 'grid' }))}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                filterState.viewMode === 'grid'
                  ? 'bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
              title="Grid view"
              aria-label="Grid view"
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              onClick={() => onFilterChange((prev) => ({ ...prev, viewMode: 'list' }))}
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                filterState.viewMode === 'list'
                  ? 'bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] shadow-xs'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              }`}
              title="List view"
              aria-label="List view"
            >
              <List size={15} />
            </button>
          </div>

          {/* Sort Dropdown */}
          <div className="relative inline-block">
            <label htmlFor="doc-sort-select" className="sr-only">
              Sort documents
            </label>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-primary)] border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)] hover:border-[var(--color-border-strong)] transition-colors">
              <ArrowDownUp size={13} className="text-[var(--color-text-muted)]" />
              <select
                id="doc-sort-select"
                value={filterState.sortBy}
                onChange={(e) =>
                  onFilterChange((prev) => ({
                    ...prev,
                    sortBy: e.target.value as DocumentFilterState['sortBy'],
                  }))
                }
                className="bg-transparent text-[var(--color-text-primary)] font-medium focus:outline-none cursor-pointer text-xs pr-2"
              >
                <option value="recent">Most recent</option>
                <option value="highest-risk">Highest risk</option>
                <option value="lowest-risk">Lowest risk</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}
            className="sm:hidden inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-surface-secondary)] border border-[var(--color-border)] text-xs font-medium text-[var(--color-text-primary)]"
          >
            <SlidersHorizontal size={13} />
            <span>Filters</span>
            {hasActiveFilters && (
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-critical)]" />
            )}
          </button>
        </div>
      </div>

      {/* Middle Row: Search Input with clear and keyboard hint */}
      <div className="relative">
        <label htmlFor="search-documents-input" className="sr-only">
          Search document library
        </label>
        <div className="relative flex items-center">
          <Search
            size={16}
            className="absolute left-3.5 text-[var(--color-text-muted)] pointer-events-none"
          />
          <input
            id="search-documents-input"
            type="text"
            placeholder="Search by filename, document type, clause, or tags..."
            value={filterState.searchQuery}
            onChange={(e) =>
              onFilterChange((prev) => ({ ...prev, searchQuery: e.target.value }))
            }
            className="w-full pl-10 pr-10 py-2.5 bg-[var(--color-surface-primary)] border border-[var(--color-border)] focus:border-[var(--color-primary-dark)] rounded-xl text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] transition-colors focus:outline-none shadow-xs"
          />
          {filterState.searchQuery ? (
            <button
              type="button"
              onClick={() => onFilterChange((prev) => ({ ...prev, searchQuery: '' }))}
              className="absolute right-3 p-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] cursor-pointer"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          ) : (
            <span className="hidden md:inline-block absolute right-3 text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-surface-secondary)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
              /
            </span>
          )}
        </div>
      </div>

      {/* Filter Chips Row: Risk, Compliance, Document Type (Collapsible on mobile) */}
      <div className={`${isMobileFilterOpen ? 'block' : 'hidden sm:block'} space-y-3 pt-1`}>
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-[var(--color-text-muted)] font-medium mr-1 text-[11px] uppercase tracking-wider">
            Risk:
          </span>
          <FilterChip
            label="Critical"
            accentColor="var(--color-critical)"
            isSelected={filterState.riskLevels.includes('critical')}
            onClick={() => toggleRiskFilter('critical')}
          />
          <FilterChip
            label="High"
            accentColor="var(--color-high)"
            isSelected={filterState.riskLevels.includes('high')}
            onClick={() => toggleRiskFilter('high')}
          />
          <FilterChip
            label="Moderate"
            accentColor="var(--color-moderate)"
            isSelected={filterState.riskLevels.includes('moderate')}
            onClick={() => toggleRiskFilter('moderate')}
          />
          <FilterChip
            label="Low"
            accentColor="var(--color-low)"
            isSelected={filterState.riskLevels.includes('low')}
            onClick={() => toggleRiskFilter('low')}
          />

          <div className="hidden lg:inline-block w-px h-4 bg-[var(--color-border)] mx-1" />

          <span className="text-[var(--color-text-muted)] font-medium mr-1 text-[11px] uppercase tracking-wider">
            Compliance:
          </span>
          <FilterChip
            label="Violations"
            isSelected={filterState.complianceStatuses.includes('violations')}
            onClick={() => toggleComplianceFilter('violations')}
          />
          <FilterChip
            label="Warnings"
            isSelected={filterState.complianceStatuses.includes('warning')}
            onClick={() => toggleComplianceFilter('warning')}
          />
          <FilterChip
            label="Compliant"
            isSelected={filterState.complianceStatuses.includes('compliant')}
            onClick={() => toggleComplianceFilter('compliant')}
          />

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs text-[var(--color-critical)] hover:underline ml-auto font-medium cursor-pointer"
            >
              <RotateCcw size={11} />
              <span>Clear filters</span>
            </button>
          )}
        </div>

        {/* Document Type Chips */}
        {availableTypes.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap text-xs pt-0.5">
            <span className="text-[var(--color-text-muted)] font-medium mr-1 text-[11px] uppercase tracking-wider">
              Type:
            </span>
            {availableTypes.map((type) => (
              <FilterChip
                key={type}
                label={type}
                isSelected={filterState.documentTypes.includes(type)}
                onClick={() => toggleTypeFilter(type)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
