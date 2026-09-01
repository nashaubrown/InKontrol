// AI content assistance (Phase 4.4). Activates when ANTHROPIC_API_KEY is set.

import Anthropic from "@anthropic-ai/sdk";

export function aiConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

const client = () => new Anthropic();

export type CaptionSuggestions = { captions: string[]; hashtags: string[] };

export async function suggestCaptions(input: {
  topic: string;
  platform: string;
  brandVoice: string;
  examplePosts: string[];
}): Promise<CaptionSuggestions> {
  const response = await client().messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    system:
      "You write social media captions for an agency's client. Respond with only valid JSON: " +
      '{"captions": [3 caption strings], "hashtags": [8 hashtag strings starting with #]}. ' +
      "No markdown, no commentary.",
    messages: [
      {
        role: "user",
        content: [
          `Platform: ${input.platform}`,
          `Topic/brief: ${input.topic}`,
          input.brandVoice && `Brand voice: ${input.brandVoice}`,
          input.examplePosts.length > 0 &&
            `Example past posts (match this style):\n${input.examplePosts.map((p) => `- ${p}`).join("\n")}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
  });
  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  const parsed = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim()) as CaptionSuggestions;
  return {
    captions: (parsed.captions ?? []).slice(0, 3).map(String),
    hashtags: (parsed.hashtags ?? []).slice(0, 10).map(String),
  };
}

export async function rewriteInBrandVoice(input: {
  text: string;
  brandVoice: string;
}): Promise<string> {
  const response = await client().messages.create({
    model: "claude-opus-5",
    max_tokens: 2000,
    system:
      "Rewrite the given social media caption to match the brand voice. Respond with only the rewritten caption, nothing else.",
    messages: [
      {
        role: "user",
        content: `Brand voice: ${input.brandVoice || "clear, direct, professional"}\n\nCaption to rewrite:\n${input.text}`,
      },
    ],
  });
  return response.content.find((b) => b.type === "text")?.text?.trim() ?? input.text;
}

// ---- Phase 5.1: cross-platform assistant (tightly scoped first release) ----

export async function generateSubtasks(input: {
  title: string;
  description: string;
}): Promise<string[]> {
  const response = await client().messages.create({
    model: "claude-opus-5",
    max_tokens: 1500,
    system:
      'Break the task into 3-7 concrete subtasks. Respond with only valid JSON: {"subtasks": ["...", ...]}. Each subtask is one short actionable sentence.',
    messages: [
      { role: "user", content: `Task: ${input.title}\n\nDescription:\n${input.description || "(none)"}` },
    ],
  });
  const text = response.content.find((b) => b.type === "text")?.text ?? "{}";
  const parsed = JSON.parse(text.replace(/^```(json)?|```$/g, "").trim()) as { subtasks?: string[] };
  return (parsed.subtasks ?? []).slice(0, 7).map((s) => String(s).slice(0, 300));
}

export async function summarizeThread(input: {
  title: string;
  description: string;
  comments: { author: string; body: string }[];
}): Promise<string> {
  const response = await client().messages.create({
    model: "claude-opus-5",
    max_tokens: 1000,
    system:
      "Summarize this task thread for someone catching up: current state, decisions made, open questions, and who owes what. Short sentences. Plain text, max 120 words.",
    messages: [
      {
        role: "user",
        content: [
          `Task: ${input.title}`,
          input.description && `Description: ${input.description.slice(0, 2000)}`,
          `Comments:\n${input.comments.map((c) => `${c.author}: ${c.body.slice(0, 500)}`).join("\n")}`,
        ]
          .filter(Boolean)
          .join("\n\n"),
      },
    ],
  });
  return response.content.find((b) => b.type === "text")?.text?.trim() ?? "";
}
