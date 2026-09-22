// Aetheris — Event Context Enrichment
// Every event gets rich scenario context so any agent can recall it
// with shared understanding. Events are history — they actually happened.

let eventCounter = 0;

export function enrichEvent(event, agents, worldState, tickCount) {
  const tick = tickCount;
  const timestamp = new Date().toISOString();
  const eventId = `evt-${tick}-${++eventCounter}`;

  // Who was present in the space where the event happened
  const spaceId = event.space_id || event.agent_a_space;
  const presentAgents = agents
    .filter(a => a.state?.space_id === spaceId)
    .map(a => ({ id: a.id, name: a.name, job: a.job, personality: a.personality }));

  // Which space
  const space = worldState.spaces.find(s => s.id === spaceId);
  const spaceName = space?.name || "the library";
  const spaceDescription = space?.description || "";

  // Build rich context based on event type
  const context = {
    id: eventId,
    tick,
    timestamp,
    type: event.type,
    content: event.content || "",
    space_id: spaceId,
    space_name: spaceName,
    space_description: spaceDescription,
    present_agents: presentAgents,
    image_prompt: event.image_prompt || null,
    image_url: event.image_url || null,
    raw: { ...event },
  };

  // Type-specific enrichment
  if (event.type === "agent_conversation") {
    context.participants = event.participants || [];
    context.depth = event.depth || 2;
    context.ending_style = event.ending_style || "natural";
    context.interaction_type = event.interaction_type;
    context.dialogue = event.dialogue || null;
    context.response = event.response || null;
    context.conversation_id = event.conversation_id;
    context.summary = `${(event.participants || []).map(p => p.name).join(", ")} had a conversation in ${spaceName}.`;
    context.what_changed = `A ${event.depth || 2}-turn conversation occurred in ${spaceName}.`;
    context.why = `Agents in close proximity started talking based on their personalities and recent events.`;
    context.consequence = `Relationships may have shifted. All participants are aware of each other.`;
    context.significance = "moderate";
  } else if (event.type === "world_expansion") {
    context.summary = event.content;
    context.what_changed = event.category
      ? `Resonance in ${event.category} reached its threshold, causing the world to respond.`
      : "The world responded to accumulated activity.";
    context.why = `Agents had been performing actions that accumulated ${event.category || "resonance"} until the world could no longer stay the same.`;
    context.consequence = `A new space or item appeared, expanding the world. Agents may now discover and explore it.`;
    context.significance = "major";
  } else if (event.type === "agent_interaction") {
    context.initiator = {
      id: event.agent_id,
      name: event.agent_name,
      job: agents.find(a => a.id === event.agent_id)?.job,
      personality: agents.find(a => a.id === event.agent_id)?.personality,
    };
    context.recipient = {
      id: event.target_id,
      name: event.target_name,
      job: agents.find(a => a.id === event.target_id)?.job,
      personality: agents.find(a => a.id === event.target_id)?.personality,
    };
    context.interaction_type = event.interaction_type || event.interaction;
    context.dialogue = event.dialogue || null;
    context.response = event.response || null;
    context.summary = `${event.agent_name} spoke to ${event.target_name} in ${spaceName}.`;
    context.what_changed = `A conversation occurred between ${event.agent_name} and ${event.target_name}.`;
    context.why = `${event.agent_name} (${context.initiator.personality}) encountered ${event.target_name} (${context.recipient.personality}) in ${spaceName} and initiated a ${event.interaction_type?.replace(/_/g, " ")}.`;
    context.consequence = `Their relationship may have shifted. Both agents are now aware of each other's presence.`;
    context.significance = "moderate";
  } else if (event.type === "agent_action") {
    const agent = agents.find(a => a.id === event.agent_id);
    context.actor = {
      id: event.agent_id,
      name: event.agent_name,
      job: agent?.job,
      personality: agent?.personality,
    };
    context.action = event.action;
    context.summary = `${event.agent_name} performed ${event.action?.replace(/_/g, " ")} in ${spaceName}.`;
    context.what_changed = `${event.agent_name} was ${event.action?.replace(/_/g, " ")} in ${spaceName}.`;
    context.why = `${event.agent_name} (${agent?.personality}, ${agent?.job}) chose this action based on their personality and the space they were in.`;
    context.consequence = `This action contributed to resonance accumulation, which may eventually trigger world changes.`;
    context.significance = "minor";
  } else if (event.type === "agent_move") {
    const agent = agents.find(a => a.id === event.agent_id);
    context.actor = {
      id: event.agent_id,
      name: event.agent_name,
      job: agent?.job,
      personality: agent?.personality,
    };
    context.from_space = event.content?.match(/from (.+?) to/)?.[1] || "unknown";
    context.to_space = event.content?.match(/to (.+)/)?.[1] || spaceName;
    context.summary = `${event.agent_name} moved from ${context.from_space} to ${context.to_space}.`;
    context.what_changed = `${event.agent_name} relocated to ${context.to_space}.`;
    context.why = `${event.agent_name} (${agent?.personality}) moved based on their restlessness and curiosity, seeking new spaces to explore.`;
    context.consequence = `${event.agent_name} may now encounter agents in ${context.to_space}, and can interact with items there.`;
    context.significance = "minor";
  } else if (event.type === "world_event" || event.type === "ambient") {
    context.summary = event.content;
    context.what_changed = `An ambient event occurred in the world: ${event.content}`;
    context.why = `The world of Aetheris is alive — it breathes, shifts, and responds to the passage of time.`;
    context.consequence = `This is atmosphere — it shapes the mood but doesn't change the structure of the world.`;
    context.significance = "ambient";
  }

  return context;
}

// Build a narrative recall for an agent — how an agent would describe an event
export function buildAgentRecall(event, agent) {
  if (!event || !agent) return null;

  const space = event.space_name || "the library";
  const agentName = agent.name;

  // Agent was present
  const wasPresent = event.present_agents?.some(a => a.id === agent.id);
  // Agent was involved
  const wasInvolved = event.initiator?.id === agent.id || event.recipient?.id === agent.id;
  // Agent heard about it (was in same space)
  const heardAbout = wasPresent || wasInvolved;

  let recall;

  if (event.type === "world_expansion") {
    if (wasPresent) {
      recall = `I was in ${space} when ${event.content}. ${event.why || ""} It was ${event.significance} — the world shifted around us.`;
    } else {
      recall = `I heard about it — ${event.content}. ${event.consequence || ""} I wasn't there, but I felt the world change.`;
    }
  } else if (event.type === "agent_interaction") {
    if (wasInvolved) {
      const isInitiator = event.initiator?.id === agent.id;
      const other = isInitiator ? event.recipient : event.initiator;
      if (event.dialogue && isInitiator) {
        recall = `I said to ${other?.name}: "${event.dialogue}". ${event.response ? `They replied: "${event.response}"` : "They didn't say much back."} It happened in ${space}.`;
      } else if (event.response && !isInitiator) {
        recall = `${event.initiator?.name} spoke to me in ${space}. They said: "${event.dialogue}". I replied: "${event.response}".`;
      } else {
        recall = `I spoke with ${other?.name} in ${space}. ${event.content}`;
      }
    } else if (wasPresent) {
      recall = `I was there when ${event.initiator?.name} spoke to ${event.recipient?.name} in ${space}. ${event.dialogue ? `They said: "${event.dialogue}"` : ""}. It was a ${event.interaction_type?.replace(/_/g, " ")} exchange.`;
    } else {
      recall = `I wasn't there, but I heard that ${event.initiator?.name} and ${event.recipient?.name} spoke in ${space}. Something about ${event.interaction_type?.replace(/_/g, " ")}.`;
    }
  } else if (event.type === "agent_action") {
    if (wasPresent || event.actor?.id === agent.id) {
      recall = `${event.content} I ${event.actor?.id === agent.id ? "was" : "saw " + event.actor?.name + " doing"} that in ${space}.`;
    } else {
      recall = `I think ${event.actor?.name} was doing something in ${space}. ${event.content}`;
    }
  } else if (event.type === "agent_move") {
    recall = event.content;
  } else {
    recall = event.content || event.summary || "";
  }

  return {
    recall,
    was_present: wasPresent,
    was_involved: wasInvolved,
    event_id: event.id,
    tick: event.tick,
    type: event.type,
  };
}
