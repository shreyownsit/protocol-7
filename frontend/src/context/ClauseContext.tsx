"use client";

import React, { createContext, useContext, useState, useMemo, useEffect } from "react";
import { ClauseFinding, ActiveTab, SimulationResult } from "../types/contract";
import { MOCK_CLAUSES } from "../data/mockContracts";

interface ClauseContextType {
  clauses: ClauseFinding[];
  activeClause: ClauseFinding | null;
  setActiveClause: (clause: ClauseFinding | null) => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  variableValues: Record<string, number>;
  setVariableValue: (id: string, value: number) => void;
  resetVariables: () => void;
  snapToScenario: (scenarioType: "current" | "adjusted" | "best" | "worst") => void;
  simulationResult: SimulationResult | null;
  
  // Negotiation pipeline state
  revealedStages: {
    prosecutor: boolean;
    defense: boolean;
    auditor: boolean;
    final: boolean;
  };
  isGenerating: boolean;
  isRevising: boolean;
  userEditedClause: string;
  setUserEditedClause: (clause: string) => void;
  isEditingClause: boolean;
  setIsEditingClause: (editing: boolean) => void;
  triggerRevision: () => void;
  regeneratePipeline: () => void;
  
  // Export modal state
  isExportOpen: boolean;
  setIsExportOpen: (open: boolean) => void;
}

const ClauseContext = createContext<ClauseContextType | undefined>(undefined);

export const ClauseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [clauses] = useState<ClauseFinding[]>(MOCK_CLAUSES);
  const [activeClause, setActiveClauseState] = useState<ClauseFinding | null>(MOCK_CLAUSES[0]);
  const [activeTab, setActiveTab] = useState<ActiveTab>("simulate");
  const [variableValues, setVariableValues] = useState<Record<string, number>>({});
  
  const [revealedStages, setRevealedStages] = useState({
    prosecutor: true,
    defense: true,
    auditor: true,
    final: true,
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRevising, setIsRevising] = useState(false);
  const [isEditingClause, setIsEditingClause] = useState(false);
  const [userEditedClause, setUserEditedClause] = useState("");
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Initialize variables when active clause changes
  useEffect(() => {
    if (activeClause && activeClause.variables.length > 0) {
      const initial: Record<string, number> = {};
      activeClause.variables.forEach((v) => {
        initial[v.id] = v.defaultValue;
      });
      setVariableValues(initial);
      setUserEditedClause(activeClause.finalCounterClause);
      setIsEditingClause(false);
    }
  }, [activeClause]);

  const setActiveClause = (clause: ClauseFinding | null) => {
    setActiveClauseState(clause);
    if (clause) {
      setUserEditedClause(clause.finalCounterClause);
    }
  };

  const setVariableValue = (id: string, value: number) => {
    setVariableValues((prev) => ({ ...prev, [id]: value }));
  };

  const resetVariables = () => {
    if (!activeClause) return;
    const res: Record<string, number> = {};
    activeClause.variables.forEach((v) => {
      res[v.id] = v.baselineValue;
    });
    setVariableValues(res);
  };

  const snapToScenario = (scenarioType: "current" | "adjusted" | "best" | "worst") => {
    if (!activeClause || activeClause.variables.length === 0) return;
    
    if (scenarioType === "current") {
      resetVariables();
      return;
    }

    if (activeClause.id === "clause-8-2") {
      if (scenarioType === "best") {
        setVariableValues({
          monthsRemaining: 3,
          monthlyFee: 15000,
          unamortizedCapex: 0,
          penaltyMultiplier: 50,
        });
      } else if (scenarioType === "worst") {
        setVariableValues({
          monthsRemaining: 36,
          monthlyFee: 15000,
          unamortizedCapex: 80000,
          penaltyMultiplier: 100,
        });
      }
    } else if (activeClause.id === "clause-5-4") {
      if (scenarioType === "best") {
        setVariableValues({
          invoiceAmount: 60000,
          daysOverdue: 5,
          monthlyInterestRate: 1.0,
          legalFeeProvision: 0,
        });
      } else if (scenarioType === "worst") {
        setVariableValues({
          invoiceAmount: 60000,
          daysOverdue: 90,
          monthlyInterestRate: 2.5,
          legalFeeProvision: 10000,
        });
      }
    }
  };

  // Compute live exposure values and chart points
  const simulationResult = useMemo<SimulationResult | null>(() => {
    if (!activeClause || !activeClause.hasSimulation) return null;

    if (activeClause.id === "clause-8-2") {
      const months = variableValues["monthsRemaining"] ?? 22;
      const fee = variableValues["monthlyFee"] ?? 15000;
      const capex = variableValues["unamortizedCapex"] ?? 45000;
      const penalty = (variableValues["penaltyMultiplier"] ?? 100) / 100;

      const baseline = 22 * 15000 * 1.0 + 45000; // $375,000
      const adjusted = months * fee * penalty + capex;
      const bestCase = 3 * fee * 0.5; // $22,500 (counter proposal standard)
      const worstCase = 36 * fee * 1.0 + 80000; // $620,000

      // 6 curve points across timeline
      const sampleMonths = [0, 6, 12, 18, 24, 30, 36];
      const curve = sampleMonths.map((m) => {
        const baseY = m * 15000 * 1.0 + 45000;
        const adjY = m * fee * penalty + capex;
        return {
          label: `M${m}`,
          x: m,
          baselineY: baseY,
          adjustedY: adjY,
        };
      });

      const delta = adjusted - baseline;
      const explanation =
        delta === 0
          ? "Under the contract baseline terms, early termination at month 14 mandates a 100% payout of all 22 remaining months ($330,000) plus full unamortized infrastructure recovery ($45,000), totaling $375,000 in early termination liability."
          : delta > 0
          ? `With the current adjusted variables (${months} months at $${fee.toLocaleString()}/mo, ${(penalty * 100).toFixed(0)}% recovery + $${capex.toLocaleString()} capex), your liability increases by $${Math.abs(delta).toLocaleString()} above baseline to $${adjusted.toLocaleString()}.`
          : `By reducing the term liability parameters to ${months} months at ${(penalty * 100).toFixed(0)}% recovery and $${capex.toLocaleString()} capex, your estimated termination payout drops by $${Math.abs(delta).toLocaleString()} to $${adjusted.toLocaleString()}.`;

      return {
        baseline,
        adjusted,
        bestCase,
        worstCase,
        curve,
        explanation,
      };
    }

    if (activeClause.id === "clause-5-4") {
      const amount = variableValues["invoiceAmount"] ?? 60000;
      const days = variableValues["daysOverdue"] ?? 30;
      const monthlyRate = (variableValues["monthlyInterestRate"] ?? 2.5) / 100;
      const legal = variableValues["legalFeeProvision"] ?? 5000;

      // Compounded daily: (1 + r/30)^days - 1
      const dailyRate = monthlyRate / 30;
      const baselineRate = 0.025 / 30;
      const baselineInterest = 60000 * (Math.pow(1 + baselineRate, 30) - 1);
      const baseline = baselineInterest + 5000;

      const adjustedInterest = amount * (Math.pow(1 + dailyRate, days) - 1);
      const adjusted = adjustedInterest + legal;

      const bestCase = 60000 * (0.01 / 30) * 5; // Net 45 grace, 5d late simple rate
      const worstCase = amount * (Math.pow(1 + 0.025 / 30, 90) - 1) + 10000;

      const sampleDays = [0, 15, 30, 45, 60, 75, 90];
      const curve = sampleDays.map((d) => {
        const bInterest = 60000 * (Math.pow(1 + baselineRate, d) - 1);
        const aInterest = amount * (Math.pow(1 + dailyRate, d) - 1);
        return {
          label: `${d}d`,
          x: d,
          baselineY: bInterest + 5000,
          adjustedY: aInterest + legal,
        };
      });

      const explanation = `At ${days} days overdue with a ${((monthlyRate * 100)).toFixed(2)}% monthly compounding rate, accumulated penalty charges total $${Math.round(adjustedInterest).toLocaleString()}, plus $${legal.toLocaleString()} collection fees for a total liability of $${Math.round(adjusted).toLocaleString()}.`;

      return {
        baseline: Math.round(baseline),
        adjusted: Math.round(adjusted),
        bestCase: Math.round(bestCase),
        worstCase: Math.round(worstCase),
        curve,
        explanation,
      };
    }

    return null;
  }, [activeClause, variableValues]);

  // Sequential pipeline generator
  const regeneratePipeline = () => {
    setIsGenerating(true);
    setRevealedStages({
      prosecutor: false,
      defense: false,
      auditor: false,
      final: false,
    });

    setTimeout(() => {
      setRevealedStages((prev) => ({ ...prev, prosecutor: true }));
    }, 400);

    setTimeout(() => {
      setRevealedStages((prev) => ({ ...prev, defense: true }));
    }, 900);

    setTimeout(() => {
      setRevealedStages((prev) => ({ ...prev, auditor: true }));
    }, 1400);

    setTimeout(() => {
      setRevealedStages((prev) => ({ ...prev, final: true }));
      setIsGenerating(false);
    }, 1800);
  };

  const triggerRevision = () => {
    setIsRevising(true);
    setTimeout(() => {
      setIsRevising(false);
    }, 1200);
  };

  return (
    <ClauseContext.Provider
      value={{
        clauses,
        activeClause,
        setActiveClause,
        activeTab,
        setActiveTab,
        variableValues,
        setVariableValue,
        resetVariables,
        snapToScenario,
        simulationResult,
        revealedStages,
        isGenerating,
        isRevising,
        userEditedClause,
        setUserEditedClause,
        isEditingClause,
        setIsEditingClause,
        triggerRevision,
        regeneratePipeline,
        isExportOpen,
        setIsExportOpen,
      }}
    >
      {children}
    </ClauseContext.Provider>
  );
};

export const useClauseContext = () => {
  const ctx = useContext(ClauseContext);
  if (!ctx) {
    throw new Error("useClauseContext must be used within a ClauseProvider");
  }
  return ctx;
};