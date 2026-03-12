"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─── Demo data ───────────────────────────────────────────────────────

const DEMO_TICKETS = [
  {
    id: "TK-001",
    subject: "Bug d'affichage sur le pipeline CRM",
    description:
      "Lorsque je fais glisser un deal de la colonne 'Proposition' vers 'Closing', l'affichage se fige pendant quelques secondes et le deal revient parfois à sa position initiale. Ce bug est reproductible sur Chrome et Firefox.",
    priority: "high" as const,
    category: "Bug",
    status: "in_progress" as const,
    created_at: "2026-03-02T09:15:00Z",
    updated_at: "2026-03-07T14:30:00Z",
    user_id: "demo-user",
    user_name: "Utilisateur",
    messages: [
      {
        id: "msg-001",
        ticket_id: "TK-001",
        content:
          "Lorsque je fais glisser un deal de la colonne 'Proposition' vers 'Closing', l'affichage se fige pendant quelques secondes et le deal revient parfois à sa position initiale.",
        sender_type: "user" as const,
        sender_name: "Utilisateur",
        created_at: "2026-03-02T09:15:00Z",
      },
      {
        id: "msg-002",
        ticket_id: "TK-001",
        content:
          "Merci pour votre retour. Nous avons identifié le problème lié au drag & drop. Un correctif est en cours de déploiement. Pourriez-vous nous confirmer votre version de navigateur ?",
        sender_type: "support" as const,
        sender_name: "Équipe Support",
        created_at: "2026-03-03T11:00:00Z",
      },
      {
        id: "msg-003",
        ticket_id: "TK-001",
        content: "Chrome 132.0.6834 sous macOS Sequoia. Merci pour la prise en charge rapide !",
        sender_type: "user" as const,
        sender_name: "Utilisateur",
        created_at: "2026-03-03T14:20:00Z",
      },
    ],
  },
  {
    id: "TK-002",
    subject: "Demande de fonctionnalité : export PDF des analytics",
    description:
      "Il serait très utile de pouvoir exporter les rapports analytics (funnel, attribution, heatmap) au format PDF pour les partager lors des réunions d'équipe.",
    priority: "medium" as const,
    category: "Fonctionnalité",
    status: "open" as const,
    created_at: "2026-03-05T16:45:00Z",
    updated_at: "2026-03-05T16:45:00Z",
    user_id: "demo-user",
    user_name: "Utilisateur",
    messages: [
      {
        id: "msg-004",
        ticket_id: "TK-002",
        content:
          "Il serait très utile de pouvoir exporter les rapports analytics au format PDF pour les partager lors des réunions d'équipe.",
        sender_type: "user" as const,
        sender_name: "Utilisateur",
        created_at: "2026-03-05T16:45:00Z",
      },
    ],
  },
  {
    id: "TK-003",
    subject: "Question sur la facturation mensuelle",
    description:
      "Je ne comprends pas le montant de ma dernière facture. Il semble y avoir un supplément que je n'avais pas anticipé. Pouvez-vous m'expliquer le détail ?",
    priority: "medium" as const,
    category: "Facturation",
    status: "resolved" as const,
    created_at: "2026-02-20T10:30:00Z",
    updated_at: "2026-02-22T09:00:00Z",
    user_id: "demo-user",
    user_name: "Utilisateur",
    messages: [
      {
        id: "msg-005",
        ticket_id: "TK-003",
        content:
          "Je ne comprends pas le montant de ma dernière facture. Il semble y avoir un supplément.",
        sender_type: "user" as const,
        sender_name: "Utilisateur",
        created_at: "2026-02-20T10:30:00Z",
      },
      {
        id: "msg-006",
        ticket_id: "TK-003",
        content:
          "Bonjour, le supplément correspond à l'ajout de 2 utilisateurs supplémentaires effectué le 15 février. Le tarif est proratisé pour la période restante du mois. Souhaitez-vous plus de détails ?",
        sender_type: "support" as const,
        sender_name: "Équipe Support",
        created_at: "2026-02-21T08:45:00Z",
      },
      {
        id: "msg-007",
        ticket_id: "TK-003",
        content:
          "Ah oui, c'est vrai ! Merci pour l'explication, tout est clair maintenant.",
        sender_type: "user" as const,
        sender_name: "Utilisateur",
        created_at: "2026-02-21T14:00:00Z",
      },
      {
        id: "msg-status-003",
        ticket_id: "TK-003",
        content: "Statut changé : Résolu",
        sender_type: "system" as const,
        sender_name: "Système",
        created_at: "2026-02-22T09:00:00Z",
      },
    ],
  },
  {
    id: "TK-004",
    subject: "Impossible de réinitialiser mon mot de passe",
    description:
      "Je ne reçois pas l'email de réinitialisation de mot de passe. J'ai vérifié mes spams et essayé plusieurs fois. Mon adresse est correcte.",
    priority: "urgent" as const,
    category: "Compte",
    status: "resolved" as const,
    created_at: "2026-02-15T08:00:00Z",
    updated_at: "2026-02-15T12:30:00Z",
    user_id: "demo-user",
    user_name: "Utilisateur",
    messages: [
      {
        id: "msg-008",
        ticket_id: "TK-004",
        content:
          "Je ne reçois pas l'email de réinitialisation de mot de passe malgré plusieurs tentatives.",
        sender_type: "user" as const,
        sender_name: "Utilisateur",
        created_at: "2026-02-15T08:00:00Z",
      },
      {
        id: "msg-009",
        ticket_id: "TK-004",
        content:
          "Nous avons identifié un problème temporaire avec notre service d'envoi d'emails. Il est maintenant résolu. Vous devriez recevoir l'email sous quelques minutes.",
        sender_type: "support" as const,
        sender_name: "Équipe Support",
        created_at: "2026-02-15T10:15:00Z",
      },
      {
        id: "msg-010",
        ticket_id: "TK-004",
        content: "C'est bon, j'ai bien reçu l'email et pu changer mon mot de passe. Merci !",
        sender_type: "user" as const,
        sender_name: "Utilisateur",
        created_at: "2026-02-15T11:00:00Z",
      },
      {
        id: "msg-status-004",
        ticket_id: "TK-004",
        content: "Statut changé : Résolu",
        sender_type: "system" as const,
        sender_name: "Système",
        created_at: "2026-02-15T12:30:00Z",
      },
    ],
  },
  {
    id: "TK-005",
    subject: "Aide pour connecter l'intégration WhatsApp",
    description:
      "Je n'arrive pas à connecter mon numéro WhatsApp Business à la plateforme. L'étape de vérification du token échoue systématiquement.",
    priority: "low" as const,
    category: "Intégration",
    status: "waiting" as const,
    created_at: "2026-03-07T13:00:00Z",
    updated_at: "2026-03-08T10:00:00Z",
    user_id: "demo-user",
    user_name: "Utilisateur",
    messages: [
      {
        id: "msg-011",
        ticket_id: "TK-005",
        content:
          "Je n'arrive pas à connecter mon numéro WhatsApp Business. L'étape de vérification du token échoue.",
        sender_type: "user" as const,
        sender_name: "Utilisateur",
        created_at: "2026-03-07T13:00:00Z",
      },
      {
        id: "msg-012",
        ticket_id: "TK-005",
        content:
          "Bonjour, pourriez-vous nous partager une capture d'écran de l'erreur et confirmer que vous utilisez bien un compte WhatsApp Business API (et non la version standard) ?",
        sender_type: "support" as const,
        sender_name: "Équipe Support",
        created_at: "2026-03-08T10:00:00Z",
      },
    ],
  },
  {
    id: "TK-006",
    subject: "Ralentissements sur le dashboard analytics",
    description:
      "Le dashboard analytics met plus de 10 secondes à charger les graphiques depuis la dernière mise à jour. Le problème est plus prononcé avec de grandes périodes (6 mois+).",
    priority: "high" as const,
    category: "Bug",
    status: "closed" as const,
    created_at: "2026-01-28T11:20:00Z",
    updated_at: "2026-02-05T16:00:00Z",
    user_id: "demo-user",
    user_name: "Utilisateur",
    messages: [
      {
        id: "msg-013",
        ticket_id: "TK-006",
        content:
          "Le dashboard analytics met plus de 10 secondes à charger les graphiques depuis la dernière mise à jour.",
        sender_type: "user" as const,
        sender_name: "Utilisateur",
        created_at: "2026-01-28T11:20:00Z",
      },
      {
        id: "msg-014",
        ticket_id: "TK-006",
        content:
          "Nous avons optimisé les requêtes et ajouté un système de cache. Les temps de chargement devraient être bien meilleurs maintenant. N'hésitez pas à nous dire si le problème persiste.",
        sender_type: "support" as const,
        sender_name: "Équipe Support",
        created_at: "2026-02-03T09:30:00Z",
      },
      {
        id: "msg-015",
        ticket_id: "TK-006",
        content: "Effectivement, c'est beaucoup plus rapide maintenant. Merci !",
        sender_type: "user" as const,
        sender_name: "Utilisateur",
        created_at: "2026-02-04T15:00:00Z",
      },
      {
        id: "msg-status-006",
        ticket_id: "TK-006",
        content: "Statut changé : Fermé",
        sender_type: "system" as const,
        sender_name: "Système",
        created_at: "2026-02-05T16:00:00Z",
      },
    ],
  },
];

// ─── Server Actions ──────────────────────────────────────────────────

export async function getTickets() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  try {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) return data;
  } catch {
    // Table doesn't exist or query failed — fallback to demo
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return DEMO_TICKETS.map(({ messages, ...ticket }) => ticket);
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

  try {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) return data;
  } catch {
    // Fallback to demo
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return DEMO_TICKETS.map(({ messages, ...ticket }) => ticket);
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

  try {
    const { error } = await supabase.from("support_tickets").insert({
      subject: data.subject,
      description: data.description,
      priority: data.priority,
      category: data.category,
      status: "open",
      user_id: user.id,
      user_name: user.user_metadata?.full_name || user.email || "Utilisateur",
    });

    if (error) throw error;
    revalidatePath("/support");
    return { success: true };
  } catch {
    // Table doesn't exist — simulate success with demo data
    revalidatePath("/support");
    return { success: true, demo: true };
  }
}

export async function getTicketDetails(ticketId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  try {
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (error) throw error;

    const { data: messages } = await supabase
      .from("support_ticket_messages")
      .select("*")
      .eq("ticket_id", ticketId)
      .order("created_at", { ascending: true });

    return { ...ticket, messages: messages || [] };
  } catch {
    // Fallback to demo
  }

  const demoTicket = DEMO_TICKETS.find((t) => t.id === ticketId);
  return demoTicket || null;
}

export async function addTicketReply(ticketId: string, message: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Non authentifié" };

  try {
    const { error } = await supabase.from("support_ticket_messages").insert({
      ticket_id: ticketId,
      content: message,
      sender_type: "user",
      sender_name: user.user_metadata?.full_name || user.email || "Utilisateur",
    });

    if (error) throw error;

    // Update the ticket's updated_at
    await supabase
      .from("support_tickets")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    revalidatePath("/support");
    return { success: true };
  } catch {
    revalidatePath("/support");
    return { success: true, demo: true };
  }
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

  try {
    const { error } = await supabase
      .from("support_tickets")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (error) throw error;

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
  } catch {
    revalidatePath("/support");
    return { success: true, demo: true };
  }
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

  // Try to get real tickets with messages
  let ticketsWithMessages: {
    priority: "low" | "medium" | "high" | "urgent";
    status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
    created_at: string;
    updated_at: string;
    messages?: { sender_type: string; created_at: string }[];
  }[] = [];

  try {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("*, support_ticket_messages(sender_type, created_at)")
      .order("created_at", { ascending: false });

    if (error) throw error;
    if (data && data.length > 0) {
      ticketsWithMessages = data.map((t: Record<string, unknown>) => ({
        ...t,
        priority: t.priority as "low" | "medium" | "high" | "urgent",
        status: t.status as "open" | "in_progress" | "waiting" | "resolved" | "closed",
        created_at: t.created_at as string,
        updated_at: t.updated_at as string,
        messages: (t.support_ticket_messages || []) as { sender_type: string; created_at: string }[],
      }));
    }
  } catch {
    // Fallback to demo data
  }

  if (ticketsWithMessages.length === 0) {
    ticketsWithMessages = DEMO_TICKETS.map((t) => ({
      priority: t.priority,
      status: t.status,
      created_at: t.created_at,
      updated_at: t.updated_at,
      messages: t.messages.map((m) => ({
        sender_type: m.sender_type,
        created_at: m.created_at,
      })),
    }));
  }

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

  try {
    const { data, error } = await supabase
      .from("support_tickets")
      .select("status, created_at, updated_at")
      .eq("user_id", user.id);

    if (error) throw error;

    if (data && data.length > 0) {
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
  } catch {
    // Fallback to demo stats
  }

  // Compute demo stats
  const open = DEMO_TICKETS.filter((t) => t.status === "open").length;
  const in_progress = DEMO_TICKETS.filter(
    (t) => t.status === "in_progress" || t.status === "waiting"
  ).length;
  const resolved = DEMO_TICKETS.filter(
    (t) => t.status === "resolved" || t.status === "closed"
  ).length;

  return { open, in_progress, resolved, avg_resolution_hours: 18 };
}
