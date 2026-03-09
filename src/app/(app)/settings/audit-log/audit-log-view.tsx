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
import type { AuditLogEntry } from "@/lib/actions/audit-log";

interface AuditLogViewProps {
  logs: AuditLogEntry[];
}

const entityTypeBadgeColors: Record<string, string> = {
  deal: "bg-blue-100 text-blue-700",
  contact: "bg-green-100 text-green-700",
  contract: "bg-purple-100 text-purple-700",
  booking: "bg-orange-100 text-orange-700",
  profile: "bg-brand/10 text-brand-dark",
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Journal d&apos;audit</h1>
        <p className="text-muted-foreground">
          Historique des actions effectuées dans le système
        </p>
      </div>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered.length} entrée(s)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Utilisateur</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Détails</TableHead>
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
                        "bg-gray-100 text-gray-700"
                      }
                    >
                      {log.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[300px] truncate">
                    {log.entity_id && (
                      <span className="mr-2 font-mono">{log.entity_id.slice(0, 8)}</span>
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
