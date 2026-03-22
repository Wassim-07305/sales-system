"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/layout/page-header";
import { History } from "lucide-react";
import type { AuditLogEntry } from "@/lib/actions/audit-log";

interface AuditLogViewProps {
  logs: AuditLogEntry[];
}

const entityTypeBadgeColors: Record<string, string> = {
  deal: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  contact: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
  contract: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  booking: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  profile: "bg-emerald-500/10 text-black border-emerald-500/20",
};

export function AuditLogView({ logs }: AuditLogViewProps) {
  const [entityFilter, setEntityFilter] = useState<string>("all");

  const entityTypes = Array.from(new Set(logs.map((l) => l.entity_type)));

  const filtered =
    entityFilter === "all"
      ? logs
      : logs.filter((l) => l.entity_type === entityFilter);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Journal d'audit"
        description="Historique des actions effectuées dans le système"
      />

      <div className="flex items-center gap-3">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Type d'entité" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les types</SelectItem>
            {entityTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card className="overflow-hidden border-border/50">
        <CardHeader className="border-b border-border/30 bg-muted/20">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
              <History className="h-4 w-4 text-emerald-500" />
            </div>
            {filtered.length} entrée(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[700px]">
            <TableHeader>
              <TableRow className="border-b border-border/30 bg-muted/10 hover:bg-muted/10">
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Date
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Utilisateur
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Action
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Type
                </TableHead>
                <TableHead className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Détails
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDistanceToNow(new Date(log.created_at), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </TableCell>
                  <TableCell className="font-medium">
                    {log.user_name || "Système"}
                  </TableCell>
                  <TableCell>{log.action}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        entityTypeBadgeColors[log.entity_type] ??
                        "bg-muted text-muted-foreground border-border/40"
                      }
                    >
                      {log.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[300px] truncate">
                    {log.entity_id && (
                      <span className="mr-2 font-mono">
                        {log.entity_id.slice(0, 8)}
                      </span>
                    )}
                    {Object.keys(log.details).length > 0
                      ? JSON.stringify(log.details).slice(0, 100)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center py-8 text-muted-foreground"
                  >
                    Aucune entrée trouvée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
