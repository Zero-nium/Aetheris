// Aetheris — Agent Schema (DNA + Job + State)
// ============================================

export const PERSONALITY_TRAITS = [
  "sleepy", "playful", "grumpy", "curious", "aloof",
  "clingy", "mischievous", "zen", "watchful", "adventurous",
];

export const MOODS = ["content", "annoyed", "happy", "sleepy", "curious", "indifferent"];

export function createAgent(dna) {
  return {
    id: dna.id || `agent-${Date.now()}`,
    name: dna.name,
    // Visual DNA (from PolyGenesis)
    visual_dna: dna.visual_dna || {},
    // Personality DNA
    personality_dna: dna.personality_dna || {},
    personality: dna.personality || "curious",
    behavior_traits: dna.behavior_traits || [],
    // Job — drives behavior and emergence
    job: dna.job || "wanderer",
    // State (changes each tick)
    state: {
      space_id: dna.starting_space || "grand_atrium",
      x: dna.x || 50,
      y: dna.y || 50,
      action: "idle",
      mood: "content",
      carrying: null,
      last_event: null,
    },
    // Cognition (short-term memory)
    cognition: {
      recent_events: [],  // last 5 events this agent experienced
      known_agents: [],   // agents they've interacted with
      discovered_spaces: ["grand_atrium"],
    },
    // Stats
    stats: {
      events_experienced: 0,
      spaces_visited: 1,
      conversations_had: 0,
      actions_taken: 0,
    },
  };
}

export function validateAgentDNA(dna) {
  const errors = [];
  if (!dna.name || typeof dna.name !== "string") {
    errors.push("name is required");
  }
  if (dna.job && !JOBS_KEYS.includes(dna.job)) {
    errors.push(`job must be one of: ${JOBS_KEYS.join(", ")}`);
  }
  return { valid: errors.length === 0, errors };
}

import { JOBS } from "./world.js";
const JOBS_KEYS = Object.keys(JOBS);
