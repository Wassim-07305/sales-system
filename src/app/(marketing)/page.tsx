import Link from "next/link";
import {
  GraduationCap,
  LayoutDashboard,
  MessageSquare,
  Bot,
  Users,
  GitBranch,
  Play,
  Star,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Trophy,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata = {
  title: "Setting Academy — Devenez un Setter d'Elite",
  description:
    "La plateforme tout-en-un pour maitriser le setting, decrocher des missions et closer plus de deals. Formation, CRM, IA et communaute.",
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: GraduationCap,
    title: "Formation complete",
    desc: "12 modules progressifs, quiz interactifs et certificat de fin de formation pour valider vos competences.",
  },
  {
    icon: LayoutDashboard,
    title: "CRM integre",
    desc: "Pipeline Kanban drag & drop, suivi des leads en temps reel et automatisation du workflow commercial.",
  },
  {
    icon: MessageSquare,
    title: "Messagerie centralisee",
    desc: "Gerez vos conversations Instagram, LinkedIn et WhatsApp depuis une seule interface unifiee.",
  },
  {
    icon: Bot,
    title: "IA Setting",
    desc: "Messages automatises, relances intelligentes et suggestions de reponses generees par IA.",
  },
  {
    icon: Users,
    title: "Communaute",
    desc: "Forum d'entraide, challenges hebdomadaires, leaderboard et gamification pour rester motive.",
  },
  {
    icon: GitBranch,
    title: "Scripts & Flowcharts",
    desc: "Editeur visuel de scripts de vente avec mode flowchart, mindmap et presentation.",
  },
];

const testimonials = [
  {
    name: "Lucas M.",
    role: "Setter freelance",
    text: "En 3 mois, j'ai triple mon nombre de rendez-vous qualifies. Le CRM et les scripts ont tout change dans mon approche.",
    rating: 5,
  },
  {
    name: "Sarah K.",
    role: "Closer B2B",
    text: "La formation est ultra-complete. Les modules sur la decouverte client m'ont permis de passer de 15% a 40% de closing.",
    rating: 5,
  },
  {
    name: "Thomas D.",
    role: "Entrepreneur e-commerce",
    text: "J'ai recrute 3 setters via la plateforme. Le workspace B2B est exactement ce qu'il me fallait pour scaler.",
    rating: 5,
  },
];

const stats = [
  { value: "500+", label: "Setters formes" },
  { value: "95%", label: "De satisfaction" },
  { value: "200%", label: "Augmentation CA moyen" },
];

const pricingPlans = [
  {
    name: "Setter",
    audience: "B2C",
    price: "97",
    period: "/mois",
    description: "Tout ce qu'il faut pour devenir un setter d'elite et decrocher vos premieres missions.",
    features: [
      "Formation complete (12 modules)",
      "Acces CRM personnel",
      "Messagerie centralisee",
      "Communaute & challenges",
      "Scripts de vente",
      "Support prioritaire",
    ],
    cta: "Commencer maintenant",
    highlighted: true,
  },
  {
    name: "Entrepreneur",
    audience: "B2B",
    price: "297",
    period: "/mois",
    description: "Workspace dedie pour gerer votre equipe de setters et scaler votre acquisition.",
    features: [
      "Tout le plan Setter",
      "Workspace equipe dedie",
      "Gestion multi-setters",
      "IA avancee & automatisations",
      "Analytics & reporting",
      "Onboarding personnalise",
    ],
    cta: "Contacter l'equipe",
    highlighted: false,
  },
];

const footerLinks = [
  { label: "A propos", href: "#" },
  { label: "Formation", href: "#features" },
  { label: "Tarifs", href: "#pricing" },
  { label: "Contact", href: "#" },
  { label: "CGV", href: "#" },
  { label: "Politique de confidentialite", href: "#" },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#7af17a]/30 selection:text-white">
      {/* -------- NAV -------- */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#7af17a]">
              <Sparkles className="size-4 text-[#0A0A0A]" />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight">
              Setting Academy
            </span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-white/60 transition hover:text-white">
              Fonctionnalites
            </a>
            <a href="#testimonials" className="text-sm text-white/60 transition hover:text-white">
              Temoignages
            </a>
            <a href="#pricing" className="text-sm text-white/60 transition hover:text-white">
              Tarifs
            </a>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" className="hidden text-sm text-white/70 hover:bg-white/5 hover:text-white sm:inline-flex">
                Se connecter
              </Button>
            </Link>
            <Link href="/register">
              <Button className="bg-[#7af17a] text-sm font-semibold text-[#0A0A0A] hover:bg-[#6ae06a]">
                Commencer
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* -------- HERO -------- */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32">
        {/* Background glow effects */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#7af17a]/[0.07] blur-[120px]" />
          <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-[#7af17a]/[0.04] blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7af17a]/20 bg-[#7af17a]/10 px-4 py-1.5 text-sm text-[#7af17a]">
              <Sparkles className="size-3.5" />
              Plateforme n&deg;1 pour les setters en France
            </div>

            {/* Headline */}
            <h1 className="font-serif text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
              Devenez un{" "}
              <span className="bg-gradient-to-r from-[#7af17a] via-[#a8f7a8] to-[#7af17a] bg-clip-text text-transparent">
                Setter d&apos;Elite
              </span>
            </h1>

            {/* Subheadline */}
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl">
              La plateforme tout-en-un pour maitriser le setting, decrocher des
              missions et closer plus de deals.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-12 rounded-xl bg-[#7af17a] px-8 text-base font-semibold text-[#0A0A0A] shadow-[0_0_40px_rgba(122,241,122,0.3)] transition-shadow hover:bg-[#6ae06a] hover:shadow-[0_0_60px_rgba(122,241,122,0.4)]"
                >
                  Commencer gratuitement
                  <ArrowRight className="size-4" />
                </Button>
              </Link>
              <a href="#features">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-12 rounded-xl border-white/10 bg-white/5 px-8 text-base text-white hover:bg-white/10 hover:text-white"
                >
                  Decouvrir la formation
                </Button>
              </a>
            </div>
          </div>

          {/* VSL Video Placeholder */}
          <div className="mx-auto mt-16 max-w-4xl sm:mt-20">
            <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent shadow-2xl shadow-[#7af17a]/5">
              <div className="flex aspect-video items-center justify-center bg-[#111111]">
                <button className="flex size-20 items-center justify-center rounded-full bg-[#7af17a]/90 shadow-lg shadow-[#7af17a]/30 transition-all hover:scale-110 hover:bg-[#7af17a]">
                  <Play className="ml-1 size-8 text-[#0A0A0A]" />
                </button>
              </div>
              <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" />
            </div>
          </div>
        </div>
      </section>

      {/* -------- SOCIAL PROOF BAR -------- */}
      <section className="border-y border-white/5 bg-[#0A0A0A]/80 py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-serif text-4xl font-bold text-[#7af17a] sm:text-5xl">
                  {stat.value}
                </div>
                <div className="mt-2 text-sm tracking-wide text-white/50 uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------- FEATURES -------- */}
      <section id="features" className="scroll-mt-20 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60">
              <TrendingUp className="size-3.5" />
              Tout-en-un
            </div>
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Tout ce dont vous avez besoin pour{" "}
              <span className="bg-gradient-to-r from-[#7af17a] to-[#a8f7a8] bg-clip-text text-transparent">
                performer
              </span>
            </h2>
            <p className="mt-4 text-lg text-white/50">
              Une suite d&apos;outils concus pour les setters et closers ambitieux.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative rounded-2xl border border-white/5 bg-[#111111] p-8 transition-all hover:border-[#7af17a]/20 hover:bg-[#111111]/80"
              >
                <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-[#7af17a]/10 text-[#7af17a] transition-colors group-hover:bg-[#7af17a]/20">
                  <feature.icon className="size-6" />
                </div>
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/50">
                  {feature.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------- TESTIMONIALS -------- */}
      <section
        id="testimonials"
        className="scroll-mt-20 border-y border-white/5 bg-[#080808] py-24 sm:py-32"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60">
              <Trophy className="size-3.5" />
              Temoignages
            </div>
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Ils ont transforme leur carriere
            </h2>
            <p className="mt-4 text-lg text-white/50">
              Decouvrez les retours de nos membres les plus actifs.
            </p>
          </div>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <div
                key={t.name}
                className="rounded-2xl border border-white/5 bg-[#111111] p-8"
              >
                <div className="mb-4 flex gap-1">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star
                      key={i}
                      className="size-4 fill-[#7af17a] text-[#7af17a]"
                    />
                  ))}
                </div>
                <p className="text-sm leading-relaxed text-white/70">
                  &ldquo;{t.text}&rdquo;
                </p>
                <div className="mt-6 flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-full bg-[#7af17a]/10 text-sm font-bold text-[#7af17a]">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-white/40">{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------- PRICING -------- */}
      <section id="pricing" className="scroll-mt-20 py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60">
              <Sparkles className="size-3.5" />
              Tarifs
            </div>
            <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
              Un investissement, pas une depense
            </h2>
            <p className="mt-4 text-lg text-white/50">
              Choisissez le plan adapte a votre profil et commencez a performer.
            </p>
          </div>

          <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
            {pricingPlans.map((plan) => (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-8 transition-all ${
                  plan.highlighted
                    ? "border-[#7af17a]/30 bg-gradient-to-b from-[#7af17a]/[0.08] to-transparent shadow-lg shadow-[#7af17a]/5"
                    : "border-white/5 bg-[#111111]"
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-[#7af17a] px-4 py-1 text-xs font-bold text-[#0A0A0A] uppercase">
                    Populaire
                  </div>
                )}
                <div className="mb-1 text-sm font-medium text-[#7af17a]">
                  {plan.audience}
                </div>
                <h3 className="font-serif text-2xl font-bold">{plan.name}</h3>
                <p className="mt-2 text-sm text-white/50">{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-serif text-5xl font-bold">
                    {plan.price}&euro;
                  </span>
                  <span className="text-white/40">{plan.period}</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#7af17a]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/register" className="mt-8 block">
                  <Button
                    className={`h-11 w-full rounded-xl text-sm font-semibold ${
                      plan.highlighted
                        ? "bg-[#7af17a] text-[#0A0A0A] hover:bg-[#6ae06a]"
                        : "bg-white/10 text-white hover:bg-white/15"
                    }`}
                  >
                    {plan.cta}
                    <ChevronRight className="size-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------- CTA FINAL -------- */}
      <section className="relative overflow-hidden border-t border-white/5 py-24 sm:py-32">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 bottom-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#7af17a]/[0.06] blur-[120px]" />
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            Pret a transformer{" "}
            <span className="bg-gradient-to-r from-[#7af17a] to-[#a8f7a8] bg-clip-text text-transparent">
              votre carriere
            </span>{" "}
            ?
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-white/50">
            Rejoignez des centaines de setters qui ont deja fait le choix de
            l&apos;excellence. Votre premiere mission vous attend.
          </p>
          <div className="mt-10">
            <Link href="/register">
              <Button
                size="lg"
                className="h-13 rounded-xl bg-[#7af17a] px-10 text-base font-semibold text-[#0A0A0A] shadow-[0_0_40px_rgba(122,241,122,0.3)] transition-shadow hover:bg-[#6ae06a] hover:shadow-[0_0_60px_rgba(122,241,122,0.4)]"
              >
                Rejoindre Setting Academy
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* -------- FOOTER -------- */}
      <footer className="border-t border-white/5 bg-[#080808] py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-md bg-[#7af17a]">
                <Sparkles className="size-3.5 text-[#0A0A0A]" />
              </div>
              <span className="font-serif text-base font-bold">
                Setting Academy
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              {footerLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  className="text-sm text-white/40 transition hover:text-white/70"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-white/5 pt-8 text-center text-xs text-white/30">
            &copy; {new Date().getFullYear()} Setting Academy. Tous droits reserves.
          </div>
        </div>
      </footer>
    </div>
  );
}
