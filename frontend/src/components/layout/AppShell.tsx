"use client";

import React, { useState } from "react";
import { useClauseContext } from "../../context/ClauseContext";
import {
  Home,
  FileText,
  GitCompare,
  ShieldCheck,
  Network,
  Sliders,
  Scale,
  User,
  Settings,
  Menu,
  X,
  Sparkles,
  ChevronRight,
  FileCheck
} from "lucide-react";

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeTab, setActiveTab } = useClauseContext();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      {/* Global Header */}
      <header className="h-14 border-b border-[var(--color-border)] bg-[var(--color-surface-primary)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)]"
            aria-label="Toggle navigation drawer"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--color-primary-dark)] text-white flex items-center justify-center font-bold text-xs">
              L
            </div>
            <span className="font-semibold tracking-tight text-sm text-[var(--color-text-primary)]">
              LexiClear
            </span>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] border-l border-[var(--color-border)] pl-3 ml-2">
            <span className="truncate max-w-[260px] font-medium text-[var(--color-text-primary)]">
              Master Services Agreement (Cloud Services v3.2)
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-[#3F7D5C14] text-[var(--color-success)] border border-[#3F7D5C40]">
              Analysis Active
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 pl-3">
            <div className="w-7 h-7 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] flex items-center justify-center text-xs font-semibold text-[var(--color-text-secondary)]">
              LC
            </div>
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Sidebar (Desktop) / Drawer (Mobile) */}
        <aside
          className={`fixed md:static inset-y-14 left-0 z-30 w-64 bg-[var(--color-surface-secondary)] border-r border-[var(--color-border)] p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <nav className="space-y-6" aria-label="Primary">
            {/* HOME */}
            <div>
              <button
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left"
              >
                <Home size={16} />
                <span>Home</span>
              </button>
            </div>

            {/* CURRENT DOCUMENT */}
            <div>
              <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
                Current Document
              </div>
              <div className="space-y-1">
                <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left">
                  <FileText size={16} />
                  <span>Overview</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left">
                  <FileCheck size={16} />
                  <span>Document</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left">
                  <GitCompare size={16} />
                  <span>Changes</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left">
                  <ShieldCheck size={16} />
                  <span>Compliance</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left">
                  <Network size={16} />
                  <span>Relationships</span>
                </button>
              </div>
            </div>

            {/* ACTION (Simulate / Negotiate) */}
            <div>
              <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
                Action Workspace
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => {
                    setActiveTab("simulate");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === "simulate"
                      ? "bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] shadow-xs border border-[var(--color-border)] font-semibold"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders size={16} className={activeTab === "simulate" ? "text-[var(--color-primary-dark)]" : ""} />
                    <span>Simulate</span>
                  </div>
                  {activeTab === "simulate" && <ChevronRight size={14} className="text-[var(--color-text-muted)]" />}
                </button>

                <button
                  onClick={() => {
                    setActiveTab("negotiate");
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                    activeTab === "negotiate"
                      ? "bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] shadow-xs border border-[var(--color-border)] font-semibold"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Scale size={16} className={activeTab === "negotiate" ? "text-[var(--color-primary-dark)]" : ""} />
                    <span>Negotiate</span>
                  </div>
                  {activeTab === "negotiate" && <ChevronRight size={14} className="text-[var(--color-text-muted)]" />}
                </button>
              </div>
            </div>

            {/* ACCOUNT */}
            <div>
              <div className="px-3 pb-1.5 text-[11px] font-semibold tracking-wider text-[var(--color-text-muted)] uppercase">
                Account
              </div>
              <div className="space-y-1">
                <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] transition-colors text-left">
                  <User size={16} />
                  <span>Profile</span>
                </button>
                <button className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] transition-colors text-left">
                  <Settings size={16} />
                  <span>Preferences</span>
                </button>
              </div>
            </div>
          </nav>

          <div className="pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
            <span>Protocol-7 Engine v1.4</span>
            <span className="w-2 h-2 rounded-full bg-[var(--color-success)]"></span>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/20 z-20 md:hidden"
          />
        )}

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto bg-[var(--color-bg)]">
          {children}
        </main>
      </div>
    </div>
  );
};