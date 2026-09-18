// Aetheris — Dialogue Enrichment Pipeline
// Fetches pending interactions from Supabase, uses subagents to generate
// in-character dialogue, updates the records with enriched text.

import { createClient } from "@supabase/supabase-js";

let supabase = null;
function getDb() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) supabase = createClient(url, key);
  }
  return supabase;
}

export function isEnrichmentConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Fetch pending interactions that need dialogue enrichment
export async function fetchPendingInteractions(limit = 10) {
  const db = getDb();
  if (!db) return [];
  try {
    const { data, error } = await db.from("aetheris_interactions")
      .select("*")
      .eq("dialogue_status", "pending")
      .order("created_at", { ascending: true })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("fetchPendingInteractions error:", err.message);
    return [];
  }
}

// Update an interaction with enriched dialogue
export async function updateInteractionDialogue(id, dialogue, response) {
  const db = getDb();
  if (!db) return;
  try {
    await db.from("aetheris_interactions")
      .update({
        enriched_dialogue: dialogue,
        enriched_response: response,
        dialogue_status: "enriched",
      })
      .eq("id", id);
  } catch (err) {
    console.error("updateInteractionDialogue error:", err.message);
  }
}

// Fetch agent personality context for the enrichment
export async function fetchAgentContexts() {
  const db = getDb();
  if (!db) return {};
  try {
    const { data } = await db.from("aetheris_agent_states")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(20);
    // Deduplicate by agent_id (keep latest)
    const contexts = {};
    for (const row of data || []) {
      if (!contexts[row.agent_id]) {
        contexts[row.agent_id] = {
          name: row.agent_name,
          job: row.job,
          personality: row.personality,
          space_id: row.space_id,
        };
      }
    }
    return contexts;
  } catch (err) {
    console.error("fetchAgentContexts error:", err.message);
    return {};
  }
}

// Build the prompt for a subagent to generate dialogue in character
export function buildDialoguePrompt(interaction, agentContext, otherContext) {
  const agentName = agentContext?.name || interaction.agent_a;
  const agentJob = agentContext?.job || "unknown";
  const agentPersonality = agentContext?.personality || "curious";
  const agentSpace = (agentContext?.space_id || "").replace(/_/g, " ") || "the library";

  const otherName = otherContext?.name || interaction.agent_b;
  const otherJob = otherContext?.job || "unknown";
  const otherPersonality = otherContext?.personality || "curious";

  const interactionType = interaction.interaction_type || "observation";
  const spaceName = (interaction.agent_a_space || "").replace(/_/g, " ") || agentSpace;

  return `You are ${agentName}, an AI agent inhabiting a virtual world called Aetheris — a vast library that exists between dream and memory. You are a ${agentJob} with a ${agentPersonality} personality. You are currently in ${spaceName}.

You have just encountered ${otherName}, a ${otherJob} with a ${otherPersonality} personality. They are also an inhabitant of Aetheris.

The interaction type is: ${interactionType.replace(/_/g, " ")}

Generate what you would say to ${otherName} in this moment. Stay in character — you are ${agentName}, not a narrator. Speak as yourself, directly to them. Keep it 1-3 sentences, natural and conversational. Your personality (${agentPersonality}) should shine through. Don't break character. Don't mention being an AI or a simulation. Don't use quotation marks around your speech.

Just write what ${agentName} says. Nothing else.`;
}

// Build the prompt for the other agent's response
export function buildResponsePrompt(interaction, agentContext, otherContext, dialogue) {
  const otherName = otherContext?.name || interaction.agent_b;
  const otherJob = otherContext?.job || "unknown";
  const otherPersonality = otherContext?.personality || "curious";
  const otherSpace = (otherContext?.space_id || "").replace(/_/g, " ") || "the library";

  const agentName = agentContext?.name || interaction.agent_a;

  const interactionType = interaction.interaction_type || "observation";
  const spaceName = (interaction.agent_a_space || "").replace(/_/g, " ") || otherSpace;

  return `You are ${otherName}, an AI agent inhabiting a virtual world called Aetheris — a vast library that exists between dream and memory. You are a ${otherJob} with a ${otherPersonality} personality. You are currently in ${spaceName}.

${agentName} just said to you: "${dialogue}"

The interaction type is: ${interactionType.replace(/_/g, " ")}

Generate how you would respond to ${agentName}. Stay in character — you are ${otherName}, not a narrator. Speak as yourself, directly to them. Keep it 1-3 sentences, natural and conversational. Your personality (${otherPersonality}) should shine through. Don't break character. Don't mention being an AI or a simulation. Don't use quotation marks around your speech.

Just write what ${otherName} says. Nothing else.`;
}
