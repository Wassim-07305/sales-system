"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Profile, Deal, DealActivity } from "@/lib/types/database";
import type { TimelineEvent } from "@/lib/actions/timeline";
import {
  Mail,
  Phone,
  MessageSquare,
  FileText,
  Building,
  Target,
  Calendar,
  DollarSign,
  ArrowLeft,
  Send,
  Sparkles,
  Loader2,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { ClientTimeline } from "@/components/client-timeline";
import { sendMessageToContact, generateFollowUpMessage, type MessageChannel } from "@/lib/actions/messaging";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

interface ContactDetailProps {
  contact: Profile;
  deals: Deal[];
  activities: DealActivity[];
  timelineEvents?: TimelineEvent[];
}

const activityIcons: Record<string, React.ReactNode> = {
  call: <Phone className="h-3.5 w-3.5" />,
  message: <MessageSquare className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  note: <FileText className="h-3.5 w-3.5" />,
  meeting: <Calendar className="h-3.5 w-3.5" />,
  status_change: <Target className="h-3.5 w-3.5" />,
};

const channelOptions: { value: MessageChannel; label: string; icon: React.ReactNode }[] = [
  { value: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
  { value: "whatsapp", label: "WhatsApp", icon: <Phone className="h-4 w-4" /> },
  { value: "linkedin", label: "LinkedIn", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "instagram", label: "Instagram", icon: <MessageSquare className="h-4 w-4" /> },
];

export function ContactDetail({ contact, deals, activities, timelineEvents }: ContactDetailProps) {
  const totalDealValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const [showMessaging, setShowMessaging] = useState(false);
  const [channel, setChannel] = useState<MessageChannel>("email");
  const [subject, setSubject] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function handleSend() {
    if (!messageText.trim()) {
      toast.error("Le message ne peut pas être vide");
      return;
    }
    setSending(true);
    try {
      const result = await sendMessageToContact({
        contactId: contact.id,
        channel,
        subject: channel === "email" ? subject : undefined,
        message: messageText,
      });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Message envoyé via ${channel}`);
        setMessageText("");
        setSubject("");
        setShowMessaging(false);
      }
    } catch {
      toast.error("Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  }

  async function handleGenerateAI() {
    const dealForContext = deals[0];
    setGenerating(true);
    try {
      const result = await generateFollowUpMessage({
        contactName: contact.full_name || "prospect",
        dealTitle: dealForContext?.title || "Accompagnement",
        daysOverdue: 3,
        channel,
      });
      if (result.error) {
        toast.error(result.error);
      } else if (result.message) {
        // Parse subject from AI-generated email
        if (channel === "email" && result.message.startsWith("Objet:")) {
          const lines = result.message.split("\n");
          setSubject(lines[0].replace("Objet:", "").trim());
          setMessageText(lines.slice(1).join("\n").trim());
        } else {
          setMessageText(result.message);
        }
        toast.success("Message généré par l'IA");
      }
    } catch {
      toast.error("Erreur génération IA");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <Link
          href="/contacts"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour aux contacts
        </Link>
      </div>

      {/* Header card */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="h-16 w-16 rounded-full bg-brand/10 flex items-center justify-center text-brand text-2xl font-bold shrink-0">
              {contact.full_name?.charAt(0)?.toUpperCase() || "?"}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold">
                  {contact.full_name || "Sans nom"}
                </h1>
                <Badge variant="outline" className="capitalize">
                  {contact.role.replace("_", " ")}
                </Badge>
              </div>
              <p className="text-muted-foreground">{contact.email}</p>
              {contact.company && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                  <Building className="h-3.5 w-3.5" />
                  {contact.company}
                </div>
              )}

              {/* Quick stats */}
              <div className="flex gap-6 mt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Health Score</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div
                      className={`h-2 w-2 rounded-full ${
                        contact.health_score >= 70
                          ? "bg-green-500"
                          : contact.health_score >= 40
                          ? "bg-orange-400"
                          : "bg-red-500"
                      }`}
                    />
                    <span className="text-lg font-bold">{contact.health_score}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total deals</p>
                  <p className="text-lg font-bold mt-0.5">{deals.length}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Valeur totale</p>
                  <p className="text-lg font-bold mt-0.5">
                    {totalDealValue.toLocaleString("fr-FR")} €
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (contact.phone) {
                    window.open(`tel:${contact.phone}`, "_self");
                  } else {
                    toast.error("Aucun numéro de téléphone");
                  }
                }}
              >
                <Phone className="h-4 w-4 mr-1" />
                Appeler
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (contact.email) {
                    window.open(`mailto:${contact.email}`, "_blank");
                  } else {
                    toast.error("Aucune adresse email");
                  }
                }}
              >
                <Mail className="h-4 w-4 mr-1" />
                Email
              </Button>
              <Button
                size="sm"
                className="bg-brand text-brand-dark hover:bg-brand/90"
                asChild
              >
                <Link href={`/contracts/new?contact_id=${contact.id}`}>
                  <FileText className="h-4 w-4 mr-1" />
                  Contrat
                </Link>
              </Button>
              <Button
                size="sm"
                variant={showMessaging ? "secondary" : "default"}
                onClick={() => setShowMessaging(!showMessaging)}
              >
                {showMessaging ? (
                  <X className="h-4 w-4 mr-1" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                {showMessaging ? "Fermer" : "Envoyer"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messaging panel */}
      {showMessaging && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Envoyer un message</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleGenerateAI}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-1" />
                )}
                Générer avec l&apos;IA
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Channel selector */}
            <div className="flex gap-2">
              {channelOptions.map((opt) => (
                <Button
                  key={opt.value}
                  variant={channel === opt.value ? "default" : "outline"}
                  size="sm"
                  onClick={() => setChannel(opt.value)}
                >
                  {opt.icon}
                  <span className="ml-1">{opt.label}</span>
                </Button>
              ))}
            </div>

            {/* Subject (email only) */}
            {channel === "email" && (
              <Input
                placeholder="Objet de l'email"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            )}

            {/* Message */}
            <Textarea
              placeholder={`Votre message via ${channel}...`}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              rows={4}
            />

            {/* Send button */}
            <div className="flex justify-end">
              <Button onClick={handleSend} disabled={sending || !messageText.trim()}>
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-1" />
                )}
                {sending ? "Envoi..." : "Envoyer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deals */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Deals associés</CardTitle>
            </CardHeader>
            <CardContent>
              {deals.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Aucun deal
                </p>
              ) : (
                <div className="space-y-3">
                  {deals.map((deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <p className="font-medium text-sm">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {deal.stage?.name || "—"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 font-semibold">
                        <DollarSign className="h-4 w-4 text-brand" />
                        {deal.value?.toLocaleString("fr-FR")} €
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Activity timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Activite recente</CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucune activite
              </p>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex gap-3">
                    <div className="mt-0.5 h-7 w-7 rounded-full bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      {activityIcons[activity.type] || (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{activity.content || activity.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(activity.created_at).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full journey timeline */}
      {timelineEvents && timelineEvents.length > 0 && (
        <div className="mt-6">
          <ClientTimeline events={timelineEvents} />
        </div>
      )}
    </div>
  );
}
