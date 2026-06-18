"use client";

import { motion, type Variants } from "framer-motion";
import { useState } from "react";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CircleDot,
  Database,
  Goal,
  Menu,
  MessageCircle,
  LineChart,
  LogIn,
  X,
  UserCircle2,
  Radio,
  ShieldCheck,
  Trophy,
  Zap,
} from "lucide-react";
import Link from "next/link";

const fadeInUp: Variants = {
  initial: { opacity: 0, y: 28 },
  animate: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.55, ease: "easeOut" },
  }),
};

const signals = [
  { label: "Win probability", value: "64%", icon: LineChart },
  { label: "Odds drift", value: "+8.2", icon: Activity },
  { label: "Form index", value: "91", icon: Zap },
];

const matchEvents = [
  { minute: "18'", label: "Pressing haut", tone: "text-lime-200" },
  { minute: "34'", label: "Cote home +8.2", tone: "text-amber-200" },
  { minute: "61'", label: "xG momentum", tone: "text-cyan-200" },
];

const playerDots = [
  ["left-[18%] top-[24%]", "bg-lime-300/90"],
  ["left-[30%] top-[45%]", "bg-lime-300/90"],
  ["left-[42%] top-[68%]", "bg-lime-300/90"],
  ["left-[62%] top-[30%]", "bg-cyan-300/90"],
  ["left-[74%] top-[54%]", "bg-cyan-300/90"],
  ["left-[83%] top-[72%]", "bg-cyan-300/90"],
];

const features = [
  {
    icon: BarChart3,
    title: "Match Intelligence",
    description:
      "Analyse fixtures, standings, form, injuries, lineups, events, player stats, and odds from your football database.",
  },
  {
    icon: Radio,
    title: "Live Context",
    description:
      "Ask direct questions about live matches, finished scores, cotes, absent players, and competition rankings.",
  },
  {
    icon: ShieldCheck,
    title: "Grounded Answers",
    description:
      "Responses are grounded in MongoDB football collections and can be enriched with uploaded PDF or Excel reports.",
  },
];

const collections = [
  "fixtures",
  "teams",
  "standings",
  "players",
  "injuries",
  "odds",
];

const navLinks = [
  { label: "Engine", href: "#engine" },
  { label: "Data", href: "#data" },
  { label: "Documentation", href: "/documentation" },
];

const whatsappHref =
  "https://wa.me/212666599460?text=Bonjour%20MetaPronostic%2C%20je%20veux%20des%20informations%20sur%20la%20plateforme.";

type LandingAuthUser = {
  email: string;
  role: "admin" | "agent" | "user";
  status?: "pending" | "active" | "blocked";
};

type LandingPageProps = {
  authUser: LandingAuthUser | null;
};

function getProfileHref(authUser: LandingAuthUser | null): string {
  if (!authUser) {
    return "/chat-login";
  }

  if (authUser.role === "admin") {
    return "/admin";
  }

  if (authUser.role === "agent") {
    return "/agent";
  }

  if (authUser.status === "pending") {
    return "/pending-approval";
  }

  if (authUser.status === "blocked") {
    return "/access-blocked";
  }

  return "/Dashboard";
}

function getAuthLabel(authUser: LandingAuthUser | null): string {
  if (!authUser) {
    return "S'authentifier";
  }

  if (authUser.role === "admin") {
    return "Profil admin";
  }

  if (authUser.role === "agent") {
    return "Profil agent";
  }

  return "Profil";
}

export default function LandingPage({ authUser }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const profileHref = getProfileHref(authUser);
  const authLabel = getAuthLabel(authUser);
  const AuthIcon = authUser ? UserCircle2 : LogIn;

  return (
    <div className="min-h-screen overflow-hidden bg-[#07110d] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#07110d]/80 backdrop-blur-2xl">
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-lime-300/40 to-transparent" />
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="group flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-lime-400 text-[#07110d] shadow-lg shadow-lime-400/20 transition group-hover:bg-lime-300">
                <Trophy className="h-5 w-5" />
              </span>
              <span className="min-w-0 truncate text-base font-black uppercase tracking-wide sm:text-lg">
                MetaPronostic
              </span>
            </Link>
            <span className="hidden rounded-full border border-lime-300/20 bg-lime-300/10 px-3 py-1 text-xs font-black uppercase text-lime-200 lg:inline-flex">
              Football AI
            </span>
          </div>

          <div className="hidden items-center rounded-lg border border-white/10 bg-white/[0.04] p-1 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-md px-4 py-2 text-sm font-bold text-white/70 transition hover:bg-white/[0.06] hover:text-lime-200"
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className="hidden h-10 items-center justify-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-4 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/20 lg:inline-flex"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
            {authUser && (
              <span className="hidden max-w-[220px] truncate rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-300 xl:inline-flex">
                {authUser.email}
              </span>
            )}
            <Link
              href={profileHref}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 text-sm font-black text-[#07110d] shadow-lg shadow-lime-400/20 transition hover:bg-lime-300"
            >
              <AuthIcon className="h-4 w-4" />
              {authLabel}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setIsMenuOpen((value) => !value)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white transition hover:bg-white/[0.1] sm:hidden"
            aria-label={isMenuOpen ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={isMenuOpen}
          >
            {isMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="border-t border-white/10 bg-[#07110d]/95 px-4 pb-4 pt-3 backdrop-blur-2xl sm:hidden"
          >
            <div className="space-y-2">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="flex h-11 items-center rounded-lg border border-white/10 bg-white/[0.04] px-4 text-sm font-bold text-slate-200 transition hover:bg-white/[0.08]"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                href={profileHref}
                onClick={() => setIsMenuOpen(false)}
                className="flex h-11 items-center justify-center gap-2 rounded-lg bg-lime-400 px-4 text-sm font-black text-[#07110d] transition hover:bg-lime-300"
              >
                <AuthIcon className="h-4 w-4" />
                {authLabel}
              </Link>
              <a
                href={whatsappHref}
                target="_blank"
                rel="noreferrer"
                onClick={() => setIsMenuOpen(false)}
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-emerald-300/20 bg-emerald-300/10 px-4 text-sm font-black text-emerald-100 transition hover:bg-emerald-300/20"
              >
                <MessageCircle className="h-4 w-4" />
                Chat WhatsApp
              </a>
              {authUser && (
                <div className="truncate rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3 text-xs font-semibold text-slate-400">
                  {authUser.email}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </nav>

      <section className="relative min-h-[calc(100vh-4rem)] px-4 py-8 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_16%,rgba(132,204,22,0.18),transparent_28%),radial-gradient(circle_at_82%_22%,rgba(34,211,238,0.12),transparent_30%),linear-gradient(135deg,rgba(34,197,94,0.12),transparent_38%,rgba(34,211,238,0.08)_72%,transparent)]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[0.86fr_1.14fr]">
          <motion.div
            initial="initial"
            animate="animate"
            className="max-w-3xl py-10"
          >
            <motion.div
              variants={fadeInUp}
              custom={0}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-lime-300/25 bg-lime-300/10 px-4 py-2 text-sm font-semibold text-lime-200"
            >
              <CircleDot className="h-4 w-4" />
              Football prediction cockpit
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              custom={1}
              className="max-w-4xl text-5xl font-black leading-[0.98] tracking-normal text-white sm:text-6xl lg:text-7xl"
            >
              MetaPronostic
            </motion.h1>
            <motion.p
              variants={fadeInUp}
              custom={2}
              className="mt-6 max-w-2xl text-lg leading-8 text-slate-300 sm:text-xl"
            >
              Analyse les matchs, détecte les signaux forts et interroge ta base
              football avec une IA connectée aux fixtures, classements, joueurs,
              blessures et cotes.
            </motion.p>
            <motion.div
              variants={fadeInUp}
              custom={3}
              className="mt-8 flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/Dashboard"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime-400 px-6 py-3 font-black text-[#07110d] transition hover:bg-lime-300"
              >
                Chat avec l'IA
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#data"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 py-3 font-bold text-white transition hover:bg-white/10"
              >
                Voir les sources
                <Database className="h-5 w-5" />
              </a>
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 18 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.75, ease: "easeOut" }}
            className="relative min-h-[540px] overflow-hidden rounded-xl border border-white/10 bg-[#08130f] shadow-2xl shadow-lime-950/50"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(163,230,53,0.22),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]" />
            <motion.div
              animate={{ opacity: [0.28, 0.5, 0.28] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-x-8 top-8 h-28 rounded-full bg-lime-300/10 blur-3xl"
            />

            <div className="absolute left-1/2 top-16 h-[390px] w-[86%] -translate-x-1/2 overflow-hidden rounded-[30px] border-2 border-lime-200/60 bg-[linear-gradient(90deg,rgba(34,197,94,0.32)_0_10%,rgba(22,101,52,0.28)_10%_20%,rgba(34,197,94,0.32)_20%_30%,rgba(22,101,52,0.28)_30%_40%,rgba(34,197,94,0.32)_40%_50%,rgba(22,101,52,0.28)_50%_60%,rgba(34,197,94,0.32)_60%_70%,rgba(22,101,52,0.28)_70%_80%,rgba(34,197,94,0.32)_80%_90%,rgba(22,101,52,0.28)_90%)] shadow-2xl shadow-black/30">
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:34px_34px]" />
              <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-lime-100/65" />
              <div className="absolute left-1/2 top-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-lime-100/65" />
              <div className="absolute left-[4%] top-1/2 h-36 w-20 -translate-y-1/2 rounded-r-xl border-y-2 border-r-2 border-lime-100/65" />
              <div className="absolute right-[4%] top-1/2 h-36 w-20 -translate-y-1/2 rounded-l-xl border-y-2 border-l-2 border-lime-100/65" />
              <div className="absolute left-[4%] top-1/2 h-16 w-8 -translate-y-1/2 rounded-r-lg border-y-2 border-r-2 border-lime-100/65" />
              <div className="absolute right-[4%] top-1/2 h-16 w-8 -translate-y-1/2 rounded-l-lg border-y-2 border-l-2 border-lime-100/65" />

              <motion.div
                animate={{ x: ["0%", "34%", "62%", "20%", "0%"], y: ["0%", "24%", "-8%", "32%", "0%"] }}
                transition={{ duration: 7.5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[19%] top-[47%] z-20 h-4 w-4 rounded-full border-2 border-white bg-white shadow-[0_0_24px_rgba(255,255,255,0.75)]"
              />

              <motion.div
                animate={{ opacity: [0.25, 0.95, 0.25], scaleX: [0.76, 1, 0.76] }}
                transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute left-[24%] top-[51%] h-[2px] w-[48%] rotate-[-18deg] bg-cyan-200/80 shadow-[0_0_18px_rgba(103,232,249,0.7)]"
              />
              <motion.div
                animate={{ opacity: [0.15, 0.8, 0.15], scaleX: [0.6, 1, 0.6] }}
                transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="absolute left-[33%] top-[38%] h-[2px] w-[36%] rotate-[24deg] bg-lime-200/80 shadow-[0_0_18px_rgba(190,242,100,0.7)]"
              />

              {playerDots.map(([position, color], index) => (
                <motion.div
                  key={`${position}-${color}`}
                  animate={{ y: [0, index % 2 === 0 ? -6 : 6, 0] }}
                  transition={{
                    duration: 2.4 + index * 0.18,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                  className={`absolute ${position} z-10 flex h-9 w-9 items-center justify-center rounded-full border border-white/50 ${color} shadow-lg shadow-black/35`}
                >
                  <span className="h-3 w-3 rounded-full bg-[#07110d]" />
                </motion.div>
              ))}
            </div>

            <div className="absolute left-5 top-5 rounded-lg border border-white/10 bg-[#07110d]/85 p-4 backdrop-blur-xl sm:left-7 sm:top-7">
              <p className="text-xs font-black uppercase text-slate-400">
                Next fixture
              </p>
              <div className="mt-2 flex items-center gap-3">
                <Goal className="h-5 w-5 text-lime-300" />
                <p className="text-lg font-black text-white">PSG vs OM</p>
              </div>
              <p className="mt-1 text-sm font-bold text-lime-300">
                Ligue 1 · Live model
              </p>
            </div>

            <div className="absolute right-5 top-5 rounded-lg border border-cyan-300/20 bg-cyan-300/10 p-4 backdrop-blur-xl sm:right-7 sm:top-7">
              <p className="text-xs font-black uppercase text-cyan-100/80">
                Confidence
              </p>
              <p className="mt-1 text-3xl font-black text-cyan-100">78%</p>
            </div>

            <div className="absolute bottom-5 left-5 right-5 grid gap-3 md:grid-cols-[1fr_0.92fr]">
              <div className="rounded-lg border border-white/10 bg-[#07110d]/88 p-4 backdrop-blur-xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase text-slate-400">
                    Timeline IA
                  </p>
                  <span className="rounded-md bg-lime-300/15 px-2 py-1 text-xs font-black text-lime-200">
                    Live
                  </span>
                </div>
                <div className="space-y-2">
                  {matchEvents.map((event) => (
                    <div
                      key={event.minute}
                      className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2"
                    >
                      <span className="text-xs font-black text-slate-500">
                        {event.minute}
                      </span>
                      <span className={`text-sm font-bold ${event.tone}`}>
                        {event.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                {signals.map((signal) => (
                  <div
                    key={signal.label}
                    className="rounded-lg border border-white/10 bg-[#07110d]/88 p-4 backdrop-blur-xl"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <signal.icon className="h-5 w-5 text-cyan-300" />
                      <p className="text-2xl font-black text-white">
                        {signal.value}
                      </p>
                    </div>
                    <p className="mt-2 text-xs font-semibold uppercase text-slate-400">
                      {signal.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section id="engine" className="border-y border-white/10 bg-[#0a1510] px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: "-80px" }}
            variants={fadeInUp}
            custom={0}
            className="max-w-2xl"
          >
            <h2 className="text-3xl font-black text-white sm:text-4xl">
              Un cockpit pour décider avant le coup d'envoi.
            </h2>
            <p className="mt-4 text-slate-300">
              MetaPronostic croise les données structurées MongoDB et les
              rapports uploadés pour produire des réponses actionnables sur les
              matchs.
            </p>
          </motion.div>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial="initial"
                whileInView="animate"
                viewport={{ once: true, margin: "-80px" }}
                variants={fadeInUp}
                custom={i + 1}
                className="rounded-lg border border-white/10 bg-white/[0.04] p-6"
              >
                <feature.icon className="h-7 w-7 text-lime-300" />
                <h3 className="mt-5 text-xl font-black text-white">
                  {feature.title}
                </h3>
                <p className="mt-3 leading-7 text-slate-300">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="data" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.8fr_1fr]">
          <div>
            <h2 className="text-3xl font-black text-white sm:text-4xl">
              Collections football prêtes pour l'IA.
            </h2>
            <p className="mt-4 leading-7 text-slate-300">
              Le front est aligné avec les collections API-FOOTBALL importées
              dans MongoDB : fixtures, standings, player statistics, injuries,
              odds et plus.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {collections.map((collection) => (
              <div
                key={collection}
                className="rounded-lg border border-lime-300/20 bg-lime-300/10 px-4 py-5"
              >
                <Database className="mb-3 h-5 w-5 text-lime-300" />
                <p className="font-black uppercase text-white">{collection}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-lime-400 text-[#07110d]">
              <Trophy className="h-4 w-4" />
            </span>
            <span className="font-black uppercase">MetaPronostic</span>
          </Link>
          <p className="text-sm text-slate-400">
            © {new Date().getFullYear()} MetaPronostic. Football prediction
            intelligence.
          </p>
        </div>
      </footer>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-5 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-xl border border-emerald-200/30 bg-emerald-400 text-[#07110d] shadow-2xl shadow-emerald-500/30 transition hover:scale-105 hover:bg-emerald-300 sm:h-auto sm:w-auto sm:gap-2 sm:px-5 sm:py-4"
        aria-label="Chat WhatsApp MetaPronostic"
      >
        <MessageCircle className="h-6 w-6" />
        <span className="hidden text-sm font-black sm:inline">WhatsApp</span>
      </a>
    </div>
  );
}
