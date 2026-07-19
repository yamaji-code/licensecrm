import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "./app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // proxy でガード済みだが、二重で保険をかける
  if (!user) {
    redirect("/login");
  }

  return <AppShell email={user.email ?? ""}>{children}</AppShell>;
}
