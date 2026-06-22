import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getCurrentChatAccess } from "@/lib/chat-users";
import { type ApiFootballTeam, searchApiFootballTeams } from "@/lib/api-football";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

type AiStructuredPrediction = {
  verdict: {
    winner: string;
    summary: string;
    confidence: number | null;
    riskLevel: "low" | "medium" | "high";
  };
  probabilities: {
    teamAWin: number | null;
    draw: number | null;
    teamBWin: number | null;
    notes: string;
  };
  teams: Array<{
    name: string;
    formSummary: string;
    strengths: string[];
    weaknesses: string[];
    tacticalIdentity: string;
  }>;
  lastMatches: Array<{
    team: string;
    date: string;
    opponent: string;
    score: string;
    competition: string;
    notes: string;
  }>;
  keyPlayers: Array<{
    team: string;
    name: string;
    role: string;
    recentImpact: string;
    status: string;
  }>;
  absences: Array<{
    team: string;
    name: string;
    reason: string;
    expectedImpact: string;
    confidence: string;
  }>;
  gamePlans: Array<{
    team: string;
    formation: string;
    attackingPlan: string;
    defensivePlan: string;
    keyDuel: string;
  }>;
  predictionFactors: Array<{
    factor: string;
    advantage: string;
    impact: string;
    evidence: string;
  }>;
  risks: string[];
  sources: Array<{
    title: string;
    url: string;
    note: string;
  }>;
};

function normalizeText(value = ""): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .toLowerCase();
}

async function findTeam(name: string) {
  const result = await searchApiFootballTeams(name);
  const teams = result.response;
  const nationalTeams = teams.filter((item) => item.team?.national === true);
  const candidates = nationalTeams.length > 0 ? nationalTeams : teams;
  const exact = candidates.find(
    (item) => normalizeText(item.team?.name) === normalizeText(name)
  );
  const selected = exact ?? candidates[0];

  if (!selected?.team?.id) {
    throw new Error(`Equipe introuvable: ${name}`);
  }

  return {
    id: selected.team.id,
    name: selected.team.name ?? name,
    code: selected.team.code ?? null,
    country: selected.team.country ?? null,
    national: selected.team.national ?? false,
    logo: selected.team.logo ?? null,
    alternatives: candidates
      .slice(0, 5)
      .map((item: ApiFootballTeam) => item.team?.name)
      .filter(Boolean),
  };
}

async function findTeamByInput(input: {
  name: string;
  teamId?: number | null;
  logo?: string | null;
  country?: string | null;
}) {
  if (!input.teamId) {
    return findTeam(input.name);
  }

  return {
    id: input.teamId,
    name: input.name,
    code: null,
    country: input.country ?? null,
    national: false,
    logo: input.logo ?? null,
    alternatives: [],
  };
}

function buildAiPrompt(input: {
  teamA: { id: number; name: string; country: string | null; logo: string | null };
  teamB: { id: number; name: string; country: string | null; logo: string | null };
  timezone: string;
}) {
  return `Tu es MetaPronostic AI, analyste football. Tu dois chercher toi-meme les donnees recentes sur le web et produire une prediction football complete.

Contrainte importante:
- API-FOOTBALL est utilisee uniquement pour identifier les equipes et leurs logos.
- Les scores, statistiques, blessures, joueurs, derniers matchs, compositions et plan de jeu doivent venir de ta recherche web.
- Cite les sources ou les sites consultes dans la derniere section.
- Si une information n'est pas confirmee, ecris "non confirme" ou "non disponible".
- Pour les valeurs numeriques non confirmees, utilise null, jamais 0 par defaut.
- lastMatches doit contenir 10 derniers matchs joues pour ${input.teamA.name} et 10 derniers matchs joues pour ${input.teamB.name} si disponibles.

Retour obligatoire:
- Reponds uniquement avec un JSON valide.
- Pas de markdown, pas de commentaire, pas de texte autour.
- Utilise exactement cette structure:
{
  "verdict": {
    "winner": "nom equipe, nul ou non confirme",
    "summary": "resume court",
    "confidence": null,
    "riskLevel": "low|medium|high"
  },
  "probabilities": {
    "teamAWin": null,
    "draw": null,
    "teamBWin": null,
    "notes": "methode et prudence"
  },
  "teams": [
    {
      "name": "nom",
      "formSummary": "forme recente",
      "strengths": ["force 1"],
      "weaknesses": ["faiblesse 1"],
      "tacticalIdentity": "style de jeu"
    }
  ],
  "lastMatches": [
    {
      "team": "nom",
      "date": "YYYY-MM-DD ou non disponible",
      "opponent": "nom",
      "score": "score",
      "competition": "competition",
      "notes": "contexte"
    }
  ],
  "keyPlayers": [
    {
      "team": "nom",
      "name": "joueur",
      "role": "poste/role",
      "recentImpact": "impact recent",
      "status": "available|doubtful|injured|suspended|non confirme"
    }
  ],
  "absences": [
    {
      "team": "nom",
      "name": "joueur",
      "reason": "blessure/suspension/non confirme",
      "expectedImpact": "impact",
      "confidence": "confirmed|reported|uncertain|non disponible"
    }
  ],
  "gamePlans": [
    {
      "team": "nom",
      "formation": "formation probable ou non disponible",
      "attackingPlan": "plan offensif",
      "defensivePlan": "plan defensif",
      "keyDuel": "duel cle"
    }
  ],
  "predictionFactors": [
    {
      "factor": "forme recente|blessures|domicile|confrontations|attaque|defense|calendrier|motivation",
      "advantage": "equipe avantagee ou neutre",
      "impact": "low|medium|high",
      "evidence": "donnee ou observation qui justifie le facteur"
    }
  ],
  "risks": ["limite ou risque"],
  "sources": [
    {
      "title": "source",
      "url": "https://...",
      "note": "information utilisee"
    }
  ]
}

Equipes:
- ${input.teamA.name}, pays: ${input.teamA.country ?? "non disponible"}, logo API-FOOTBALL: ${input.teamA.logo ?? "non disponible"}
- ${input.teamB.name}, pays: ${input.teamB.country ?? "non disponible"}, logo API-FOOTBALL: ${input.teamB.logo ?? "non disponible"}

Timezone utilisateur: ${input.timezone}`;
}

function extractJsonObject(text: string): unknown {
  const trimmed = text.trim();
  const withoutFence = trimmed
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("AI response did not contain JSON");
  }

  return JSON.parse(withoutFence.slice(start, end + 1));
}

function normalizeStructuredPrediction(value: unknown): AiStructuredPrediction {
  const input = value as Partial<AiStructuredPrediction>;
  const parseNullablePercent = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null;
  };

  return {
    verdict: {
      winner: input.verdict?.winner ?? "non confirme",
      summary: input.verdict?.summary ?? "Analyse non disponible.",
      confidence: parseNullablePercent(input.verdict?.confidence),
      riskLevel: input.verdict?.riskLevel ?? "medium",
    },
    probabilities: {
      teamAWin: parseNullablePercent(input.probabilities?.teamAWin),
      draw: parseNullablePercent(input.probabilities?.draw),
      teamBWin: parseNullablePercent(input.probabilities?.teamBWin),
      notes: input.probabilities?.notes ?? "Probabilites estimees par l'IA.",
    },
    teams: Array.isArray(input.teams) ? input.teams : [],
    lastMatches: Array.isArray(input.lastMatches)
      ? input.lastMatches.slice(0, 20)
      : [],
    keyPlayers: Array.isArray(input.keyPlayers) ? input.keyPlayers : [],
    absences: Array.isArray(input.absences) ? input.absences : [],
    gamePlans: Array.isArray(input.gamePlans) ? input.gamePlans : [],
    predictionFactors: Array.isArray(input.predictionFactors)
      ? input.predictionFactors
      : [],
    risks: Array.isArray(input.risks) ? input.risks : [],
    sources: Array.isArray(input.sources) ? input.sources : [],
  };
}

async function generateAiAnalysis(input: {
  teamA: { id: number; name: string; country: string | null; logo: string | null };
  teamB: { id: number; name: string; country: string | null; logo: string | null };
  timezone: string;
}) {
  const prompt = buildAiPrompt(input);

  if (OPENAI_API_KEY) {
    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: OPENAI_MODEL,
          tools: [{ type: "web_search_preview", search_context_size: "medium" }],
          tool_choice: "required",
          input: prompt,
        }),
      });

      const result = (await response.json()) as {
        output_text?: string;
        output?: Array<{
          content?: Array<{ text?: string }>;
        }>;
        error?: { message?: string };
      };

      if (!response.ok) {
        throw new Error(result.error?.message ?? "OpenAI AI prediction failed");
      }

      const text =
        result.output_text?.trim() ??
        result.output
          ?.flatMap((item) => item.content ?? [])
          .map((content) => content.text)
          .filter(Boolean)
          .join("\n")
          .trim() ??
        null;
      let structured: AiStructuredPrediction | null = null;
      let parseError: string | null = null;

      if (text) {
        try {
          structured = normalizeStructuredPrediction(extractJsonObject(text));
        } catch (error) {
          parseError =
            error instanceof Error ? error.message : "AI JSON parsing failed";
        }
      }

      return {
        provider: `OpenAI ${OPENAI_MODEL} + web_search`,
        text,
        structured,
        error: parseError,
      };
    } catch (error) {
      return {
        provider: `OpenAI ${OPENAI_MODEL} + web_search`,
        text: null,
        structured: null,
        error: error instanceof Error ? error.message : "OpenAI AI prediction failed",
      };
    }
  }

  if (GEMINI_API_KEY) {
    try {
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text().trim();
      let structured: AiStructuredPrediction | null = null;
      let parseError: string | null = null;

      try {
        structured = normalizeStructuredPrediction(extractJsonObject(text));
      } catch (error) {
        parseError =
          error instanceof Error ? error.message : "AI JSON parsing failed";
      }

      return {
        provider: "Gemini 2.5 Flash",
        text,
        structured,
        error: parseError,
      };
    } catch (error) {
      return {
        provider: "Gemini 2.5 Flash",
        text: null,
        structured: null,
        error: error instanceof Error ? error.message : "Gemini AI prediction failed",
      };
    }
  }

  return {
    provider: null,
    text: null,
    structured: null,
    error: "No AI key configured. Set OPENAI_API_KEY or GEMINI_API_KEY.",
  };
}

export async function GET(req: NextRequest) {
  const access = await getCurrentChatAccess();
  if (!access.allowed) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized" },
      { status: access.status }
    );
  }

  const teamA = req.nextUrl.searchParams.get("teamA")?.trim();
  const teamB = req.nextUrl.searchParams.get("teamB")?.trim();
  const teamAId = Number(req.nextUrl.searchParams.get("teamAId"));
  const teamBId = Number(req.nextUrl.searchParams.get("teamBId"));
  const teamALogo = req.nextUrl.searchParams.get("teamALogo");
  const teamBLogo = req.nextUrl.searchParams.get("teamBLogo");
  const teamACountry = req.nextUrl.searchParams.get("teamACountry");
  const teamBCountry = req.nextUrl.searchParams.get("teamBCountry");
  const timezone =
    req.nextUrl.searchParams.get("timezone")?.trim() || "Africa/Casablanca";

  if (!teamA || !teamB) {
    return NextResponse.json(
      { ok: false, error: "teamA and teamB are required" },
      { status: 400 }
    );
  }

  try {
    const [firstTeam, secondTeam] = await Promise.all([
      findTeamByInput({
        name: teamA,
        teamId: Number.isFinite(teamAId) ? teamAId : null,
        logo: teamALogo,
        country: teamACountry,
      }),
      findTeamByInput({
        name: teamB,
        teamId: Number.isFinite(teamBId) ? teamBId : null,
        logo: teamBLogo,
        country: teamBCountry,
      }),
    ]);

    const aiAnalysis = await generateAiAnalysis({
      teamA: firstTeam,
      teamB: secondTeam,
      timezone,
    });

    return NextResponse.json({
      ok: true,
      generatedAt: new Date().toISOString(),
      timezone,
      teams: {
        teamA: firstTeam,
        teamB: secondTeam,
      },
      fixture: null,
      percentages: {
        teamAWin: aiAnalysis.structured?.probabilities.teamAWin ?? 0,
        draw: aiAnalysis.structured?.probabilities.draw ?? 0,
        teamBWin: aiAnalysis.structured?.probabilities.teamBWin ?? 0,
        source: "ai-web-search",
      },
      advice: null,
      winner: null,
      lineups: [],
      injuries: [],
      teamAnalytics: {
        teamA: null,
        teamB: null,
      },
      headToHead: {
        count: 0,
        matches: [],
      },
      aiAnalysis,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "AI prediction request failed",
      },
      { status: 500 }
    );
  }
}
