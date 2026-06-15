import { redirect } from "next/navigation";
import { createSupabaseServer } from "@/lib/db/supabase";

export default async function HomePage() {
  const db = await createSupabaseServer();
  const {
    data: { user },
  } = await db.auth.getUser();

  if (user) {
    redirect("/chat");
  } else {
    redirect("/login");
  }
}
