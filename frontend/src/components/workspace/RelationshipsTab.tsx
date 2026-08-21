"use client";

import React, { useState } from "react";
import Link from "next/link";
import { DocumentDetail, GraphNode, GraphEdge, WorkspaceTab } from "@/types/workspace";
import {
  Network,
  List,
  AlertTriangle,
  Sliders,
  FileText,
  ArrowRight,
  ShieldAlert,
  Info,
  DollarSign,
  Layers,
  Sparkles,
} from "lucide-react";

interface RelationshipsTabProps {
  document: DocumentDetail;
  onNavigateTab: (tab: WorkspaceTab, clauseId?: string) => void;
}

export const RelationshipsTab: React.FC<RelationshipsTabProps> = ({
  document: docDetail,
  onNavigateTab,
}) => {
  const [selectedNode, setSelectedNode] = useState<GraphNode>(docDetail.graphNodes[0]);
  const [viewMode, setViewMode] = useState<"graph" | "list">("graph");
  const [filterContradictionsOnly, setFilterContradictionsOnly] = useState(false);

  // Find edges related to selected node
  const relatedEdges = docDetail.graphEdges.filter(
    (e) => e.source === selectedNode?.id || e.target === selectedNode?.id
  );

  const contradictionEdges = docDetail.graphEdges.filter((e) => e.type === "contradicts");

  const displayedNodes = filterContradictionsOnly
    ? docDetail.graphNodes.filter((n) =>
        contradictionEdges.some((e) => e.source === n.id || e.target === n.id)
      )
    : docDetail.graphNodes;

  const displayedEdges = filterContradictionsOnly
    ? contradictionEdges
    : docDetail.graphEdges;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. TOP CONTROLS & LEGEND BAR */}
      <div className="bg-[var(--color-surface-secondary)] border border-[var(--color-border)] rounded-xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Network size={18} className="text-[var(--color-primary-dark)]" />
            <span className="text-xs sm:text-sm font-bold text-[var(--color-text-primary)]">
              Clause Knowledge Graph & Interdependency Map
            </span>
          </div>

          {/* Graph Legend */}
          <div className="flex items-center gap-4 text-xs font-medium border-l border-[var(--color-border)] pl-4">
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-[#C73333]" />
              <span className="text-[#C73333] font-bold">Contradiction ({contradictionEdges.length})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[var(--color-text-primary)]" />
              <span className="text-[var(--color-text-secondary)]">Dependency</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-4 h-0.5 bg-[var(--color-border-strong)]" />
              <span className="text-[var(--color-text-muted)]">Reference</span>
            </div>
          </div>
        </div>

        {/* View Mode & Filter Toggles */}
        <div className="flex items-center gap-2.5 self-start md:self-auto text-xs">
          <button
            type="button"
            onClick={() => setFilterContradictionsOnly(!filterContradictionsOnly)}
            className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 cursor-pointer ${
              filterContradictionsOnly
                ? "bg-[#C73333] text-white border-[#C73333] font-semibold"
                : "border-[var(--color-border)] bg-[var(--color-surface-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
            }`}
          >
            <AlertTriangle size={13} />
            <span>Contradictions Only</span>
          </button>

          {/* Graph vs List view toggle (Accessibility feature) */}
          <div className="flex items-center bg-[var(--color-surface-primary)] p-1 rounded-lg border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => setViewMode("graph")}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                viewMode === "graph"
                  ? "bg-[var(--color-primary-dark)] text-white font-medium"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              <Network size={13} />
              <span>Canvas</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`px-2.5 py-1 rounded text-xs transition-colors flex items-center gap-1 cursor-pointer ${
                viewMode === "list"
                  ? "bg-[var(--color-primary-dark)] text-white font-medium"
                  : "text-[var(--color-text-secondary)]"
              }`}
            >
              <List size={13} />
              <span>List View</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. GRAPH CANVAS OR ACCESSIBLE LIST VIEW */}
      {viewMode === "graph" ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SVG Graph Canvas (70%) */}
          <div className="lg:col-span-8 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-2xl p-4 sm:p-6 relative overflow-hidden shadow-2xs min-h-[440px] flex items-center justify-center">
            {/* Dot Grid Background Texture */}
            <div
              className="absolute inset-0 opacity-40 pointer-events-none"
              style={{
                backgroundImage: "radial-gradient(var(--color-border-strong) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />

            <svg
              viewBox="0 0 680 480"
              className="w-full h-full max-h-[480px] overflow-visible relative z-10"
            >
              {/* Edges */}
              {displayedEdges.map((edge) => {
                const sourceNode = docDetail.graphNodes.find((n) => n.id === edge.source);
                const targetNode = docDetail.graphNodes.find((n) => n.id === edge.target);
                if (!sourceNode || !targetNode) return null;

                const isContradiction = edge.type === "contradicts";
                const isSelected =
                  selectedNode?.id === sourceNode.id || selectedNode?.id === targetNode.id;

                return (
                  <g key={edge.id}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      stroke={
                        isContradiction
                          ? "var(--color-critical)"
                          : isSelected
                          ? "var(--color-primary-dark)"
                          : "var(--color-border-strong)"
                      }
                      strokeWidth={isContradiction ? 2.5 : isSelected ? 2 : 1.5}
                      strokeDasharray={isContradiction ? "5 4" : "none"}
                      opacity={isSelected || isContradiction ? 1 : 0.45}
                    />

                    {/* Edge Label for Contradictions */}
                    {isContradiction && (
                      <g
                        transform={`translate(${(sourceNode.x + targetNode.x) / 2}, ${
                          (sourceNode.y + targetNode.y) / 2
                        })`}
                      >
                        <rect
                          x="-38"
                          y="-10"
                          width="76"
                          height="20"
                          rx="4"
                          fill="var(--color-surface-primary)"
                          stroke="var(--color-critical)"
                          strokeWidth="1"
                        />
                        <text
                          x="0"
                          y="3"
                          fontSize="9"
                          fontWeight="bold"
                          fill="var(--color-critical)"
                          textAnchor="middle"
                          fontFamily="sans-serif"
                        >
                          CONTRADICTS
                        </text>
                      </g>
                    )}
                  </g>
                );
              })}

              {/* Nodes */}
              {displayedNodes.map((node) => {
                const isSelected = selectedNode?.id === node.id;
                const isCritical = node.severity === "critical";
                const isHigh = node.severity === "high";

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer transition-transform hover:scale-105"
                  >
                    {/* Node Box */}
                    <rect
                      x="-65"
                      y="-28"
                      width="130"
                      height="56"
                      rx="10"
                      fill="var(--color-surface-primary)"
                      stroke={
                        isSelected
                          ? "var(--color-primary-dark)"
                          : isCritical
                          ? "var(--color-critical)"
                          : isHigh
                          ? "var(--color-high)"
                          : "var(--color-border)"
                      }
                      strokeWidth={isSelected ? 2.5 : 1.5}
                      filter={isSelected ? "drop-shadow(0 4px 12px rgba(0,0,0,0.08))" : "none"}
                    />

                    {/* Left Accent Bar on Node */}
                    {isCritical && (
                      <rect x="-65" y="-28" width="4" height="56" rx="2" fill="var(--color-critical)" />
                    )}
                    {isHigh && (
                      <rect x="-65" y="-28" width="4" height="56" rx="2" fill="var(--color-high)" />
                    )}

                    {/* Clause Number */}
                    <text
                      x="-52"
                      y="-10"
                      fontSize="9"
                      fontWeight="bold"
                      fontFamily="monospace"
                      fill="var(--color-text-muted)"
                    >
                      {node.clauseNumber}
                    </text>

                    {/* Clause Title */}
                    <text
                      x="-52"
                      y="8"
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="sans-serif"
                      fill="var(--color-text-primary)"
                    >
                      {node.title.length > 16 ? `${node.title.slice(0, 15)}…` : node.title}
                    </text>

                    {/* Category Label */}
                    <text
                      x="-52"
                      y="20"
                      fontSize="8"
                      fontFamily="sans-serif"
                      fill="var(--color-text-muted)"
                      style={{ textTransform: "uppercase" }}
                    >
                      {node.category}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Right Column: Selected Node Context Inspector (30%) */}
          <div className="lg:col-span-4 bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] pb-3">
                <span className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                  Node Inspector
                </span>
                <span className="font-mono text-xs font-bold text-[var(--color-text-primary)] bg-[var(--color-surface-secondary)] px-2 py-0.5 rounded border border-[var(--color-border)]">
                  {selectedNode.clauseNumber}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-[var(--color-text-primary)]">
                  {selectedNode.title}
                </h3>
                <span className="text-xs text-[var(--color-text-muted)] capitalize block mt-0.5">
                  Category: {selectedNode.category}
                </span>
              </div>

              <div className="ai-generated-panel p-4 rounded-r-xl border-y border-r border-[var(--color-border)]">
                <div className="flex items-center gap-1 text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-1">
                  <Sparkles size={13} />
                  <span>Clause Summary</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                  {selectedNode.summary}
                </p>
              </div>

              {/* Connected Relationships List */}
              <div>
                <span className="text-xs font-bold text-[var(--color-text-primary)] block mb-2">
                  Connected Dependencies ({relatedEdges.length}):
                </span>
                <div className="space-y-2.5">
                  {relatedEdges.map((edge) => {
                    const isContradiction = edge.type === "contradicts";
                    const otherNodeId = edge.source === selectedNode.id ? edge.target : edge.source;
                    const otherNode = docDetail.graphNodes.find((n) => n.id === otherNodeId);

                    return (
                      <div
                        key={edge.id}
                        className={`p-3 rounded-lg border text-xs space-y-1 ${
                          isContradiction
                            ? "bg-[#C733330A] border-[#C7333333]"
                            : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
                        }`}
                      >
                        <div className="flex items-center justify-between font-semibold">
                          <span className={isContradiction ? "text-[#C73333]" : "text-[var(--color-text-primary)]"}>
                            {isContradiction ? "⚠ Contradicts" : "↔ Connects to"}{" "}
                            {otherNode?.clauseNumber}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--color-text-muted)]">
                            {edge.type}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--color-text-secondary)] leading-relaxed">
                          {edge.description}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Action CTAs in Node Inspector */}
            <div className="pt-4 border-t border-[var(--color-border)] space-y-2">
              <button
                type="button"
                onClick={() => onNavigateTab("document")}
                className="w-full py-2 px-3 rounded-lg border border-[var(--color-border)] hover:bg-[var(--color-surface-secondary)] text-xs font-medium text-[var(--color-text-primary)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <FileText size={14} />
                <span>Jump to Clause in Document Viewer</span>
              </button>

              <Link
                href={`/simulate-negotiate?docId=${encodeURIComponent(docDetail.id)}`}
                className="w-full py-2.5 px-4 rounded-lg bg-[var(--color-primary-dark)] text-white text-xs font-semibold hover:bg-black/85 flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Sliders size={14} />
                <span>Launch Scenario Simulator</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* ACCESSIBLE STRUCTURED LIST VIEW */
        <div className="bg-[var(--color-surface-primary)] border border-[var(--color-border)] rounded-xl p-6 shadow-2xs space-y-4">
          <div className="border-b border-[var(--color-border)] pb-3">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)]">
              Accessible Relational Interdependency Inventory
            </h3>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Screen-reader friendly textual representation of all mapped clause dependencies and contradictions.
            </p>
          </div>

          <div className="space-y-3">
            {docDetail.graphEdges.map((edge) => {
              const src = docDetail.graphNodes.find((n) => n.id === edge.source);
              const tgt = docDetail.graphNodes.find((n) => n.id === edge.target);
              const isContradiction = edge.type === "contradicts";

              return (
                <div
                  key={edge.id}
                  className={`p-4 rounded-xl border flex items-start gap-3.5 ${
                    isContradiction
                      ? "bg-[#C733330A] border-[#C7333340]"
                      : "bg-[var(--color-surface-secondary)] border-[var(--color-border)]"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isContradiction
                        ? "bg-[#C7333314] text-[#C73333]"
                        : "bg-[var(--color-surface-primary)] text-[var(--color-text-primary)]"
                    }`}
                  >
                    {isContradiction ? <AlertTriangle size={15} /> : <Network size={15} />}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs text-[var(--color-text-primary)] font-mono">
                        {src?.clauseNumber} ({src?.title})
                      </span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          isContradiction
                            ? "bg-[#C7333318] text-[#C73333]"
                            : "bg-[var(--color-surface-primary)] text-[var(--color-text-secondary)]"
                        }`}
                      >
                        {isContradiction ? "CONTRADICTS" : edge.type.toUpperCase()}
                      </span>
                      <span className="font-bold text-xs text-[var(--color-text-primary)] font-mono">
                        {tgt?.clauseNumber} ({tgt?.title})
                      </span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
                      {edge.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
