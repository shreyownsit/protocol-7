"use client";

import React from "react";
import { ClauseProvider, useClauseContext } from "../context/ClauseContext";
import { AppShell } from "../components/layout/AppShell";
import { ActionWorkspaceHeader } from "../components/navigation/ActionWorkspaceHeader";
import { SimulateTab } from "../components/simulation/SimulateTab";
import { NegotiateTab } from "../components/negotiation/NegotiateTab";
import { ExportModal } from "../components/overlays/ExportModal";

function ActionWorkspaceContent() {
  const { activeTab } = useClauseContext();

  return (
    <div className="flex flex-col min-h-full">
      <ActionWorkspaceHeader />
      <div className="flex-1">
        {activeTab === "simulate" ? <SimulateTab /> : <NegotiateTab />}
      </div>
      <ExportModal />
    </div>
  );
}

export default function Home() {
  return (
    <ClauseProvider>
      <AppShell>
        <ActionWorkspaceContent />
      </AppShell>
    </ClauseProvider>
  );
}