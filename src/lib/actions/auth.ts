"use server";

import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();

  // Clear httpOnly cached cookies set by middleware
  const cookieStore = await cookies();
  cookieStore.delete("x-user-role");
  cookieStore.delete("x-onboarding-done");
}
