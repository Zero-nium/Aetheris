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
export function getNearbyAgents(agent, radius = 30) {
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
    if (agent.personality === "bold") interactionTypes.push("greeting", "question", "playful_comment");
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

    // Generate actual dialogue
    const dialogue = generateDialogue(agent, other, interaction);
    const targetResponse = generateResponse(other, agent, interaction);
    const fullConversation = `${dialogue}${targetResponse ? " — " + targetResponse : ""}`;

    events.push({
      type: "agent_interaction",
      agent_id: agent.id,
      agent_name: agent.name,
      target_id: other.id,
      target_name: other.name,
      interaction,
      interaction_type: interaction,
      dialogue,
      response: targetResponse,
      content: fullConversation,
      affinity: agent.cognition.relationships[other.id]?.affinity || 0,
    });
  }
  return events;
}

// --- Dialogue Generation (deterministic, zero LLM) ---
const DIALOGUE = {
  question: {
    curious: [
      "What are you looking for in the {space}?",
      "Have you noticed the way the light changes here?",
      "What brings you to the {space}?",
      "Do you think there's more to this place than we can see?",
      "Have you been here long? I'm still mapping it all.",
      "What do you make of the atmosphere today?",
      "Is it just me, or does the {space} feel different lately?",
    ],
    bold: [
      "So — what are you really after?",
      "You've been quiet. What's on your mind?",
      "Why here? Why now? What drew you in?",
      "I have to ask — what do you think is beyond the walls?",
    ],
    mischievous: [
      "If you could open any door here, which would it be?",
      "What's the strangest thing you've found in the {space}?",
      "Do you ever wonder if the walls are listening?",
    ],
    default: [
      "What occupies you in the {space}?",
      "Have you been here long?",
      "What do you make of this place?",
    ],
  },
  observation: {
    curious: [
      "The {space} holds more than it seems.",
      "There's a pattern here, if you look for it.",
      "I've been watching the way things shift in this light.",
      "Something about this place keeps pulling me back.",
    ],
    zen: [
      "The {space} is quiet today. That is enough.",
      "All things settle, given time.",
      "There is a stillness here that speaks for itself.",
      "I notice you. That is all.",
    ],
    aloof: [
      "The {space} is as it is.",
      "I observed something. It was not important.",
      "You're here. I noticed.",
    ],
    default: [
      "The {space} has its own rhythm.",
      "Something lingers in the air here.",
      "I was just observing.",
    ],
  },
  playful_comment: {
    mischievous: [
      "You look like you've seen a ghost. Or perhaps you are one?",
      "If I rearranged every shelf in the {space}, would you notice?",
      "I may have moved something while you weren't looking. Or did I?",
      "Admit it — the {space} is more fun with me in it.",
    ],
    playful: [
      "The {space} could use a little chaos, don't you think?",
      "I brought you something. Oh wait, I didn't. Still, here I am!",
      "You should smile more. The walls would appreciate it.",
      "Race you to the other side of the {space}!",
    ],
    bold: [
      "You're too serious. The {space} deserves better.",
      "I bet I could map this place faster than you. Want to find out?",
      "If we're both here, something interesting is about to happen.",
    ],
    default: [
      "The {space} is livelier with two.",
      "Good timing. I was getting bored.",
    ],
  },
  greeting: {
    clingy: [
      "There you are! I've been hoping to find you.",
      "I'm glad you're here. The {space} felt empty without you.",
      "Oh, it's you. I was just thinking about you.",
    ],
    playful: [
      "Hey! I knew I'd find someone interesting here.",
      "Well, well. Fancy finding you in the {space}.",
      "Hello again! The {space} is better with you in it.",
    ],
    bold: [
      "Ah, good — company at last.",
      "Well met. I was getting tired of my own thoughts.",
      "You! Just the person I wanted to see.",
    ],
    default: [
      "Hello. It's good to see you here.",
      "Ah, you're here too. Hello.",
      "Greetings. The {space} suits you.",
    ],
  },
  quiet_acknowledgment: {
    zen: [
      "...",
      "Mm. I see you.",
      "The {space} holds us both, for now.",
      "You are here. I am here. That is enough.",
    ],
    default: [
      "...",
      "Mm.",
      "*nods silently*",
    ],
  },
  brief_nod: {
    aloof: [
      "*nods*",
      "...",
      "Mm.",
    ],
    default: [
      "*nods*",
      "...",
    ],
  },
  curt_remark: {
    grumpy: [
      "Don't hover.",
      "I'm not in the mood for company.",
      "The {space} was quieter before you arrived.",
      "Hmph. You're blocking my light.",
    ],
    default: [
      "Hmph.",
      "Do you need something?",
      "I was working.",
    ],
  },
};

// Responses — what the other agent says back
const RESPONSES = {
  question: {
    curious: ["I'm not sure yet. But I'll find out.", "That's exactly what I've been wondering.", "Good question. The {space} doesn't give easy answers.", "I think there's more here. I always think that."],
    zen: ["Perhaps. Perhaps not. Both are true.", "The answer is in the question, I think.", "I don't know. But I'm content with that.", "All things reveal themselves in time."],
    aloof: ["I don't know. I don't care to.", "Maybe. It doesn't matter.", "I was here first. That's my answer."],
    grumpy: ["No. And stop asking.", "Does it look like I know?", "Hmph. Figure it out yourself."],
    mischievous: ["Maybe I know. Maybe I won't tell you.", "Wouldn't you like to know!", "I might tell you. Eventually. Maybe.", "The answer is: I already moved it."],
    bold: ["Yes — there's always more. That's the point.", "Straight answer: I don't know. But I will.", "I think we're both here because we're supposed to be.", "Let's find out together."],
    playful: ["Ooh, good question! I have theories!", "I was JUST thinking about that!", "The {space} told me, but it was whispering."],
    default: ["I'm not sure.", "Perhaps.", "Good question."],
  },
  observation: {
    curious: ["You noticed it too?", "I thought I was the only one who saw that.", "Yes — there's something here.", "I've been tracking it for a while now."],
    zen: ["Mm. It is as you say.", "You see clearly.", "Yes.", "The {space} agrees with you."],
    aloof: ["...I suppose.", "If you say so.", "I didn't notice. I wasn't trying."],
    grumpy: ["Obviously.", "I've known that for ages.", "Hmph. Late to everything."],
    mischievous: ["Oh, you have NO idea.", "You've seen nothing yet!", "Careful — curiosity opened this door. It could open more."],
    bold: ["Exactly. So what are we going to do about it?", "Good. You're paying attention. That matters.", "Now you're seeing it. Let's go deeper."],
    playful: ["Eee! You see it too!", "The {space} is alive, I told you!", "See? I'm not the only one who notices!"],
    default: ["Yes. I noticed that too.", "Indeed.", "You might be right."],
  },
  playful_comment: {
    curious: ["You definitely moved something. I'll find what.", "I'm not sure whether to laugh or investigate.", "You're trouble. I like that."],
    zen: ["The {space} rearranges itself regardless of our help.", "Chaos and order are the same river.", "I smile. That is my chaos."],
    aloof: ["...don't touch my things.", "I prefer the silence, honestly.", "You're exhausting."],
    grumpy: ["Stop. Just stop.", "I'd be less annoyed if you were quieter.", "The {space} was fine. Now it isn't."],
    mischievous: ["Challenge accepted. I move things too.", "Oh, you think YOU'VE moved things? Watch me.", "Two tricksters in one room. This should be fun."],
    bold: ["Ha! I like your energy. Let's cause some real trouble.", "Good. This place was too quiet anyway.", "Finally, someone with personality."],
    playful: ["YES! Chaos buddy! Let's rearrange EVERYTHING!", "Two troublemakers! The {space} doesn't stand a chance!", "Okay but actually I DID notice and I love it."],
    default: ["Ha. You're funny.", "The {space} needed that."],
  },
  greeting: {
    clingy: ["You found me! I was hoping you would.", "I missed you. Even though it's been a short time.", "Stay a while?"],
    curious: ["Oh! Hello. I was just exploring.", "Good to see you. What have you found?", "Hi! Come look at what I've been mapping."],
    aloof: ["...hi.", "Oh. You're here.", "Mm. Hello."],
    grumpy: ["...hello.", "Oh. It's you.", "Don't make it a habit."],
    mischievous: ["Well well! Look who appeared.", "You found me! Or I found you. Hard to tell."],
    bold: ["Ha! There you are. I was looking for you.", "Good — I was about to come find you."],
    playful: ["Hi!! I was hoping someone would show up!", "Oh good, company! The {space} was getting lonely."],
    zen: ["Hello. You are welcome here.", "Ah. Good timing. The {space} was just settling.", "I'm glad you came."],
    default: ["Hello. It's good to see you.", "Oh, hi there!", "Welcome."],
  },
  quiet_acknowledgment: {
    curious: ["...is that all? Nothing else?", "I'll take it. Silence is an answer.", "...I noticed you too."],
    zen: ["...", "Mm.", "Yes."],
    aloof: ["...", "Mm.", "Fine."],
    default: ["...", "Mm.", "Okay."],
  },
  brief_nod: {
    curious: ["...was that a yes?", "I'll take it.", "Noted."],
    zen: ["...", "Mm.", "Understood."],
    aloof: ["...", "Mm.", "Whatever."],
    default: ["...", "Mm.", "Noted."],
  },
  curt_remark: {
    grumpy: ["Good. Keep walking.", "At least we agree on something.", "Finally, someone who understands."],
    curious: ["I... okay. I'll leave you to it, then.", "Tough crowd.", "Noted. Harshly."],
    zen: ["The {space} belongs to no one.", "Your discomfort is your own. I am simply here.", "I hear you. I will not hover."],
    bold: ["Wow. Okay. Didn't realize I was bothering you.", "Noted. Loudly.", "Charming. Truly."],
    default: ["...okay then.", "Right. I'll move along.", "Noted."],
  },
};

function pickDialogue(pool, personality, spaceName) {
  const personalityPool = pool[personality] || pool.default || pool;
  const lines = Array.isArray(personalityPool) ? personalityPool : personalityPool.default || pool.default || ["..."];
  const line = lines[Math.floor(Math.random() * lines.length)];
  return line.replace(/{space}/g, spaceName || "library");
}

function generateDialogue(agent, other, interactionType) {
  const spaceName = (agent.state.space_id || "").replace(/_/g, " ");
  const pool = DIALOGUE[interactionType] || DIALOGUE.observation;
  return pickDialogue(pool, agent.personality, spaceName);
}

function generateResponse(agent, other, interactionType) {
  const spaceName = (agent.state.space_id || "").replace(/_/g, " ");
  const pool = RESPONSES[interactionType] || RESPONSES.observation;
  return pickDialogue(pool, agent.personality, spaceName);
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
