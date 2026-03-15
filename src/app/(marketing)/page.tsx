"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
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
  Zap,
  Shield,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";

/* ------------------------------------------------------------------ */
/*  Intersection Observer hook for scroll-triggered animations          */
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

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: GraduationCap,
    title: "Formation complète",
    desc: "12 modules progressifs, quiz interactifs et certificat de fin de formation pour valider vos compétences.",
    gradient: "from-emerald-500/20 to-emerald-500/5",
  },
  {
    icon: LayoutDashboard,
    title: "CRM intégré",
    desc: "Pipeline Kanban drag & drop, suivi des leads en temps réel et automatisation du workflow commercial.",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: MessageSquare,
    title: "Messagerie centralisée",
    desc: "Gérez vos conversations Instagram, LinkedIn et WhatsApp depuis une seule interface unifiée.",
    gradient: "from-violet-500/20 to-violet-500/5",
  },
  {
    icon: Bot,
    title: "IA Setting",
    desc: "Messages automatisés, relances intelligentes et suggestions de réponses générées par IA.",
    gradient: "from-amber-500/20 to-amber-500/5",
  },
  {
    icon: Users,
    title: "Communauté",
    desc: "Forum d\u2019entraide, challenges hebdomadaires, leaderboard et gamification pour rester motivé.",
    gradient: "from-rose-500/20 to-rose-500/5",
  },
  {
    icon: GitBranch,
    title: "Scripts & Flowcharts",
    desc: "Éditeur visuel de scripts de vente avec mode flowchart, mindmap et présentation.",
    gradient: "from-cyan-500/20 to-cyan-500/5",
  },
];

const testimonials = [
  {
    name: "Lucas M.",
    role: "Setter freelance",
    text: "En 3 mois, j\u2019ai triplé mon nombre de rendez-vous qualifiés. Le CRM et les scripts ont tout changé dans mon approche.",
    rating: 5,
    metric: "3x plus de RDV",
  },
  {
    name: "Sarah K.",
    role: "Closer B2B",
    text: "La formation est ultra-complète. Les modules sur la découverte client m\u2019ont permis de passer de 15\u00A0% à 40\u00A0% de closing.",
    rating: 5,
    metric: "+25 pts de closing",
  },
  {
    name: "Thomas D.",
    role: "Entrepreneur e-commerce",
    text: "J\u2019ai recruté 3 setters via la plateforme. Le workspace B2B est exactement ce qu\u2019il me fallait pour scaler.",
    rating: 5,
    metric: "Équipe x3 en 2 mois",
  },
];

const stats = [
  { value: 500, suffix: "+", label: "Setters formés" },
  { value: 95, suffix: "\u00A0%", label: "De satisfaction" },
  { value: 200, suffix: "\u00A0%", label: "Augmentation CA moyen" },
];

const pricingPlans = [
  {
    name: "Setter",
    audience: "B2C",
    price: "97",
    period: "/mois",
    description:
      "Tout ce qu\u2019il faut pour devenir un setter d\u2019élite et décrocher vos premières missions.",
    features: [
      "Formation complète (12 modules)",
      "Accès CRM personnel",
      "Messagerie centralisée",
      "Communauté & challenges",
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
    description:
      "Workspace dédié pour gérer votre équipe de setters et scaler votre acquisition.",
    features: [
      "Tout le plan Setter",
      "Workspace équipe dédié",
      "Gestion multi-setters",
      "IA avancée & automatisations",
      "Analytics & reporting",
      "Onboarding personnalisé",
    ],
    cta: "Contacter l\u2019équipe",
    highlighted: false,
  },
];

const footerSections = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "#features" },
      { label: "Tarifs", href: "#pricing" },
      { label: "Témoignages", href: "#testimonials" },
    ],
  },
  {
    title: "Entreprise",
    links: [
      { label: "À propos", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Légal",
    links: [
      { label: "CGV", href: "/cgv" },
      { label: "Mentions légales", href: "/mentions-legales" },
      { label: "Politique de confidentialité", href: "/confidentialite" },
    ],
  },
];

const navLinks = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Témoignages", href: "#testimonials" },
  { label: "Tarifs", href: "#pricing" },
];

/* ------------------------------------------------------------------ */
/*  Animated counter component                                         */
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
      // Ease-out cubic
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const statsSection = useInView(0.3);
  const featuresSection = useInView(0.1);
  const testimonialsSection = useInView(0.1);
  const pricingSection = useInView(0.1);
  const ctaSection = useInView(0.2);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#09090B] text-white antialiased selection:bg-[#7af17a]/20 selection:text-white">
      {/* Subtle dot grid background */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle, #ffffff 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* -------- NAV -------- */}
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          scrolled
            ? "border-b border-white/[0.06] bg-[#09090B]/80 backdrop-blur-2xl backdrop-saturate-150"
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
              <Sparkles className="size-4 text-[#09090B]" aria-hidden="true" />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight">
              Setting Academy
            </span>
          </Link>

          {/* Desktop nav */}
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
              <Button
                variant="ghost"
                className="h-9 rounded-lg px-4 text-[13px] font-medium text-white/60 hover:bg-white/[0.04] hover:text-white"
              >
                Se connecter
              </Button>
            </Link>
            <Link href="/register" className="hidden sm:inline-flex">
              <Button className="h-9 rounded-lg bg-white px-4 text-[13px] font-semibold text-[#09090B] transition-all duration-200 hover:bg-white/90">
                Commencer
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Button>
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
          className={`overflow-hidden border-t border-white/[0.04] bg-[#09090B]/98 backdrop-blur-2xl transition-all duration-300 md:hidden ${
            mobileMenuOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"
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
                <Button
                  variant="ghost"
                  className="w-full justify-center text-[15px] font-medium text-white/60 hover:bg-white/[0.04] hover:text-white"
                >
                  Se connecter
                </Button>
              </Link>
              <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full justify-center bg-white text-[15px] font-semibold text-[#09090B] hover:bg-white/90">
                  Commencer
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="relative z-10">
        {/* -------- HERO -------- */}
        <section className="relative overflow-hidden pt-28 pb-20 sm:pt-36 sm:pb-28 lg:pt-44 lg:pb-36">
          {/* Background glow — subtle, shifted warm */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-[700px] w-[1000px] -translate-x-1/2 rounded-full bg-[#7af17a]/[0.04] blur-[160px]" />
            <div className="absolute right-1/4 top-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/[0.02] blur-[100px]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-4 py-1.5 text-[13px] font-medium text-white/50 backdrop-blur-sm">
                <span className="flex size-1.5 rounded-full bg-[#7af17a] shadow-[0_0_6px_rgba(122,241,122,0.6)]" />
                Plateforme n&deg;1 pour les setters en France
              </div>

              {/* Headline */}
              <h1 className="font-serif text-[2.75rem] font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-[4.25rem]">
                Devenez un{" "}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-[#7af17a] via-[#b0f4b0] to-[#7af17a] bg-clip-text text-transparent">
                    Setter d&apos;&Eacute;lite
                  </span>
                  <span
                    className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#7af17a]/40 to-transparent"
                    aria-hidden="true"
                  />
                </span>
              </h1>

              {/* Subheadline */}
              <p className="mx-auto mt-6 max-w-xl text-[1.125rem] leading-relaxed text-white/45 sm:text-lg">
                La plateforme tout-en-un pour ma&icirc;triser le setting,
                d&eacute;crocher des missions et closer plus de deals.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="group h-12 rounded-xl bg-[#7af17a] px-7 text-[15px] font-semibold text-[#09090B] shadow-[0_0_40px_rgba(122,241,122,0.15),0_1px_2px_rgba(0,0,0,0.2)] transition-all duration-300 hover:bg-[#8ff58f] hover:shadow-[0_0_60px_rgba(122,241,122,0.25),0_1px_2px_rgba(0,0,0,0.2)] active:scale-[0.98]"
                  >
                    Commencer gratuitement
                    <ArrowRight
                      className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </Button>
                </Link>
                <a href="#features">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-xl border-white/[0.08] bg-white/[0.03] px-7 text-[15px] font-medium text-white/70 transition-all duration-200 hover:border-white/[0.12] hover:bg-white/[0.06] hover:text-white"
                  >
                    D&eacute;couvrir la formation
                  </Button>
                </a>
              </div>

              {/* Trust line */}
              <div className="mt-8 flex items-center justify-center gap-5 text-[13px] text-white/30">
                <span className="flex items-center gap-1.5">
                  <Shield className="size-3.5" aria-hidden="true" />
                  Sans engagement
                </span>
                <span className="h-3 w-px bg-white/10" aria-hidden="true" />
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5" aria-hidden="true" />
                  Setup en 2 min
                </span>
                <span className="h-3 w-px bg-white/10" aria-hidden="true" />
                <span className="flex items-center gap-1.5">
                  <Zap className="size-3.5" aria-hidden="true" />
                  Accès immédiat
                </span>
              </div>
            </div>

            {/* VSL Video Placeholder */}
            <div className="mx-auto mt-16 max-w-4xl sm:mt-20">
              <div className="group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-px">
                <div className="overflow-hidden rounded-[15px] bg-[#0F0F11]">
                  <div className="flex aspect-video items-center justify-center">
                    <div className="text-center">
                      <button
                        type="button"
                        className="flex size-16 items-center justify-center rounded-full bg-white/90 shadow-[0_0_40px_rgba(255,255,255,0.1)] transition-all duration-300 hover:scale-105 hover:bg-white hover:shadow-[0_0_60px_rgba(255,255,255,0.15)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0F11] sm:size-20"
                        aria-label="Lire la vid&eacute;o de pr&eacute;sentation"
                      >
                        <Play
                          className="ml-0.5 size-6 text-[#09090B] sm:size-7"
                          aria-hidden="true"
                        />
                      </button>
                      <p className="mt-4 text-[13px] font-medium text-white/30">
                        D&eacute;couvrez Setting Academy en 2 minutes
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* -------- SOCIAL PROOF BAR -------- */}
        <section
          ref={statsSection.ref}
          className="relative border-y border-white/[0.04] py-16 sm:py-20"
          aria-label="Statistiques"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
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
                    className={`mt-2 text-[13px] font-medium tracking-wide text-white/35 uppercase transition-all duration-700 ${
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

        {/* -------- FEATURES -------- */}
        <section
          id="features"
          ref={featuresSection.ref}
          className="scroll-mt-20 py-24 sm:py-32 lg:py-40"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div
              className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
                featuresSection.isInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#7af17a]/70">
                Tout-en-un
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
              <p className="mt-5 text-base leading-relaxed text-white/40 sm:text-lg">
                Une suite d&apos;outils con&ccedil;us pour les setters et
                closers ambitieux.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5 lg:mt-20 lg:grid-cols-3">
              {features.map((feature, i) => (
                <article
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-2xl border border-white/[0.04] bg-white/[0.02] p-7 transition-all duration-500 hover:border-white/[0.08] hover:bg-white/[0.04] sm:p-8 ${
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
                    <div className="mb-5 flex size-10 items-center justify-center rounded-lg bg-white/[0.06] text-white/70 transition-colors duration-300 group-hover:bg-white/[0.1] group-hover:text-white">
                      <feature.icon className="size-5" aria-hidden="true" />
                    </div>
                    <h3 className="text-[15px] font-semibold tracking-tight">
                      {feature.title}
                    </h3>
                    <p className="mt-2.5 text-[14px] leading-relaxed text-white/40">
                      {feature.desc}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* -------- TESTIMONIALS -------- */}
        <section
          id="testimonials"
          ref={testimonialsSection.ref}
          className="scroll-mt-20 border-y border-white/[0.04] bg-[#07070A] py-24 sm:py-32 lg:py-40"
          aria-labelledby="testimonials-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div
              className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
                testimonialsSection.isInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#7af17a]/70">
                T&eacute;moignages
              </p>
              <h2
                id="testimonials-heading"
                className="font-serif text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Ils ont transform&eacute; leur carri&egrave;re
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/40 sm:text-lg">
                D&eacute;couvrez les retours de nos membres les plus actifs.
              </p>
            </div>

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
                    aria-label={`${t.rating} étoiles sur 5`}
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
                      <div className="text-[12px] text-white/35">{t.role}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* -------- PRICING -------- */}
        <section
          id="pricing"
          ref={pricingSection.ref}
          className="scroll-mt-20 py-24 sm:py-32 lg:py-40"
          aria-labelledby="pricing-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div
              className={`mx-auto max-w-2xl text-center transition-all duration-700 ${
                pricingSection.isInView
                  ? "opacity-100 translate-y-0"
                  : "opacity-0 translate-y-6"
              }`}
            >
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#7af17a]/70">
                Tarifs
              </p>
              <h2
                id="pricing-heading"
                className="font-serif text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Un investissement, pas une d&eacute;pense
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/40 sm:text-lg">
                Choisissez le plan adapt&eacute; &agrave; votre profil et
                commencez &agrave; performer.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-5 md:grid-cols-2 lg:mt-20">
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
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-px left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#7af17a]/50 to-transparent" />
                  )}
                  {plan.highlighted && (
                    <div className="mb-5 inline-flex items-center rounded-full bg-[#7af17a]/10 px-3 py-1 text-[12px] font-semibold text-[#7af17a]">
                      Populaire
                    </div>
                  )}
                  <div
                    className={`text-[13px] font-medium uppercase tracking-wider ${
                      plan.highlighted ? "text-white/50" : "text-white/35"
                    } ${plan.highlighted ? "" : "mb-0"}`}
                  >
                    {plan.audience}
                  </div>
                  <h3 className="mt-1 font-serif text-2xl font-bold">
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-white/40">
                    {plan.description}
                  </p>
                  <div className="mt-6 flex items-baseline gap-1">
                    <span className="font-serif text-5xl font-bold tracking-tight">
                      {plan.price}&euro;
                    </span>
                    <span className="text-[15px] text-white/30">
                      {plan.period}
                    </span>
                  </div>
                  <div className="my-7 h-px bg-white/[0.04]" />
                  <ul className="space-y-3.5" role="list">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-3 text-[14px] text-white/55"
                      >
                        <CheckCircle2
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
                    <Button
                      className={`group/btn h-11 w-full rounded-xl text-[14px] font-semibold transition-all duration-300 active:scale-[0.98] ${
                        plan.highlighted
                          ? "bg-[#7af17a] text-[#09090B] shadow-[0_0_20px_rgba(122,241,122,0.1)] hover:bg-[#8ff58f] hover:shadow-[0_0_30px_rgba(122,241,122,0.2)]"
                          : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white"
                      }`}
                    >
                      {plan.cta}
                      <ChevronRight
                        className="size-4 transition-transform duration-200 group-hover/btn:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </Button>
                  </Link>
                </article>
              ))}
            </div>

            <p className="mx-auto mt-10 max-w-md text-center text-[13px] text-white/25">
              Annulation possible &agrave; tout moment. Aucun engagement longue
              dur&eacute;e.
            </p>
          </div>
        </section>

        {/* -------- CTA FINAL -------- */}
        <section
          ref={ctaSection.ref}
          className="relative overflow-hidden border-t border-white/[0.04] py-24 sm:py-32 lg:py-40"
          aria-labelledby="cta-heading"
        >
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <div className="absolute left-1/2 bottom-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#7af17a]/[0.03] blur-[160px]" />
          </div>
          <div
            className={`relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8 transition-all duration-700 ${
              ctaSection.isInView
                ? "opacity-100 translate-y-0"
                : "opacity-0 translate-y-6"
            }`}
          >
            <h2
              id="cta-heading"
              className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
            >
              Pr&ecirc;t &agrave; transformer
              <br />
              <span className="text-white/40">votre carri&egrave;re</span> ?
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-white/40 sm:text-lg">
              Rejoignez des centaines de setters qui ont d&eacute;j&agrave; fait
              le choix de l&apos;excellence.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4">
              <Link href="/register">
                <Button
                  size="lg"
                  className="group h-13 rounded-xl bg-[#7af17a] px-10 text-[15px] font-semibold text-[#09090B] shadow-[0_0_40px_rgba(122,241,122,0.15)] transition-all duration-300 hover:bg-[#8ff58f] hover:shadow-[0_0_60px_rgba(122,241,122,0.25)] active:scale-[0.98]"
                >
                  Rejoindre Setting Academy
                  <ArrowRight
                    className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Button>
              </Link>
              <span className="text-[13px] text-white/25">
                Essai gratuit &middot; Sans carte bancaire
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* -------- FOOTER -------- */}
      <footer
        className="border-t border-white/[0.04] bg-[#07070A] py-16 sm:py-20"
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
                    className="size-3.5 text-[#09090B]"
                    aria-hidden="true"
                  />
                </div>
                <span className="font-serif text-[15px] font-bold">
                  Setting Academy
                </span>
              </Link>
              <p className="mt-4 max-w-[220px] text-[13px] leading-relaxed text-white/30">
                La plateforme de r&eacute;f&eacute;rence pour les setters et
                closers en France.
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
                        className="text-[13px] text-white/30 transition-colors duration-200 hover:text-white/60"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 border-t border-white/[0.04] pt-8 text-center text-[12px] text-white/20">
            &copy; 2026 Setting Academy. Tous droits r&eacute;serv&eacute;s.
          </div>
        </div>
      </footer>
    </div>
  );
}
