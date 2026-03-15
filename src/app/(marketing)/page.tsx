"use client";

import Link from "next/link";
import { useState } from "react";
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

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const features = [
  {
    icon: GraduationCap,
    title: "Formation complète",
    desc: "12 modules progressifs, quiz interactifs et certificat de fin de formation pour valider vos compétences.",
  },
  {
    icon: LayoutDashboard,
    title: "CRM intégré",
    desc: "Pipeline Kanban drag & drop, suivi des leads en temps réel et automatisation du workflow commercial.",
  },
  {
    icon: MessageSquare,
    title: "Messagerie centralisée",
    desc: "Gérez vos conversations Instagram, LinkedIn et WhatsApp depuis une seule interface unifiée.",
  },
  {
    icon: Bot,
    title: "IA Setting",
    desc: "Messages automatisés, relances intelligentes et suggestions de réponses générées par IA.",
  },
  {
    icon: Users,
    title: "Communauté",
    desc: "Forum d\u2019entraide, challenges hebdomadaires, leaderboard et gamification pour rester motivé.",
  },
  {
    icon: GitBranch,
    title: "Scripts & Flowcharts",
    desc: "Éditeur visuel de scripts de vente avec mode flowchart, mindmap et présentation.",
  },
];

const testimonials = [
  {
    name: "Lucas M.",
    role: "Setter freelance",
    text: "En 3 mois, j\u2019ai triplé mon nombre de rendez-vous qualifiés. Le CRM et les scripts ont tout changé dans mon approche.",
    rating: 5,
  },
  {
    name: "Sarah K.",
    role: "Closer B2B",
    text: "La formation est ultra-complète. Les modules sur la découverte client m\u2019ont permis de passer de 15\u00A0% à 40\u00A0% de closing.",
    rating: 5,
  },
  {
    name: "Thomas D.",
    role: "Entrepreneur e-commerce",
    text: "J\u2019ai recruté 3 setters via la plateforme. Le workspace B2B est exactement ce qu\u2019il me fallait pour scaler.",
    rating: 5,
  },
];

const stats = [
  { value: "500+", label: "Setters formés" },
  { value: "95\u00A0%", label: "De satisfaction" },
  { value: "200\u00A0%", label: "Augmentation CA moyen" },
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
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function LandingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-[#7af17a]/30 selection:text-white">
      {/* -------- NAV -------- */}
      <nav
        className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0A0A0A]/80 backdrop-blur-xl"
        aria-label="Navigation principale"
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2" aria-label="Setting Academy - Accueil">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#7af17a]">
              <Sparkles className="size-4 text-[#0A0A0A]" aria-hidden="true" />
            </div>
            <span className="font-serif text-lg font-bold tracking-tight">
              Setting Academy
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm text-white/60 transition-colors hover:text-white"
              >
                {link.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:inline-flex">
              <Button
                variant="ghost"
                className="text-sm text-white/70 hover:bg-white/5 hover:text-white"
              >
                Se connecter
              </Button>
            </Link>
            <Link href="/register" className="hidden sm:inline-flex">
              <Button className="bg-[#7af17a] text-sm font-semibold text-[#0A0A0A] hover:bg-[#6ae06a]">
                Commencer
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </Link>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/5 hover:text-white md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label={mobileMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
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
        {mobileMenuOpen && (
          <div
            id="mobile-menu"
            className="border-t border-white/5 bg-[#0A0A0A]/95 backdrop-blur-xl md:hidden"
            role="menu"
          >
            <div className="space-y-1 px-4 py-4">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  role="menuitem"
                  className="block rounded-lg px-3 py-2.5 text-base text-white/70 transition-colors hover:bg-white/5 hover:text-white"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </a>
              ))}
              <div className="mt-4 flex flex-col gap-2 border-t border-white/5 pt-4">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant="ghost"
                    className="w-full justify-center text-sm text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    Se connecter
                  </Button>
                </Link>
                <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full justify-center bg-[#7af17a] text-sm font-semibold text-[#0A0A0A] hover:bg-[#6ae06a]">
                    Commencer
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </nav>

      <main>
        {/* -------- HERO -------- */}
        <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32">
          {/* Background glow effects */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#7af17a]/[0.07] blur-[120px]" />
            <div className="absolute right-0 top-1/3 h-[400px] w-[400px] rounded-full bg-[#7af17a]/[0.04] blur-[100px]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#7af17a]/20 bg-[#7af17a]/10 px-4 py-1.5 text-sm text-[#7af17a]">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Plateforme n&deg;1 pour les setters en France
              </div>

              {/* Headline */}
              <h1 className="font-serif text-5xl font-bold leading-[1.1] tracking-tight sm:text-6xl lg:text-7xl">
                Devenez un{" "}
                <span className="bg-gradient-to-r from-[#7af17a] via-[#a8f7a8] to-[#7af17a] bg-clip-text text-transparent">
                  Setter d&apos;&Eacute;lite
                </span>
              </h1>

              {/* Subheadline */}
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/60 sm:text-xl">
                La plateforme tout-en-un pour ma&icirc;triser le setting, d&eacute;crocher des
                missions et closer plus de deals.
              </p>

              {/* CTAs */}
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/register">
                  <Button
                    size="lg"
                    className="h-12 rounded-xl bg-[#7af17a] px-8 text-base font-semibold text-[#0A0A0A] shadow-[0_0_40px_rgba(122,241,122,0.3)] transition-all hover:bg-[#6ae06a] hover:shadow-[0_0_60px_rgba(122,241,122,0.4)] active:scale-[0.98]"
                  >
                    Commencer gratuitement
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </Link>
                <a href="#features">
                  <Button
                    variant="outline"
                    size="lg"
                    className="h-12 rounded-xl border-white/10 bg-white/5 px-8 text-base text-white transition-colors hover:bg-white/10 hover:text-white"
                  >
                    D&eacute;couvrir la formation
                  </Button>
                </a>
              </div>
            </div>

            {/* VSL Video Placeholder */}
            <div className="mx-auto mt-16 max-w-4xl sm:mt-20">
              <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-transparent shadow-2xl shadow-[#7af17a]/5">
                <div className="flex aspect-video items-center justify-center bg-[#111111]">
                  <div className="text-center">
                    <button
                      type="button"
                      className="flex size-20 items-center justify-center rounded-full bg-[#7af17a]/90 shadow-lg shadow-[#7af17a]/30 transition-all hover:scale-110 hover:bg-[#7af17a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7af17a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111111]"
                      aria-label="Lire la vid&eacute;o de pr&eacute;sentation"
                    >
                      <Play className="ml-1 size-8 text-[#0A0A0A]" aria-hidden="true" />
                    </button>
                    <p className="mt-4 text-sm text-white/40">
                      D&eacute;couvrez Setting Academy en 2 minutes
                    </p>
                  </div>
                </div>
                <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10" aria-hidden="true" />
              </div>
            </div>
          </div>
        </section>

        {/* -------- SOCIAL PROOF BAR -------- */}
        <section className="border-y border-white/5 bg-[#0A0A0A]/80 py-12" aria-label="Statistiques">
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
        <section id="features" className="scroll-mt-20 py-24 sm:py-32" aria-labelledby="features-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60">
                <TrendingUp className="size-3.5" aria-hidden="true" />
                Tout-en-un
              </div>
              <h2 id="features-heading" className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
                Tout ce dont vous avez besoin pour{" "}
                <span className="bg-gradient-to-r from-[#7af17a] to-[#a8f7a8] bg-clip-text text-transparent">
                  performer
                </span>
              </h2>
              <p className="mt-4 text-lg text-white/50">
                Une suite d&apos;outils con&ccedil;us pour les setters et closers ambitieux.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <article
                  key={feature.title}
                  className="group relative rounded-2xl border border-white/5 bg-[#111111] p-8 transition-all duration-200 hover:border-[#7af17a]/20 hover:bg-[#111111]/80 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-[#7af17a]/5"
                >
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-[#7af17a]/10 text-[#7af17a] transition-colors group-hover:bg-[#7af17a]/20">
                    <feature.icon className="size-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">
                    {feature.desc}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* -------- TESTIMONIALS -------- */}
        <section
          id="testimonials"
          className="scroll-mt-20 border-y border-white/5 bg-[#080808] py-24 sm:py-32"
          aria-labelledby="testimonials-heading"
        >
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60">
                <Trophy className="size-3.5" aria-hidden="true" />
                T&eacute;moignages
              </div>
              <h2 id="testimonials-heading" className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                Ils ont transform&eacute; leur carri&egrave;re
              </h2>
              <p className="mt-4 text-lg text-white/50">
                D&eacute;couvrez les retours de nos membres les plus actifs.
              </p>
            </div>

            <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
              {testimonials.map((t) => (
                <article
                  key={t.name}
                  className="rounded-2xl border border-white/5 bg-[#111111] p-8 transition-all duration-200 hover:border-white/10 hover:shadow-lg hover:shadow-black/20"
                >
                  <div className="mb-4 flex gap-1" role="img" aria-label={`${t.rating} étoiles sur 5`}>
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="size-4 fill-[#7af17a] text-[#7af17a]"
                        aria-hidden="true"
                      />
                    ))}
                  </div>
                  <blockquote className="text-sm leading-relaxed text-white/70">
                    &laquo;&nbsp;{t.text}&nbsp;&raquo;
                  </blockquote>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-[#7af17a]/10 text-sm font-bold text-[#7af17a]" aria-hidden="true">
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{t.name}</div>
                      <div className="text-xs text-white/40">{t.role}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* -------- PRICING -------- */}
        <section id="pricing" className="scroll-mt-20 py-24 sm:py-32" aria-labelledby="pricing-heading">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-sm text-white/60">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Tarifs
              </div>
              <h2 id="pricing-heading" className="font-serif text-3xl font-bold tracking-tight sm:text-4xl">
                Un investissement, pas une d&eacute;pense
              </h2>
              <p className="mt-4 text-lg text-white/50">
                Choisissez le plan adapt&eacute; &agrave; votre profil et commencez &agrave; performer.
              </p>
            </div>

            <div className="mx-auto mt-16 grid max-w-4xl grid-cols-1 gap-8 md:grid-cols-2">
              {pricingPlans.map((plan) => (
                <article
                  key={plan.name}
                  className={`relative rounded-2xl border p-8 transition-all duration-200 ${
                    plan.highlighted
                      ? "border-[#7af17a]/30 bg-gradient-to-b from-[#7af17a]/[0.08] to-transparent shadow-lg shadow-[#7af17a]/5 hover:shadow-xl hover:shadow-[#7af17a]/10"
                      : "border-white/5 bg-[#111111] hover:border-white/10 hover:shadow-lg hover:shadow-black/20"
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
                      {plan.price}&nbsp;&euro;
                    </span>
                    <span className="text-white/40">{plan.period}</span>
                  </div>
                  <ul className="mt-8 space-y-3" role="list">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-3 text-sm text-white/70">
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#7af17a]" aria-hidden="true" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="mt-8 block">
                    <Button
                      className={`h-11 w-full rounded-xl text-sm font-semibold transition-all active:scale-[0.98] ${
                        plan.highlighted
                          ? "bg-[#7af17a] text-[#0A0A0A] hover:bg-[#6ae06a] shadow-[0_0_20px_rgba(122,241,122,0.15)] hover:shadow-[0_0_30px_rgba(122,241,122,0.25)]"
                          : "bg-white/10 text-white hover:bg-white/15"
                      }`}
                    >
                      {plan.cta}
                      <ChevronRight className="size-4" aria-hidden="true" />
                    </Button>
                  </Link>
                </article>
              ))}
            </div>

            <p className="mx-auto mt-8 max-w-md text-center text-sm text-white/30">
              Annulation possible &agrave; tout moment. Aucun engagement longue dur&eacute;e.
            </p>
          </div>
        </section>

        {/* -------- CTA FINAL -------- */}
        <section className="relative overflow-hidden border-t border-white/5 py-24 sm:py-32" aria-labelledby="cta-heading">
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/2 bottom-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#7af17a]/[0.06] blur-[120px]" />
          </div>
          <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
            <h2 id="cta-heading" className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
              Pr&ecirc;t &agrave; transformer{" "}
              <span className="bg-gradient-to-r from-[#7af17a] to-[#a8f7a8] bg-clip-text text-transparent">
                votre carri&egrave;re
              </span>
              {" "}?
            </h2>
            <p className="mx-auto mt-6 max-w-xl text-lg text-white/50">
              Rejoignez des centaines de setters qui ont d&eacute;j&agrave; fait le choix de
              l&apos;excellence. Votre premi&egrave;re mission vous attend.
            </p>
            <div className="mt-10">
              <Link href="/register">
                <Button
                  size="lg"
                  className="h-13 rounded-xl bg-[#7af17a] px-10 text-base font-semibold text-[#0A0A0A] shadow-[0_0_40px_rgba(122,241,122,0.3)] transition-all hover:bg-[#6ae06a] hover:shadow-[0_0_60px_rgba(122,241,122,0.4)] active:scale-[0.98]"
                >
                  Rejoindre Setting Academy
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* -------- FOOTER -------- */}
      <footer className="border-t border-white/5 bg-[#080808] py-16" role="contentinfo">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link href="/" className="flex items-center gap-2" aria-label="Setting Academy - Accueil">
                <div className="flex size-7 items-center justify-center rounded-md bg-[#7af17a]">
                  <Sparkles className="size-3.5 text-[#0A0A0A]" aria-hidden="true" />
                </div>
                <span className="font-serif text-base font-bold">
                  Setting Academy
                </span>
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-white/40">
                La plateforme de r&eacute;f&eacute;rence pour les setters et closers en France.
              </p>
            </div>

            {/* Link sections */}
            {footerSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-white/60">
                  {section.title}
                </h3>
                <ul className="mt-4 space-y-3" role="list">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-sm text-white/40 transition-colors hover:text-white/70"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 border-t border-white/5 pt-8 text-center text-xs text-white/30">
            &copy; 2025 Setting Academy. Tous droits r&eacute;serv&eacute;s.
          </div>
        </div>
      </footer>
    </div>
  );
}
