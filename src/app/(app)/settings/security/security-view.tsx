"use client";

import { useCallback, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Shield,
  Smartphone,
  Key,
  Lock,
  Globe,
  Clock,
  AlertTriangle,
  Monitor,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  Copy,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  enrollMfa,
  verifyMfaEnrollment,
  unenrollMfa,
  updateSecuritySettings,
} from "@/lib/actions/security";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface MfaStatus {
  enrolled: boolean;
  factors: {
    id: string;
    friendly_name: string;
    factor_type: string;
    status: string;
    created_at: string;
  }[];
}

interface SecuritySettings {
  sessionTimeout: number;
  ipWhitelist: string[];
}

interface LoginEntry {
  id: string;
  date: string;
  ip: string;
  device: string;
  status: "success" | "failed";
  location: string;
}

interface SessionEntry {
  id: string;
  device: string;
  ip: string;
  lastActive: string;
  current: boolean;
}

interface SecurityViewProps {
  initialMfaStatus: MfaStatus;
  initialSecuritySettings: SecuritySettings;
  initialLoginHistory: LoginEntry[];
  initialActiveSessions: SessionEntry[];
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SecurityView({
  initialMfaStatus,
  initialSecuritySettings,
  initialLoginHistory,
  initialActiveSessions,
}: SecurityViewProps) {
  const [mfaStatus, setMfaStatus] = useState(initialMfaStatus);
  const [securitySettings, setSecuritySettings] = useState(initialSecuritySettings);
  const [isPending, startTransition] = useTransition();

  // MFA enrollment state
  const [enrollData, setEnrollData] = useState<{
    factorId: string;
    qrCode: string;
    secret: string;
  } | null>(null);
  const [totpCode, setTotpCode] = useState("");
  const [showEnrollDialog, setShowEnrollDialog] = useState(false);
  const [showDisableDialog, setShowDisableDialog] = useState(false);

  // Security settings state
  const [ipWhitelistText, setIpWhitelistText] = useState(
    securitySettings.ipWhitelist.join("\n")
  );
  const [sessionTimeout, setSessionTimeout] = useState(
    String(securitySettings.sessionTimeout)
  );

  // -------------------------------------------------------------------------
  // MFA Handlers
  // -------------------------------------------------------------------------

  function handleEnrollStart() {
    startTransition(async () => {
      const result = await enrollMfa();
      if (!result.success) {
        toast.error(result.error ?? "Erreur lors de l'activation de la 2FA");
        return;
      }
      setEnrollData({
        factorId: result.factorId!,
        qrCode: result.qrCode!,
        secret: result.secret!,
      });
      setTotpCode("");
      setShowEnrollDialog(true);
    });
  }

  function handleVerify() {
    if (!enrollData || totpCode.length < 6) return;
    startTransition(async () => {
      const result = await verifyMfaEnrollment(enrollData.factorId, totpCode);
      if (!result.success) {
        toast.error(result.error ?? "Code invalide");
        return;
      }
      toast.success("Authentification à deux facteurs activée");
      setShowEnrollDialog(false);
      setEnrollData(null);
      setTotpCode("");
      setMfaStatus({
        enrolled: true,
        factors: [
          ...mfaStatus.factors,
          {
            id: enrollData.factorId,
            friendly_name: "",
            factor_type: "totp",
            status: "verified",
            created_at: new Date().toISOString(),
          },
        ],
      });
    });
  }

  function handleDisableMfa() {
    const verifiedFactor = mfaStatus.factors.find((f) => f.status === "verified");
    if (!verifiedFactor) return;
    startTransition(async () => {
      const result = await unenrollMfa(verifiedFactor.id);
      if (!result.success) {
        toast.error(result.error ?? "Erreur lors de la désactivation");
        return;
      }
      toast.success("Authentification à deux facteurs désactivée");
      setShowDisableDialog(false);
      setMfaStatus({
        enrolled: false,
        factors: mfaStatus.factors.filter((f) => f.id !== verifiedFactor.id),
      });
    });
  }

  // -------------------------------------------------------------------------
  // Security Settings Handlers
  // -------------------------------------------------------------------------

  function handleSaveSettings() {
    const ips = ipWhitelistText
      .split("\n")
      .map((ip) => ip.trim())
      .filter(Boolean);
    startTransition(async () => {
      const result = await updateSecuritySettings({
        sessionTimeout: Number(sessionTimeout),
        ipWhitelist: ips,
      });
      if (!result.success) {
        toast.error(result.error ?? "Erreur lors de la sauvegarde");
        return;
      }
      setSecuritySettings({
        sessionTimeout: Number(sessionTimeout),
        ipWhitelist: ips,
      });
      toast.success("Paramètres de sécurité mis à jour");
    });
  }

  function copySecret() {
    if (!enrollData) return;
    navigator.clipboard.writeText(enrollData.secret);
    toast.success("Clé secrète copiée dans le presse-papiers");
  }

  // -------------------------------------------------------------------------
  // Format helpers
  // -------------------------------------------------------------------------

  function formatDate(iso: string) {
    return new Date(iso).toLocaleString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  const formatRelative = useCallback((iso: string) => {
    const diff = Date.now() - new Date(iso).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours}h`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days}j`;
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* 2FA Section */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7af17a]/10">
                <Shield className="h-5 w-5 text-[#7af17a]" />
              </div>
              <div>
                <CardTitle className="text-lg">Authentification à deux facteurs (2FA)</CardTitle>
                <CardDescription>
                  Ajoutez une couche de sécurité supplémentaire à votre compte
                </CardDescription>
              </div>
            </div>
            <Badge
              variant={mfaStatus.enrolled ? "default" : "secondary"}
              className={
                mfaStatus.enrolled
                  ? "bg-[#7af17a]/20 text-[#7af17a] hover:bg-[#7af17a]/30"
                  : ""
              }
            >
              {mfaStatus.enrolled ? "Activée" : "Désactivée"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {mfaStatus.enrolled ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-[#7af17a]" />
                <span>
                  La 2FA est active via une application d&apos;authentification (TOTP)
                </span>
              </div>
              <Button
                variant="destructive"
                onClick={() => setShowDisableDialog(true)}
                disabled={isPending}
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Désactiver la 2FA
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <span>
                  Votre compte n&apos;est pas protégé par la 2FA.
                  Nous vous recommandons de l&apos;activer.
                </span>
              </div>
              <Button onClick={handleEnrollStart} disabled={isPending}>
                {isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Smartphone className="h-4 w-4 mr-2" />
                )}
                Activer la 2FA
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Active Sessions */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
              <Monitor className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Sessions actives</CardTitle>
              <CardDescription>
                Appareils actuellement connectés à votre compte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Appareil</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Dernière activité</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialActiveSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4 text-muted-foreground" />
                      {session.device}
                      {session.current && (
                        <Badge variant="outline" className="text-xs">
                          Session actuelle
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {session.ip}
                  </TableCell>
                  <TableCell>{formatRelative(session.lastActive)}</TableCell>
                  <TableCell className="text-right">
                    {!session.current && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() =>
                          toast.info("Révocation de session non disponible en démo")
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Login History */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Clock className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Historique de connexion</CardTitle>
              <CardDescription>
                Les dernières tentatives de connexion à votre compte
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>Appareil</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Localisation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {initialLoginHistory.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell>{formatDate(entry.date)}</TableCell>
                  <TableCell className="font-mono text-sm">{entry.ip}</TableCell>
                  <TableCell>{entry.device}</TableCell>
                  <TableCell>
                    {entry.status === "success" ? (
                      <Badge
                        variant="outline"
                        className="border-[#7af17a]/30 text-[#7af17a]"
                      >
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Réussi
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        Échoué
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Globe className="h-3 w-3 text-muted-foreground" />
                      {entry.location}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Security Settings */}
      {/* ----------------------------------------------------------------- */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
              <Key className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Paramètres de sécurité</CardTitle>
              <CardDescription>
                Configurez les règles de sécurité avancées
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Session timeout */}
          <div className="space-y-2">
            <Label htmlFor="session-timeout" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Expiration de session
            </Label>
            <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
              <SelectTrigger id="session-timeout" className="w-[240px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">1 heure</SelectItem>
                <SelectItem value="240">4 heures</SelectItem>
                <SelectItem value="1440">24 heures</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Durée d&apos;inactivité avant déconnexion automatique
            </p>
          </div>

          <Separator />

          {/* IP Whitelist */}
          <div className="space-y-2">
            <Label htmlFor="ip-whitelist" className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              Liste blanche d&apos;adresses IP
            </Label>
            <Textarea
              id="ip-whitelist"
              placeholder={"192.168.1.0/24\n10.0.0.1"}
              value={ipWhitelistText}
              onChange={(e) => setIpWhitelistText(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Une adresse IP par ligne. Laissez vide pour autoriser toutes les adresses.
            </p>
          </div>

          <Separator />

          {/* Change password */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-muted-foreground" />
              Mot de passe
            </Label>
            <p className="text-sm text-muted-foreground">
              Modifiez votre mot de passe pour renforcer la sécurité de votre compte.
            </p>
            <Button
              variant="outline"
              onClick={() =>
                toast.info(
                  "Un e-mail de réinitialisation sera envoyé à votre adresse"
                )
              }
            >
              <Lock className="h-4 w-4 mr-2" />
              Changer le mot de passe
            </Button>
          </div>

          <Separator />

          <div className="flex justify-end">
            <Button onClick={handleSaveSettings} disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Enregistrer les paramètres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ----------------------------------------------------------------- */}
      {/* Enroll Dialog */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={showEnrollDialog} onOpenChange={setShowEnrollDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[#7af17a]" />
              Activer la 2FA
            </DialogTitle>
            <DialogDescription>
              Scannez le QR code ci-dessous avec votre application
              d&apos;authentification (Google Authenticator, Authy, etc.)
            </DialogDescription>
          </DialogHeader>

          {enrollData && (
            <div className="space-y-4">
              {/* QR Code */}
              <div className="flex justify-center rounded-lg bg-white p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={enrollData.qrCode}
                  alt="QR Code 2FA"
                  className="h-48 w-48"
                />
              </div>

              {/* Secret key */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Clé secrète (saisie manuelle)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={enrollData.secret}
                    className="font-mono text-xs"
                  />
                  <Button variant="outline" size="icon" onClick={copySecret}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Verification code */}
              <div className="space-y-1">
                <Label htmlFor="totp-code">Code de vérification</Label>
                <Input
                  id="totp-code"
                  placeholder="000000"
                  maxLength={6}
                  value={totpCode}
                  onChange={(e) =>
                    setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="font-mono text-center text-lg tracking-widest"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowEnrollDialog(false);
                setEnrollData(null);
              }}
            >
              Annuler
            </Button>
            <Button
              onClick={handleVerify}
              disabled={isPending || totpCode.length < 6}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Vérifier et activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ----------------------------------------------------------------- */}
      {/* Disable 2FA Confirmation Dialog */}
      {/* ----------------------------------------------------------------- */}
      <Dialog open={showDisableDialog} onOpenChange={setShowDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Désactiver la 2FA
            </DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir désactiver l&apos;authentification à deux
              facteurs ? Votre compte sera moins sécurisé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDisableDialog(false)}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableMfa}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmer la désactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
