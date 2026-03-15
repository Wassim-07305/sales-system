"use client";

import Link from "next/link";
import { useState, useEffect, useRef, type ReactNode } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  Bot,
  GitBranch,
  MessageSquare,
  BarChart3,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  TrendingUp,
  Star,
  Menu,
  X,
  Zap,
  Shield,
  Clock,
  UserPlus,
  Users,
  Rocket,
  ChevronRight,
  Check,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Intersection Observer — fade-in on scroll                          */
/* ------------------------------------------------------------------ */

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.unobserve(el);
        }
      },
      { threshold }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, isInView };
}

function FadeIn({
  children,
  className = "",
  delay = 0,
  isInView,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  isInView: boolean;
}) {
  return (
    <div
      className={`transition-all duration-700 ${
        isInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated counter                                                    */
/* ------------------------------------------------------------------ */

function AnimatedCounter({
  target,
  suffix,
  isInView,
}: {
  target: number;
  suffix: string;
  isInView: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isInView) return;
    let frame: number;
    const duration = 2000;
    const start = performance.now();

    function step(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) frame = requestAnimationFrame(step);
    }

    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [isInView, target]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const navLinks = [
  { label: "Fonctionnalites", href: "#features" },
  { label: "Comment ca marche", href: "#how-it-works" },
  { label: "Tarifs", href: "#pricing" },
  { label: "Temoignages", href: "#testimonials" },
];

const stats = [
  { value: 200, suffix: "+", label: "Setters formes" },
  { value: 50, suffix: "+", label: "Entreprises" },
  { value: 98, suffix: "%", label: "De satisfaction" },
];

const features = [
  {
    icon: LayoutDashboard,
    title: "CRM Intelligent",
    desc: "Pipeline Kanban drag & drop, automatisation du workflow et suivi des deals en temps reel.",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: GraduationCap,
    title: "Academy",
    desc: "Formation modulaire progressive, quiz interactifs, certifications et suivi de competences.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: Bot,
    title: "Prospection IA",
    desc: "LinkedIn, Instagram et WhatsApp automatises. Relances intelligentes et scoring des leads.",
    gradient: "from-violet-500/20 to-violet-500/5",
  },
  {
    icon: GitBranch,
    title: "Scripts de Vente",
    desc: "Flowcharts interactifs, mind maps visuels et templates de scripts prets a l'emploi.",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: MessageSquare,
    title: "Chat & Communaute",
    desc: "Messagerie temps reel, forum d'entraide, events communautaires et replays video.",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Funnel de conversion, attribution multi-canal, projections IA et heatmaps de performance.",
    gradient: "from-cyan-500/20 to-cyan-500/5",
  },
];

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "Creez votre compte",
    desc: "Configuration en 5 minutes. Importez vos contacts et personnalisez votre pipeline.",
  },
  {
    icon: Users,
    number: "02",
    title: "Formez votre equipe",
    desc: "Academy complete avec modules progressifs, roleplay IA et certifications.",
  },
  {
    icon: Rocket,
    number: "03",
    title: "Prospectez et vendez",
    desc: "CRM intelligent, prospection IA multi-canal et automatisation du closing.",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: { monthly: "Gratuit", yearly: "Gratuit" },
    priceValue: { monthly: 0, yearly: 0 },
    description: "Pour demarrer et decouvrir la plateforme.",
    features: [
      "1 utilisateur",
      "CRM basique",
      "Academy (modules gratuits)",
      "Communaute",
      "Support email",
    ],
    cta: "Commencer gratuitement",
    highlighted: false,
  },
  {
    name: "Pro",
    price: { monthly: "49", yearly: "39" },
    priceValue: { monthly: 49, yearly: 39 },
    description: "Pour les equipes qui veulent scaler.",
    features: [
      "Jusqu'a 5 utilisateurs",
      "CRM complet + Kanban",
      "Academy integrale",
      "Prospection IA",
      "Analytics avances",
      "Scripts & flowcharts",
      "Support prioritaire",
    ],
    cta: "Essai gratuit 14 jours",
    highlighted: true,
    badge: "Populaire",
  },
  {
    name: "Enterprise",
    price: { monthly: "Sur mesure", yearly: "Sur mesure" },
    priceValue: { monthly: -1, yearly: -1 },
    description: "Pour les organisations ambitieuses.",
    features: [
      "Utilisateurs illimites",
      "White-label complet",
      "API & integrations",
      "Support dedie",
      "Onboarding personnalise",
      "SLA garanti",
      "Formation sur site",
    ],
    cta: "Contacter l'equipe",
    highlighted: false,
  },
];

const testimonials = [
  {
    name: "Lucas M.",
    role: "Setter freelance",
    text: "En 3 mois, j'ai triple mon nombre de rendez-vous qualifies. Le CRM et les scripts ont tout change dans mon approche commerciale.",
    rating: 5,
    metric: "3x plus de RDV",
  },
  {
    name: "Sarah K.",
    role: "Closer B2B",
    text: "La formation est ultra-complete. Les modules sur la decouverte client m'ont permis de passer de 15% a 40% de taux de closing.",
    rating: 5,
    metric: "+25 pts de closing",
  },
  {
    name: "Thomas D.",
    role: "Entrepreneur e-commerce",
    text: "J'ai recrute 3 setters via la plateforme. Le workspace B2B est exactement ce qu'il me fallait pour scaler mon acquisition.",
    rating: 5,
    metric: "Equipe x3 en 2 mois",
  },
];

const footerSections = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalites", href: "#features" },
      { label: "Tarifs", href: "#pricing" },
      { label: "Temoignages", href: "#testimonials" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Blog", href: "/blog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "CGV", href: "/cgv" },
      { label: "Mentions legales", href: "/mentions-legales" },
      { label: "Politique de confidentialite", href: "/confidentialite" },
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Dashboard mockup component                                         */
/* ------------------------------------------------------------------ */

function DashboardMockup() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-px">
      <div className="overflow-hidden rounded-[15px] bg-[#0F0F11]">
        {/* Top bar */}
        <div className="flex items-center gap-2 border-b border-white/[0.04] px-4 py-3">
          <div className="flex gap-1.5">
            <span className="size-2.5 rounded-full bg-red-500/60" />
            <span className="size-2.5 rounded-full bg-amber-500/60" />
            <span className="size-2.5 rounded-full bg-green-500/60" />
          </div>
          <div className="ml-3 flex-1 rounded-md bg-white/[0.04] px-3 py-1 text-[11px] text-white/30">
            app.settingacademy.fr/dashboard
          </div>
        </div>

        {/* Dashboard content mockup */}
        <div className="grid grid-cols-12 gap-3 p-4">
          {/* Sidebar mock */}
          <div className="col-span-2 hidden space-y-2 lg:block">
            <div className="h-3 w-16 rounded bg-[#7af17a]/20" />
            <div className="mt-4 space-y-2">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`h-2.5 rounded ${i === 0 ? "w-full bg-[#7af17a]/15" : "w-3/4 bg-white/[0.04]"}`}
                />
              ))}
            </div>
          </div>

          {/* Main content */}
          <div className="col-span-12 space-y-3 lg:col-span-10">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {["Leads", "RDV", "Closing", "CA"].map((label, i) => (
                <div
                  key={label}
                  className={`rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 ${i === 3 ? "hidden sm:block" : ""}`}
                >
                  <div className="text-[9px] text-white/30">{label}</div>
                  <div className="mt-1 text-sm font-bold text-white/80">
                    {["147", "42", "18", "24.5k"][i]}
                  </div>
                  <div className="mt-1 flex items-center gap-1">
                    <div className="h-1 flex-1 rounded-full bg-white/[0.04]">
                      <div
                        className="h-1 rounded-full bg-[#7af17a]/40"
                        style={{ width: `${[72, 58, 82, 65][i]}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Chart mock */}
            <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[10px] font-medium text-white/40">
                  Performance
                </div>
                <div className="flex gap-2">
                  <div className="h-1.5 w-6 rounded bg-[#7af17a]/30" />
                  <div className="h-1.5 w-6 rounded bg-blue-500/30" />
                </div>
              </div>
              <div className="flex h-16 items-end gap-1 sm:h-24">
                {[35, 42, 28, 56, 45, 68, 52, 75, 60, 82, 70, 90].map(
                  (h, i) => (
                    <div key={i} className="flex flex-1 flex-col gap-0.5">
                      <div
                        className="rounded-t bg-[#7af17a]/20 transition-all duration-500"
                        style={{ height: `${h}%` }}
                      />
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Kanban mock */}
            <div className="grid grid-cols-3 gap-2">
              {["Prospect", "Decouverte", "Closing"].map((col, ci) => (
                <div
                  key={col}
                  className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-2"
                >
                  <div className="mb-2 text-[9px] font-medium text-white/30">
                    {col}
                  </div>
                  {[...Array(ci === 0 ? 3 : ci === 1 ? 2 : 1)].map((_, j) => (
                    <div
                      key={j}
                      className="mb-1.5 rounded border border-white/[0.04] bg-white/[0.03] p-1.5"
                    >
                      <div className="h-1.5 w-3/4 rounded bg-white/[0.08]" />
                      <div className="mt-1 h-1 w-1/2 rounded bg-white/[0.04]" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [billingYearly, setBillingYearly] = useState(false);

  const statsSection = useInView(0.3);
  const featuresSection = useInView(0.1);
  const howSection = useInView(0.1);
  const pricingSection = useInView(0.1);
  const testimonialsSection = useInView(0.1);
  const ctaSection = useInView(0.2);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-[#7af17a]/20 selection:text-white">
      {/* Dot grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* ================================================================ */}
      {/*  NAVIGATION                                                       */}
      {/* ================================================================ */}
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          scrolled
            ? "border-b border-white/[0.06] bg-[#0a0a0a]/80 backdrop-blur-2xl backdrop-saturate-150"
            : "bg-transparent"
        }`}
        aria-label="Navigation principale"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5"
            aria-label="Setting Academy - Accueil"
          >
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#7af17a] shadow-[0_0_12px_rgba(122,241,122,0.3)]">
              <Sparkles className="size-4 text-[#0a0a0a]" aria-hidden="true" />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight">
              Setting Academy
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="rounded-lg px-3.5 py-2 text-[13px] font-medium text-white/50 transition-colors duration-200 hover:bg-white/[0.04] hover:text-white/90"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex">
              <button
                type="button"
                className="h-9 rounded-lg px-4 text-[13px] font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
              >
                Connexion
              </button>
            </Link>
            <Link href="/register" className="hidden sm:inline-flex">
              <button
                type="button"
                className="flex h-9 items-center gap-1.5 rounded-lg bg-[#7af17a] px-4 text-[13px] font-semibold text-[#0a0a0a] transition-all duration-200 hover:bg-[#8ff58f] hover:shadow-[0_0_20px_rgba(122,241,122,0.2)]"
              >
                Commencer
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </button>
            </Link>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={
                mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"
              }
            >
              {mobileMenuOpen ? (
                <X className="size-5" aria-hidden="true" />
              ) : (
                <Menu className="size-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu panel */}
        <div
          id="mobile-menu"
          className={`overflow-hidden border-t border-white/[0.04] bg-[#0a0a0a]/98 backdrop-blur-2xl transition-all duration-300 md:hidden ${
            mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
          role="menu"
        >
          <div className="space-y-1 px-4 py-3">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                role="menuitem"
                className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="flex flex-col gap-2 border-t border-white/[0.04] pt-3">
              <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                <button
                  type="button"
                  className="w-full rounded-lg py-2.5 text-center text-[15px] font-medium text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white"
                >
                  Connexion
                </button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <button
                  type="button"
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#7af17a] py-2.5 text-[15px] font-semibold text-[#0a0a0a] transition-colors hover:bg-[#8ff58f]"
                >
                  Commencer
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* ============================================================== */}
        {/*  1. HERO                                                        */}
        {/* ============================================================== */}
        <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28 lg:pt-44 lg:pb-36">
          {/* Background orbs */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-[700px] w-[1000px] -translate-x-1/2 rounded-full bg-[#7af17a]/[0.04] blur-[160px]" />
            <div className="absolute right-1/4 top-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/[0.02] blur-[100px]" />
            <div className="absolute left-1/4 top-1/3 h-[250px] w-[250px] rounded-full bg-[#7af17a]/[0.02] blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-[13px] font-medium text-white/50 backdrop-blur-sm">
                <span className="flex size-1.5 rounded-full bg-[#7af17a] shadow-[0_0_6px_rgba(122,241,122,0.6)]" />
                Plateforme n&deg;1 pour les equipes de vente
              </div>

              {/* Headline */}
              <h1 className="font-serif text-[2.75rem] font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-[4.25rem]">
                La plateforme{" "}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-[#7af17a] via-[#b0f4b0] to-[#7af17a] bg-clip-text text-transparent">
                    tout-en-un
                  </span>
                  <span
                    className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#7af17a]/40 to-transparent"
                    aria-hidden="true"
                  />
                </span>{" "}
                pour les equipes de vente
              </h1>

              {/* Subheadline */}
              <p className="mx-auto mt-6 max-w-xl text-[1.125rem] leading-relaxed text-white/45 sm:text-lg">
                Formation, CRM, prospection IA et management d&apos;equipe.
                Remplacez 10 outils par un seul.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register">
                  <button
                    type="button"
                    className="group flex h-12 items-center gap-2 rounded-xl bg-[#7af17a] px-7 text-[15px] font-semibold text-[#0a0a0a] shadow-[0_0_40px_rgba(122,241,122,0.15),0_1px_2px_rgba(0,0,0,0.2)] transition-all duration-300 hover:bg-[#8ff58f] hover:shadow-[0_0_60px_rgba(122,241,122,0.25)] active:scale-[0.98]"
                  >
                    Commencer gratuitement
                    <ArrowRight
                      className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </button>
                </Link>
                <a href="#features">
                  <button
                    type="button"
                    className="h-12 rounded-xl border border-white/[0.08] bg-white/[0.03] px-7 text-[15px] font-medium text-white/70 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
                  >
                    Voir la demo
                  </button>
                </a>
              </div>

              {/* Trust pills */}
              <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-[13px] text-white/50">
                <span className="flex items-center gap-1.5">
                  <Shield className="size-3.5" aria-hidden="true" />
                  Sans engagement
                </span>
                <span className="h-3 w-px bg-white/10" aria-hidden="true" />
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden="true" />
                  Setup en 5 min
                </span>
                <span className="h-3 w-px bg-white/10" aria-hidden="true" />
                <span className="flex items-center gap-1.5">
                  <Zap className="size-3.5" aria-hidden="true" />
                  Acces immediat
                </span>
              </div>
            </div>

            {/* Dashboard mockup */}
            <div className="mx-auto mt-16 max-w-4xl sm:mt-20">
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/*  2. SOCIAL PROOF / STATS                                        */}
        {/* ============================================================== */}
        <section
          ref={statsSection.ref}
          className="relative border-y border-white/[0.04] py-16 sm:py-20"
          aria-label="Statistiques"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="mb-10 text-center text-[13px] font-medium uppercase tracking-[0.15em] text-white/30">
              Ils nous font confiance
            </p>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
              {stats.map((stat, i) => (
                <div key={stat.label} className="text-center">
                  <div
                    className={`font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl transition-all duration-700 ${
                      statsSection.isInView
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4"
                    }`}
                    style={{ transitionDelay: `${i * 150}ms` }}
                  >
                    <AnimatedCounter
                      target={stat.value}
                      suffix={stat.suffix}
                      isInView={statsSection.isInView}
                    />
                  </div>
                  <div
                    className={`mt-2 text-[13px] font-medium tracking-wide text-white/50 uppercase transition-all duration-700 ${
                      statsSection.isInView
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-4"
                    }`}
                    style={{ transitionDelay: `${i * 150 + 100}ms` }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/*  3. FEATURES GRID                                               */}
        {/* ============================================================== */}
        <section
          id="features"
          ref={featuresSection.ref}
          className="scroll-mt-20 py-24 sm:py-32 lg:py-40"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FadeIn isInView={featuresSection.isInView} className="mx-auto max-w-2xl text-center">
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#7af17a]/70">
                Fonctionnalites
              </p>
              <h2
                id="features-heading"
                className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]"
              >
                Tout ce dont vous avez besoin
                <br className="hidden sm:block" />
                pour{" "}
                <span className="text-white/40">performer</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/50 sm:text-lg">
                Une suite d&apos;outils concus pour les equipes de vente ambitieuses.
              </p>
            </FadeIn>

            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-20 lg:grid-cols-3">
              {features.map((feature, i) => (
                <article
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-2xl border border-white/[0.04] bg-white/[0.02] p-7 transition-all duration-500 hover:border-white/[0.08] hover:bg-white/[0.04] hover:scale-[1.02] sm:p-8 ${
                    featuresSection.isInView
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  {/* Hover glow */}
                  <div
                    className={`pointer-events-none absolute -top-20 -right-20 h-40 w-40 rounded-full bg-gradient-to-br ${feature.gradient} opacity-0 blur-3xl transition-opacity duration-500 group-hover:opacity-100`}
                    aria-hidden="true"
                  />
                  <div className="relative">
                    <div className="mb-5 flex size-10 items-center justify-center rounded-lg bg-white/[0.06] text-white/70 transition-colors duration-300 group-hover:bg-[#7af17a]/10 group-hover:text-[#7af17a]">
                      <feature.icon className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-[15px] font-semibold tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="mt-2.5 text-[14px] leading-relaxed text-white/50">
                      {feature.desc}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/*  4. COMMENT CA MARCHE                                           */}
        {/* ============================================================== */}
        <section
          id="how-it-works"
          ref={howSection.ref}
          className="scroll-mt-20 border-y border-white/[0.04] bg-[#070709] py-24 sm:py-32 lg:py-40"
          aria-labelledby="how-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FadeIn isInView={howSection.isInView} className="mx-auto max-w-2xl text-center">
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#7af17a]/70">
                Comment ca marche
              </p>
              <h2
                id="how-heading"
                className="font-serif text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Operationnel en{" "}
                <span className="text-white/40">3 etapes</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/50 sm:text-lg">
                Une mise en place simple pour des resultats rapides.
              </p>
            </FadeIn>

            <div className="relative mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 lg:mt-20">
              {/* Connector line (desktop) */}
              <div
                className="pointer-events-none absolute top-16 left-[16.66%] hidden h-px w-[66.66%] bg-gradient-to-r from-[#7af17a]/20 via-[#7af17a]/10 to-[#7af17a]/20 md:block"
                aria-hidden="true"
              />

              {steps.map((step, i) => (
                <FadeIn
                  key={step.number}
                  isInView={howSection.isInView}
                  delay={i * 120}
                  className="relative text-center"
                >
                  <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.03]">
                    <step.icon
                      className="size-6 text-[#7af17a]/70"
                      aria-hidden="true"
                    />
                  </div>
                  <div className="mb-3 text-[12px] font-bold tracking-[0.2em] text-[#7af17a]/50">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    {step.title}
                  </h3>
                  <p className="mx-auto mt-2.5 max-w-xs text-[14px] leading-relaxed text-white/50">
                    {step.desc}
                  </p>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/*  5. PRICING                                                     */}
        {/* ============================================================== */}
        <section
          id="pricing"
          ref={pricingSection.ref}
          className="scroll-mt-20 py-24 sm:py-32 lg:py-40"
          aria-labelledby="pricing-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FadeIn isInView={pricingSection.isInView} className="mx-auto max-w-2xl text-center">
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#7af17a]/70">
                Tarifs
              </p>
              <h2
                id="pricing-heading"
                className="font-serif text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Un investissement, pas une depense
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/50 sm:text-lg">
                Choisissez le plan adapte a votre equipe.
              </p>

              {/* Monthly/Yearly toggle */}
              <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-white/[0.06] bg-white/[0.03] p-1.5">
                <button
                  type="button"
                  onClick={() => setBillingYearly(false)}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                    !billingYearly
                      ? "bg-white/[0.1] text-white"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setBillingYearly(true)}
                  className={`flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-medium transition-all duration-200 ${
                    billingYearly
                      ? "bg-white/[0.1] text-white"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  Annuel
                  <span className="rounded-full bg-[#7af17a]/10 px-2 py-0.5 text-[11px] font-semibold text-[#7af17a]">
                    -20%
                  </span>
                </button>
              </div>
            </FadeIn>

            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3 lg:mt-16">
              {pricingPlans.map((plan, i) => (
                <article
                  key={plan.name}
                  className={`group relative overflow-hidden rounded-2xl border transition-all duration-500 ${
                    plan.highlighted
                      ? "border-[#7af17a]/20 bg-gradient-to-b from-[#7af17a]/[0.04] to-transparent"
                      : "border-white/[0.04] bg-white/[0.02]"
                  } p-7 sm:p-8 ${
                    pricingSection.isInView
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7af17a]/50 to-transparent" />
                  )}
                  {plan.highlighted && plan.badge && (
                    <div className="mb-5 inline-flex items-center rounded-full bg-[#7af17a]/10 px-3 py-1 text-[12px] font-semibold text-[#7af17a]">
                      {plan.badge}
                    </div>
                  )}

                  <h3 className="font-serif text-xl font-bold">{plan.name}</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/50">
                    {plan.description}
                  </p>

                  <div className="mt-6 flex items-baseline gap-1">
                    {plan.priceValue[billingYearly ? "yearly" : "monthly"] === 0 ? (
                      <span className="font-serif text-4xl font-bold tracking-tight">
                        Gratuit
                      </span>
                    ) : plan.priceValue[billingYearly ? "yearly" : "monthly"] === -1 ? (
                      <span className="font-serif text-2xl font-bold tracking-tight">
                        Sur mesure
                      </span>
                    ) : (
                      <>
                        <span className="font-serif text-4xl font-bold tracking-tight">
                          {plan.price[billingYearly ? "yearly" : "monthly"]}&euro;
                        </span>
                        <span className="text-[15px] text-white/30">/mois</span>
                      </>
                    )}
                  </div>

                  <div className="my-7 h-px bg-white/[0.04]" />

                  <ul className="space-y-3" role="list">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-3 text-[14px] text-white/55"
                      >
                        <Check
                          className={`mt-0.5 size-4 shrink-0 ${
                            plan.highlighted
                              ? "text-[#7af17a]/70"
                              : "text-white/25"
                          }`}
                          aria-hidden="true"
                        />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <Link href="/register" className="mt-8 block">
                    <button
                      type="button"
                      className={`group/btn flex h-11 w-full items-center justify-center gap-1.5 rounded-xl text-[14px] font-semibold transition-all duration-300 active:scale-[0.98] ${
                        plan.highlighted
                          ? "bg-[#7af17a] text-[#0a0a0a] shadow-[0_0_20px_rgba(122,241,122,0.1)] hover:bg-[#8ff58f] hover:shadow-[0_0_30px_rgba(122,241,122,0.2)]"
                          : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white"
                      }`}
                    >
                      {plan.cta}
                      <ChevronRight
                        className="size-4 transition-transform duration-200 group-hover/btn:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </button>
                  </Link>
                </article>
              ))}
            </div>

            <p className="mx-auto mt-10 max-w-md text-center text-[13px] text-white/45">
              Annulation possible a tout moment. Sans carte bancaire pour le plan Starter.
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/*  6. TESTIMONIALS                                                */}
        {/* ============================================================== */}
        <section
          id="testimonials"
          ref={testimonialsSection.ref}
          className="scroll-mt-20 border-y border-white/[0.04] bg-[#070709] py-24 sm:py-32 lg:py-40"
          aria-labelledby="testimonials-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FadeIn isInView={testimonialsSection.isInView} className="mx-auto max-w-2xl text-center">
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#7af17a]/70">
                Temoignages
              </p>
              <h2
                id="testimonials-heading"
                className="font-serif text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Ils ont transforme leur carriere
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/50 sm:text-lg">
                Decouvrez les retours de nos membres les plus actifs.
              </p>
            </FadeIn>

            <div className="mt-16 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3 lg:mt-20">
              {testimonials.map((t, i) => (
                <article
                  key={t.name}
                  className={`group relative overflow-hidden rounded-2xl border border-white/[0.04] bg-white/[0.02] p-7 transition-all duration-500 hover:border-white/[0.08] hover:bg-white/[0.04] sm:p-8 ${
                    testimonialsSection.isInView
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${i * 100}ms` }}
                >
                  {/* Result badge */}
                  <div className="mb-5 inline-flex items-center gap-1.5 rounded-full border border-[#7af17a]/10 bg-[#7af17a]/[0.06] px-3 py-1 text-[12px] font-medium text-[#7af17a]/80">
                    <TrendingUp className="size-3" aria-hidden="true" />
                    {t.metric}
                  </div>

                  <div
                    className="mb-4 flex gap-0.5"
                    role="img"
                    aria-label={`${t.rating} etoiles sur 5`}
                  >
                    {Array.from({ length: t.rating }).map((_, idx) => (
                      <Star
                        key={idx}
                        className="size-3.5 fill-amber-400/80 text-amber-400/80"
                        aria-hidden="true"
                      />
                    ))}
                  </div>

                  <blockquote className="text-[14px] leading-relaxed text-white/55">
                    &laquo;&nbsp;{t.text}&nbsp;&raquo;
                  </blockquote>

                  <div className="mt-6 flex items-center gap-3 border-t border-white/[0.04] pt-5">
                    <div
                      className="flex size-9 items-center justify-center rounded-full bg-white/[0.06] text-[13px] font-semibold text-white/60"
                      aria-hidden="true"
                    >
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[13px] font-semibold text-white/80">
                        {t.name}
                      </div>
                      <div className="text-[12px] text-white/50">{t.role}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/*  7. CTA FINAL                                                   */}
        {/* ============================================================== */}
        <section
          ref={ctaSection.ref}
          className="relative overflow-hidden py-24 sm:py-32 lg:py-40"
          aria-labelledby="cta-heading"
        >
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/2 bottom-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#7af17a]/[0.03] blur-[160px]" />
          </div>
          <FadeIn
            isInView={ctaSection.isInView}
            className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8"
          >
            <h2
              id="cta-heading"
              className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
            >
              Pret a transformer
              <br />
              <span className="text-white/40">votre equipe commerciale</span> ?
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-white/50 sm:text-lg">
              Rejoignez des centaines de professionnels qui ont deja fait le choix de l&apos;excellence.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4">
              <Link href="/register">
                <button
                  type="button"
                  className="group flex h-13 items-center gap-2 rounded-xl bg-[#7af17a] px-10 text-[15px] font-semibold text-[#0a0a0a] shadow-[0_0_40px_rgba(122,241,122,0.15)] transition-all duration-300 hover:bg-[#8ff58f] hover:shadow-[0_0_60px_rgba(122,241,122,0.25)] active:scale-[0.98]"
                >
                  Commencer gratuitement
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </button>
              </Link>
              <span className="text-[13px] text-white/45">
                Pas de carte bancaire requise
              </span>
            </div>
          </FadeIn>
        </section>
      </main>

      {/* ================================================================ */}
      {/*  8. FOOTER                                                        */}
      {/* ================================================================ */}
      <footer
        className="border-t border-white/[0.04] bg-[#070709] py-16 sm:py-20"
        role="contentinfo"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link
                href="/"
                className="flex items-center gap-2.5"
                aria-label="Setting Academy - Accueil"
              >
                <div className="flex size-7 items-center justify-center rounded-md bg-[#7af17a]">
                  <Sparkles
                    className="size-3.5 text-[#0a0a0a]"
                    aria-hidden="true"
                  />
                </div>
                <span className="font-serif text-[15px] font-bold">
                  Setting Academy
                </span>
              </Link>
              <p className="mt-4 max-w-[220px] text-[13px] leading-relaxed text-white/50">
                La plateforme de reference pour les equipes de vente en France.
              </p>
            </div>

            {/* Link sections */}
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-white/40">
                  {section.title}
                </h3>
                <ul className="mt-4 space-y-2.5" role="list">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[13px] text-white/50 transition-colors duration-200 hover:text-white/70"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 border-t border-white/[0.04] pt-8 text-center text-[12px] text-white/45">
            &copy; 2026 Setting Academy. Tous droits reserves.
          </div>
        </div>
      </footer>
    </div>
  );
}
