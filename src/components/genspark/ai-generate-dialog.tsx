"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, Loader2, MessageSquare, Zap } from "lucide-react";
import {
  generatePresentation,
  generateGuideQuestions,
  generateFromGuide,
} from "@/lib/actions/genspark";

interface AiGenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiGenerateDialog({
  open,
  onOpenChange,
}: AiGenerateDialogProps) {
  const router = useRouter();

  // Rapid mode
  const [prompt, setPrompt] = useState("");
  const [slideCount, setSlideCount] = useState("8");
  const [tone, setTone] = useState("professionnel");

  // Guide mode
  const [guideTopic, setGuideTopic] = useState("");
  const [guideQuestions, setGuideQuestions] = useState<string[]>([]);
  const [guideAnswers, setGuideAnswers] = useState<string[]>([]);
  const [isLoadingQuestions, startLoadingQuestions] = useTransition();

  async function handleRapidGenerate() {
    if (!prompt.trim()) {
      toast.error("Veuillez décrire votre présentation");
      return;
    }

    // Fermer la modal immédiatement + toast de progression
    const savedPrompt = prompt.trim();
    const savedSlideCount = parseInt(slideCount);
    const savedTone = tone;
    onOpenChange(false);
    resetState();

    const toastId = toast.loading("Génération de la présentation en cours...", {
      description: "L'IA travaille, vous pouvez continuer à naviguer.",
      duration: Infinity,
    });

    try {
      const result = await generatePresentation({
        prompt: savedPrompt,
        slideCount: savedSlideCount,
        tone: savedTone,
      });
      toast.dismiss(toastId);
      toast.success("Présentation générée !", {
        description: "Cliquez pour l'ouvrir dans l'éditeur.",
        action: {
          label: "Ouvrir",
          onClick: () => router.push(`/genspark/${result.id}`),
        },
        duration: 10000,
      });
      router.push(`/genspark/${result.id}`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Erreur lors de la génération", {
        description: err instanceof Error ? err.message : "Veuillez réessayer.",
      });
    }
  }

  function handleLoadQuestions() {
    if (!guideTopic.trim()) {
      toast.error("Veuillez saisir un sujet");
      return;
    }
    startLoadingQuestions(async () => {
      try {
        const questions = await generateGuideQuestions(guideTopic.trim());
        setGuideQuestions(questions);
        setGuideAnswers(new Array(questions.length).fill(""));
      } catch {
        toast.error("Erreur lors de la génération des questions");
      }
    });
  }

  async function handleGuideGenerate() {
    const savedTopic = guideTopic;
    const savedAnswers = guideQuestions.map((q, i) => ({
      question: q,
      answer: guideAnswers[i] || "",
    }));

    // Fermer la modal immédiatement
    onOpenChange(false);
    resetState();

    const toastId = toast.loading("Génération de la présentation en cours...", {
      description: "L'IA travaille à partir de vos réponses.",
      duration: Infinity,
    });

    try {
      const result = await generateFromGuide({
        topic: savedTopic,
        answers: savedAnswers,
      });
      toast.dismiss(toastId);
      toast.success("Présentation générée !", {
        description: "Cliquez pour l'ouvrir dans l'éditeur.",
        action: {
          label: "Ouvrir",
          onClick: () => router.push(`/genspark/${result.id}`),
        },
        duration: 10000,
      });
      router.push(`/genspark/${result.id}`);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Erreur lors de la génération", {
        description: err instanceof Error ? err.message : "Veuillez réessayer.",
      });
    }
  }

  function resetState() {
    setPrompt("");
    setGuideTopic("");
    setGuideQuestions([]);
    setGuideAnswers([]);
  }

  function updateGuideAnswer(index: number, value: string) {
    setGuideAnswers((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-brand" />
            Générer avec l&apos;IA
          </DialogTitle>
          <DialogDescription>
            Créez une présentation complète en quelques secondes.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="rapid" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="rapid" className="flex-1 gap-2">
              <Zap className="h-3.5 w-3.5" />
              Mode rapide
            </TabsTrigger>
            <TabsTrigger value="guide" className="flex-1 gap-2">
              <MessageSquare className="h-3.5 w-3.5" />
              Mode guidé
            </TabsTrigger>
          </TabsList>

          {/* Rapid Mode */}
          <TabsContent value="rapid" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                placeholder="Décrivez le contenu de votre présentation... Ex: Pitch commercial pour une agence de marketing digital ciblant les PME"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Nombre de slides</Label>
                <Select value={slideCount} onValueChange={setSlideCount}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 slides</SelectItem>
                    <SelectItem value="8">8 slides</SelectItem>
                    <SelectItem value="10">10 slides</SelectItem>
                    <SelectItem value="12">12 slides</SelectItem>
                    <SelectItem value="15">15 slides</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Ton</Label>
                <Select value={tone} onValueChange={setTone}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professionnel">Professionnel</SelectItem>
                    <SelectItem value="decontracte">Décontracté</SelectItem>
                    <SelectItem value="inspirant">Inspirant</SelectItem>
                    <SelectItem value="pedagogique">Pédagogique</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button
                onClick={handleRapidGenerate}
                disabled={!prompt.trim()}
                className="bg-brand text-brand-dark hover:bg-brand/90"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Générer
              </Button>
            </DialogFooter>
          </TabsContent>

          {/* Guide Mode */}
          <TabsContent value="guide" className="space-y-4 mt-4">
            {guideQuestions.length === 0 ? (
              <>
                <div className="space-y-2">
                  <Label>
                    Sujet de la présentation{" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    placeholder="Ex: Formation sur les techniques de closing"
                    value={guideTopic}
                    onChange={(e) => setGuideTopic(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleLoadQuestions()
                    }
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  L&apos;IA va vous poser des questions pour mieux comprendre
                  vos besoins et créer une présentation sur mesure.
                </p>
                <DialogFooter>
                  <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Annuler
                  </Button>
                  <Button
                    onClick={handleLoadQuestions}
                    disabled={isLoadingQuestions || !guideTopic.trim()}
                    className="bg-brand text-brand-dark hover:bg-brand/90"
                  >
                    {isLoadingQuestions ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4 mr-2" />
                    )}
                    Commencer le guide
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {guideQuestions.map((q, i) => (
                    <div key={i} className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        {i + 1}. {q}
                      </Label>
                      <Textarea
                        placeholder="Votre réponse..."
                        value={guideAnswers[i] || ""}
                        onChange={(e) => updateGuideAnswer(i, e.target.value)}
                        rows={2}
                        className="text-sm"
                      />
                    </div>
                  ))}
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setGuideQuestions([]);
                      setGuideAnswers([]);
                    }}
                  >
                    Retour
                  </Button>
                  <Button
                    onClick={handleGuideGenerate}
                    className="bg-brand text-brand-dark hover:bg-brand/90"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Générer la présentation
                  </Button>
                </DialogFooter>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
