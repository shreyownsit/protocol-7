export type RiskLevel = 'critical' | 'high' | 'moderate' | 'low';

export type ComplianceStatus = 'compliant' | 'warning' | 'violations';

export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'failed';

export type DocumentType = 
  | 'Master Services Agreement'
  | 'Non-Disclosure Agreement'
  | 'Employment Agreement'
  | 'Commercial Lease'
  | 'Software License'
  | 'Vendor Agreement'
  | 'Investor Rights'
  | 'Consulting Agreement'
  | 'Other';

export interface DocumentItem {
  id: string;
  name: string;
  type: DocumentType;
  fileSize: string;
  uploadedDate: string;
  lastAnalyzed: string;
  riskLevel: RiskLevel;
  riskScore: number;
  issueCount: number;
  complianceStatus: ComplianceStatus;
  complianceText: string;
  topFindingExcerpt?: string;
  status: ProcessingStatus;
  processingStep?: number;
  totalSteps?: number;
  currentStepDescription?: string;
  failureReason?: string;
  tags?: string[];
  isFeatured?: boolean;
}

export interface DocumentFilterState {
  searchQuery: string;
  riskLevels: RiskLevel[];
  complianceStatuses: ComplianceStatus[];
  documentTypes: string[];
  sortBy: 'recent' | 'highest-risk' | 'lowest-risk' | 'name';
  viewMode: 'grid' | 'list';
}
