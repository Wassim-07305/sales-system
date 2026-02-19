"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Send, MessageCircle, Target } from "lucide-react";

const mockProspects = [
  { name: "Jean-Pierre M.", platform: "LinkedIn", status: "contacted", lastMessage: "Il y a 2j" },
  { name: "Sarah K.", platform: "Instagram", status: "replied", lastMessage: "Il y a 1j" },
  { name: "Marc D.", platform: "LinkedIn", status: "booked", lastMessage: "Aujourd'hui" },
  { name: "Sophie R.", platform: "Instagram", status: "new", lastMessage: "—" },
];

const statusColors: Record<string, string> = {
  new: "bg-gray-100 text-gray-700",
  contacted: "bg-blue-100 text-blue-700",
  replied: "bg-green-100 text-green-700",
  booked: "bg-brand/10 text-brand-dark",
  not_interested: "bg-red-100 text-red-700",
};

export default function ProspectingPage() {
  const [dmsSent] = useState(14);
  const dmsTarget = 20;

  return (
    <div>
      <PageHeader
        title="Prospection"
        description="Tracker de prospection et quotas journaliers"
      >
        <Button className="bg-brand text-brand-dark hover:bg-brand/90">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un prospect
        </Button>
      </PageHeader>

      {/* Daily quota */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-brand/10 flex items-center justify-center">
                <Send className="h-5 w-5 text-brand" />
              </div>
              <div>
                <h3 className="font-semibold">Quota journalier</h3>
                <p className="text-sm text-muted-foreground">
                  {dmsSent}/{dmsTarget} DMs envoyés aujourd&apos;hui
                </p>
              </div>
            </div>
            <span className="text-2xl font-bold">{Math.round((dmsSent / dmsTarget) * 100)}%</span>
          </div>
          <Progress value={(dmsSent / dmsTarget) * 100} className="h-3" />
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <Send className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">14</p>
            <p className="text-xs text-muted-foreground">DMs envoyés</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageCircle className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">5</p>
            <p className="text-xs text-muted-foreground">Réponses reçues</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-5 w-5 text-brand mx-auto mb-2" />
            <p className="text-2xl font-bold">2</p>
            <p className="text-xs text-muted-foreground">RDV bookés</p>
          </CardContent>
        </Card>
      </div>

      {/* Prospects table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Prospects</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher..." className="pl-9 h-9" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Plateforme</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Dernier message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockProspects.map((prospect, i) => (
                <TableRow key={i}>
                  <TableCell className="font-medium">{prospect.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{prospect.platform}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusColors[prospect.status]}
                    >
                      {prospect.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {prospect.lastMessage}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
