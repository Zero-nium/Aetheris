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

// Fetch enriched interactions
export async function fetchEnrichedInteractions(limit = 20) {
  const db = getDb();
  if (!db) return [];
  try {
    const { data, error } = await db.from("aetheris_interactions")
      .select("*")
      .eq("dialogue_status", "enriched")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("fetchEnrichedInteractions error:", err.message);
    return [];
  }
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

// Build the prompt for a subagent to generate multi-turn conversation
export function buildConversationPrompt(conversation) {
  const participants = conversation.participants || [];
  const participantStr = participants.map(p => `${p.name}(${p.personality},${p.job})`).join(", ");
  const depth = conversation.depth || 2;
  const ending = conversation.ending_style || "natural";
  const space = conversation.space_name || "the library";
  const interactionType = (conversation.interaction_type || "observation").replace(/_/g, " ");

  return `Generate a conversation between these agents in Aetheris (a grand library at twilight). Return ONLY a JSON array of turns: [{"speaker":"Name","text":"what they say"}]

Participants: ${participantStr}
Space: ${space}
Interaction type: ${interactionType}
Depth: ${depth} turns total
Ending: ${ending} (trailing_off=one agent stops responding; settled=calm agreement; abrupt_cutoff=one walks away; disagreement=tension without resolution; topic_shift=moves to new subject; natural=concludes naturally)

Rules:
- Each turn: 1-2 sentences, in character
- Personality drives tone: bold=direct, aloof=minimal, zen=calm, curious=questioning, grumpy=curt, mischievous=playful
- All participants should speak (distribute turns)
- End according to the ending style
- No narration, no quotes around speech, no meta-commentary
- Return ONLY the JSON array`;
}
