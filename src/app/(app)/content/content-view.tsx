"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Calendar, CalendarDays, List, Linkedin, Instagram, Youtube, Trash2, Newspaper } from "lucide-react";
import { createContentPost, updateContentPost, deleteContentPost } from "@/lib/actions/content";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface ContentPost {
  id: string;
  title: string | null;
  content: string | null;
  platform: string | null;
  framework: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  metrics: Record<string, unknown>;
  created_at: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="h-4 w-4 text-[#0077b5]" />,
  instagram: <Instagram className="h-4 w-4 text-[#e4405f]" />,
  youtube: <Youtube className="h-4 w-4 text-[#ff0000]" />,
};

const platformColors: Record<string, string> = {
  linkedin: "bg-[#0077b5]/10 border-[#0077b5]/30",
  instagram: "bg-[#e4405f]/10 border-[#e4405f]/30",
  youtube: "bg-[#ff0000]/10 border-[#ff0000]/30",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  scheduled: "bg-orange-100 text-orange-700",
  published: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = { draft: "Brouillon", scheduled: "Planifié", published: "Publié" };
const frameworkLabels: Record<string, string> = { storytelling: "Storytelling", educational: "Éducatif", controversy: "Controverse", testimonial: "Témoignage", cta: "CTA" };

export function ContentView({ posts }: { posts: ContentPost[] }) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<ContentPost | null>(null);
  const [filterPlatform, setFilterPlatform] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [form, setForm] = useState({
    title: "", content: "", platform: "linkedin", framework: "educational", scheduled_at: "", status: "draft",
  });

  const filtered = posts.filter((p) => {
    if (filterPlatform !== "all" && p.platform !== filterPlatform) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  // Calendar data
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay === 0 ? 6 : firstDay - 1; // Monday-start

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < offset; i++) calendarDays.push(null);
  for (let i = 1; i <= daysInMonth; i++) calendarDays.push(i);

  function getPostsForDay(day: number) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return filtered.filter((p) => p.scheduled_at?.startsWith(dateStr));
  }

  function openNew(date?: string) {
    setEditingPost(null);
    setForm({ title: "", content: "", platform: "linkedin", framework: "educational", scheduled_at: date || "", status: "draft" });
    setDialogOpen(true);
  }

  function openEdit(p: ContentPost) {
    setEditingPost(p);
    setForm({
      title: p.title || "", content: p.content || "", platform: p.platform || "linkedin",
      framework: p.framework || "educational", scheduled_at: p.scheduled_at?.split("T")[0] || "", status: p.status,
    });
    setDialogOpen(true);
  }

  async function handleSave() {
    try {
      if (editingPost) {
        await updateContentPost(editingPost.id, { ...form, scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined });
        toast.success("Post mis à jour");
      } else {
        await createContentPost({ ...form, scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : undefined });
        toast.success("Post créé");
      }
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Erreur");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Êtes-vous sûr de vouloir supprimer ce post ? Cette action est irréversible.")) return;
    try {
      await deleteContentPost(id);
      toast.success("Post supprimé");
      router.refresh();
    } catch {
      toast.error("Erreur");
    }
  }

  // Top posts by engagement
  const postsWithMetrics = posts.filter((p) => p.metrics && Object.keys(p.metrics).length > 0);
  const topPosts = postsWithMetrics
    .map((p) => {
      const m = p.metrics as { views?: number; likes?: number; comments?: number; dms_received?: number };
      const engagement = (m.likes || 0) + (m.comments || 0) * 2 + (m.dms_received || 0) * 3;
      return { ...p, engagement };
    })
    .sort((a, b) => b.engagement - a.engagement)
    .slice(0, 3);

  return (
    <div>
      <PageHeader title="Content Planner" description="Planifiez et suivez votre contenu">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setViewMode(viewMode === "calendar" ? "list" : "calendar")}>
            {viewMode === "calendar" ? <List className="h-4 w-4 mr-2" /> : <CalendarDays className="h-4 w-4 mr-2" />}
            {viewMode === "calendar" ? "Liste" : "Calendrier"}
          </Button>
          <Button onClick={() => openNew()} className="bg-brand text-brand-dark hover:bg-brand/90">
            <Plus className="h-4 w-4 mr-2" />
            Nouveau post
          </Button>
        </div>
      </PageHeader>

      {viewMode === "calendar" ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{now.toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-1">
              {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
              {calendarDays.map((day, i) => {
                const dayPosts = day ? getPostsForDay(day) : [];
                const dateStr = day ? `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
                return (
                  <div
                    key={i}
                    className={`min-h-[80px] p-1 border rounded-md ${day ? "cursor-pointer hover:bg-muted/50" : "bg-muted/20"} ${day === now.getDate() ? "border-brand" : ""}`}
                    onClick={() => day && openNew(dateStr)}
                  >
                    {day && (
                      <>
                        <span className={`text-xs font-medium ${day === now.getDate() ? "text-brand" : ""}`}>{day}</span>
                        <div className="space-y-0.5 mt-1">
                          {dayPosts.slice(0, 2).map((p) => (
                            <div
                              key={p.id}
                              className={`text-[10px] px-1 py-0.5 rounded border truncate ${platformColors[p.platform || ""]}`}
                              onClick={(e) => { e.stopPropagation(); openEdit(p); }}
                            >
                              {p.title || "Sans titre"}
                            </div>
                          ))}
                          {dayPosts.length > 2 && <span className="text-[10px] text-muted-foreground">+{dayPosts.length - 2}</span>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <Select value={filterPlatform} onValueChange={setFilterPlatform}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="youtube">YouTube</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                {Object.entries(statusLabels).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-3 mb-6">
            {filtered.map((post) => (
              <Card key={post.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => openEdit(post)}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                      {platformIcons[post.platform || ""] || <Newspaper className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="font-medium">{post.title || "Sans titre"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {post.framework && <Badge variant="outline" className="text-[10px]">{frameworkLabels[post.framework] || post.framework}</Badge>}
                        {post.scheduled_at && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(post.scheduled_at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColors[post.status]}>{statusLabels[post.status] || post.status}</Badge>
                    <Button size="sm" variant="ghost" className="text-red-500" onClick={(e) => { e.stopPropagation(); handleDelete(post.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center text-muted-foreground">
                  <Newspaper className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="font-medium">Aucun post</p>
                  <p className="text-sm">Créez votre premier post pour commencer.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}

      {/* Top posts metrics */}
      {topPosts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top 3 posts par engagement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPosts.map((p, i) => {
                const m = p.metrics as Record<string, number>;
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <span className="text-lg font-bold text-brand">#{i + 1}</span>
                    <div className="flex-1">
                      <p className="font-medium text-sm">{p.title || "Sans titre"}</p>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        {m.views && <span>{m.views} vues</span>}
                        {m.likes && <span>{m.likes} likes</span>}
                        {m.comments && <span>{m.comments} commentaires</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPost ? "Modifier le post" : "Nouveau post"}</DialogTitle>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Titre</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label>Contenu</Label>
                <Textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={8} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Plateforme</Label>
                  <Select value={form.platform} onValueChange={(v) => setForm({ ...form, platform: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Framework</Label>
                  <Select value={form.framework} onValueChange={(v) => setForm({ ...form, framework: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(frameworkLabels).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Date de publication</Label>
                  <Input type="date" value={form.scheduled_at} onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })} />
                </div>
                <div>
                  <Label>Statut</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusLabels).map(([v, l]) => (
                        <SelectItem key={v} value={v}>{l}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleSave} className="w-full bg-brand text-brand-dark hover:bg-brand/90">
                {editingPost ? "Mettre à jour" : "Créer"}
              </Button>
            </div>
            {/* Preview */}
            <div>
              <Label className="mb-2 block">Aperçu</Label>
              <div className={`border rounded-lg p-4 ${form.platform === "linkedin" ? "bg-white" : form.platform === "instagram" ? "bg-gradient-to-b from-purple-50 to-pink-50" : "bg-gray-50"}`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-full bg-brand/20 flex items-center justify-center text-brand text-xs font-bold">D</div>
                  <div>
                    <p className="text-sm font-semibold">Damien Reynaud</p>
                    <p className="text-[10px] text-muted-foreground">Coach commercial B2B</p>
                  </div>
                </div>
                <p className="text-sm whitespace-pre-wrap">{form.content || "Votre contenu apparaîtra ici..."}</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
