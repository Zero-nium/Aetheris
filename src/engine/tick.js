// Aetheris — Tick Loop
// Runs the simulation: world events → agent actions → proximity → log
// =====================================================

import { getWorldState, getAgents, getEventLog, moveAgent, selectAction, getNearbyAgents, generateWorldEvent } from "./simulation.js";
import { getJob } from "../schema/world.js";

let tickCount = 0;
let lastEventTick = 0;

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
        events.push({
          type: "agent_move",
          agent_id: agent.id,
          agent_name: agent.name,
          content: `${agent.name} moved from ${move.from} to ${move.to}`,
        });
      }
    }

    // Select action
    const action = selectAction(agent);
    agent.stats.actions_taken++;

    // Apply action effects (deterministic)
    if (action !== "idle") {
      events.push({
        type: "agent_action",
        agent_id: agent.id,
        agent_name: agent.name,
        action,
        content: `${agent.name} is ${action.replace(/_/g, " ")} in ${state.spaces.find(s => s.id === agent.state.space_id)?.name || "the library"}`,
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

  // 3. Proximity interactions (deterministic check — LLM only if conversation warranted)
  for (const agent of agents) {
    const nearby = getNearbyAgents(agent);
    for (const other of nearby) {
      // Only log proximity events occasionally (20% chance)
      if (Math.random() < 0.2) {
        events.push({
          type: "proximity",
          agents: [agent.name, other.name],
          content: `${agent.name} and ${other.name} are near each other in ${state.spaces.find(s => s.id === agent.state.space_id)?.name || "the library"}`,
        });
        agent.cognition.known_agents = [...new Set([...agent.cognition.known_agents, other.id])];
        other.cognition.known_agents = [...new Set([...other.cognition.known_agents, agent.id])];
      }
    }
  }

  // 4. Update agent cognition — recent events
  for (const agent of agents) {
    const agentEvents = events.filter(e => e.agent_id === agent.id || e.type === "world_event");
    agent.cognition.recent_events = [...agentEvents].slice(-5);
    agent.stats.events_experienced += agentEvents.length;
  }

  return { tick: tickCount, events, agentCount: agents.length };
}

export function getTickCount() { return tickCount; }
