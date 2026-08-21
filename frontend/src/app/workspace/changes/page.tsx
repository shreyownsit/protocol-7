import { redirect } from "next/navigation";

export default function WorkspaceChangesRedirect() {
  redirect("/workspace?tab=changes");
}
