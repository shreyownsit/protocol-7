import { redirect } from "next/navigation";

export default function WorkspaceDocumentRedirect() {
  redirect("/workspace?tab=document");
}
