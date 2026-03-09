"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ---------------------------------------------------------------------------
// MFA Status
// ---------------------------------------------------------------------------

export async function getMfaStatus() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { enrolled: false, factors: [] as { id: string; friendly_name: string; factor_type: string; status: string; created_at: string }[] };

  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return { enrolled: false, factors: [] };

  const totpFactors = data.totp.map((f) => ({
    id: f.id,
    friendly_name: f.friendly_name ?? "",
    factor_type: f.factor_type,
    status: f.status,
    created_at: f.created_at,
  }));

  const verified = totpFactors.filter((f) => f.status === "verified");

  return {
    enrolled: verified.length > 0,
    factors: totpFactors,
  };
}

// ---------------------------------------------------------------------------
// Enroll MFA
// ---------------------------------------------------------------------------

export async function enrollMfa() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false as const, error: "Non authentifie" };

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
  });

  if (error || !data) {
    return { success: false as const, error: error?.message ?? "Erreur lors de l'activation" };
  }

  return {
    success: true as const,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    uri: data.totp.uri,
  };
}

// ---------------------------------------------------------------------------
// Verify MFA Enrollment
// ---------------------------------------------------------------------------

export async function verifyMfaEnrollment(factorId: string, code: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie" };

  const { data: challenge, error: challengeError } =
    await supabase.auth.mfa.challenge({ factorId });

  if (challengeError || !challenge) {
    return { success: false, error: challengeError?.message ?? "Erreur de challenge" };
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });

  if (verifyError) {
    return { success: false, error: verifyError.message };
  }

  revalidatePath("/settings/security");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Unenroll MFA
// ---------------------------------------------------------------------------

export async function unenrollMfa(factorId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie" };

  const { error } = await supabase.auth.mfa.unenroll({ factorId });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/security");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Security Settings (hardcoded defaults, stored in profiles metadata)
// ---------------------------------------------------------------------------

export async function getSecuritySettings() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const defaults = {
    sessionTimeout: 60,
    ipWhitelist: [] as string[],
  };

  if (!user) return defaults;

  const metadata = user.user_metadata;
  return {
    sessionTimeout: (metadata?.session_timeout as number) ?? 60,
    ipWhitelist: (metadata?.ip_whitelist as string[]) ?? [],
  };
}

export async function updateSecuritySettings(settings: {
  sessionTimeout: number;
  ipWhitelist: string[];
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Non authentifie" };

  const { error } = await supabase.auth.updateUser({
    data: {
      session_timeout: settings.sessionTimeout,
      ip_whitelist: settings.ipWhitelist,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/settings/security");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Login History (demo data — Supabase does not expose auth.sessions publicly)
// ---------------------------------------------------------------------------

export async function getLoginHistory() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Supabase Auth doesn't expose login history to clients.
  // Return demo data for UI purposes.
  const now = new Date();
  return [
    {
      id: "1",
      date: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
      ip: "192.168.1.42",
      device: "Chrome / macOS",
      status: "success" as const,
      location: "Paris, France",
    },
    {
      id: "2",
      date: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
      ip: "192.168.1.42",
      device: "Safari / iPhone",
      status: "success" as const,
      location: "Paris, France",
    },
    {
      id: "3",
      date: new Date(now.getTime() - 1000 * 60 * 60 * 24).toISOString(),
      ip: "10.0.0.1",
      device: "Firefox / Windows",
      status: "failed" as const,
      location: "Lyon, France",
    },
    {
      id: "4",
      date: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
      ip: "192.168.1.42",
      device: "Chrome / macOS",
      status: "success" as const,
      location: "Paris, France",
    },
    {
      id: "5",
      date: new Date(now.getTime() - 1000 * 60 * 60 * 72).toISOString(),
      ip: "172.16.0.5",
      device: "Edge / Windows",
      status: "failed" as const,
      location: "Marseille, France",
    },
  ];
}

// ---------------------------------------------------------------------------
// Active Sessions (demo data)
// ---------------------------------------------------------------------------

export async function getActiveSessions() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();
  return [
    {
      id: "sess_1",
      device: "Chrome / macOS",
      ip: "192.168.1.42",
      lastActive: new Date(now.getTime() - 1000 * 60 * 2).toISOString(),
      current: true,
    },
    {
      id: "sess_2",
      device: "Safari / iPhone",
      ip: "192.168.1.42",
      lastActive: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
      current: false,
    },
  ];
}
