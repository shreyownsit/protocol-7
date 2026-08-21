"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  FileText,
  GitCompare,
  ShieldCheck,
  Network,
  Sliders,
  User,
  Settings,
  Menu,
  X,
  Plus,
  LogOut,
  FileCheck,
  ChevronRight
} from "lucide-react";
import { UploadModal } from "@/components/overlays/UploadModal";
import { DocumentType } from "@/types/document";

interface AppShellProps {
  children: React.ReactNode;
  activeDocName?: string;
  activeDocStatus?: string;
  onUploadSuccess?: (newDoc: { name: string; type: DocumentType; size: string }) => void;
}

export const AppShell: React.FC<AppShellProps> = ({ 
  children,
  activeDocName,
  activeDocStatus = "Analysis Active",
  onUploadSuccess
}) => {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const isHome = pathname === "/" || pathname === "";
  const isSimulateNegotiate = pathname?.includes("simulate-negotiate");

  const handleUploadDone = (newDoc: { name: string; type: DocumentType; size: string }) => {
    if (onUploadSuccess) {
      onUploadSuccess(newDoc);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col font-sans text-[var(--color-text-primary)]">
      {/* Global Header */}
      <header className="h-16 border-b border-[var(--color-border)] bg-[var(--color-surface-primary)] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-1.5 rounded-lg text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-secondary)] cursor-pointer"
            aria-label="Toggle navigation drawer"
          >
            {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-7 h-7 rounded-lg bg-[var(--color-primary-dark)] text-white flex items-center justify-center font-bold text-xs tracking-wider shadow-xs group-hover:bg-black/85 transition-colors">
              P7
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-sm text-[var(--color-text-primary)] leading-none">
                LexiClear
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] font-mono leading-tight">
                PROTOCOL-7
              </span>
            </div>
          </Link>

          {/* Active Document Context Pill in Header */}
          {activeDocName ? (
            <div className="hidden md:flex items-center gap-2 text-xs text-[var(--color-text-muted)] border-l border-[var(--color-border)] pl-3 ml-2">
              <span className="truncate max-w-[260px] font-medium text-[var(--color-text-primary)]" title={activeDocName}>
                {activeDocName}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#3F7D5C14] text-[var(--color-success)] border border-[#3F7D5C40]">
                {activeDocStatus}
              </span>
            </div>
          ) : (
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] border-l border-[var(--color-border)] pl-3 ml-2 font-normal">
              Workspace & Document Library
            </div>
          )}
        </div>

        {/* Header Right Actions: Upload New CTA + User Avatar Popover */}
        <div className="flex items-center gap-3">
          {/* Primary Upload CTA (Never navigates, always opens overlay) */}
          <button
            type="button"
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-[var(--color-primary-dark)] text-[var(--color-surface-primary)] text-xs font-semibold hover:bg-black/85 transition-all shadow-xs cursor-pointer"
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">Upload New</span>
            <span className="sm:hidden">Upload</span>
          </button>

          {/* User Profile Avatar Popover */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-8 h-8 rounded-full bg-[var(--color-surface-secondary)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] flex items-center justify-center text-xs font-bold text-[var(--color-text-primary)] transition-colors cursor-pointer"
              aria-label="User account menu"
            >
              LC
            </button>

            {isUserMenuOpen && (
              <div 
                className="absolute right-0 mt-2 w-48 bg-[var(--color-surface-primary)] rounded-xl shadow-lg border border-[var(--color-border)] py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100"
                onClick={() => setIsUserMenuOpen(false)}
              >
                <div className="px-3.5 py-2 border-b border-[var(--color-border)]">
                  <p className="text-xs font-semibold text-[var(--color-text-primary)] truncate">
                    Legal Counsel
                  </p>
                  <p className="text-[11px] text-[var(--color-text-muted)] truncate">
                    counsel@protocol-7.ai
                  </p>
                </div>
                
                <Link
                  href="/"
                  className="w-full px-3.5 py-2 text-xs text-left text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] flex items-center gap-2.5 transition-colors"
                >
                  <User size={14} />
                  <span>Account & Profile</span>
                </Link>

                <Link
                  href="/"
                  className="w-full px-3.5 py-2 text-xs text-left text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-secondary)] flex items-center gap-2.5 transition-colors"
                >
                  <Settings size={14} />
                  <span>Preferences</span>
                </Link>

                <div className="my-1 border-t border-[var(--color-border)]" />

                <Link
                  href="/auth/login"
                  className="w-full px-3.5 py-2 text-xs text-left text-[var(--color-critical)] hover:bg-[#C7333314] flex items-center gap-2.5 transition-colors font-medium"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container: Sidebar + Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Persistent Sidebar (Desktop) / Drawer (Mobile) */}
        <aside
          className={`fixed md:static inset-y-16 left-0 z-30 w-64 bg-[var(--color-surface-secondary)] border-r border-[var(--color-border)] p-4 flex flex-col justify-between transition-transform duration-200 ease-in-out ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          }`}
        >
          <nav className="space-y-6" aria-label="Primary">
            {/* HOME */}
            <div>
              <Link
                href="/"
                onClick={() => setIsMobileMenuOpen(false)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                  isHome
                    ? "bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] shadow-xs border border-[var(--color-border)] font-semibold"
                    : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)]"
                }`}
                aria-current={isHome ? "page" : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <Home size={16} className={isHome ? "text-[var(--color-primary-dark)]" : ""} />
                  <span>Home</span>
                </div>
                {isHome && <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary-dark)]" />}
              </Link>
            </div>

            {/* CURRENT DOCUMENT SECTION */}
            <div>
              <div className="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase flex items-center justify-between">
                <span>Current Document</span>
                {!activeDocName && <span className="text-[10px] font-normal lowercase">(none)</span>}
              </div>
              <div className="space-y-1">
                {activeDocName ? (
                  <>
                    <Link
                      href="/simulate-negotiate"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left"
                    >
                      <FileText size={16} />
                      <span>Overview</span>
                    </Link>
                    <Link
                      href="/simulate-negotiate"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left"
                    >
                      <FileCheck size={16} />
                      <span>Document</span>
                    </Link>
                    <Link
                      href="/simulate-negotiate"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left"
                    >
                      <GitCompare size={16} />
                      <span>Changes</span>
                    </Link>
                    <Link
                      href="/simulate-negotiate"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left"
                    >
                      <ShieldCheck size={16} />
                      <span>Compliance</span>
                    </Link>
                    <Link
                      href="/simulate-negotiate"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left"
                    >
                      <Network size={16} />
                      <span>Relationships</span>
                    </Link>
                  </>
                ) : (
                  <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] italic bg-[var(--color-surface-secondary)]/50 rounded-lg border border-dashed border-[var(--color-border)]">
                    No document selected. Select a contract below to open workspace.
                  </div>
                )}
              </div>
            </div>

            {/* ACTION WORKSPACE */}
            <div>
              <div className="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase">
                Action Workspace
              </div>
              <div className="space-y-1">
                <Link
                  href="/simulate-negotiate"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    isSimulateNegotiate
                      ? "bg-[var(--color-surface-primary)] text-[var(--color-text-primary)] shadow-xs border border-[var(--color-border)] font-semibold"
                      : "text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sliders size={16} className={isSimulateNegotiate ? "text-[var(--color-primary-dark)]" : ""} />
                    <span>Simulate & Negotiate</span>
                  </div>
                  <ChevronRight size={14} className="text-[var(--color-text-muted)]" />
                </Link>
              </div>
            </div>

            {/* ACCOUNT */}
            <div>
              <div className="px-3 pb-1.5 text-[11px] font-bold tracking-wider text-[var(--color-text-muted)] uppercase">
                Account
              </div>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left cursor-pointer"
                >
                  <User size={16} />
                  <span>Profile</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-primary)] hover:text-[var(--color-text-primary)] transition-colors text-left cursor-pointer"
                >
                  <Settings size={16} />
                  <span>Preferences</span>
                </button>
              </div>
            </div>
          </nav>

          <div className="pt-4 border-t border-[var(--color-border)] text-xs text-[var(--color-text-muted)] flex items-center justify-between">
            <span className="font-mono">Protocol-7 v1.4</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[var(--color-success)] animate-pulse"></span>
              <span className="text-[10px]">Operational</span>
            </span>
          </div>
        </aside>

        {/* Backdrop for mobile drawer */}
        {isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/30 backdrop-blur-xs z-20 md:hidden"
          />
        )}

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto bg-[var(--color-bg)]">
          {children}
        </main>
      </div>

      {/* Upload New Overlay Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={handleUploadDone}
      />
    </div>
  );
};