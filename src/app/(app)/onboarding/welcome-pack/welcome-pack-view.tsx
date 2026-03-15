"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import {
  Trophy,
  BookOpen,
  Users,
  CalendarPlus,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Play,
  FileText,
  ExternalLink,
  Lightbulb,
} from "lucide-react";

interface WelcomePackData {
  profile: {
    role: string;
    full_name: string;
    company: string | null;
  } | null;
  pack: {
    id: string;
    title: string;
    description: string;
    resources: Array<{
      type: string;
      title: string;
      url: string;
      description?: string;
    }>;
    [key: string]: unknown;
  } | null;
  quizResult: {
    score: number;
    color_code: string;
    answers: Record<string, string>;
  } | null;
  personalizedTips: string[];
}

interface Props {
  data: WelcomePackData;
}

const colorCodeConfig: Record<string, { label: string; className: string; bgGradient: string }> = {
  green: {
    label: "Excellent",
    className: "bg-green-500 text-white",
    bgGradient: "from-green-500/20 via-brand/10 to-transparent",
  },
  orange: {
    label: "Bon potentiel",
    className: "bg-orange-500 text-white",
    bgGradient: "from-orange-500/20 via-brand/10 to-transparent",
  },
  red: {
    label: "En progression",
    className: "bg-red-500 text-white",
    bgGradient: "from-red-500/20 via-brand/10 to-transparent",
  },
};

const roleLabels: Record<string, string> = {
  client_b2b: "Client B2B",
  client_b2c: "Client B2C",
  setter: "Setter",
  closer: "Closer",
  manager: "Manager",
  admin: "Admin",
};

const resourceIcons: Record<string, React.ReactNode> = {
  video: <Play className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  link: <ExternalLink className="h-4 w-4" />,
};

export function WelcomePackView({ data }: Props) {
  const router = useRouter();
  const { profile, pack, quizResult, personalizedTips } = data;

  const firstName = profile?.full_name?.split(" ")[0] || "Nouveau membre";
  const colorCode = quizResult?.color_code || "orange";
  const colorConfig = colorCodeConfig[colorCode] || colorCodeConfig.orange;

  return (
    <div className="max-w-3xl mx-auto pb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Gradient hero banner */}
      <div
        className={cn(
          "relative rounded-2xl p-8 md:p-10 mb-8 overflow-hidden bg-gradient-to-br",
          colorConfig.bgGradient,
          "border border-brand/20 shadow-sm"
        )}
      >
        <div className="absolute top-0 right-0 w-48 h-48 bg-brand/8 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-brand/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />
        <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-brand/20 to-transparent" />

        <div className="relative">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-brand/15">
              <Sparkles className="h-4 w-4 text-brand" />
            </div>
            <span className="text-sm font-semibold text-brand tracking-wide">Welcome Pack</span>
          </div>

          <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
            Bienvenue, {firstName} !
          </h1>
          <p className="text-muted-foreground mb-5 max-w-lg leading-relaxed">
            Votre espace personnalis&eacute; est pr&ecirc;t. D&eacute;couvrez vos ressources,
            conseils et prochaines &eacute;tapes pour r&eacute;ussir.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {profile?.role && (
              <Badge variant="outline" className="text-xs px-3 py-1 rounded-lg border-brand/30 bg-white/50 backdrop-blur-sm">
                {roleLabels[profile.role] || profile.role}
              </Badge>
            )}
            {profile?.company && (
              <Badge variant="outline" className="text-xs px-3 py-1 rounded-lg border-brand/30 bg-white/50 backdrop-blur-sm">
                {profile.company}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Quiz score card */}
      {quizResult && (
        <Card className="mb-6 border-brand/20 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10">
                  <Trophy className="h-7 w-7 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold text-brand-dark">R&eacute;sultat de votre quiz</h3>
                  <p className="text-sm text-muted-foreground">
                    Votre niveau initial a &eacute;t&eacute; &eacute;valu&eacute;
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold text-brand-dark">{quizResult.score}%</span>
                <Badge className={cn("text-sm px-3 py-1 rounded-lg", colorConfig.className)}>
                  {colorConfig.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personalized tips */}
      <Card className="mb-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-brand/10">
              <Lightbulb className="h-5 w-5 text-brand" />
            </div>
            <h3 className="font-semibold text-brand-dark">Conseils personnalis&eacute;s</h3>
          </div>
          <div className="space-y-3.5">
            {personalizedTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-brand/5 hover:bg-brand/8 transition-colors duration-200">
                <CheckCircle2 className="h-5 w-5 text-brand shrink-0 mt-0.5" />
                <p className="text-sm leading-relaxed">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Welcome pack resources */}
      {pack && (
        <Card className="mb-6 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-6">
            <h3 className="font-semibold text-brand-dark mb-1">{pack.title || "Ressources"}</h3>
            {pack.description && (
              <p className="text-sm text-muted-foreground mb-5">{pack.description}</p>
            )}

            {pack.resources && pack.resources.length > 0 ? (
              <div className="grid gap-3">
                {pack.resources.map((resource, i) => (
                  <a
                    key={i}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:border-brand/50 hover:bg-brand/5 hover:shadow-sm transition-all duration-200 group"
                  >
                    <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-brand/10 shrink-0 group-hover:bg-brand/15 transition-colors duration-200">
                      {resourceIcons[resource.type] || <FileText className="h-4 w-4 text-brand" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{resource.title}</p>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {resource.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-brand group-hover:translate-x-0.5 transition-all duration-200 shrink-0" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/50 mb-3">
                  <FileText className="h-5 w-5 text-muted-foreground/60" />
                </div>
                <p>Les ressources seront bient&ocirc;t disponibles.</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No pack fallback */}
      {!pack && (
        <Card className="mb-6 rounded-2xl shadow-sm">
          <CardContent className="p-6">
            <div className="text-center py-6">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand/10 mb-4">
                <BookOpen className="h-7 w-7 text-brand" />
              </div>
              <h3 className="font-semibold text-brand-dark mb-2">Ressources en pr&eacute;paration</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
                Votre pack de bienvenue est en cours de pr&eacute;paration.
                En attendant, explorez les actions ci-dessous.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA buttons */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Button
          className="bg-brand text-brand-dark hover:bg-brand/90 h-auto py-5 flex-col gap-2.5 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => router.push("/formation")}
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-brand-dark/10">
            <BookOpen className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold">Commencer la formation</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-5 flex-col gap-2.5 rounded-2xl border-border/60 hover:border-brand/50 hover:bg-brand/5 hover:shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => router.push("/communaute")}
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-brand/10">
            <Users className="h-5 w-5 text-brand" />
          </div>
          <span className="text-sm font-semibold">Explorer la communaut&eacute;</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-5 flex-col gap-2.5 rounded-2xl border-border/60 hover:border-brand/50 hover:bg-brand/5 hover:shadow-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          onClick={() => router.push("/booking")}
        >
          <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-brand/10">
            <CalendarPlus className="h-5 w-5 text-brand" />
          </div>
          <span className="text-sm font-semibold">Booker un appel</span>
        </Button>
      </div>
    </div>
  );
}
