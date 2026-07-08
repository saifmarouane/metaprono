import { readFile } from "node:fs/promises";
import path from "node:path";

import prompts from "@/data/ai-prompts.json";

type AiPrompt = {
  id: string;
  name: string;
  model?: string;
  system: string;
  userTemplate: string;
};

type OpenAiResponsesPayload = {
  output_text?: string;
  output?: Array<{
    content?: Array<{
      text?: string;
    }>;
  }>;
  error?: {
    message?: string;
  };
};

const AI_PROMPTS = prompts as AiPrompt[];

function stringifyJsonForPrompt(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

export function getAiPromptById(promptId: string): AiPrompt {
  const prompt = AI_PROMPTS.find((item) => item.id === promptId);

  if (!prompt) {
    throw new Error(`AI prompt not found: ${promptId}`);
  }

  return prompt;
}

export function buildTeamStatisticsPrompt(input: {
  teamAJson: unknown;
  teamBJson: unknown;
  promptId?: string;
}) {
  const prompt = getAiPromptById(input.promptId ?? "team_statistics_analysis");
  const teamAJson = input.teamAJson;
  const teamBJson = input.teamBJson;
  const userPrompt = prompt.userTemplate
    .replace("{{teamAJson}}", stringifyJsonForPrompt(teamAJson))
    .replace("{{teamBJson}}", stringifyJsonForPrompt(teamBJson));

  return {
    prompt,
    teamAJson,
    teamBJson,
    messages: [
      {
        role: "system" as const,
        content: prompt.system,
      },
      {
        role: "user" as const,
        content: userPrompt,
      },
    ],
  };
}

export async function buildTeamStatisticsPromptFromTxt(input: {
  teamAJson: unknown;
  teamBJson: unknown;
}) {
  const promptPath = path.join(process.cwd(), "src", "data", "prompt.txt");
  const promptText = await readFile(promptPath, "utf8");
  const teamAJson = input.teamAJson;
  const teamBJson = input.teamBJson;
  const sentPrompt = [
    promptText,
    "",
    "JSON_EQUIPE_A:",
    stringifyJsonForPrompt(teamAJson),
    "",
    "JSON_EQUIPE_B:",
    stringifyJsonForPrompt(teamBJson),
  ].join("\n");

  return {
    promptPath,
    promptText,
    teamAJson,
    teamBJson,
    sentPrompt,
    messages: [
      {
        role: "user" as const,
        content: sentPrompt,
      },
    ],
  };
}

export async function analyzeTeamStatisticsWithGpt(input: {
  teamAJson: unknown;
  teamBJson: unknown;
  promptId?: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set");
  }

  const { promptPath, promptText, sentPrompt, teamAJson, teamBJson, messages } =
    await buildTeamStatisticsPromptFromTxt(input);
  const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: messages,
    }),
  });
  const result = (await response.json()) as OpenAiResponsesPayload;

  if (!response.ok) {
    throw new Error(result.error?.message ?? "OpenAI analysis request failed");
  }

  const outputText =
    result.output_text?.trim() ??
    result.output
      ?.flatMap((item) => item.content ?? [])
      .map((content) => content.text)
      .filter(Boolean)
      .join("\n")
      .trim() ??
    "";

  return {
    promptId: "src_data_prompt_txt",
    promptName: "src/data/prompt.txt",
    promptPath,
    promptText,
    sentPrompt,
    model,
    teamAJson,
    teamBJson,
    outputText,
  };
}
