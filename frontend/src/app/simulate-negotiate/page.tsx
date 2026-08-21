"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { ClauseProvider, useClauseContext } from "@/context/ClauseContext";
import { AppShell } from "@/components/layout/AppShell";
import { ActionWorkspaceHeader } from "@/components/navigation/ActionWorkspaceHeader";
import { SimulateTab } from "@/components/simulation/SimulateTab";
import { NegotiateTab } from "@/components/negotiation/NegotiateTab";
import { ExportModal } from "@/components/overlays/ExportModal";

function ActionWorkspaceContent() {
  const { activeTab } = useClauseContext();

  return (
    <div className="flex flex-col min-h-full">
      <ActionWorkspaceHeader />
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1280px] mx-auto w-full">
        {activeTab === "simulate" ? <SimulateTab /> : <NegotiateTab />}
      </div>
      <ExportModal />
    </div>
  );
}

function WorkspaceContainer() {
  const searchParams = useSearchParams();
  const docName = searchParams.get("docName") || "Master Services Agreement (Cloud Services v3.2)";

  return (
    <ClauseProvider>
      <AppShell
        activeDocName={docName}
        activeDocStatus="Analysis Active"
      >
        <ActionWorkspaceContent />
      </AppShell>
    </ClauseProvider>
  );
}

export default function SimulateNegotiatePage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-sm text-[var(--color-text-muted)]">Loading Action Workspace...</div>}>
      <WorkspaceContainer />
    </Suspense>
  );
}