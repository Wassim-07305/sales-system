"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef, useCallback, type ReactNode } from "react";
import {
  LayoutDashboard,
  GraduationCap,
  Bot,
  GitBranch,
  MessageSquare,
  BarChart3,
  ArrowRight,
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
  Play,
  Sparkles,
  Target,
  Award,
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
      { threshold },
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
/*  Floating particles                                                  */
/* ------------------------------------------------------------------ */

function FloatingParticles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {Array.from({ length: 30 }).map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-[#7af17a]/30"
          style={{
            width: `${Math.random() * 3 + 1}px`,
            height: `${Math.random() * 3 + 1}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `floatParticle ${8 + Math.random() * 12}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 5}s`,
            opacity: Math.random() * 0.5 + 0.2,
          }}
        />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Glowing card with mouse-follow effect                               */
/* ------------------------------------------------------------------ */

function GlowCard({
  children,
  className = "",
  glowColor = "rgba(122, 241, 122, 0.08)",
}: {
  children: ReactNode;
  className?: string;
  glowColor?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  return (
    <div
      ref={cardRef}
      className={`group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02] transition-all duration-500 hover:border-white/[0.12] hover:bg-white/[0.04] ${className}`}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Mouse-follow glow */}
      <div
        className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: isHovered
            ? `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, ${glowColor}, transparent 40%)`
            : "none",
        }}
      />
      {/* Top edge glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
      <div className="relative">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Animated gradient border                                            */
/* ------------------------------------------------------------------ */

function GradientBorderCard({
  children,
  className = "",
  active = false,
}: {
  children: ReactNode;
  className?: string;
  active?: boolean;
}) {
  return (
    <div className={`relative rounded-2xl p-px ${className}`}>
      {active && (
        <div
          className="absolute inset-0 rounded-2xl opacity-60"
          style={{
            background:
              "conic-gradient(from var(--gradient-angle, 0deg), #7af17a, #3b82f6, #8b5cf6, #7af17a)",
            animation: "rotateGradient 4s linear infinite",
          }}
        />
      )}
      <div
        className={`relative rounded-2xl ${
          active
            ? "bg-[#0a0a0a]"
            : "border border-white/[0.06] bg-white/[0.02]"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Marquee for logos / social proof                                     */
/* ------------------------------------------------------------------ */

function Marquee({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="pointer-events-none absolute left-0 top-0 z-10 h-full w-24 bg-gradient-to-r from-[#0a0a0a] to-transparent" />
      <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-24 bg-gradient-to-l from-[#0a0a0a] to-transparent" />
      <div className="flex animate-marquee gap-8">
        {children}
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const navLinks = [
  { label: "Fonctionnalités", href: "#features" },
  { label: "Comment ça marche", href: "#how-it-works" },
  { label: "Tarifs", href: "#pricing" },
  { label: "Témoignages", href: "#testimonials" },
];

const stats = [
  { value: 200, suffix: "+", label: "Setters formés", icon: Users },
  { value: 50, suffix: "+", label: "Entreprises", icon: Target },
  { value: 98, suffix: "%", label: "De satisfaction", icon: Award },
];

const features = [
  {
    icon: LayoutDashboard,
    title: "CRM Intelligent",
    desc: "Pipeline Kanban drag & drop, automatisation du workflow et suivi des deals en temps réel.",
    gradient: "from-blue-500 to-cyan-400",
    glowColor: "rgba(59, 130, 246, 0.08)",
    size: "large" as const,
  },
  {
    icon: GraduationCap,
    title: "Academy",
    desc: "Formation modulaire progressive, quiz interactifs, certifications et suivi de compétences.",
    gradient: "from-emerald-500 to-teal-400",
    glowColor: "rgba(16, 185, 129, 0.08)",
    size: "large" as const,
  },
  {
    icon: Bot,
    title: "Prospection IA",
    desc: "LinkedIn, Instagram et WhatsApp automatisés. Relances intelligentes et scoring des leads.",
    gradient: "from-violet-500 to-purple-400",
    glowColor: "rgba(139, 92, 246, 0.08)",
    size: "small" as const,
  },
  {
    icon: GitBranch,
    title: "Scripts de Vente",
    desc: "Flowcharts interactifs, mind maps visuels et templates prêts à l'emploi.",
    gradient: "from-amber-500 to-orange-400",
    glowColor: "rgba(245, 158, 11, 0.08)",
    size: "small" as const,
  },
  {
    icon: MessageSquare,
    title: "Chat & Communauté",
    desc: "Messagerie temps réel, forum d'entraide, events et replays vidéo.",
    gradient: "from-rose-500 to-pink-400",
    glowColor: "rgba(244, 63, 94, 0.08)",
    size: "small" as const,
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Funnel, attribution multi-canal, projections IA et heatmaps de performance.",
    gradient: "from-cyan-500 to-blue-400",
    glowColor: "rgba(6, 182, 212, 0.08)",
    size: "small" as const,
  },
];

const steps = [
  {
    icon: UserPlus,
    number: "01",
    title: "Créez votre compte",
    desc: "Configuration en 5 minutes. Importez vos contacts et personnalisez votre pipeline.",
  },
  {
    icon: Users,
    number: "02",
    title: "Formez votre équipe",
    desc: "Academy complète avec modules progressifs, roleplay IA et certifications.",
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
    description: "Pour démarrer et découvrir la plateforme.",
    features: [
      "1 utilisateur",
      "CRM basique",
      "Academy (modules gratuits)",
      "Communauté",
      "Support email",
    ],
    cta: "Commencer gratuitement",
    highlighted: false,
  },
  {
    name: "Pro",
    price: { monthly: "49", yearly: "39" },
    priceValue: { monthly: 49, yearly: 39 },
    description: "Pour les équipes qui veulent scaler.",
    features: [
      "Jusqu'à 5 utilisateurs",
      "CRM complet + Kanban",
      "Academy intégrale",
      "Prospection IA",
      "Analytics avancés",
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
      "Utilisateurs illimités",
      "White-label complet",
      "API & intégrations",
      "Support dédié",
      "Onboarding personnalisé",
      "SLA garanti",
      "Formation sur site",
    ],
    cta: "Contacter l'équipe",
    highlighted: false,
  },
];

const testimonials = [
  {
    name: "Lucas M.",
    role: "Setter freelance",
    text: "En 3 mois, j'ai triplé mon nombre de rendez-vous qualifiés. Le CRM et les scripts ont tout changé dans mon approche commerciale.",
    rating: 5,
    metric: "3x plus de RDV",
  },
  {
    name: "Sarah K.",
    role: "Closer B2B",
    text: "La formation est ultra-complète. Les modules sur la découverte client m'ont permis de passer de 15% à 40% de taux de closing.",
    rating: 5,
    metric: "+25 pts de closing",
  },
  {
    name: "Thomas D.",
    role: "Entrepreneur e-commerce",
    text: "J'ai recruté 3 setters via la plateforme. Le workspace B2B est exactement ce qu'il me fallait pour scaler mon acquisition.",
    rating: 5,
    metric: "Équipe x3 en 2 mois",
  },
];

const trustedBy = [
  "Scale Leaders",
  "ClosingPro",
  "AcquiForce",
  "SalesHub",
  "LeadMakers",
  "GrowthPact",
  "SetterElite",
  "VenteMax",
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
    title: "Ressources",
    links: [
      { label: "Blog", href: "/blog" },
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

/* ------------------------------------------------------------------ */
/*  Dashboard mockup component (enhanced)                               */
/* ------------------------------------------------------------------ */

function DashboardMockup() {
  return (
    <div className="relative">
      {/* Outer glow */}
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-b from-[#7af17a]/[0.06] via-transparent to-transparent blur-xl" />

      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent p-px shadow-[0_0_80px_rgba(122,241,122,0.06)]">
        <div className="overflow-hidden rounded-[15px] bg-[#0F0F11]">
          {/* Top bar */}
          <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-red-500/60" />
              <span className="size-2.5 rounded-full bg-amber-500/60" />
              <span className="size-2.5 rounded-full bg-green-500/60" />
            </div>
            <div className="ml-3 flex-1 rounded-md bg-white/[0.04] px-3 py-1 text-[11px] text-white/30">
              app.salessystem.fr/dashboard
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
                    className={`h-2.5 rounded transition-all duration-1000 ${
                      i === 0 ? "w-full bg-[#7af17a]/15" : "w-3/4 bg-white/[0.04]"
                    }`}
                    style={{ animationDelay: `${i * 100}ms` }}
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
                    className={`rounded-lg border border-white/[0.04] bg-white/[0.02] p-2.5 ${
                      i === 3 ? "hidden sm:block" : ""
                    }`}
                  >
                    <div className="text-[9px] text-white/30">{label}</div>
                    <div className="mt-1 text-sm font-bold text-white/80">
                      {["147", "42", "18", "24.5k"][i]}
                    </div>
                    <div className="mt-1 flex items-center gap-1">
                      <div className="h-1 flex-1 rounded-full bg-white/[0.04]">
                        <div
                          className="h-1 rounded-full bg-[#7af17a]/40 transition-all duration-1000"
                          style={{ width: `${[72, 58, 82, 65][i]}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Chart mock with animated bars */}
              <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[10px] font-medium text-white/40">Performance</div>
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
                          className="rounded-t bg-gradient-to-t from-[#7af17a]/10 to-[#7af17a]/30 transition-all duration-1000"
                          style={{
                            height: `${h}%`,
                            animationDelay: `${i * 50}ms`,
                          }}
                        />
                      </div>
                    ),
                  )}
                </div>
              </div>

              {/* Kanban mock */}
              <div className="grid grid-cols-3 gap-2">
                {["Prospect", "Découverte", "Closing"].map((col, ci) => (
                  <div
                    key={col}
                    className="rounded-lg border border-white/[0.04] bg-white/[0.015] p-2"
                  >
                    <div className="mb-2 text-[9px] font-medium text-white/30">
                      {col}
                    </div>
                    {[...Array(ci === 0 ? 3 : ci === 1 ? 2 : 1)].map(
                      (_, j) => (
                        <div
                          key={j}
                          className="mb-1.5 rounded border border-white/[0.04] bg-white/[0.03] p-1.5"
                        >
                          <div className="h-1.5 w-3/4 rounded bg-white/[0.08]" />
                          <div className="mt-1 h-1 w-1/2 rounded bg-white/[0.04]" />
                        </div>
                      ),
                    )}
                  </div>
                ))}
              </div>
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
  const [heroVisible, setHeroVisible] = useState(false);

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

  useEffect(() => {
    const timer = setTimeout(() => setHeroVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white antialiased selection:bg-[#7af17a]/20 selection:text-white">
      {/* ── Global CSS animations ── */}
      <style>{`
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-20px) translateX(10px); }
          50% { transform: translateY(-10px) translateX(-10px); }
          75% { transform: translateY(-30px) translateX(5px); }
        }
        @keyframes rotateGradient {
          0% { --gradient-angle: 0deg; }
          100% { --gradient-angle: 360deg; }
        }
        @property --gradient-angle {
          syntax: "<angle>";
          initial-value: 0deg;
          inherits: false;
        }
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes pulseGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes slideUp {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          33% { transform: translateY(-10px) rotate(1deg); }
          66% { transform: translateY(5px) rotate(-1deg); }
        }
        @keyframes borderPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        .text-shimmer {
          background-size: 200% auto;
          animation: shimmer 3s ease-in-out infinite;
        }
        .hover-lift {
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease;
        }
        .hover-lift:hover {
          transform: translateY(-4px);
        }
        @keyframes gridFade {
          0% { opacity: 0.02; }
          50% { opacity: 0.05; }
          100% { opacity: 0.02; }
        }
      `}</style>

      {/* Dot grid background with subtle animation */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          opacity: 0.03,
          animation: "gridFade 8s ease-in-out infinite",
        }}
      />

      {/* ================================================================ */}
      {/*  NAVIGATION                                                       */}
      {/* ================================================================ */}
      <nav
        className={`fixed top-0 z-50 w-full transition-all duration-500 ${
          scrolled
            ? "border-b border-white/[0.06] bg-[#0a0a0a]/70 backdrop-blur-2xl backdrop-saturate-150 shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
            : "bg-transparent"
        }`}
        aria-label="Navigation principale"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex items-center gap-2.5 group"
            aria-label="Sales System - Accueil"
          >
            <Image
              src="/logo.png"
              alt="Sales System"
              width={32}
              height={32}
              className="rounded-lg shadow-[0_0_12px_rgba(122,241,122,0.3)] transition-shadow duration-300 group-hover:shadow-[0_0_20px_rgba(122,241,122,0.5)]"
            />
            <span className="font-serif text-lg font-bold tracking-tight">
              Sales System
            </span>
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="relative rounded-lg px-3.5 py-2 text-[13px] font-medium text-white/50 transition-all duration-300 hover:text-white/90 group"
              >
                <span className="relative z-10">{link.label}</span>
                <span className="absolute inset-0 rounded-lg bg-white/[0.04] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link href="/login" className="hidden sm:inline-flex">
              <button
                type="button"
                className="h-9 rounded-lg px-4 text-[13px] font-medium text-white/60 transition-all duration-300 hover:bg-white/[0.04] hover:text-white"
              >
                Connexion
              </button>
            </Link>
            <Link href="/register" className="hidden sm:inline-flex">
              <button
                type="button"
                className="group relative flex h-9 items-center gap-1.5 overflow-hidden rounded-lg bg-[#7af17a] px-4 text-[13px] font-semibold text-[#0a0a0a] transition-all duration-300 hover:shadow-[0_0_25px_rgba(122,241,122,0.3)]"
              >
                <span className="absolute inset-0 bg-gradient-to-r from-[#7af17a] via-[#b0f4b0] to-[#7af17a] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <span className="relative flex items-center gap-1.5">
                  Commencer
                  <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </button>
            </Link>

            {/* Mobile menu toggle */}
            <button
              type="button"
              className="inline-flex size-10 items-center justify-center rounded-lg text-white/60 transition-colors hover:bg-white/[0.04] hover:text-white md:hidden"
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
          {/* Animated background orbs */}
          <div
            className="pointer-events-none absolute inset-0"
            aria-hidden="true"
          >
            <div
              className="absolute left-1/2 top-0 h-[700px] w-[1000px] -translate-x-1/2 rounded-full bg-[#7af17a]/[0.04] blur-[160px]"
              style={{ animation: "pulseGlow 6s ease-in-out infinite" }}
            />
            <div
              className="absolute right-1/4 top-1/4 h-[350px] w-[350px] rounded-full bg-blue-500/[0.03] blur-[120px]"
              style={{ animation: "pulseGlow 8s ease-in-out infinite 1s" }}
            />
            <div
              className="absolute left-1/4 top-1/3 h-[280px] w-[280px] rounded-full bg-violet-500/[0.02] blur-[120px]"
              style={{ animation: "pulseGlow 10s ease-in-out infinite 2s" }}
            />
            {/* Extra orb for depth */}
            <div
              className="absolute right-1/3 bottom-1/4 h-[200px] w-[200px] rounded-full bg-[#7af17a]/[0.02] blur-[100px]"
              style={{ animation: "pulseGlow 7s ease-in-out infinite 3s" }}
            />
          </div>

          {/* Floating particles */}
          <FloatingParticles />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              {/* Badge with shimmer */}
              <div
                className={`mb-8 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-4 py-1.5 text-[13px] font-medium text-white/60 backdrop-blur-md transition-all duration-700 ${
                  heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
              >
                <Sparkles className="size-3.5 text-[#7af17a]" aria-hidden="true" />
                <span className="flex size-1.5 rounded-full bg-[#7af17a] shadow-[0_0_6px_rgba(122,241,122,0.6)]" style={{ animation: "pulseGlow 2s ease-in-out infinite" }} />
                Plateforme n&deg;1 pour les équipes de vente
              </div>

              {/* Headline with shimmer gradient */}
              <h1
                className={`font-serif text-[2.75rem] font-bold leading-[1.08] tracking-tight sm:text-6xl lg:text-[4.5rem] transition-all duration-1000 ${
                  heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: "200ms" }}
              >
                La plateforme{" "}
                <span className="relative inline-block">
                  <span
                    className="text-shimmer bg-gradient-to-r from-[#7af17a] via-[#b0f4b0] via-[#7af17a] to-[#b0f4b0] bg-clip-text text-transparent"
                    style={{ backgroundSize: "200% auto" }}
                  >
                    tout-en-un
                  </span>
                  <span
                    className="absolute -bottom-1 left-0 h-px w-full bg-gradient-to-r from-transparent via-[#7af17a]/50 to-transparent"
                    aria-hidden="true"
                    style={{ animation: "borderPulse 3s ease-in-out infinite" }}
                  />
                </span>{" "}
                pour les équipes de vente
              </h1>

              {/* Subheadline */}
              <p
                className={`mx-auto mt-6 max-w-xl text-[1.125rem] leading-relaxed text-white/45 sm:text-lg transition-all duration-1000 ${
                  heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: "400ms" }}
              >
                Formation, CRM, prospection IA et management d&apos;équipe.
                <br className="hidden sm:block" />
                Remplacez <span className="text-white/70 font-medium">10 outils</span> par un seul.
              </p>

              {/* CTAs */}
              <div
                className={`mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row transition-all duration-1000 ${
                  heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
                }`}
                style={{ transitionDelay: "600ms" }}
              >
                <Link href="/register">
                  <button
                    type="button"
                    className="group relative flex h-12 items-center gap-2 overflow-hidden rounded-xl bg-[#7af17a] px-7 text-[15px] font-semibold text-[#0a0a0a] shadow-[0_0_40px_rgba(122,241,122,0.15),0_1px_2px_rgba(0,0,0,0.2)] transition-all duration-300 hover:shadow-[0_0_60px_rgba(122,241,122,0.3)] active:scale-[0.98]"
                  >
                    {/* Shine effect */}
                    <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                    <span className="relative flex items-center gap-2">
                      Commencer gratuitement
                      <ArrowRight
                        className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </button>
                </Link>
                <a href="#features">
                  <button
                    type="button"
                    className="group flex h-12 items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-7 text-[15px] font-medium text-white/70 backdrop-blur-sm transition-all duration-300 hover:border-white/[0.15] hover:bg-white/[0.06] hover:text-white"
                  >
                    <Play className="size-3.5 fill-current" aria-hidden="true" />
                    Voir la démo
                  </button>
                </a>
              </div>

              {/* Trust pills */}
              <div
                className={`mt-8 flex flex-wrap items-center justify-center gap-5 text-[13px] text-white/50 transition-all duration-1000 ${
                  heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: "800ms" }}
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="size-3.5 text-[#7af17a]/60" aria-hidden="true" />
                  Sans engagement
                </span>
                <span className="h-3 w-px bg-white/10" aria-hidden="true" />
                <span className="flex items-center gap-1.5">
                  <Clock className="size-3.5 text-[#7af17a]/60" aria-hidden="true" />
                  Setup en 5 min
                </span>
                <span className="h-3 w-px bg-white/10" aria-hidden="true" />
                <span className="flex items-center gap-1.5">
                  <Zap className="size-3.5 text-[#7af17a]/60" aria-hidden="true" />
                  Accès immédiat
                </span>
              </div>
            </div>

            {/* Dashboard mockup with float animation */}
            <div
              className={`mx-auto mt-16 max-w-4xl sm:mt-20 transition-all duration-1000 ${
                heroVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"
              }`}
              style={{
                transitionDelay: "1000ms",
                animation: heroVisible ? "float 6s ease-in-out infinite 2s" : "none",
              }}
            >
              <DashboardMockup />
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/*  TRUSTED BY — Logo marquee                                      */}
        {/* ============================================================== */}
        <section className="border-y border-white/[0.04] py-10 sm:py-12" aria-label="Partenaires">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <p className="mb-6 text-center text-[12px] font-medium uppercase tracking-[0.2em] text-white/25">
              Ils utilisent Sales System
            </p>
            <Marquee>
              {trustedBy.map((name) => (
                <span
                  key={name}
                  className="flex-shrink-0 rounded-lg border border-white/[0.04] bg-white/[0.02] px-6 py-2.5 text-[14px] font-medium text-white/25 transition-colors hover:text-white/40"
                >
                  {name}
                </span>
              ))}
            </Marquee>
          </div>
        </section>

        {/* ============================================================== */}
        {/*  2. SOCIAL PROOF / STATS                                        */}
        {/* ============================================================== */}
        <section
          ref={statsSection.ref}
          className="relative py-20 sm:py-28"
          aria-label="Statistiques"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 sm:gap-8">
              {stats.map((stat, i) => (
                <GlowCard
                  key={stat.label}
                  className={`transition-all duration-700 ${
                    statsSection.isInView
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                >
                  <div
                    className="p-8 text-center"
                    style={{ transitionDelay: `${i * 150}ms` }}
                  >
                    <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-[#7af17a]/[0.08]">
                      <stat.icon className="size-5 text-[#7af17a]/70" aria-hidden="true" />
                    </div>
                    <div className="font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl">
                      <AnimatedCounter
                        target={stat.value}
                        suffix={stat.suffix}
                        isInView={statsSection.isInView}
                      />
                    </div>
                    <div className="mt-2 text-[13px] font-medium tracking-wide text-white/50 uppercase">
                      {stat.label}
                    </div>
                  </div>
                </GlowCard>
              ))}
            </div>
          </div>
        </section>

        {/* ============================================================== */}
        {/*  3. FEATURES — Bento Grid                                       */}
        {/* ============================================================== */}
        <section
          id="features"
          ref={featuresSection.ref}
          className="scroll-mt-20 py-24 sm:py-32 lg:py-40"
          aria-labelledby="features-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FadeIn
              isInView={featuresSection.isInView}
              className="mx-auto max-w-2xl text-center"
            >
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#7af17a]/70">
                Fonctionnalités
              </p>
              <h2
                id="features-heading"
                className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-[2.75rem]"
              >
                Tout ce dont vous avez besoin
                <br className="hidden sm:block" />
                pour <span className="text-white/40">performer</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/50 sm:text-lg">
                Une suite d&apos;outils conçus pour les équipes de vente
                ambitieuses.
              </p>
            </FadeIn>

            {/* Bento grid layout: 2 large + 4 small */}
            <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-4">
              {features.map((feature, i) => (
                <GlowCard
                  key={feature.title}
                  glowColor={feature.glowColor}
                  className={`hover-lift ${
                    feature.size === "large" ? "sm:col-span-2" : "sm:col-span-1"
                  } ${
                    featuresSection.isInView
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                >
                  <div
                    className={`relative p-7 sm:p-8 ${feature.size === "large" ? "min-h-[220px]" : ""}`}
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    {/* Background gradient accent */}
                    <div
                      className={`pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-gradient-to-br ${feature.gradient} opacity-[0.04] blur-3xl transition-opacity duration-700 group-hover:opacity-[0.08]`}
                      aria-hidden="true"
                    />

                    <div className="relative">
                      <div className={`mb-5 flex size-11 items-center justify-center rounded-xl bg-gradient-to-br ${feature.gradient} bg-opacity-10 shadow-lg`}>
                        <feature.icon className="size-5 text-white" aria-hidden="true" />
                      </div>
                      <h3 className="text-[16px] font-semibold tracking-tight">
                        {feature.title}
                      </h3>
                      <p className={`mt-2.5 text-[14px] leading-relaxed text-white/50 ${feature.size === "large" ? "max-w-sm" : ""}`}>
                        {feature.desc}
                      </p>
                      {feature.size === "large" && (
                        <div className="mt-5">
                          <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[#7af17a]/70 transition-colors group-hover:text-[#7af17a]">
                            En savoir plus
                            <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" aria-hidden="true" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </GlowCard>
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
          className="scroll-mt-20 relative overflow-hidden border-y border-white/[0.04] bg-[#070709] py-24 sm:py-32 lg:py-40"
          aria-labelledby="how-heading"
        >
          {/* Background decoration */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/2 top-1/2 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#7af17a]/[0.02] blur-[160px]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FadeIn
              isInView={howSection.isInView}
              className="mx-auto max-w-2xl text-center"
            >
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#7af17a]/70">
                Comment ça marche
              </p>
              <h2
                id="how-heading"
                className="font-serif text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Opérationnel en <span className="text-white/40">3 étapes</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/50 sm:text-lg">
                Une mise en place simple pour des résultats rapides.
              </p>
            </FadeIn>

            <div className="relative mt-16 grid grid-cols-1 gap-6 md:grid-cols-3 lg:mt-20">
              {/* Animated connector line (desktop) */}
              <div
                className="pointer-events-none absolute top-16 left-[16.66%] hidden h-px w-[66.66%] md:block"
                aria-hidden="true"
              >
                <div className="h-full w-full bg-gradient-to-r from-[#7af17a]/30 via-[#7af17a]/15 to-[#7af17a]/30" />
                {/* Animated dot on the line */}
                <div
                  className="absolute top-1/2 -translate-y-1/2 size-2 rounded-full bg-[#7af17a] shadow-[0_0_10px_rgba(122,241,122,0.5)]"
                  style={{
                    animation: "marquee 4s ease-in-out infinite alternate",
                    left: "0%",
                  }}
                />
              </div>

              {steps.map((step, i) => (
                <FadeIn
                  key={step.number}
                  isInView={howSection.isInView}
                  delay={i * 150}
                  className="relative text-center"
                >
                  <GlowCard className="hover-lift">
                    <div className="p-8">
                      <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[#7af17a]/10 to-[#7af17a]/[0.02] border border-[#7af17a]/10">
                        <step.icon
                          className="size-6 text-[#7af17a]/80"
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
                    </div>
                  </GlowCard>
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
            <FadeIn
              isInView={pricingSection.isInView}
              className="mx-auto max-w-2xl text-center"
            >
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#7af17a]/70">
                Tarifs
              </p>
              <h2
                id="pricing-heading"
                className="font-serif text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Un investissement, pas une dépense
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/50 sm:text-lg">
                Choisissez le plan adapté à votre équipe.
              </p>

              {/* Monthly/Yearly toggle with glassmorphism */}
              <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 backdrop-blur-md">
                <button
                  type="button"
                  onClick={() => setBillingYearly(false)}
                  className={`rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-300 ${
                    !billingYearly
                      ? "bg-white/[0.12] text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  Mensuel
                </button>
                <button
                  type="button"
                  onClick={() => setBillingYearly(true)}
                  className={`flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-medium transition-all duration-300 ${
                    billingYearly
                      ? "bg-white/[0.12] text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                      : "text-white/40 hover:text-white/60"
                  }`}
                >
                  Annuel
                  <span className="rounded-full bg-[#7af17a]/15 px-2 py-0.5 text-[11px] font-semibold text-[#7af17a]">
                    -20%
                  </span>
                </button>
              </div>
            </FadeIn>

            <div className="mx-auto mt-12 grid max-w-5xl grid-cols-1 gap-5 md:grid-cols-3 lg:mt-16">
              {pricingPlans.map((plan, i) => (
                <GradientBorderCard
                  key={plan.name}
                  active={plan.highlighted}
                  className={`transition-all duration-700 hover-lift ${
                    pricingSection.isInView
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                >
                  <div
                    className="relative overflow-hidden p-7 sm:p-8"
                    style={{ transitionDelay: `${i * 100}ms` }}
                  >
                    {plan.highlighted && (
                      <>
                        {/* Top glow */}
                        <div className="absolute -top-20 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full bg-[#7af17a]/[0.06] blur-[60px]" />
                        <div className="mb-5 inline-flex items-center rounded-full bg-[#7af17a]/10 px-3 py-1 text-[12px] font-semibold text-[#7af17a]">
                          <Sparkles className="mr-1.5 size-3" aria-hidden="true" />
                          {plan.badge}
                        </div>
                      </>
                    )}

                    <h3 className="font-serif text-xl font-bold">{plan.name}</h3>
                    <p className="mt-2 text-[14px] leading-relaxed text-white/50">
                      {plan.description}
                    </p>

                    <div className="mt-6 flex items-baseline gap-1">
                      {plan.priceValue[billingYearly ? "yearly" : "monthly"] ===
                      0 ? (
                        <span className="font-serif text-4xl font-bold tracking-tight">
                          Gratuit
                        </span>
                      ) : plan.priceValue[
                          billingYearly ? "yearly" : "monthly"
                        ] === -1 ? (
                        <span className="font-serif text-2xl font-bold tracking-tight">
                          Sur mesure
                        </span>
                      ) : (
                        <>
                          <span className="font-serif text-4xl font-bold tracking-tight">
                            {plan.price[billingYearly ? "yearly" : "monthly"]}
                            &euro;
                          </span>
                          <span className="text-[15px] text-white/30">
                            /mois
                          </span>
                        </>
                      )}
                    </div>

                    <div className="my-7 h-px bg-white/[0.06]" />

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
                        className={`group/btn relative flex h-11 w-full items-center justify-center gap-1.5 overflow-hidden rounded-xl text-[14px] font-semibold transition-all duration-300 active:scale-[0.98] ${
                          plan.highlighted
                            ? "bg-[#7af17a] text-[#0a0a0a] shadow-[0_0_20px_rgba(122,241,122,0.15)] hover:shadow-[0_0_40px_rgba(122,241,122,0.25)]"
                            : "bg-white/[0.06] text-white/70 hover:bg-white/[0.1] hover:text-white"
                        }`}
                      >
                        {/* Shine sweep on highlighted */}
                        {plan.highlighted && (
                          <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover/btn:translate-x-full" />
                        )}
                        <span className="relative flex items-center gap-1.5">
                          {plan.cta}
                          <ChevronRight
                            className="size-4 transition-transform duration-200 group-hover/btn:translate-x-0.5"
                            aria-hidden="true"
                          />
                        </span>
                      </button>
                    </Link>
                  </div>
                </GradientBorderCard>
              ))}
            </div>

            <p className="mx-auto mt-10 max-w-md text-center text-[13px] text-white/45">
              Annulation possible à tout moment. Sans carte bancaire pour le
              plan Starter.
            </p>
          </div>
        </section>

        {/* ============================================================== */}
        {/*  6. TESTIMONIALS                                                */}
        {/* ============================================================== */}
        <section
          id="testimonials"
          ref={testimonialsSection.ref}
          className="scroll-mt-20 relative overflow-hidden border-y border-white/[0.04] bg-[#070709] py-24 sm:py-32 lg:py-40"
          aria-labelledby="testimonials-heading"
        >
          {/* Background blobs */}
          <div className="pointer-events-none absolute inset-0" aria-hidden="true">
            <div className="absolute left-1/4 top-1/4 h-[300px] w-[300px] rounded-full bg-[#7af17a]/[0.02] blur-[120px]" />
            <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-blue-500/[0.02] blur-[120px]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <FadeIn
              isInView={testimonialsSection.isInView}
              className="mx-auto max-w-2xl text-center"
            >
              <p className="mb-4 text-[13px] font-semibold uppercase tracking-[0.15em] text-[#7af17a]/70">
                Témoignages
              </p>
              <h2
                id="testimonials-heading"
                className="font-serif text-3xl font-bold tracking-tight sm:text-4xl"
              >
                Ils ont transformé leur carrière
              </h2>
              <p className="mt-5 text-base leading-relaxed text-white/50 sm:text-lg">
                Découvrez les retours de nos membres les plus actifs.
              </p>
            </FadeIn>

            <div className="mt-16 grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3 lg:mt-20">
              {testimonials.map((t, i) => (
                <GlowCard
                  key={t.name}
                  className={`hover-lift ${
                    testimonialsSection.isInView
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-8"
                  }`}
                >
                  <div
                    className="p-7 sm:p-8"
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

                    <div className="mt-6 flex items-center gap-3 border-t border-white/[0.06] pt-5">
                      <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-[#7af17a]/20 to-[#7af17a]/[0.05] text-[13px] font-semibold text-[#7af17a]/70">
                        {t.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold text-white/80">
                          {t.name}
                        </div>
                        <div className="text-[12px] text-white/50">{t.role}</div>
                      </div>
                    </div>
                  </div>
                </GlowCard>
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
            <div
              className="absolute left-1/2 bottom-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[#7af17a]/[0.04] blur-[180px]"
              style={{ animation: "pulseGlow 6s ease-in-out infinite" }}
            />
            <div
              className="absolute left-1/3 top-1/3 h-[200px] w-[200px] rounded-full bg-violet-500/[0.02] blur-[100px]"
              style={{ animation: "pulseGlow 8s ease-in-out infinite 2s" }}
            />
          </div>

          <FloatingParticles />

          <FadeIn
            isInView={ctaSection.isInView}
            className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8"
          >
            <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-[#7af17a]/10 bg-[#7af17a]/[0.04] px-4 py-1.5 text-[13px] font-medium text-[#7af17a]/70 backdrop-blur-sm">
              <Rocket className="size-3.5" aria-hidden="true" />
              Lancez-vous maintenant
            </div>

            <h2
              id="cta-heading"
              className="font-serif text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl"
            >
              Prêt à transformer
              <br />
              <span className="text-shimmer bg-gradient-to-r from-[#7af17a] via-[#b0f4b0] to-[#7af17a] bg-clip-text text-transparent" style={{ backgroundSize: "200% auto" }}>
                votre équipe commerciale
              </span>{" "}
              ?
            </h2>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-white/50 sm:text-lg">
              Rejoignez des centaines de professionnels qui ont déjà fait le
              choix de l&apos;excellence.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4">
              <Link href="/register">
                <button
                  type="button"
                  className="group relative flex h-14 items-center gap-2 overflow-hidden rounded-xl bg-[#7af17a] px-10 text-[15px] font-semibold text-[#0a0a0a] shadow-[0_0_50px_rgba(122,241,122,0.2)] transition-all duration-300 hover:shadow-[0_0_80px_rgba(122,241,122,0.35)] active:scale-[0.98]"
                >
                  {/* Shine sweep */}
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                  <span className="relative flex items-center gap-2">
                    Commencer gratuitement
                    <ArrowRight
                      className="size-4 transition-transform duration-200 group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </button>
              </Link>
              <span className="flex items-center gap-1.5 text-[13px] text-white/45">
                <Shield className="size-3.5 text-[#7af17a]/50" aria-hidden="true" />
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
                className="flex items-center gap-2.5 group"
                aria-label="Sales System - Accueil"
              >
                <Image
                  src="/logo.png"
                  alt="Sales System"
                  width={28}
                  height={28}
                  className="rounded-md transition-shadow duration-300 group-hover:shadow-[0_0_15px_rgba(122,241,122,0.3)]"
                />
                <span className="font-serif text-[15px] font-bold">
                  Sales System
                </span>
              </Link>
              <p className="mt-4 max-w-[220px] text-[13px] leading-relaxed text-white/50">
                La plateforme de référence pour les équipes de vente en France.
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
                        className="text-[13px] text-white/50 transition-all duration-200 hover:text-white/70 hover:translate-x-0.5 inline-block"
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
            &copy; 2026 Sales System. Tous droits réservés.
          </div>
        </div>
      </footer>
    </div>
  );
}
