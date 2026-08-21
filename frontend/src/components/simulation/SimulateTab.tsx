"use client";

import React from "react";
import { useClauseContext } from "../../context/ClauseContext";
import { Sliders, RotateCcw, ArrowRight, Info, AlertTriangle, ShieldCheck, Sparkles } from "lucide-react";

export const SimulateTab: React.FC = () => {
  const {
    activeClause,
    setActiveTab,
    variableValues,
    setVariableValue,
    resetVariables,
    snapToScenario,
    simulationResult,
  } = useClauseContext();

  if (!activeClause) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <div className="p-8 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl">
          <Info size={32} className="mx-auto text-[var(--color-text-muted)] mb-3" />
          <h3 className="text-base font-semibold text-[var(--color-text-primary)]">
            No Clause Selected
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">
            Please select a finding or clause above to begin the financial & operational exposure simulation.
          </p>
        </div>
      </div>
    );
  }

  // Variant: No adjustable variables (static contract term)
  if (!activeClause.hasSimulation || !simulationResult) {
    return (
      <div className="p-4 sm:p-8 max-w-5xl mx-auto space-y-6">
        <div className="p-6 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl">
          <span className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            Static Clause Analysis
          </span>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mt-1">
            {activeClause.title}
          </h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2">
            This contract term has no adjustable numerical variables to simulate (e.g., qualitative liability caps, non-solicitation, or governing law).
          </p>
        </div>

        <div className="ai-generated-panel p-6 rounded-r-xl border-y border-r border-[var(--color-border)]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
            <Sparkles size={14} />
            <span>AI Risk Assessment</span>
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] mt-2 leading-relaxed">
            {activeClause.summary} While this term cannot be modeled with quantitative variables, the qualitative risk remains critical. We recommend advancing directly to structured counter-drafting.
          </p>
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={() => setActiveTab("negotiate")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary-dark)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-xs"
          >
            <span>Negotiate this clause</span>
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    );
  }

  const { baseline, adjusted, bestCase, worstCase, curve, explanation } = simulationResult;

  // Find max exposure across chart for SVG scaling
  const maxY = Math.max(...curve.map((c) => Math.max(c.baselineY, c.adjustedY)), worstCase, 100000);
  const chartHeight = 220;
  const chartWidth = 520;
  const paddingX = 40;
  const paddingY = 30;

  // Generate SVG path points
  const pointsAdjusted = curve.map((pt, i) => {
    const x = paddingX + (i / (curve.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (pt.adjustedY / maxY) * (chartHeight - paddingY * 2);
    return `${x},${y}`;
  });

  const pointsBaseline = curve.map((pt, i) => {
    const x = paddingX + (i / (curve.length - 1)) * (chartWidth - paddingX * 2);
    const y = chartHeight - paddingY - (pt.baselineY / maxY) * (chartHeight - paddingY * 2);
    return `${x},${y}`;
  });

  const pathAdjusted = `M ${pointsAdjusted.join(" L ")}`;
  const pathBaseline = `M ${pointsBaseline.join(" L ")}`;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* 1. SCENARIO HEADER */}
      <div className="p-5 sm:p-6 bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase flex items-center gap-1.5">
            <Sliders size={13} />
            Scenario Formulation
          </span>
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mt-1">
            &ldquo;{activeClause.scenarioQuestion}&rdquo;
          </h2>
        </div>
        <button
          onClick={resetVariables}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-primary)] text-xs font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] transition-colors self-start md:self-auto"
        >
          <RotateCcw size={13} />
          <span>Reset to Baseline</span>
        </button>
      </div>

      {/* 2. MAIN GRID: VARIABLE CONTROLS + EXPOSURE VISUALIZATION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Variable Controls Panel (40% split) */}
        <div className="lg:col-span-5 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
          <div>
            <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3 mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                Adjustable Variables
              </h3>
              <span className="text-xs text-[var(--color-text-muted)] font-mono">
                Live Cause & Effect
              </span>
            </div>

            <div className="space-y-4">
              {activeClause.variables.map((variable) => {
                const curVal = variableValues[variable.id] ?? variable.defaultValue;
                const isChanged = curVal !== variable.baselineValue;

                return (
                  <div key={variable.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <label htmlFor={variable.id} className="font-medium text-[var(--color-text-primary)]">
                        {variable.label}
                      </label>
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs font-mono text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                          {variable.unit === "$" ? `$${curVal.toLocaleString()}` : `${curVal} ${variable.unit}`}
                        </span>
                        {isChanged && (
                          <span className="text-[10px] text-[var(--color-information)] font-medium">
                            (Modified)
                          </span>
                        )}
                      </div>
                    </div>

                    <input
                      type="range"
                      id={variable.id}
                      min={variable.min}
                      max={variable.max}
                      step={variable.step}
                      value={curVal}
                      onChange={(e) => setVariableValue(variable.id, parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-[var(--color-surface-secondary)] rounded-lg appearance-none cursor-pointer accent-[var(--color-primary-dark)]"
                      aria-label={`${variable.label}: current value ${curVal} ${variable.unit}`}
                    />

                    <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] font-mono">
                      <span>{variable.unit === "$" ? `$${variable.min}` : `${variable.min} ${variable.unit}`}</span>
                      <span>Baseline: {variable.unit === "$" ? `$${variable.baselineValue.toLocaleString()}` : `${variable.baselineValue} ${variable.unit}`}</span>
                      <span>{variable.unit === "$" ? `$${variable.max.toLocaleString()}` : `${variable.max} ${variable.unit}`}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="p-3 bg-[var(--color-surface-secondary)] rounded-lg border border-[var(--color-border)] text-xs text-[var(--color-text-secondary)]">
            <span className="font-semibold text-[var(--color-text-primary)]">Interactive Note: </span>
            Drag sliders to simulate real-time liability accumulation. Scenario comparison cards below will update dynamically.
          </div>
        </div>

        {/* Right Column: Exposure Visualization (60% split) */}
        <div className="lg:col-span-7 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--color-border)] pb-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                  Projected Financial Exposure Curve
                </h3>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  Simulated liability curve vs. as-is contract baseline
                </p>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[var(--color-primary-dark)]"></span>
                  <span className="text-[var(--color-text-secondary)]">Contract Baseline</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[var(--color-information)]"></span>
                  <span className="text-[var(--color-information)]">Adjusted Simulation</span>
                </div>
              </div>
            </div>

            {/* SVG Chart */}
            <div className="relative w-full overflow-hidden flex items-center justify-center py-2">
              <svg
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                className="w-full h-auto max-h-[240px] overflow-visible"
              >
                {/* Horizontal Grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                  const y = chartHeight - paddingY - ratio * (chartHeight - paddingY * 2);
                  const labelValue = Math.round((ratio * maxY) / 1000) * 1000;
                  return (
                    <g key={idx}>
                      <line
                        x1={paddingX}
                        y1={y}
                        x2={chartWidth - paddingX}
                        y2={y}
                        stroke="var(--color-border)"
                        strokeDasharray="3 3"
                        strokeWidth="1"
                      />
                      <text
                        x={paddingX - 6}
                        y={y + 3}
                        fontSize="9"
                        fill="var(--color-text-muted)"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        ${(labelValue / 1000).toFixed(0)}k
                      </text>
                    </g>
                  );
                })}

                {/* Baseline Line */}
                <path
                  d={pathBaseline}
                  fill="none"
                  stroke="var(--color-primary-dark)"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                />

                {/* Adjusted Line */}
                <path
                  d={pathAdjusted}
                  fill="none"
                  stroke="var(--color-information)"
                  strokeWidth="3"
                  className="transition-all duration-150"
                />

                {/* Data Points on Adjusted Line */}
                {curve.map((pt, i) => {
                  const x = paddingX + (i / (curve.length - 1)) * (chartWidth - paddingX * 2);
                  const y = chartHeight - paddingY - (pt.adjustedY / maxY) * (chartHeight - paddingY * 2);
                  return (
                    <g key={i}>
                      <circle
                        cx={x}
                        cy={y}
                        r="4"
                        fill="var(--color-surface-primary)"
                        stroke="var(--color-information)"
                        strokeWidth="2"
                      />
                      <text
                        x={x}
                        y={chartHeight - 10}
                        fontSize="9"
                        fill="var(--color-text-muted)"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {pt.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Accessible Text Summary per accessibility.md */}
          <div className="pt-2 text-xs text-[var(--color-text-secondary)] border-t border-[var(--color-border)]">
            <span className="font-medium text-[var(--color-text-primary)]">Data readout: </span>
            Adjusted exposure currently calculated at <span className="font-semibold text-[var(--color-text-primary)] font-mono">${adjusted.toLocaleString()}</span> (Baseline: <span className="font-mono">${baseline.toLocaleString()}</span>).
          </div>
        </div>
      </div>

      {/* 3. SCENARIO COMPARISON (4 CARDS ROW) */}
      <div>
        <div className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
          Scenario Comparison (Click any card to snap inputs)
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Current / Baseline Card */}
          <button
            onClick={() => snapToScenario("current")}
            className="p-4 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl text-left hover:border-[var(--color-border-strong)] transition-all group"
          >
            <span className="text-xs font-medium text-[var(--color-text-muted)]">Current Baseline</span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--color-text-primary)] mt-1">
              ${baseline.toLocaleString()}
            </div>
            <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">
              Contract as-is
            </span>
          </button>

          {/* Adjusted Simulation Card */}
          <button
            onClick={() => snapToScenario("adjusted")}
            className="p-4 bg-[var(--color-surface-primary)] border-2 border-[var(--color-information)] rounded-xl text-left hover:shadow-xs transition-all group"
          >
            <span className="text-xs font-semibold text-[var(--color-information)]">Simulated Adjustment</span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--color-text-primary)] mt-1">
              ${adjusted.toLocaleString()}
            </div>
            <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">
              {adjusted > baseline ? `+$${(adjusted - baseline).toLocaleString()} liability` : `-$${(baseline - adjusted).toLocaleString()} savings`}
            </span>
          </button>

          {/* Best Case Card */}
          <button
            onClick={() => snapToScenario("best")}
            className="p-4 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl text-left hover:border-[var(--color-success)] transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Best Case Target</span>
              <ShieldCheck size={14} className="text-[var(--color-success)]" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[var(--color-success)] mt-1">
              ${bestCase.toLocaleString()}
            </div>
            <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">
              Counter-clause cap
            </span>
          </button>

          {/* Worst Case Card */}
          <button
            onClick={() => snapToScenario("worst")}
            className="p-4 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl text-left hover:border-[#C73333] transition-all group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--color-text-muted)]">Worst Case Ceiling</span>
              <AlertTriangle size={14} className="text-[#C73333]" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-[#C73333] mt-1">
              ${worstCase.toLocaleString()}
            </div>
            <span className="text-[11px] text-[var(--color-text-secondary)] mt-1 block">
              Full term + capex breach
            </span>
          </button>
        </div>
      </div>

      {/* 4. PLAIN-LANGUAGE EXPLANATION PANEL */}
      <div className="ai-generated-panel p-5 sm:p-6 rounded-r-xl border-y border-r border-[var(--color-border)] space-y-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">
          <Sparkles size={14} />
          <span>Plain-Language Synthesis</span>
        </div>
        <p className="text-sm sm:text-base text-[var(--color-text-primary)] leading-relaxed">
          {explanation}
        </p>
      </div>

      {/* 5. ACTION FOOTER: Route to Negotiate Tab */}
      <div className="flex items-center justify-between pt-2 border-t border-[var(--color-border)]">
        <span className="text-xs text-[var(--color-text-muted)]">
          Selected clause: <span className="font-medium text-[var(--color-text-primary)]">{activeClause.section}</span> will persist into Negotiate workspace.
        </span>
        <button
          onClick={() => setActiveTab("negotiate")}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--color-primary-dark)] text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
        >
          <span>Negotiate this clause</span>
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
};