import { redirect } from "next/navigation";

export default function WorkspaceOverviewRedirect() {
  redirect("/workspace?tab=overview");
}
