"use client";

import { motion, type Variants } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  CircleDot,
  Database,
  LineChart,
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

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-[#07110d] text-white">
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#07110d]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-lime-400 text-[#07110d]">
              <Trophy className="h-5 w-5" />
            </span>
            <span className="text-lg font-black uppercase tracking-wide">
              MetaPronostic
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#engine"
              className="text-sm font-medium text-white/70 transition-colors hover:text-lime-300"
            >
              Engine
            </a>
            <a
              href="#data"
              className="text-sm font-medium text-white/70 transition-colors hover:text-lime-300"
            >
              Data
            </a>
          </div>
          <Link
            href="/Dashboard"
            className="inline-flex items-center gap-2 rounded-lg bg-lime-400 px-4 py-2 text-sm font-bold text-[#07110d] transition hover:bg-lime-300"
          >
            Chat IA
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/admin"
            className="hidden items-center rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10 sm:inline-flex"
          >
            Admin
          </Link>
          <Link
            href="/agent"
            className="hidden items-center rounded-lg border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-bold text-cyan-100 transition hover:bg-cyan-300/20 sm:inline-flex"
          >
            Agent
          </Link>
        </div>
      </nav>

      <section className="relative min-h-[calc(100vh-4rem)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(34,197,94,0.12),transparent_35%,rgba(34,211,238,0.08)_70%,transparent)]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-[1fr_0.95fr]">
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
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, ease: "easeOut" }}
            className="relative min-h-[520px] overflow-hidden rounded-xl border border-white/10 bg-[#0b1712] shadow-2xl shadow-lime-950/40"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(132,204,22,0.22),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.04),transparent)]" />
            <div className="absolute left-1/2 top-14 h-[520px] w-[88%] -translate-x-1/2 rounded-[28px] border-2 border-lime-300/60 bg-[linear-gradient(90deg,rgba(34,197,94,0.18)_0_10%,rgba(22,163,74,0.08)_10%_20%,rgba(34,197,94,0.18)_20%_30%,rgba(22,163,74,0.08)_30%_40%,rgba(34,197,94,0.18)_40%_50%,rgba(22,163,74,0.08)_50%_60%,rgba(34,197,94,0.18)_60%_70%,rgba(22,163,74,0.08)_70%_80%,rgba(34,197,94,0.18)_80%_90%,rgba(22,163,74,0.08)_90%)]" />
            <div className="absolute left-1/2 top-[314px] h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-lime-300/60" />
            <div className="absolute left-1/2 top-[314px] h-[2px] w-[88%] -translate-x-1/2 bg-lime-300/60" />
            <div className="absolute left-[6%] top-[206px] h-56 w-24 rounded-r-xl border-y-2 border-r-2 border-lime-300/60" />
            <div className="absolute right-[6%] top-[206px] h-56 w-24 rounded-l-xl border-y-2 border-l-2 border-lime-300/60" />

            <div className="absolute left-6 top-6 rounded-lg border border-white/10 bg-[#08110d]/90 p-4 backdrop-blur">
              <p className="text-xs font-bold uppercase text-slate-400">
                Next fixture
              </p>
              <p className="mt-2 text-lg font-black text-white">PSG vs OM</p>
              <p className="text-sm text-lime-300">Ligue 1 · 2025</p>
            </div>

            <div className="absolute bottom-6 left-6 right-6 grid gap-3 sm:grid-cols-3">
              {signals.map((signal) => (
                <div
                  key={signal.label}
                  className="rounded-lg border border-white/10 bg-[#08110d]/90 p-4 backdrop-blur"
                >
                  <signal.icon className="mb-3 h-5 w-5 text-cyan-300" />
                  <p className="text-2xl font-black text-white">
                    {signal.value}
                  </p>
                  <p className="mt-1 text-xs font-semibold uppercase text-slate-400">
                    {signal.label}
                  </p>
                </div>
              ))}
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
    </div>
  );
}
