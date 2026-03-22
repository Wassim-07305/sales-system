"use client";

import { useState, useEffect, useTransition } from "react";
import {
  LifeBuoy,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  ChevronDown,
  ChevronUp,
  Loader2,
  Plus,
  Filter,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { toast } from "sonner";
import {
  createTicket,
  getTicketDetails,
  addTicketReply,
  updateTicketStatus,
  getAllTickets,
  getSlaStatus,
  getSlaMetrics,
  getSlaConfig,
} from "@/lib/actions/support";

// ─── Local types (not exported from server action) ───────────────────

interface TicketMessage {
  id: string;
  ticket_id: string;
  content: string;
  sender_type: "user" | "support" | "system";
  sender_name: string;
  created_at: string;
}

interface Ticket {
  id: string;
  subject: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  category: string;
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
  user_id: string;
  user_name: string;
  messages?: TicketMessage[];
}

interface TicketStats {
  open: number;
  in_progress: number;
  resolved: number;
  avg_resolution_hours: number;
}

interface SlaStatusInfo {
  responseStatus: "ok" | "warning" | "breached";
  resolutionStatus: "ok" | "warning" | "breached";
  responseTimeLeft: string;
  resolutionTimeLeft: string;
}

interface SlaMetricsInfo {
  complianceRate: number;
  avgResponseTime: string;
  avgResolutionTime: string;
  breachedCount: number;
}

interface SlaConfigInfo {
  urgent: { firstResponse: number; resolution: number };
  high: { firstResponse: number; resolution: number };
  medium: { firstResponse: number; resolution: number };
  low: { firstResponse: number; resolution: number };
}

interface SupportViewProps {
  tickets: Ticket[];
  stats: TicketStats;
  userRole: string;
  userName: string;
}

// ─── Constants ───────────────────────────────────────────────────────

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-500/10 text-slate-600 border-slate-500/20",
  medium: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  high: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  urgent: "bg-red-500/10 text-red-600 border-red-500/20",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente",
};

const STATUS_COLORS: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  in_progress: "bg-amber-500/10 text-amber-600 border-amber-500/20",
  waiting: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  resolved: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  closed: "bg-slate-500/10 text-slate-600 border-slate-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  waiting: "En attente",
  resolved: "Résolu",
  closed: "Fermé",
};

const CATEGORIES = [
  "Bug",
  "Fonctionnalité",
  "Facturation",
  "Compte",
  "Intégration",
  "Autre",
];

// ─── Component ───────────────────────────────────────────────────────

export function SupportView({
  tickets: initialTickets,
  stats,
  userRole,
  userName,
}: SupportViewProps) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets);
  const [expandedTicketId, setExpandedTicketId] = useState<string | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<Ticket | null>(null);
  const [replyText, setReplyText] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isPending, startTransition] = useTransition();

  // New ticket form state
  const [newSubject, setNewSubject] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newPriority, setNewPriority] = useState("");
  const [newDescription, setNewDescription] = useState("");

  // Admin: all tickets
  const [allTickets, setAllTickets] = useState<Ticket[] | null>(null);
  const [allTicketsLoaded, setAllTicketsLoaded] = useState(false);

  // SLA state
  const [slaStatuses, setSlaStatuses] = useState<Record<string, SlaStatusInfo>>(
    {},
  );
  const [, setSlaMetricsData] = useState<SlaMetricsInfo | null>(null);
  const [, setSlaConfigData] = useState<SlaConfigInfo | null>(null);

  const isAdmin = userRole === "admin" || userRole === "manager";

  // Load SLA data on mount
  useEffect(() => {
    async function loadSlaData() {
      const [metrics, config] = await Promise.all([
        getSlaMetrics(),
        getSlaConfig(),
      ]);
      setSlaMetricsData(metrics);
      setSlaConfigData(config);

      // Compute SLA status for each ticket
      const statuses: Record<string, SlaStatusInfo> = {};
      for (const ticket of initialTickets) {
        const status = await getSlaStatus(ticket);
        statuses[ticket.id] = status;
      }
      setSlaStatuses(statuses);
    }
    loadSlaData();
  }, [initialTickets]);

  function slaSort(a: Ticket, b: Ticket): number {
    const slaA = slaStatuses[a.id];
    const slaB = slaStatuses[b.id];
    const scoreA = slaA
      ? slaA.responseStatus === "breached" ||
        slaA.resolutionStatus === "breached"
        ? 0
        : 1
      : 1;
    const scoreB = slaB
      ? slaB.responseStatus === "breached" ||
        slaB.resolutionStatus === "breached"
        ? 0
        : 1
      : 1;
    return scoreA - scoreB;
  }

  const filteredTickets = tickets
    .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
    .sort(slaSort);

  const filteredAllTickets = (allTickets || [])
    .filter((t) => (statusFilter === "all" ? true : t.status === statusFilter))
    .sort(slaSort);

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleToggleExpand(ticketId: string) {
    if (expandedTicketId === ticketId) {
      setExpandedTicketId(null);
      setExpandedTicket(null);
      setReplyText("");
      return;
    }

    setExpandedTicketId(ticketId);
    startTransition(async () => {
      const details = await getTicketDetails(ticketId);
      if (details) {
        setExpandedTicket(details as Ticket);
      }
    });
  }

  function handleSubmitTicket() {
    if (
      !newSubject.trim() ||
      !newCategory ||
      !newPriority ||
      !newDescription.trim()
    ) {
      toast.error("Veuillez remplir tous les champs", {
        style: { background: "#09090b", borderColor: "#333" },
      });
      return;
    }

    startTransition(async () => {
      const result = await createTicket({
        subject: newSubject,
        description: newDescription,
        priority: newPriority,
        category: newCategory,
      });

      if (result.error) {
        toast.error(result.error, {
          style: { background: "#09090b", borderColor: "#333" },
        });
        return;
      }

      // Add to local state
      const newTicket: Ticket = {
        id: `TK-${String(tickets.length + 1).padStart(3, "0")}`,
        subject: newSubject,
        description: newDescription,
        priority: newPriority as Ticket["priority"],
        category: newCategory,
        status: "open",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        user_id: "current-user",
        user_name: userName,
      };

      setTickets((prev) => [newTicket, ...prev]);
      setNewSubject("");
      setNewCategory("");
      setNewPriority("");
      setNewDescription("");

      toast.success("Ticket créé avec succès", {
        style: { background: "#09090b", borderColor: "#333" },
      });
    });
  }

  function handleSendReply() {
    if (!replyText.trim() || !expandedTicketId) return;

    startTransition(async () => {
      const result = await addTicketReply(expandedTicketId, replyText);

      if (result.error) {
        toast.error(result.error, {
          style: { background: "#09090b", borderColor: "#333" },
        });
        return;
      }

      // Update local expanded ticket messages
      if (expandedTicket) {
        const newMessage: TicketMessage = {
          id: `msg-new-${Date.now()}`,
          ticket_id: expandedTicketId,
          content: replyText,
          sender_type: "user",
          sender_name: userName,
          created_at: new Date().toISOString(),
        };
        setExpandedTicket({
          ...expandedTicket,
          messages: [...(expandedTicket.messages || []), newMessage],
        });
      }

      setReplyText("");
      toast.success("Réponse envoyée", {
        style: { background: "#09090b", borderColor: "#333" },
      });
    });
  }

  function handleStatusChange(ticketId: string, newStatus: string) {
    startTransition(async () => {
      const result = await updateTicketStatus(ticketId, newStatus);

      if (result.error) {
        toast.error(result.error, {
          style: { background: "#09090b", borderColor: "#333" },
        });
        return;
      }

      setTickets((prev) =>
        prev.map((t) =>
          t.id === ticketId
            ? {
                ...t,
                status: newStatus as Ticket["status"],
                updated_at: new Date().toISOString(),
              }
            : t,
        ),
      );

      if (allTickets) {
        setAllTickets((prev) =>
          (prev || []).map((t) =>
            t.id === ticketId
              ? {
                  ...t,
                  status: newStatus as Ticket["status"],
                  updated_at: new Date().toISOString(),
                }
              : t,
          ),
        );
      }

      toast.success("Statut mis à jour", {
        style: { background: "#09090b", borderColor: "#333" },
      });
    });
  }

  function handleLoadAllTickets() {
    startTransition(async () => {
      const data = await getAllTickets();
      setAllTickets(data as Ticket[]);
      setAllTicketsLoaded(true);
    });
  }

  function renderTicketRow(ticket: Ticket, showActions: boolean) {
    const isExpanded = expandedTicketId === ticket.id;

    return (
      <>
        <TableRow
          key={ticket.id}
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => handleToggleExpand(ticket.id)}
        >
          <TableCell className="font-mono text-xs text-muted-foreground">
            {ticket.id}
          </TableCell>
          <TableCell className="font-medium max-w-[200px] truncate">
            {ticket.subject}
          </TableCell>
          <TableCell>{ticket.category}</TableCell>
          <TableCell>
            <Badge
              variant="outline"
              className={`text-xs ${PRIORITY_COLORS[ticket.priority]}`}
            >
              {PRIORITY_LABELS[ticket.priority]}
            </Badge>
          </TableCell>
          <TableCell>
            <Badge
              variant="outline"
              className={`text-xs ${STATUS_COLORS[ticket.status]}`}
            >
              {STATUS_LABELS[ticket.status]}
            </Badge>
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {formatDate(ticket.created_at)}
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">
            {formatDate(ticket.updated_at)}
          </TableCell>
          <TableCell>
            {isExpanded ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </TableCell>
        </TableRow>

        {isExpanded && (
          <TableRow key={`${ticket.id}-expanded`}>
            <TableCell colSpan={8} className="p-0">
              <div className="border-t bg-muted/20 p-6">
                {/* Status change for admin */}
                {showActions && isAdmin && (
                  <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/50">
                    <span className="text-sm text-muted-foreground">
                      Changer le statut :
                    </span>
                    <Select
                      value={ticket.status}
                      onValueChange={(val) =>
                        handleStatusChange(ticket.id, val)
                      }
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Ouvert</SelectItem>
                        <SelectItem value="in_progress">En cours</SelectItem>
                        <SelectItem value="waiting">En attente</SelectItem>
                        <SelectItem value="resolved">Résolu</SelectItem>
                        <SelectItem value="closed">Fermé</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Conversation thread */}
                <div className="space-y-4 mb-4 max-h-[400px] overflow-y-auto">
                  {isPending && !expandedTicket ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="size-5 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">
                        Chargement...
                      </span>
                    </div>
                  ) : (
                    (expandedTicket?.messages || []).map((msg) => {
                      if (msg.sender_type === "system") {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                              {msg.content} - {formatDate(msg.created_at)}
                            </span>
                          </div>
                        );
                      }

                      const isUser = msg.sender_type === "user";

                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isUser ? "justify-start" : "justify-end"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isUser
                                ? "bg-muted"
                                : "bg-[#10b981]/10 border border-[#10b981]/20"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <div
                                className={`size-6 rounded-full flex items-center justify-center text-xs font-medium ${
                                  isUser
                                    ? "bg-primary/20 text-primary"
                                    : "bg-[#10b981]/20 text-[#10b981]"
                                }`}
                              >
                                {msg.sender_name.charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-medium">
                                {msg.sender_name}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatDate(msg.created_at)}
                              </span>
                            </div>
                            <p className="text-sm leading-relaxed">
                              {msg.content}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Reply area */}
                {ticket.status !== "closed" && (
                  <div className="flex gap-2 pt-4 border-t border-border/50">
                    <Textarea
                      placeholder="Votre réponse..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="min-h-[80px] resize-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                          handleSendReply();
                        }
                      }}
                    />
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSendReply();
                      }}
                      disabled={!replyText.trim() || isPending}
                      className="self-end bg-[#10b981] text-black hover:bg-[#10b981]/80"
                    >
                      <Send className="size-4 mr-1" />
                      Envoyer
                    </Button>
                  </div>
                )}
              </div>
            </TableCell>
          </TableRow>
        )}
      </>
    );
  }

  const statusFilterDropdown = (
    <div className="flex items-center gap-2 mb-4">
      <Filter className="size-4 text-muted-foreground" />
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filtrer par statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les statuts</SelectItem>
          <SelectItem value="open">Ouvert</SelectItem>
          <SelectItem value="in_progress">En cours</SelectItem>
          <SelectItem value="waiting">En attente</SelectItem>
          <SelectItem value="resolved">Résolu</SelectItem>
          <SelectItem value="closed">Fermé</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Support"
        description="Gérez vos tickets de support et contactez notre équipe"
      >
        <LifeBuoy className="size-5 text-[#10b981]" />
      </PageHeader>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Tickets ouverts
            </CardTitle>
            <div className="h-9 w-9 rounded-lg ring-1 ring-blue-500/20 bg-blue-500/10 flex items-center justify-center">
              <MessageSquare className="size-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.open}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              En cours
            </CardTitle>
            <div className="h-9 w-9 rounded-lg ring-1 ring-amber-500/20 bg-amber-500/10 flex items-center justify-center">
              <Clock className="size-4 text-amber-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.in_progress}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Résolus
            </CardTitle>
            <div className="h-9 w-9 rounded-lg ring-1 ring-emerald-500/20 bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle className="size-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.resolved}</div>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
              Temps moyen résolution
            </CardTitle>
            <div className="h-9 w-9 rounded-lg ring-1 ring-purple-500/20 bg-purple-500/10 flex items-center justify-center">
              <AlertTriangle className="size-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avg_resolution_hours}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="my-tickets">
        <TabsList className="bg-muted/30 rounded-lg p-0.5">
          <TabsTrigger
            value="my-tickets"
            className="data-[state=active]:bg-emerald-500 data-[state=active]:text-black data-[state=active]:shadow-sm"
          >
            Mes tickets
          </TabsTrigger>
          <TabsTrigger
            value="new-ticket"
            className="data-[state=active]:bg-emerald-500 data-[state=active]:text-black data-[state=active]:shadow-sm"
          >
            <Plus className="size-4 mr-1" />
            Nouveau ticket
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger
              value="all-tickets"
              className="data-[state=active]:bg-emerald-500 data-[state=active]:text-black data-[state=active]:shadow-sm"
              onClick={() => {
                if (!allTicketsLoaded) handleLoadAllTickets();
              }}
            >
              Tous les tickets
            </TabsTrigger>
          )}
        </TabsList>

        {/* My tickets tab */}
        <TabsContent value="my-tickets" className="mt-4">
          {statusFilterDropdown}

          {filteredTickets.length === 0 ? (
            <Card className="border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                  <LifeBuoy className="size-7 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm font-medium">
                  Aucun ticket trouvé
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Créez un nouveau ticket pour contacter le support
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">#ID</TableHead>
                      <TableHead>Sujet</TableHead>
                      <TableHead>Catégorie</TableHead>
                      <TableHead>Priorité</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Créé le</TableHead>
                      <TableHead>Dernière MAJ</TableHead>
                      <TableHead className="w-[40px]" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) =>
                      renderTicketRow(ticket, true),
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* New ticket tab */}
        <TabsContent value="new-ticket" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Créer un nouveau ticket</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Sujet
                </label>
                <Input
                  placeholder="Décrivez brièvement votre problème"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Catégorie
                  </label>
                  <Select value={newCategory} onValueChange={setNewCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner une catégorie" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                    Priorité
                  </label>
                  <Select value={newPriority} onValueChange={setNewPriority}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner la priorité" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">
                        <span style={{ color: PRIORITY_COLORS.low }}>
                          Basse
                        </span>
                      </SelectItem>
                      <SelectItem value="medium">
                        <span style={{ color: PRIORITY_COLORS.medium }}>
                          Moyenne
                        </span>
                      </SelectItem>
                      <SelectItem value="high">
                        <span style={{ color: PRIORITY_COLORS.high }}>
                          Haute
                        </span>
                      </SelectItem>
                      <SelectItem value="urgent">
                        <span style={{ color: PRIORITY_COLORS.urgent }}>
                          Urgente
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                  Description
                </label>
                <Textarea
                  placeholder="Décrivez votre problème en détail..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>

              <Button
                onClick={handleSubmitTicket}
                disabled={isPending}
                className="bg-[#10b981] text-black hover:bg-[#10b981]/80"
              >
                {isPending ? (
                  <Loader2 className="size-4 mr-2 animate-spin" />
                ) : (
                  <Send className="size-4 mr-2" />
                )}
                Soumettre le ticket
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* All tickets tab (admin/manager) */}
        {isAdmin && (
          <TabsContent value="all-tickets" className="mt-4">
            {statusFilterDropdown}

            {!allTicketsLoaded ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Loader2 className="size-8 animate-spin text-muted-foreground mb-4" />
                  <p className="text-sm text-muted-foreground">
                    Chargement des tickets...
                  </p>
                </CardContent>
              </Card>
            ) : filteredAllTickets.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <div className="h-14 w-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <LifeBuoy className="size-7 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground text-sm font-medium">
                    Aucun ticket trouvé
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[80px]">#ID</TableHead>
                        <TableHead>Sujet</TableHead>
                        <TableHead>Catégorie</TableHead>
                        <TableHead>Priorité</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Créé le</TableHead>
                        <TableHead>Dernière MAJ</TableHead>
                        <TableHead className="w-[40px]" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAllTickets.map((ticket) =>
                        renderTicketRow(ticket, true),
                      )}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
