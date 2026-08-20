export type SeverityLevel = "critical" | "high" | "moderate" | "low";

export interface SimulationVariable {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
  defaultValue: number;
  baselineValue: number;
}

export interface SimulationResult {
  baseline: number;
  adjusted: number;
  bestCase: number;
  worstCase: number;
  curve: { label: string; x: number; baselineY: number; adjustedY: number }[];
  explanation: string;
}

export interface ProsecutorFinding {
  id: string;
  title: string;
  description: string;
  citation: string;
}

export interface AuditorEvaluation {
  status: "pass" | "needs_revision";
  score: number;
  reasoning: string;
  recommendations?: string[];
}

export interface RevisionHistoryItem {
  passNumber: number;
  defenseDraft: string;
  auditorFeedback: string;
  timestamp: string;
}

export interface ClauseFinding {
  id: string;
  section: string;
  title: string;
  severity: SeverityLevel;
  originalText: string;
  summary: string;
  category: "liability" | "termination" | "compliance" | "payment" | "ip";
  hasSimulation: boolean;
  scenarioQuestion: string;
  variables: SimulationVariable[];
  prosecutorFindings: ProsecutorFinding[];
  defenseDraft: string;
  auditorEvaluation: AuditorEvaluation;
  revisionHistory: RevisionHistoryItem[];
  finalCounterClause: string;
}

export type ActiveTab = "simulate" | "negotiate";