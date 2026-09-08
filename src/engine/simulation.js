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
// Job + personality traits → weighted destination
export function moveAgent(agent) {
  const job = getJob(agent.job);
  const currentSpace = worldState.spaces.find(s => s.id === agent.state.space_id);
  if (!currentSpace) return;

  // Build weighted list of destinations
  const destinations = [];
  for (const space of worldState.spaces) {
    let weight = 1; // base weight for any space
    // Job preference
    if (job.preferred_spaces.includes(space.id)) weight += 5;
    // Already there — less likely to move
    if (space.id === agent.state.space_id) weight += 3;
    // Discovered spaces only (agent must have been there or adjacent)
    if (!agent.cognition.discovered_spaces.includes(space.id)) {
      // Check if connected to a discovered space
      const connected = space.connections.some(c => agent.cognition.discovered_spaces.includes(c));
      if (!connected) continue; // can't go there
      weight += 2; // novelty bonus for newly discovered
    }
    // Behavior traits influence
    for (const trait of agent.behavior_traits) {
      if (trait === "adventurous" && space.id !== agent.state.space_id) weight += 2;
      if (trait === "sleepy" && space.id === agent.state.space_id) weight += 3;
      if (trait === "curious" && !agent.cognition.discovered_spaces.includes(space.id)) weight += 3;
      if (trait === "clingy" && space.id === agent.state.space_id) weight += 2;
    }
    destinations.push({ space_id: space.id, weight });
  }

  // Weighted random selection
  const totalWeight = destinations.reduce((s, d) => s + d.weight, 0);
  let roll = Math.random() * totalWeight;
  let chosen = destinations[0].space_id;
  for (const d of destinations) {
    roll -= d.weight;
    if (roll <= 0) { chosen = d.space_id; break; }
  }

  // Update agent position
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
// Job behaviors → weighted action
export function selectAction(agent) {
  const job = getJob(agent.job);
  const space = worldState.spaces.find(s => s.id === agent.state.space_id);
  const behaviors = job.behaviors;
  // Filter behaviors valid for current space
  let validBehaviors = behaviors;
  if (space && space.items.length === 0) {
    // No items to interact with — remove item-based behaviors
    validBehaviors = behaviors.filter(b => !b.includes("organize") && !b.includes("catalog") && !b.includes("repair"));
  }
  if (validBehaviors.length === 0) validBehaviors = ["idle", "observe"];
  // Add idle as fallback
  validBehaviors = [...validBehaviors, "idle", "idle"];
  // Weight by personality
  if (agent.personality === "sleepy") validBehaviors.push("idle", "idle");
  if (agent.personality === "playful") validBehaviors.push("explore", "wander");
  if (agent.personality === "curious") validBehaviors.push("explore", "observe");
  const action = validBehaviors[Math.floor(Math.random() * validBehaviors.length)];
  agent.state.action = action;
  return action;
}

// --- Proximity Check ---
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
