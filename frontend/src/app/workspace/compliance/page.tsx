import { redirect } from "next/navigation";

export default function WorkspaceComplianceRedirect() {
  redirect("/workspace?tab=compliance");
}
