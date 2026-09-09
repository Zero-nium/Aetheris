// Aetheris — Simulation Engine (deterministic core)
// ====================================================

import { WORLD_DNA, getJob } from "../schema/world.js";

// --- State ---
let worldState = null;
let agents = [];
let eventLog = [];

export function initWorld() {
  worldState = JSON.parse(JSON.stringify(WORLD_DNA));
  agents = [];
  eventLog = [];
  return { worldState, agents, eventLog };
}

export function getWorldState() { return worldState; }
export function getAgents() { return agents; }
export function getEventLog() { return eventLog; }

export function addAgent(agent) {
  if (agents.length >= worldState.max_agents) return null;
  agents.push(agent);
  return agent;
}

// --- Deterministic Agent Movement ---
// Dimensions (extroversion, curiosity, restlessness) + job → weighted destination
export function moveAgent(agent) {
  const job = getJob(agent.job);
  const dims = agent.dimensions || {};
  const restlessness = dims.restlessness ?? 0.5;
  const curiosity = dims.curiosity ?? 0.5;

  // High restlessness = more likely to move. Low = stays put.
  if (Math.random() > restlessness) return { moved: false };

  const currentSpace = worldState.spaces.find(s => s.id === agent.state.space_id);
  if (!currentSpace) return;

  const destinations = [];
  for (const space of worldState.spaces) {
    let weight = 1;
    // Job preference
    if (job.preferred_spaces.includes(space.id)) weight += 5;
    // Already there — low restlessness agents stay
    if (space.id === agent.state.space_id) weight += (1 - restlessness) * 5;
    // Must be connected to a discovered space
    if (!agent.cognition.discovered_spaces.includes(space.id)) {
      const connected = space.connections.some(c => agent.cognition.discovered_spaces.includes(c));
      if (!connected) continue;
      // Curiosity drives exploration of undiscovered spaces
      weight += curiosity * 5;
    }
    // High curiosity → more weight on new spaces
    if (space.id !== agent.state.space_id && !agent.cognition.discovered_spaces.includes(space.id)) {
      weight += curiosity * 3;
    }
    destinations.push({ space_id: space.id, weight });
  }

  const totalWeight = destinations.reduce((s, d) => s + d.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = destinations[0]?.space_id || currentSpace.id;
  for (const d of destinations) {
    roll -= d.weight;
    if (roll <= 0) { chosen = d.space_id; break; }
  }

  if (chosen !== agent.state.space_id) {
    const newSpace = worldState.spaces.find(s => s.id === chosen);
    agent.state.space_id = chosen;
    agent.state.x = newSpace.coordinates.x + (Math.random() * 10 - 5);
    agent.state.y = newSpace.coordinates.y + (Math.random() * 10 - 5);
    if (!agent.cognition.discovered_spaces.includes(chosen)) {
      agent.cognition.discovered_spaces.push(chosen);
      agent.stats.spaces_visited++;
    }
    agent.stats.actions_taken++;
    return { moved: true, from: currentSpace.id, to: chosen };
  }
  return { moved: false };
}

// --- Deterministic Action Selection ---
// Job behaviors → space-aware + personality-influenced action
export function selectAction(agent) {
  const job = getJob(agent.job);
  const space = worldState.spaces.find(s => s.id === agent.state.space_id);
  const dims = agent.dimensions || {};
  const sociability = dims.sociability ?? 0.3;
  const boldness = dims.boldness ?? 0.4;

  let validBehaviors = [...job.behaviors];

  // Space-aware filtering — gardener can't tend plants in archives
  if (space) {
    if (space.id === "archives" && agent.job === "gardener") {
      validBehaviors = validBehaviors.filter(b => !["tend_plants", "water_fountain", "watch_sky"].includes(b));
      validBehaviors = [...validBehaviors, "observe", "wander"];
    }
    if (space.id === "garden_courtyard" && agent.job === "archivist") {
      validBehaviors = validBehaviors.filter(b => !["catalog", "preserve", "guard_archives"].includes(b));
      validBehaviors = [...validBehaviors, "observe", "wander"];
    }
    if (space.items.length === 0) {
      validBehaviors = validBehaviors.filter(b => !["organize_shelves", "catalog", "repair", "organize"].includes(b));
    }
  }

  if (validBehaviors.length === 0) validBehaviors = ["observe", "idle"];

  // Add idle as fallback, weighted by low boldness
  validBehaviors = [...validBehaviors, "idle"];
  if (boldness < 0.3) validBehaviors.push("idle", "idle");

  // Sociable agents more likely to "observe" (look for others)
  if (sociability > 0.5) validBehaviors.push("observe");

  const action = validBehaviors[Math.floor(Math.random() * validBehaviors.length)];
  agent.state.action = action;
  return action;
}

// --- Proximity & Agent Interaction ---
// Sociability + extroversion → chance to interact with nearby agents
export function getNearbyAgents(agent, radius = 15) {
  return agents.filter(a => {
    if (a.id === agent.id) return false;
    if (a.state.space_id !== agent.state.space_id) return false;
    const dx = a.state.x - agent.state.x;
    const dy = a.state.y - agent.state.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist <= radius;
  });
}

export function processProximityInteractions(agent, nearbyAgents) {
  const dims = agent.dimensions || {};
  const sociability = dims.sociability ?? 0.3;
  const extroversion = dims.extroversion ?? 0.5;
  const events = [];

  for (const other of nearbyAgents) {
    // Cooldown check
    if (agent.state.conversation_cooldown > 0) continue;

    // Interaction chance = sociability * extroversion * 0.4 (max ~40% per tick per pair)
    const interactChance = sociability * extroversion * 0.4;
    if (Math.random() > interactChance) continue;

    // Determine interaction type based on personality
    const interactionTypes = [];
    if (agent.personality === "mischievous") interactionTypes.push("playful_comment", "observation");
    if (agent.personality === "grumpy") interactionTypes.push("curt_remark", "observation");
    if (agent.personality === "curious") interactionTypes.push("question", "observation");
    if (agent.personality === "zen") interactionTypes.push("quiet_acknowledgment");
    if (agent.personality === "clingy") interactionTypes.push("greeting", "observation");
    if (agent.personality === "aloof") interactionTypes.push("brief_nod");
    if (agent.personality === "playful") interactionTypes.push("greeting", "playful_comment");
    if (interactionTypes.length === 0) interactionTypes.push("observation");

    const interaction = interactionTypes[Math.floor(Math.random() * interactionTypes.length)];

    // Build relationship
    if (!agent.cognition.relationships[other.id]) {
      agent.cognition.relationships[other.id] = { affinity: 0, last_interaction: null };
    }
    agent.cognition.relationships[other.id].last_interaction = new Date().toISOString();
    // Affinity shifts based on interaction type
    if (["greeting", "question", "quiet_acknowledgment", "brief_nod"].includes(interaction)) {
      agent.cognition.relationships[other.id].affinity += 0.1;
    }
    if (["playful_comment"].includes(interaction)) {
      agent.cognition.relationships[other.id].affinity += 0.05;
    }

    agent.cognition.known_agents = [...new Set([...agent.cognition.known_agents, other.id])];
    agent.state.conversation_cooldown = 2 + Math.floor(Math.random() * 3);
    agent.stats.conversations_had++;

    events.push({
      type: "agent_interaction",
      agent_id: agent.id,
      agent_name: agent.name,
      target_id: other.id,
      target_name: other.name,
      interaction,
      content: `${agent.name} ${interaction.replace(/_/g, " ")} toward ${other.name}`,
    });
  }
  return events;
}

// --- Event Generation (deterministic) ---
export function generateWorldEvent() {
  const events = [
    "A draft blows through the atrium, scattering loose papers.",
    "The brass globe creaks as it rotates slightly on its axis.",
    "Somewhere in the archives, a shelf groans under old weight.",
    "The fountain in the courtyard sputters, then flows steady.",
    "Light shifts through the stained glass, painting new colors.",
    "A distant sound echoes — perhaps a door, perhaps something else.",
    "The amber lamps in the reading hall flicker once.",
    "Dust motes spiral through a shaft of twilight.",
    "The vines in the courtyard rustle, though there is no wind.",
    "A page turns somewhere in the library, unaided.",
  ];
  const event = events[Math.floor(Math.random() * events.length)];
  eventLog.push({
    id: `evt-${Date.now()}`,
    type: "ambient",
    content: event,
    space_id: null,
    timestamp: new Date().toISOString(),
  });
  return event;
}
