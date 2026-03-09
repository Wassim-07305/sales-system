"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import type { Profile, UserRole } from "@/lib/types/database";
import { Search, Plus, Mail, Phone, Download } from "lucide-react";
import { ImportExportDialog } from "./import-export-dialog";
import { ExportDialog } from "@/components/export-dialog";

interface ContactsListProps {
  initialContacts: Profile[];
}

const roleBadgeColors: Record<UserRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  manager: "bg-blue-100 text-blue-700",
  setter: "bg-green-100 text-green-700",
  closer: "bg-orange-100 text-orange-700",
  client_b2b: "bg-brand/10 text-brand-dark",
  client_b2c: "bg-gray-100 text-gray-700",
};

export function ContactsList({ initialContacts }: ContactsListProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [exportOpen, setExportOpen] = useState(false);

  const filtered = initialContacts.filter((c) => {
    const matchesSearch =
      !search ||
      c.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      c.company?.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "all" || c.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher un contact..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Rôle" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            <SelectItem value="client_b2b">Client B2B</SelectItem>
            <SelectItem value="client_b2c">Client B2C</SelectItem>
            <SelectItem value="setter">Setter</SelectItem>
            <SelectItem value="closer">Closer</SelectItem>
          </SelectContent>
        </Select>
        <ImportExportDialog />
        <Button variant="outline" size="sm" onClick={() => setExportOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Export avancé
        </Button>
        <ExportDialog type="contacts" open={exportOpen} onOpenChange={setExportOpen} />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Entreprise</TableHead>
                <TableHead>Score santé</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((contact) => (
                <TableRow key={contact.id}>
                  <TableCell>
                    <Link
                      href={`/contacts/${contact.id}`}
                      className="flex items-center gap-3 hover:underline"
                    >
                      <div className="h-8 w-8 rounded-full bg-brand/10 flex items-center justify-center text-brand text-xs font-bold shrink-0">
                        {contact.full_name?.charAt(0)?.toUpperCase() || "?"}
                      </div>
                      <span className="font-medium">
                        {contact.full_name || "Sans nom"}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.email}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={roleBadgeColors[contact.role]}
                    >
                      {contact.role.replace("_", " ")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {contact.company || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-2 w-2 rounded-full ${
                          contact.health_score >= 70
                            ? "bg-green-500"
                            : contact.health_score >= 40
                            ? "bg-orange-400"
                            : "bg-red-500"
                        }`}
                      />
                      <span className="text-sm">{contact.health_score}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center gap-1 justify-end">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Mail className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Aucun contact trouvé
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
