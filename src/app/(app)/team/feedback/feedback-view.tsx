"use client";

import { useState, useEffect, useTransition } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Star,
  MessageCircle,
  Users,
  CheckCircle,
  Send,
  Loader2,
} from "lucide-react";
import {
  createFeedback,
  getMyFeedback,
  getFeedbackForMember,
  acknowledgeFeedback,
} from "@/lib/actions/feedback";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface FeedbackItem {
  id: string;
  type: string;
  title: string;
  content: string;
  rating: number | null;
  action_items: string[] | string | null;
  status: string;
  created_at: string;
  manager: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

interface Member {
  id: string;
  full_name: string | null;
  role: string;
}

interface Stats {
  total: number;
  averageRating: number;
  membersCoached: number;
}

interface Props {
  stats: Stats;
  members: Member[];
  userRole: string;
  userId: string;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function FeedbackView({ stats, members, userRole, userId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);

  // Form state
  const [memberId, setMemberId] = useState("");
  const [type, setType] = useState<"feedback" | "coaching" | "review">("feedback");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [rating, setRating] = useState(0);
  const [actionItemsText, setActionItemsText] = useState("");

  const isManager = userRole === "admin" || userRole === "manager";

  useEffect(() => {
    startTransition(async () => {
      try {
        if (isManager) {
          // Get all feedback given by this manager (query all members)
          const allFeedback: FeedbackItem[] = [];
          for (const member of members) {
            const items = await getFeedbackForMember(member.id);
            allFeedback.push(...(items as FeedbackItem[]));
          }
          allFeedback.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setFeedbackList(allFeedback);
        } else {
          const items = await getMyFeedback();
          setFeedbackList(items as FeedbackItem[]);
        }
      } catch {
        // ignore
      }
    });
  }, [isManager, members]);

  function handleCreate() {
    if (!memberId || !title.trim() || !content.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    startTransition(async () => {
      try {
        const actionItems = actionItemsText
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean);

        await createFeedback({
          memberId,
          type,
          title,
          content,
          rating: rating > 0 ? rating : undefined,
          actionItems: actionItems.length > 0 ? actionItems : undefined,
        });

        toast.success("Feedback envoye !");
        setDialogOpen(false);
        setMemberId("");
        setType("feedback");
        setTitle("");
        setContent("");
        setRating(0);
        setActionItemsText("");
        router.refresh();
      } catch {
        toast.error("Erreur lors de l'envoi du feedback");
      }
    });
  }

  function handleAcknowledge(feedbackId: string) {
    startTransition(async () => {
      try {
        await acknowledgeFeedback(feedbackId);
        toast.success("Feedback accuse !");
        router.refresh();
      } catch {
        toast.error("Erreur");
      }
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Brouillon</Badge>;
      case "sent":
        return <Badge variant="default">Envoye</Badge>;
      case "acknowledged":
        return <Badge className="bg-green-600">Accuse</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  function getTypeBadge(t: string) {
    switch (t) {
      case "feedback":
        return <Badge variant="outline">Feedback</Badge>;
      case "coaching":
        return <Badge variant="outline" className="border-blue-500 text-blue-500">Coaching</Badge>;
      case "review":
        return <Badge variant="outline" className="border-purple-500 text-purple-500">Review</Badge>;
      default:
        return <Badge variant="outline">{t}</Badge>;
    }
  }

  function parseActionItems(items: string[] | string | null): string[] {
    if (!items) return [];
    if (Array.isArray(items)) return items;
    try {
      const parsed = JSON.parse(items);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return (
    <div>
      <PageHeader title="Feedback & Coaching" description="Donnez et recevez du feedback">
        {isManager && (
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-brand text-brand-dark hover:bg-brand/90"
          >
            <Send className="h-4 w-4 mr-2" />
            Nouveau feedback
          </Button>
        )}
      </PageHeader>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total feedback</span>
              <div className="h-9 w-9 rounded-xl bg-brand/10 flex items-center justify-center ring-1 ring-brand/20">
                <MessageCircle className="h-4 w-4 text-brand" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-border/50 hover:shadow-md transition-all duration-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Note moyenne</span>
              <div className="h-9 w-9 rounded-xl bg-amber-500/10 flex items-center justify-center ring-1 ring-amber-500/20">
                <Star className="h-4 w-4 text-amber-500" />
              </div>
            </div>
            <p className="text-2xl font-bold tracking-tight">{stats.averageRating > 0 ? `${stats.averageRating}/5` : "-"}</p>
          </CardContent>
        </Card>
        {isManager && (
          <Card className="border-border/50 hover:shadow-md transition-all duration-200">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Membres coaches</span>
                <div className="h-9 w-9 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
              </div>
              <p className="text-2xl font-bold tracking-tight">{stats.membersCoached}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Feedback list */}
      <Card className="border-border/50 overflow-hidden">
        <CardHeader className="border-b border-border/30 bg-muted/20">
          <CardTitle className="text-lg">
            {isManager ? "Feedback donnes" : "Feedback recus"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            {feedbackList.map((item) => (
              <div key={item.id} className="p-4 rounded-xl border border-border/50 space-y-2 hover:shadow-sm transition-all duration-150">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{item.title}</h3>
                    {getTypeBadge(item.type)}
                    {getStatusBadge(item.status)}
                  </div>
                  {item.rating && (
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-4 w-4 ${s <= item.rating! ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"}`}
                        />
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{item.content}</p>
                {parseActionItems(item.action_items).length > 0 && (
                  <div className="text-sm">
                    <p className="font-medium text-xs uppercase text-muted-foreground mb-1">Actions :</p>
                    <ul className="list-disc list-inside text-sm text-muted-foreground">
                      {parseActionItems(item.action_items).map((ai, i) => (
                        <li key={i}>{ai}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <span>
                    {isManager ? "" : `Par ${item.manager?.full_name || "Manager"} - `}
                    {new Date(item.created_at).toLocaleDateString("fr-FR")}
                  </span>
                  {!isManager && item.status === "sent" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAcknowledge(item.id)}
                      disabled={isPending}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Accuser reception
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {feedbackList.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                {isManager ? "Aucun feedback donne pour le moment" : "Aucun feedback recu pour le moment"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Create feedback dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nouveau feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Membre</Label>
              <Select value={memberId} onValueChange={setMemberId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir un membre" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name || "Sans nom"} ({m.role})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as "feedback" | "coaching" | "review")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feedback">Feedback</SelectItem>
                  <SelectItem value="coaching">Coaching</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Titre</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre du feedback..."
              />
            </div>
            <div className="space-y-2">
              <Label>Contenu</Label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Detaillez votre feedback..."
              />
            </div>
            <div className="space-y-2">
              <Label>Note (1-5)</Label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setRating(rating === s ? 0 : s)}
                    className="p-1"
                  >
                    <Star
                      className={`h-6 w-6 cursor-pointer transition-colors ${
                        s <= rating ? "text-yellow-500 fill-yellow-500" : "text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Actions (separees par des virgules)</Label>
              <Input
                value={actionItemsText}
                onChange={(e) => setActionItemsText(e.target.value)}
                placeholder="Action 1, Action 2, Action 3..."
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={isPending}
              className="w-full bg-brand text-brand-dark hover:bg-brand/90"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Envoyer le feedback
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
