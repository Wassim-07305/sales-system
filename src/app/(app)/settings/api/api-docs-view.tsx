"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Code,
  Globe,
  Key,
  ChevronDown,
  ChevronRight,
  Copy,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

const BASE_URL = typeof window !== "undefined" ? window.location.origin : "";

interface Endpoint {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  params?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  body?: {
    name: string;
    type: string;
    required: boolean;
    description: string;
  }[];
  response: string;
}

const ENDPOINTS: Endpoint[] = [
  {
    method: "GET",
    path: "/api/v1/deals",
    description: "Lister les deals avec pagination",
    params: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "Numéro de page (défaut: 1)",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "Résultats par page (max: 100, défaut: 20)",
      },
      {
        name: "status",
        type: "string",
        required: false,
        description: "Filtrer par statut",
      },
    ],
    response:
      '{ "data": [{ "id": "...", "name": "Deal A", "value": 5000, "status": "open" }], "meta": { "page": 1, "limit": 20, "total": 42 } }',
  },
  {
    method: "POST",
    path: "/api/v1/deals",
    description: "Créer un nouveau deal",
    body: [
      {
        name: "name",
        type: "string",
        required: true,
        description: "Nom du deal",
      },
      {
        name: "value",
        type: "number",
        required: false,
        description: "Valeur en euros",
      },
      {
        name: "status",
        type: "string",
        required: false,
        description: "Statut (défaut: open)",
      },
      {
        name: "stage",
        type: "string",
        required: false,
        description: "Étape pipeline",
      },
      {
        name: "contact_id",
        type: "uuid",
        required: false,
        description: "ID du contact associé",
      },
    ],
    response:
      '{ "data": { "id": "...", "name": "Deal A", "value": 5000, "status": "open" } }',
  },
  {
    method: "GET",
    path: "/api/v1/deals/:id",
    description: "Récupérer un deal par ID",
    response: '{ "data": { "id": "...", "name": "Deal A", "value": 5000 } }',
  },
  {
    method: "PATCH",
    path: "/api/v1/deals/:id",
    description: "Mettre à jour un deal",
    body: [
      {
        name: "name",
        type: "string",
        required: false,
        description: "Nouveau nom",
      },
      {
        name: "value",
        type: "number",
        required: false,
        description: "Nouvelle valeur",
      },
      {
        name: "status",
        type: "string",
        required: false,
        description: "Nouveau statut",
      },
    ],
    response: '{ "data": { "id": "...", "name": "Deal B", "value": 7500 } }',
  },
  {
    method: "DELETE",
    path: "/api/v1/deals/:id",
    description: "Supprimer un deal",
    response: '{ "data": { "deleted": true } }',
  },
  {
    method: "GET",
    path: "/api/v1/contacts",
    description: "Lister les contacts",
    params: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "Numéro de page",
      },
      {
        name: "limit",
        type: "number",
        required: false,
        description: "Résultats par page",
      },
      {
        name: "search",
        type: "string",
        required: false,
        description: "Recherche par nom, email ou entreprise",
      },
    ],
    response:
      '{ "data": [{ "id": "...", "first_name": "Jean", "last_name": "Dupont" }], "meta": { ... } }',
  },
  {
    method: "POST",
    path: "/api/v1/contacts",
    description: "Créer un contact",
    body: [
      {
        name: "first_name",
        type: "string",
        required: true,
        description: "Prénom",
      },
      { name: "last_name", type: "string", required: true, description: "Nom" },
      { name: "email", type: "string", required: false, description: "Email" },
      {
        name: "phone",
        type: "string",
        required: false,
        description: "Téléphone",
      },
      {
        name: "company",
        type: "string",
        required: false,
        description: "Entreprise",
      },
    ],
    response:
      '{ "data": { "id": "...", "first_name": "Jean", "last_name": "Dupont" } }',
  },
  {
    method: "GET",
    path: "/api/v1/bookings",
    description: "Lister les rendez-vous",
    params: [
      {
        name: "page",
        type: "number",
        required: false,
        description: "Numéro de page",
      },
      {
        name: "status",
        type: "string",
        required: false,
        description: "Filtrer par statut",
      },
    ],
    response:
      '{ "data": [{ "id": "...", "prospect_name": "...", "scheduled_at": "..." }], "meta": { ... } }',
  },
  {
    method: "POST",
    path: "/api/v1/bookings",
    description: "Créer un rendez-vous",
    body: [
      {
        name: "prospect_name",
        type: "string",
        required: true,
        description: "Nom du prospect",
      },
      {
        name: "scheduled_at",
        type: "datetime",
        required: true,
        description: "Date et heure (ISO 8601)",
      },
      {
        name: "duration_minutes",
        type: "number",
        required: false,
        description: "Durée en minutes (défaut: 30)",
      },
    ],
    response:
      '{ "data": { "id": "...", "prospect_name": "...", "scheduled_at": "..." } }',
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  POST: "bg-green-500/20 text-green-400 border-green-500/30",
  PATCH: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

export function ApiDocsView() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggle = (key: string) => setExpanded(expanded === key ? null : key);

  const copyToken = () => {
    navigator.clipboard.writeText("Votre token Supabase (voir Profil)");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Base URL
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                <Globe className="h-4 w-4 text-blue-500" />
              </div>
            </div>
            <p className="font-mono text-sm tracking-tight">
              {BASE_URL}/api/v1
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Authentification
              </span>
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                <Key className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <p className="text-sm font-medium tracking-tight">
              Bearer Token (Supabase)
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">
                Rate Limit
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center ring-1 ring-emerald-500/20">
                <Code className="h-4 w-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-sm font-medium tracking-tight">
              100 requêtes / minute
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Auth */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
              <Key className="h-4 w-4 text-amber-500" />
            </div>
            Authentification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Ajoutez votre token Supabase dans le header{" "}
            <code className="bg-muted px-1 rounded">Authorization</code> :
          </p>
          <div className="bg-muted rounded-lg p-3 font-mono text-sm flex items-center justify-between">
            <span>Authorization: Bearer &lt;votre_token_supabase&gt;</span>
            <Button variant="ghost" size="sm" onClick={copyToken}>
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
              <Code className="h-4 w-4 text-blue-500" />
            </div>
            Endpoints ({ENDPOINTS.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {ENDPOINTS.map((ep, i) => {
            const key = `${ep.method}-${ep.path}`;
            const isOpen = expanded === key;
            return (
              <div
                key={i}
                className="border border-border/50 rounded-xl overflow-hidden"
              >
                <button
                  onClick={() => toggle(key)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0" />
                  )}
                  <Badge
                    variant="outline"
                    className={`font-mono text-xs px-2 ${METHOD_COLORS[ep.method]}`}
                  >
                    {ep.method}
                  </Badge>
                  <span className="font-mono text-sm">{ep.path}</span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    {ep.description}
                  </span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t bg-muted/30">
                    {ep.params && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          PARAMÈTRES
                        </p>
                        <div className="space-y-1">
                          {ep.params.map((p) => (
                            <div
                              key={p.name}
                              className="flex items-center gap-2 text-sm"
                            >
                              <code className="bg-muted px-1 rounded text-xs">
                                {p.name}
                              </code>
                              <span className="text-muted-foreground text-xs">
                                {p.type}
                              </span>
                              {p.required && (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-red-400 border-red-400/30"
                                >
                                  requis
                                </Badge>
                              )}
                              <span className="text-muted-foreground text-xs">
                                — {p.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {ep.body && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-muted-foreground mb-1">
                          BODY (JSON)
                        </p>
                        <div className="space-y-1">
                          {ep.body.map((p) => (
                            <div
                              key={p.name}
                              className="flex items-center gap-2 text-sm"
                            >
                              <code className="bg-muted px-1 rounded text-xs">
                                {p.name}
                              </code>
                              <span className="text-muted-foreground text-xs">
                                {p.type}
                              </span>
                              {p.required && (
                                <Badge
                                  variant="outline"
                                  className="text-xs text-red-400 border-red-400/30"
                                >
                                  requis
                                </Badge>
                              )}
                              <span className="text-muted-foreground text-xs">
                                — {p.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        RÉPONSE
                      </p>
                      <pre className="bg-muted rounded p-2 text-xs font-mono overflow-x-auto">
                        {ep.response}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Error format */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-red-500/10 flex items-center justify-center ring-1 ring-red-500/20">
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
            Format des erreurs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-muted rounded-lg p-3 text-xs font-mono">
            {`{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Token invalide ou expiré"
  }
}

Codes: 400 VALIDATION | 401 UNAUTHORIZED | 404 NOT_FOUND | 429 RATE_LIMITED | 500 DB_ERROR`}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
