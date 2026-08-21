import { redirect } from "next/navigation";

export default function WorkspaceRelationshipsRedirect() {
  redirect("/workspace?tab=relationships");
}
