import { redirect } from "next/navigation";

export default function AccountPreferencesRedirect() {
  redirect("/account?tab=preferences");
}
