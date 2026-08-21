import { SeverityLevel } from "./contract";
import { DocumentType, ComplianceStatus, RiskLevel } from "./document";

export type WorkspaceTab = "overview" | "document" | "changes" | "compliance" | "relationships";

export interface DocumentSection {
  id: string;
  number: string;
  title: string;
  content: string;
  pageNumber: number;
  riskLevel?: RiskLevel;
  findingSummary?: string;
  plainLanguageExplanation?: string;
  category: "termination" | "payment" | "liability" | "intellectual_property" | "confidentiality" | "governing_law" | "warranty" | "indemnification";
}

export interface RedlineChange {
  id: string;
  type: "addition" | "deletion" | "modification";
  sectionNumber: string;
  sectionTitle: string;
  severity: SeverityLevel;
  description: string;
  oldText?: string;
  newText?: string;
  lineNumber: number;
  clauseId: string;
}

export interface ComplianceRuleEvaluation {
  id: string;
  ruleName: string;
  statutoryReference: string;
  jurisdiction: string;
  category: string;
  status: "violation" | "warning" | "passed";
  severity: SeverityLevel;
  description: string;
  evidenceExcerpt: string;
  clauseId: string;
  clauseSection: string;
  isDeterministic: boolean; // Solid border & verified badge
}

export interface GraphNode {
  id: string;
  clauseNumber: string;
  title: string;
  category: "termination" | "payment" | "liability" | "intellectual_property" | "confidentiality" | "governing_law";
  severity?: SeverityLevel;
  x: number;
  y: number;
  summary: string;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: "contradicts" | "depends_on" | "references";
  description: string;
}

export interface DocumentDetail {
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
  jurisdiction: string;
  rulesEvaluated: number;
  violationsCount: number;
  financialExposure: string;
  potentialSavings: string;
  governingLaw: string;
  effectiveDate: string;
  expirationDate: string;
  parties: {
    firstParty: string;
    secondParty: string;
  };
  executiveSummary: string;
  sections: DocumentSection[];
  redlineChanges: RedlineChange[];
  complianceRules: ComplianceRuleEvaluation[];
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
}
