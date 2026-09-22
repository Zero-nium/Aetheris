// Aetheris — Tick Loop
// Runs the simulation: world events → agent actions → proximity → log
// =====================================================

import { getWorldState, getAgents, getEventLog, moveAgent, selectAction, getNearbyAgents, generateWorldEvent, processProximityInteractions } from "./simulation.js";
import { accumulateResonance, decayResonance, checkResonanceTriggers, getResonanceState, EXPANSIONS } from "./causality.js";
import { getJob } from "../schema/world.js";
import { saveEvents, saveInteractions, saveAgentStates, saveWorldState, isDbConfigured } from "./persistence.js";
import { enrichEvent } from "./eventContext.js";

let tickCount = 0;
let lastEventTick = 0;

// Convert raw action to natural English
function formatAction(action) {
    const map = {
    organize_shelves: "organizing shelves",
    guide_visitors: "guiding visitors",
    maintain_order: "maintaining order",
    explore: "exploring",
    map_spaces: "mapping spaces",
    discover_passages: "discovering passages",
    tend_plants: "tending plants",
    water_fountain: "watering the fountain",
    watch_sky: "watching the sky",
    read: "reading",
    research: "researching",
    contemplate: "contemplating",
    take_notes: "taking notes",
    wander: "wandering",
    observe: "observing",
    play_music: "playing music",
    debate: "debating",
    rest: "resting",
    idle: "idle",
    sit: "sitting quietly",
    meditate: "meditating",
    question: "asking a question",
    greet: "greeting",
    shelve_books: "shelving books",
    catalog: "cataloguing",
    preserve: "preserving",
    guard_archives: "guarding the archives",
    repair: "repairing",
    organize: "organizing",
    water_plants: "watering the plants",
    prune: "pruning",
    sweep: "sweeping",
    tend_garden: "tending the garden",
    sketch: "sketching",
    write: "writing",
    compose: "composing",
    hum: "humming",
    practice: "practicing",
    listen: "listening",
    reflect: "reflecting",
    pace: "pacing",
    stretch: "stretching",
    nap: "napping",
  };
  return map[action] || action.replace(/_/g, " ");
}

export function runTick() {
  tickCount++;
  const events = [];
  const state = getWorldState();
  const agents = getAgents();

  // 1. World event (every 2-3 ticks)
  if (tickCount - lastEventTick >= 2 + Math.floor(Math.random() * 2)) {
    const event = generateWorldEvent();
    events.push({ type: "world_event", content: event });
    lastEventTick = tickCount;
  }

  // 2. Agent turns (deterministic — no LLM)
  for (const agent of agents) {
    // Maybe move (50% chance)
    if (Math.random() < 0.5) {
      const move = moveAgent(agent);
      if (move.moved) {
        const fromName = state.spaces.find(s => s.id === move.from)?.name || move.from;
        const toName = state.spaces.find(s => s.id === move.to)?.name || move.to;
        events.push({
          type: "agent_move",
          agent_id: agent.id,
          agent_name: agent.name,
          content: `${agent.name} moved from ${fromName} to ${toName}`,
        });
      }
    }

    // Select action
    const action = selectAction(agent);
    agent.stats.actions_taken++;

    // Apply action effects (deterministic)
    if (action !== "idle") {
      const spaceName = state.spaces.find(s => s.id === agent.state.space_id)?.name || "the library";
      const actionText = formatAction(action);
      events.push({
        type: "agent_action",
        agent_id: agent.id,
        agent_name: agent.name,
        action,
        content: `${agent.name} is ${actionText} in ${spaceName}`,
      });
    }

    // Update mood based on action
    const moodMap = {
      read: "sleepy", research: "curious", explore: "curious",
      contemplate: "zen", organize: "content", wander: "indifferent",
      observe: "curious", play_music: "happy", debate: "annoyed",
    };
    if (moodMap[action]) agent.state.mood = moodMap[action];
  }

  // 3. Proximity interactions (deterministic — driven by sociability + extroversion)
  for (const agent of agents) {
    // Decrement cooldown
    if (agent.state.conversation_cooldown > 0) agent.state.conversation_cooldown--;
    const nearby = getNearbyAgents(agent);
    if (nearby.length > 0) {
      const interactionEvents = processProximityInteractions(agent, nearby);
      events.push(...interactionEvents);
    }
  }

  // 4. Update agent cognition — recent events
  for (const agent of agents) {
    const agentEvents = events.filter(e => e.agent_id === agent.id || e.type === "world_event");
    agent.cognition.recent_events = [...agentEvents].slice(-5);
    agent.stats.events_experienced += agentEvents.length;
  }

  // 5. Accumulate resonance from agent actions (butterfly effect)
  for (const agent of agents) {
    if (agent.state.action && agent.state.action !== "idle") {
      accumulateResonance(agent.state.action);
    }
  }

  // 6. Decay resonance (things fade if not sustained)
  decayResonance();

  // 7. Check for world expansion triggers (consequence of accumulated actions)
  const triggers = checkResonanceTriggers();
  for (const trigger of triggers) {
    const templates = EXPANSIONS[trigger.category] || [];
    if (templates.length === 0) continue;
    const template = templates[Math.floor(Math.random() * templates.length)];

    if (template.type === "new_space") {
      const existing = state.spaces.find(s => s.name === template.name);
      if (!existing) {
        const newSpace = {
          id: template.name.toLowerCase().replace(/\s+/g, "_"),
          name: template.name,
          description: template.description,
          connections: template.connections,
          coordinates: template.coordinates,
          size: "medium",
          items: [],
        };
        state.spaces.push(newSpace);
        for (const connId of template.connections) {
          const parent = state.spaces.find(s => s.id === connId);
          if (parent && !parent.connections.includes(newSpace.id)) {
            parent.connections.push(newSpace.id);
          }
        }
        for (const agent of agents) {
          if (!agent.cognition.discovered_spaces.includes(newSpace.id)) {
            agent.cognition.discovered_spaces.push(newSpace.id);
          }
        }
        const imgPrompt = buildEventImagePrompt(`A new space has emerged in the library: ${template.name}. ${template.description}`);
        events.push({
          type: "world_expansion",
          category: trigger.category,
          content: `A new space has emerged: ${template.name}. ${template.description}`,
          space_id: newSpace.id,
          image_prompt: imgPrompt,
          significant: true,
        });
      }
    } else if (template.type === "new_item") {
      const space = state.spaces.find(s => s.id === template.space);
      if (space) {
        const existing = space.items.find(i => i.name === template.item.name);
        if (!existing) {
          space.items.push({ id: `item-${Date.now()}`, ...template.item });
          const imgPrompt = buildEventImagePrompt(`Something new appeared in ${space.name}: ${template.item.name}. The ${space.name.toLowerCase()} of the twilight library.`);
          events.push({
            type: "world_expansion",
            category: trigger.category,
            content: `Something new appeared in ${space.name}: ${template.item.name}`,
            space_id: space.id,
            image_prompt: imgPrompt,
            significant: true,
          });
        }
      }
    }
  }

  // Enrich events with rich scenario context
  const enrichedEvents = events.map(e => enrichEvent(e, agents, state, tickCount));

  // Push all events to the global event log
  const eventLog = getEventLog();
  for (const e of enrichedEvents) {
    eventLog.push(e);
  }

  // Persist to Supabase (fire-and-forget, don't block the tick)
  if (isDbConfigured()) {
    saveEvents(enrichedEvents, tickCount).catch(() => {});
    saveInteractions(enrichedEvents, tickCount).catch(() => {});
    saveAgentStates(agents, tickCount).catch(() => {});
    saveWorldState(state, agents.length, tickCount).catch(() => {});
  }

  return {
    tick: tickCount,
    events: enrichedEvents,
    agentCount: agents.length,
    resonance: getResonanceState(),
    spaceCount: state.spaces.length,
  };
}

export function getTickCount() { return tickCount; }

// Style anchors for event images — consistent across all renders
export const IMAGE_STYLE = "anime style, ethereal atmosphere, soft twilight lighting, cel-shaded, warm golden tones with violet shadows, atmospheric, dreamlike, library setting";
export const IMAGE_NEGATIVE = "text, watermark, people, realistic, 3d render, photorealistic, cluttered, harsh lighting";
export function buildEventImagePrompt(desc) { return `${desc}. ${IMAGE_STYLE}`; }
