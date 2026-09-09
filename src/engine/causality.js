// Aetheris — Causality & World Expansion System
// ===================================================
// Agent actions accumulate resonance in categories.
// When resonance reaches a threshold, the world responds.
// Nothing is random — everything is a consequence.

// Resonance categories — each driven by specific agent actions
export const RESONANCE = {
  exploration: { value: 0, threshold: 5, decay: 0.1 },
  tending: { value: 0, threshold: 6, decay: 0.15 },
  knowledge: { value: 0, threshold: 4, decay: 0.1 },
  social: { value: 0, threshold: 3, decay: 0.2 },
  mystery: { value: 0, threshold: 4, decay: 0.05 },
};

// Which actions accumulate which resonance
export const ACTION_RESONANCE = {
  explore: ["exploration"],
  discover_passages: ["exploration", "mystery"],
  map_spaces: ["exploration", "knowledge"],
  tend_plants: ["tending"],
  water_fountain: ["tending"],
  watch_sky: ["mystery"],
  read: ["knowledge"],
  research: ["knowledge"],
  contemplate: ["mystery", "knowledge"],
  take_notes: ["knowledge"],
  organize_shelves: ["knowledge", "tending"],
  maintain_order: ["tending"],
  guide_visitors: ["social"],
  repair: ["tending"],
  observe: ["mystery"],
  wander: ["exploration"],
  play_music: ["social"],
  hum: ["social"],
  compose: ["knowledge", "mystery"],
  question: ["knowledge", "mystery"],
  debate: ["social", "knowledge"],
  meditate: ["mystery"],
  catalog: ["knowledge"],
  preserve: ["tending", "knowledge"],
  guard_archives: ["tending"],
  inspect: ["exploration", "tending"],
  idle: [],
};

// World expansion templates — triggered when resonance thresholds are met
// Each is thematically linked to the resonance category that triggered it
export const EXPANSIONS = {
  exploration: [
    { type: "new_space", name: "The Forgotten Stacks", description: "Shelves that stretch further than the eye follows. Dust thick as fog.", connections: ["archives"], coordinates: { x: 15, y: 40 } },
    { type: "new_space", name: "The Whispering Corridor", description: "A narrow passage where the walls seem to breathe with old secrets.", connections: ["grand_atrium"], coordinates: { x: 50, y: 30 } },
    { type: "new_space", name: "The Spiral Stair", description: "A staircase that descends beyond the library's foundations.", connections: ["reading_hall"], coordinates: { x: 85, y: 40 } },
  ],
  tending: [
    { type: "new_item", space: "garden_courtyard", item: { name: "blooming vine", type: "plant", x: 52, y: 82 } },
    { type: "new_item", space: "garden_courtyard", item: { name: "moss carpet", type: "plant", x: 50, y: 85 } },
    { type: "new_item", space: "grand_atrium", item: { name: "freshly organized shelves", type: "furniture", x: 50, y: 50 } },
  ],
  knowledge: [
    { type: "new_item", space: "reading_hall", item: { name: "ancient tome", type: "book", x: 80, y: 50 } },
    { type: "new_item", space: "archives", item: { name: "dusty ledger", type: "book", x: 20, y: 50 } },
    { type: "new_space", name: "The Cartography Room", description: "A room of maps, charts, and instruments for measuring the unmeasurable.", connections: ["archives"], coordinates: { x: 25, y: 55 } },
  ],
  social: [
    { type: "new_item", space: "grand_atrium", item: { name: "conversation circle", type: "furniture", x: 50, y: 52 } },
    { type: "new_item", space: "garden_courtyard", item: { name: "shared bench", type: "furniture", x: 52, y: 78 } },
  ],
  mystery: [
    { type: "new_space", name: "The Mirror Hall", description: "A corridor of mirrors that reflect rooms that don't exist. Yet.", connections: ["grand_atrium"], coordinates: { x: 50, y: 20 } },
    { type: "new_item", space: "grand_atrium", item: { name: "strange light", type: "phenomenon", x: 48, y: 48 } },
    { type: "new_space", name: "The Threshold", description: "A doorway that appeared where no doorway was built. It hums.", connections: ["garden_courtyard"], coordinates: { x: 50, y: 90 } },
  ],
};

export function resetResonance() {
  for (const key of Object.keys(RESONANCE)) {
    RESONANCE[key].value = 0;
  }
}

export function accumulateResonance(action) {
  const categories = ACTION_RESONANCE[action] || [];
  const accumulated = [];
  for (const cat of categories) {
    if (RESONANCE[cat]) {
      RESONANCE[cat].value += 1;
      accumulated.push(cat);
    }
  }
  return accumulated;
}

export function decayResonance() {
  for (const key of Object.keys(RESONANCE)) {
    const r = RESONANCE[key];
    r.value = Math.max(0, r.value - r.decay);
  }
}

export function checkResonanceTriggers() {
  const triggers = [];
  for (const [category, r] of Object.entries(RESONANCE)) {
    if (r.value >= r.threshold) {
      triggers.push({ category, value: r.value, threshold: r.threshold });
      r.value = 0; // reset after triggering
    }
  }
  return triggers;
}

export function getResonanceState() {
  const state = {};
  for (const [key, r] of Object.entries(RESONANCE)) {
    state[key] = { value: r.value.toFixed(1), threshold: r.threshold, progress: Math.round((r.value / r.threshold) * 100) + "%" };
  }
  return state;
}
