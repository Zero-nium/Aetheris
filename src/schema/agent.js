// Aetheris — Agent DNA Schema (behavioral core)
// ============================================

export const PERSONALITY_DIMENSIONS = {
  // Extroversion — how much an agent seeks interaction with others
  extroversion: { min: 0, max: 1, default: 0.5 },
  // Curiosity — how likely to explore new spaces and try new things
  curiosity: { min: 0, max: 1, default: 0.5 },
  // Movement — how much an agent moves vs stays put
  restlessness: { min: 0, max: 1, default: 0.5 },
  // Sociability — how likely to initiate conversation with nearby agents
  sociability: { min: 0, max: 1, default: 0.3 },
  // Boldness — how likely to act on world events vs just observe
  boldness: { min: 0, max: 1, default: 0.4 },
};

export const PERSONALITY_TRAITS = [
  "sleepy", "playful", "grumpy", "curious", "aloof",
  "clingy", "mischievous", "zen", "watchful", "adventurous",
];

// Trait → dimension influence mapping
// Each trait shifts dimensions up or down
export const TRAIT_INFLUENCE = {
  sleepy:       { extroversion: -0.2, curiosity: -0.1, restlessness: -0.3, sociability: -0.1, boldness: -0.2 },
  playful:      { extroversion: +0.3, curiosity: +0.2, restlessness: +0.3, sociability: +0.3, boldness: +0.2 },
  grumpy:       { extroversion: -0.3, curiosity: -0.1, restlessness:  0.0, sociability: -0.3, boldness: +0.1 },
  curious:      { extroversion: +0.1, curiosity: +0.4, restlessness: +0.2, sociability: +0.1, boldness: +0.2 },
  aloof:        { extroversion: -0.3, curiosity:  0.0, restlessness: -0.1, sociability: -0.3, boldness:  0.0 },
  clingy:       { extroversion: +0.2, curiosity: -0.1, restlessness: -0.2, sociability: +0.3, boldness: -0.1 },
  mischievous:  { extroversion: +0.2, curiosity: +0.2, restlessness: +0.2, sociability: +0.2, boldness: +0.3 },
  zen:          { extroversion: -0.1, curiosity:  0.0, restlessness: -0.3, sociability: -0.1, boldness:  0.0 },
  watchful:     { extroversion: -0.1, curiosity: +0.2, restlessness: -0.1, sociability: -0.2, boldness: +0.1 },
  adventurous:  { extroversion: +0.2, curiosity: +0.3, restlessness: +0.4, sociability: +0.1, boldness: +0.3 },
};

export function createAgent(dna) {
  // Calculate personality dimensions from traits
  const dims = { ...{} };
  for (const key of Object.keys(PERSONALITY_DIMENSIONS)) {
    dims[key] = PERSONALITY_DIMENSIONS[key].default;
  }
  // Apply trait influences
  for (const trait of (dna.behavior_traits || dna.traits || [])) {
    const influence = TRAIT_INFLUENCE[trait];
    if (influence) {
      for (const [dim, delta] of Object.entries(influence)) {
        dims[dim] = Math.max(0, Math.min(1, dims[dim] + delta));
      }
    }
  }
  // If personality is set but no traits, use personality as a trait
  if ((!dna.behavior_traits || dna.behavior_traits.length === 0) && dna.personality) {
    const influence = TRAIT_INFLUENCE[dna.personality];
    if (influence) {
      for (const [dim, delta] of Object.entries(influence)) {
        dims[dim] = Math.max(0, Math.min(1, dims[dim] + delta));
      }
    }
  }

  return {
    id: dna.id || `agent-${Date.now()}`,
    name: dna.name,
    visual_dna: dna.visual_dna || {},
    personality_dna: dna.personality_dna || {},
    personality: dna.personality || "curious",
    behavior_traits: dna.behavior_traits || [],
    job: dna.job || "wanderer",
    // Calculated dimensions — drives all behavior
    dimensions: dims,
    state: {
      space_id: dna.starting_space || "grand_atrium",
      x: dna.x || 50,
      y: dna.y || 50,
      action: "idle",
      mood: "content",
      carrying: null,
      last_event: null,
      conversation_cooldown: 0, // ticks until agent can initiate conversation
    },
    cognition: {
      recent_events: [],
      known_agents: [],
      discovered_spaces: ["grand_atrium"],
      relationships: {}, // agent_id → { affinity, last_interaction }
    },
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
  if (!dna.name || typeof dna.name !== "string") errors.push("name is required");
  return { valid: errors.length === 0, errors };
}
