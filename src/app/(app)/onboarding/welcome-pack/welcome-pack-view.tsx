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
    <div className="max-w-3xl mx-auto pb-12">
      {/* Gradient hero banner */}
      <div
        className={cn(
          "relative rounded-2xl p-8 mb-8 overflow-hidden bg-gradient-to-br",
          colorConfig.bgGradient,
          "border border-brand/20"
        )}
      >
        <div className="absolute top-0 right-0 w-40 h-40 bg-brand/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-brand/5 rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="h-5 w-5 text-brand" />
            <span className="text-sm font-medium text-brand">Welcome Pack</span>
          </div>

          <h1 className="text-3xl font-bold mb-2">
            Bienvenue, {firstName} !
          </h1>
          <p className="text-muted-foreground mb-4 max-w-lg">
            Votre espace personnalisé est prêt. Découvrez vos ressources,
            conseils et prochaines étapes pour réussir.
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            {profile?.role && (
              <Badge variant="outline" className="text-xs">
                {roleLabels[profile.role] || profile.role}
              </Badge>
            )}
            {profile?.company && (
              <Badge variant="outline" className="text-xs">
                {profile.company}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Quiz score card */}
      {quizResult && (
        <Card className="mb-6 border-brand/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-brand/10">
                  <Trophy className="h-7 w-7 text-brand" />
                </div>
                <div>
                  <h3 className="font-semibold">Résultat de votre quiz</h3>
                  <p className="text-sm text-muted-foreground">
                    Votre niveau initial a été évalué
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-3xl font-bold">{quizResult.score}%</span>
                <Badge className={cn("text-sm px-3 py-1", colorConfig.className)}>
                  {colorConfig.label}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personalized tips */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="h-5 w-5 text-brand" />
            <h3 className="font-semibold">Conseils personnalisés</h3>
          </div>
          <div className="space-y-3">
            {personalizedTips.map((tip, i) => (
              <div key={i} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-brand shrink-0 mt-0.5" />
                <p className="text-sm">{tip}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Welcome pack resources */}
      {pack && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <h3 className="font-semibold mb-1">{pack.title || "Ressources"}</h3>
            {pack.description && (
              <p className="text-sm text-muted-foreground mb-4">{pack.description}</p>
            )}

            {pack.resources && pack.resources.length > 0 ? (
              <div className="grid gap-3">
                {pack.resources.map((resource, i) => (
                  <a
                    key={i}
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 rounded-lg border hover:border-brand/50 hover:bg-brand/5 transition-all group"
                  >
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-brand/10 shrink-0">
                      {resourceIcons[resource.type] || <FileText className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{resource.title}</p>
                      {resource.description && (
                        <p className="text-xs text-muted-foreground truncate">
                          {resource.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors shrink-0" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">
                Les ressources seront bientôt disponibles.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No pack fallback */}
      {!pack && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-brand/10 mb-3">
                <BookOpen className="h-6 w-6 text-brand" />
              </div>
              <h3 className="font-semibold mb-1">Ressources en préparation</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Votre pack de bienvenue est en cours de préparation.
                En attendant, explorez les actions ci-dessous.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* CTA buttons */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Button
          className="bg-brand text-brand-dark hover:bg-brand/90 h-auto py-4 flex-col gap-2"
          onClick={() => router.push("/formation")}
        >
          <BookOpen className="h-5 w-5" />
          <span className="text-sm font-medium">Commencer la formation</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2 hover:border-brand/50 hover:bg-brand/5"
          onClick={() => router.push("/communaute")}
        >
          <Users className="h-5 w-5" />
          <span className="text-sm font-medium">Explorer la communauté</span>
        </Button>

        <Button
          variant="outline"
          className="h-auto py-4 flex-col gap-2 hover:border-brand/50 hover:bg-brand/5"
          onClick={() => router.push("/booking")}
        >
          <CalendarPlus className="h-5 w-5" />
          <span className="text-sm font-medium">Booker un appel</span>
        </Button>
      </div>
    </div>
  );
}
