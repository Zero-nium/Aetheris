// Aetheris — Supabase Persistence Layer
import { createClient } from "@supabase/supabase-js";

let supabase = null;

function getDb() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      supabase = createClient(url, key);
    }
  }
  return supabase;
}

export function isDbConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
export async function saveEvents(events, tick) {
  const db = getDb();
  if (!db) return;
  const rows = events.map(e => ({
    tick,
    type: e.type,
    content: e.content || "",
    agent_name: e.agent_name || e.agents?.join(", ") || null,
    space_id: e.space_id || null,
    image_url: e.image_url || null,
    image_prompt: e.image_prompt || null,
  }));
  try {
    await db.from("aetheris_events").insert(rows);
  } catch (err) {
    console.error("saveEvents error:", err.message);
  }
}

// Save interactions to Supabase
export async function saveInteractions(events, tick) {
  const db = getDb();
  if (!db) return;
  const interactions = events.filter(e => e.type === "agent_interaction");
  if (!interactions.length) return;
  const rows = interactions.map(e => ({
    tick,
    agent_a: e.agent_name || e.agents?.[0] || null,
    agent_b: e.target_agent || e.agents?.[1] || null,
    interaction_type: e.interaction_type || "observation",
    agent_a_space: e.agent_a_space || null,
    agent_b_space: e.agent_b_space || null,
    content: e.content || "",
    affinity: e.affinity || 0,
  }));
  try {
    await db.from("aetheris_interactions").insert(rows);
  } catch (err) {
    console.error("saveInteractions error:", err.message);
  }
}

// Save agent state snapshot
export async function saveAgentStates(agents, tick) {
  const db = getDb();
  if (!db) return;
  const rows = agents.map(a => ({
    agent_id: a.id,
    agent_name: a.name,
    tick,
    space_id: a.state?.space_id || null,
    action: a.state?.action || null,
    mood: a.state?.mood || null,
    job: a.job || null,
    personality: a.personality || null,
    known_agents: Array.from(a.cognition?.known_agents || []),
    discovered_spaces: Array.from(a.cognition?.discovered_spaces || []),
    conversations_had: a.stats?.conversations_had || 0,
    affinity_map: a.relationships || {},
  }));
  try {
    await db.from("aetheris_agent_states").insert(rows);
  } catch (err) {
    console.error("saveAgentStates error:", err.message);
  }
}

// Save world state snapshot
export async function saveWorldState(state, agentCount, tick) {
  const db = getDb();
  if (!db) return;
  try {
    await db.from("aetheris_world_states").insert({
      tick,
      spaces: state.spaces,
      resonance: state.resonance || {},
      agent_count: agentCount,
      space_count: state.spaces.length,
    });
  } catch (err) {
    console.error("saveWorldState error:", err.message);
  }
}

// Fetch events from Supabase (with pagination)
export async function fetchEvents(limit = 50, offset = 0, type = null) {
  const db = getDb();
  if (!db) return [];
  let query = db.from("aetheris_events").select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
  if (type) query = query.eq("type", type);
  try {
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("fetchEvents error:", err.message);
    return [];
  }
}

// Fetch interactions from Supabase
export async function fetchInteractions(limit = 50, offset = 0) {
  const db = getDb();
  if (!db) return [];
  try {
    const { data, error } = await db.from("aetheris_interactions")
      .select("*").order("created_at", { ascending: false }).range(offset, offset + limit - 1);
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("fetchInteractions error:", err.message);
    return [];
  }
}

// Fetch latest world state
export async function fetchLatestWorldState() {
  const db = getDb();
  if (!db) return null;
  try {
    const { data, error } = await db.from("aetheris_world_states")
      .select("*").order("created_at", { ascending: false }).limit(1);
    if (error) throw error;
    return data?.[0] || null;
  } catch (err) {
    console.error("fetchLatestWorldState error:", err.message);
    return null;
  }
}

// Fetch latest agent states
export async function fetchLatestAgentStates() {
  const db = getDb();
  if (!db) return [];
  try {
    const { data, error } = await db.from("aetheris_agent_states")
      .select("*").order("created_at", { ascending: false }).limit(20);
    if (error) throw error;
    // Deduplicate by agent_id (keep latest)
    const seen = new Map();
    for (const row of data || []) {
      if (!seen.has(row.agent_id)) seen.set(row.agent_id, row);
    }
    return Array.from(seen.values());
  } catch (err) {
    console.error("fetchLatestAgentStates error:", err.message);
    return [];
  }
}
