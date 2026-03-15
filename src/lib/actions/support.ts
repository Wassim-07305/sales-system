"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Helpers ─────────────────────────────────────────────────────────

function isTableMissing(error: { message?: string; code?: string } | null): boolean {
  if (!error) return false;
  const msg = (error.message || "").toLowerCase();
  return (
    msg.includes("relation") && msg.includes("does not exist") ||
    error.code === "42P01"
  );
}

// ─── Server Actions ──────────────────────────────────────────────────

export async function getTickets() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    if (isTableMissing(error)) return [];
    throw new Error(error.message);
  }

  return data || [];
}

export async function getAllTickets() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return [];
  }

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    if (isTableMissing(error)) return [];
    throw new Error(error.message);
  }

  return data || [];
}

export async function createTicket(data: {
  subject: string;
  description: string;
  priority: string;
  category: string;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("support_tickets").insert({
    subject: data.subject,
    description: data.description,
    priority: data.priority,
    category: data.category,
    status: "open",
    user_id: user.id,
    user_name: user.user_metadata?.full_name || user.email || "Utilisateur",
  });

  if (error) {
    if (isTableMissing(error)) {
      return { error: "Le système de tickets n'est pas encore configuré." };
    }
    return { error: error.message };
  }

  revalidatePath("/support");
  return { success: true };
}

export async function getTicketDetails(ticketId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: ticket, error } = await supabase
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (error) {
    if (isTableMissing(error)) return null;
    return null;
  }

  const { data: messages } = await supabase
    .from("support_ticket_messages")
    .select("*")
    .eq("ticket_id", ticketId)
    .order("created_at", { ascending: true });

  return { ...ticket, messages: messages || [] };
}

export async function addTicketReply(ticketId: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { error } = await supabase.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    content: message,
    sender_type: "user",
    sender_name: user.user_metadata?.full_name || user.email || "Utilisateur",
  });

  if (error) {
    if (isTableMissing(error)) {
      return { error: "Le système de messages n'est pas encore configuré." };
    }
    return { error: error.message };
  }

  // Update the ticket's updated_at
  await supabase
    .from("support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  revalidatePath("/support");
  return { success: true };
}

export async function updateTicketStatus(
  ticketId: string,
  status: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "manager"].includes(profile.role)) {
    return { error: "Non autorisé" };
  }

  const { error } = await supabase
    .from("support_tickets")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", ticketId);

  if (error) {
    if (isTableMissing(error)) {
      return { error: "Le système de tickets n'est pas encore configuré." };
    }
    return { error: error.message };
  }

  // Add system message for status change
  const statusLabels: Record<string, string> = {
    open: "Ouvert",
    in_progress: "En cours",
    waiting: "En attente",
    resolved: "Résolu",
    closed: "Fermé",
  };

  await supabase.from("support_ticket_messages").insert({
    ticket_id: ticketId,
    content: `Statut changé : ${statusLabels[status] || status}`,
    sender_type: "system",
    sender_name: "Système",
  });

  revalidatePath("/support");
  return { success: true };
}

// ─── SLA Enforcement ─────────────────────────────────────────────────

export async function getSlaConfig() {
  return {
    urgent: { firstResponse: 1, resolution: 4 },
    high: { firstResponse: 4, resolution: 24 },
    medium: { firstResponse: 8, resolution: 48 },
    low: { firstResponse: 24, resolution: 72 },
  };
}

export async function getSlaStatus(ticket: {
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  messages?: { sender_type: string; created_at: string }[];
}) {
  const slaConfig = await getSlaConfig();
  const config = slaConfig[ticket.priority];
  const now = new Date();
  const createdAt = new Date(ticket.created_at);

  // Find first support response time
  const firstSupportMsg = (ticket.messages || []).find(
    (m) => m.sender_type === "support"
  );
  const firstResponseAt = firstSupportMsg
    ? new Date(firstSupportMsg.created_at)
    : null;

  // Response SLA
  const responseDeadline = new Date(
    createdAt.getTime() + config.firstResponse * 60 * 60 * 1000
  );
  let responseStatus: "ok" | "warning" | "breached";
  let responseTimeLeft: string;

  if (firstResponseAt) {
    // Already responded — check if it was within SLA
    if (firstResponseAt <= responseDeadline) {
      responseStatus = "ok";
      responseTimeLeft = "Repondu dans les delais";
    } else {
      responseStatus = "breached";
      const exceededMs = firstResponseAt.getTime() - responseDeadline.getTime();
      responseTimeLeft = `SLA depasse de ${formatDuration(exceededMs)}`;
    }
  } else if (ticket.status === "resolved" || ticket.status === "closed") {
    // Resolved/closed without support response — mark as ok
    responseStatus = "ok";
    responseTimeLeft = "Resolu";
  } else {
    const remainingMs = responseDeadline.getTime() - now.getTime();
    if (remainingMs <= 0) {
      responseStatus = "breached";
      responseTimeLeft = `SLA depasse de ${formatDuration(Math.abs(remainingMs))}`;
    } else {
      const warningThreshold = config.firstResponse * 60 * 60 * 1000 * 0.25;
      responseStatus = remainingMs <= warningThreshold ? "warning" : "ok";
      responseTimeLeft = `Reponse dans ${formatDuration(remainingMs)}`;
    }
  }

  // Resolution SLA
  const resolutionDeadline = new Date(
    createdAt.getTime() + config.resolution * 60 * 60 * 1000
  );
  let resolutionStatus: "ok" | "warning" | "breached";
  let resolutionTimeLeft: string;

  if (ticket.status === "resolved" || ticket.status === "closed") {
    const resolvedAt = new Date(ticket.updated_at);
    if (resolvedAt <= resolutionDeadline) {
      resolutionStatus = "ok";
      resolutionTimeLeft = "Resolu dans les delais";
    } else {
      resolutionStatus = "breached";
      const exceededMs = resolvedAt.getTime() - resolutionDeadline.getTime();
      resolutionTimeLeft = `SLA depasse de ${formatDuration(exceededMs)}`;
    }
  } else {
    const remainingMs = resolutionDeadline.getTime() - now.getTime();
    if (remainingMs <= 0) {
      resolutionStatus = "breached";
      resolutionTimeLeft = `SLA depasse de ${formatDuration(Math.abs(remainingMs))}`;
    } else {
      const warningThreshold = config.resolution * 60 * 60 * 1000 * 0.25;
      resolutionStatus = remainingMs <= warningThreshold ? "warning" : "ok";
      resolutionTimeLeft = `Resolution dans ${formatDuration(remainingMs)}`;
    }
  }

  return {
    responseStatus,
    resolutionStatus,
    responseTimeLeft,
    resolutionTimeLeft,
  };
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.floor(ms / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0 && minutes > 0) return `${hours}h${String(minutes).padStart(2, "0")}`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}min`;
}

export async function getSlaMetrics() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      complianceRate: 0,
      avgResponseTime: "—",
      avgResolutionTime: "—",
      breachedCount: 0,
    };
  }

  const emptyMetrics = {
    complianceRate: 100,
    avgResponseTime: "—",
    avgResolutionTime: "—",
    breachedCount: 0,
  };

  const { data, error } = await supabase
    .from("support_tickets")
    .select("*, support_ticket_messages(sender_type, created_at)")
    .order("created_at", { ascending: false });

  if (error) {
    if (isTableMissing(error)) return emptyMetrics;
    throw new Error(error.message);
  }

  if (!data || data.length === 0) return emptyMetrics;

  const ticketsWithMessages = data.map((t: Record<string, unknown>) => ({
    ...t,
    priority: t.priority as "low" | "medium" | "high" | "urgent",
    status: t.status as "open" | "in_progress" | "waiting" | "resolved" | "closed",
    created_at: t.created_at as string,
    updated_at: t.updated_at as string,
    messages: (t.support_ticket_messages || []) as { sender_type: string; created_at: string }[],
  }));

  const slaConfig = await getSlaConfig();
  let breachedCount = 0;
  let totalResponseMs = 0;
  let responseCount = 0;
  let totalResolutionMs = 0;
  let resolutionCount = 0;

  for (const ticket of ticketsWithMessages) {
    const config = slaConfig[ticket.priority];
    const createdAt = new Date(ticket.created_at);
    const responseDeadline = new Date(
      createdAt.getTime() + config.firstResponse * 60 * 60 * 1000
    );
    const resolutionDeadline = new Date(
      createdAt.getTime() + config.resolution * 60 * 60 * 1000
    );

    const firstSupportMsg = (ticket.messages || []).find(
      (m) => m.sender_type === "support"
    );

    // Check response breach
    let responseBreach = false;
    if (firstSupportMsg) {
      const respTime = new Date(firstSupportMsg.created_at);
      totalResponseMs += respTime.getTime() - createdAt.getTime();
      responseCount++;
      if (respTime > responseDeadline) responseBreach = true;
    } else if (ticket.status !== "resolved" && ticket.status !== "closed") {
      if (new Date() > responseDeadline) responseBreach = true;
    }

    // Check resolution breach
    let resolutionBreach = false;
    if (ticket.status === "resolved" || ticket.status === "closed") {
      const resolvedAt = new Date(ticket.updated_at);
      totalResolutionMs += resolvedAt.getTime() - createdAt.getTime();
      resolutionCount++;
      if (resolvedAt > resolutionDeadline) resolutionBreach = true;
    } else {
      if (new Date() > resolutionDeadline) resolutionBreach = true;
    }

    if (responseBreach || resolutionBreach) breachedCount++;
  }

  const complianceRate =
    ticketsWithMessages.length > 0
      ? Math.round(
          ((ticketsWithMessages.length - breachedCount) /
            ticketsWithMessages.length) *
            100
        )
      : 100;

  const avgResponseTime =
    responseCount > 0
      ? formatDuration(totalResponseMs / responseCount)
      : "—";

  const avgResolutionTime =
    resolutionCount > 0
      ? formatDuration(totalResolutionMs / resolutionCount)
      : "—";

  return {
    complianceRate,
    avgResponseTime,
    avgResolutionTime,
    breachedCount,
  };
}

export async function getTicketStats() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { open: 0, in_progress: 0, resolved: 0, avg_resolution_hours: 0 };
  }

  const emptyStats = { open: 0, in_progress: 0, resolved: 0, avg_resolution_hours: 0 };

  const { data, error } = await supabase
    .from("support_tickets")
    .select("status, created_at, updated_at")
    .eq("user_id", user.id);

  if (error) {
    if (isTableMissing(error)) return emptyStats;
    throw new Error(error.message);
  }

  if (!data || data.length === 0) return emptyStats;

  const open = data.filter((t) => t.status === "open").length;
  const in_progress = data.filter((t) => t.status === "in_progress").length;
  const resolved = data.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  ).length;

  const resolvedTickets = data.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  );
  const totalHours = resolvedTickets.reduce((sum, t) => {
    const diff =
      new Date(t.updated_at).getTime() - new Date(t.created_at).getTime();
    return sum + diff / (1000 * 60 * 60);
  }, 0);
  const avg_resolution_hours =
    resolvedTickets.length > 0
      ? Math.round(totalHours / resolvedTickets.length)
      : 0;

  return { open, in_progress, resolved, avg_resolution_hours };
}
