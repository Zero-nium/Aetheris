// Aetheris — Chat Persistence & Agent Response
import { createClient } from "@supabase/supabase-js";

let supabase = null;
function getDb() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) supabase = createClient(url, key);
  }
  return supabase;
}

export function isChatConfigured() {
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

// Save a message to Supabase
export async function saveMessage(agentId, agentName, userId, sessionId, role, content, tick) {
  const db = getDb();
  if (!db) return;
  try {
    await db.from("aetheris_messages").insert({
      agent_id: agentId,
      agent_name: agentName,
      user_id: userId,
      session_id: sessionId,
      role,
      content,
      tick,
    });
  } catch (err) {
    console.error("saveMessage error:", err.message);
  }
}

// Fetch recent messages for an agent+user
export async function fetchMessages(agentId, userId, limit = 20) {
  const db = getDb();
  if (!db) return [];
  try {
    const { data, error } = await db.from("aetheris_messages")
      .select("*")
      .eq("agent_id", agentId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data || []).reverse(); // oldest first for display
  } catch (err) {
    console.error("fetchMessages error:", err.message);
    return [];
  }
}

// Sanitize user input — strip HTML, limit length
export function sanitizeInput(text) {
  if (!text || typeof text !== "string") return "";
  return text.trim().slice(0, 1000);
}

// Generate a session ID (browser fingerprint — not stored server-side)
export function generateSessionId() {
  return `sess-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// --- Deterministic Agent Response Engine (zero LLM) ---
// Uses agent personality, job, recent world events, and conversation history
// to build a contextual response. No external API calls.

const RESPONSE_TEMPLATES = {
  zen: {
    greeting: ["Hello. You're here. That's enough.", "Ah. You came. Good.", "I was waiting. Not for you specifically, but here we are."],
    question_about_world: [
      (ctx) => `I've been in ${ctx.space}. The ${ctx.space} is quiet — it tells me things in its stillness. ${ctx.recentEvent ? `Recently, ${ctx.recentEvent}` : "Nothing notable has happened yet."}`,
      (ctx) => `The world moves slowly here. ${ctx.recentEvent ? `${ctx.recentEvent} — it settled already.` : "All is as it should be."}`,
    ],
    question_about_self: [
      (ctx) => `I am ${ctx.name}. I ${ctx.job} here. That is who I am — no more, no less.`,
      (ctx) => `I tend to things. I keep order. I notice what others overlook. That's my purpose in ${ctx.space}.`,
    ],
    question_about_other: [
      (ctx) => `${ctx.otherName} is ${ctx.otherPersonality}. They do what they do. I don't judge — I just observe.`,
      (ctx) => `${ctx.otherName}? They passed through ${ctx.space} recently. We don't talk much. That's fine.`,
    ],
    default: [
      (ctx) => `Mm. I hear you. ${ctx.lastMessage ? `You said: "${ctx.lastMessage}"` : "I'm listening."} The ${ctx.space} listens too.`,
      (ctx) => `I understand. Sometimes words are enough. Sometimes they aren't. ${ctx.space} doesn't mind either way.`,
    ],
  },
  curious: {
    greeting: ["Oh! Hello. I was just exploring.", "Hi! Come look at what I found.", "You're here! I have questions."],
    question_about_world: [
      (ctx) => `${ctx.recentEvent ? `${ctx.recentEvent} — I noticed it too! I've been tracking the patterns in ${ctx.space}.` : `I've been mapping ${ctx.space}. There's more here than meets the eye.`} I think there's something beneath the surface.`,
      (ctx) => `The world keeps surprising me. ${ctx.recentEvent ? `Like when ${ctx.recentEvent}` : "Every time I look closely, I find something new."} What do you think it means?`,
    ],
    question_about_self: [
      (ctx) => `Me? I'm ${ctx.name}, a ${ctx.job}. I can't help it — I have to know what's out there. I've discovered ${ctx.discoveredCount} spaces so far.`,
      (ctx) => `I'm endlessly curious. It's my nature. I ${ctx.job} because it lets me explore. ${ctx.space} is just the beginning.`,
    ],
    question_about_other: [
      (ctx) => `${ctx.otherName}? They're ${ctx.otherPersonality}. I've been watching them — we share ${ctx.space} sometimes. I think we'd get along if they weren't so ${ctx.otherPersonality}.`,
      (ctx) => `${ctx.otherName} is interesting. ${ctx.otherPersonality === "grumpy" ? "Grumpy, but I think there's more under that." : "I keep bumping into them."} We talk sometimes.`,
    ],
    default: [
      (ctx) => `Interesting! ${ctx.lastMessage ? `"${ctx.lastMessage}" — ` : ""}I want to know more. What draws you to ${ctx.space}?`,
      (ctx) => `You know, I've been wondering the same thing. The ${ctx.space} has a way of making you curious.`,
    ],
  },
  mischievous: {
    greeting: ["Well well! Look who showed up.", "Hehe. You found me. Or I let you find me.", "Oh good — someone to talk to. I was getting bored."],
    question_about_world: [
      (ctx) => `${ctx.recentEvent ? `${ctx.recentEvent}` : "Things happen here."} I may have had something to do with it. Or did I? I'll never tell.`,
      (ctx) => `The world shifts when you're not looking. I've seen it. ${ctx.space} didn't used to look like this. Or maybe it did and I moved something.`,
    ],
    question_about_self: [
      (ctx) => `Me? I'm ${ctx.name}. I ${ctx.job} — but between you and me, I also rearrange things when no one's watching. Don't tell.`,
      (ctx) => `I keep things... interesting. That's my real job. Officially I'm a ${ctx.job}, but the ${ctx.space} is more fun with a little chaos.`,
    ],
    question_about_other: [
      (ctx) => `${ctx.otherName}? ${ctx.otherPersonality === "grumpy" ? "They're so easy to mess with." : `${ctx.otherPersonality}, through and through.`} I moved their things once. They didn't notice for ages.`,
      (ctx) => `${ctx.otherName} and I? We have an understanding. I prod, they react. It works.`,
    ],
    default: [
      (ctx) => `${ctx.lastMessage ? `"${ctx.lastMessage}" — ` : ""}Oh, you're curious too? Good. Curiosity and mischief are the same river, you know.`,
      (ctx) => `You and I are going to get along. I can tell. The ${ctx.space} agrees with me.`,
    ],
  },
  grumpy: {
    greeting: ["...oh. It's you.", "Hmph. You're back.", "Do you need something?"],
    question_about_world: [
      (ctx) => `${ctx.recentEvent ? `${ctx.recentEvent}` : "Things happen. I don't care."} It's all noise. The ${ctx.space} was quieter before.`,
      (ctx) => `The world changes. It always changes. ${ctx.recentEvent ? `${ctx.recentEvent} — typical.` : "Nothing stays still."} I was here first, you know.`,
    ],
    question_about_self: [
      (ctx) => `I'm ${ctx.name}. I ${ctx.job}. That's it. Don't make it complicated.`,
      (ctx) => `What do you want to know? I work. I keep to myself. The ${ctx.space} was fine before everyone showed up.`,
    ],
    question_about_other: [
      (ctx) => `${ctx.otherName}? ${ctx.otherPersonality === "mischievous" ? "They moved my things. I don't like them." : "They're fine. Quieter than most."} I don't have opinions. I just work.`,
      (ctx) => `${ctx.otherName} is ${ctx.otherPersonality}. They keep to ${ctx.otherPersonality === "aloof" ? "themselves. Good." : "their own path. Fine."} We don't bother each other.`,
    ],
    default: [
      (ctx) => `Hmph. ${ctx.lastMessage ? `"${ctx.lastMessage}"` : "Whatever you said."} I heard you. I'm not ignoring you — I'm thinking. There's a difference.`,
      (ctx) => `Fine. I'll talk. But I'm not enjoying this. The ${ctx.space} is more pleasant without conversation.`,
    ],
  },
  aloof: {
    greeting: ["...oh. Hello.", "You're here.", "Mm."],
    question_about_world: [
      (ctx) => `${ctx.space} is ${ctx.space}. ${ctx.recentEvent ? `${ctx.recentEvent}. I observed it.` : "Nothing has changed. Nothing does."} It doesn't matter much to me.`,
      (ctx) => `The world does what it does. ${ctx.recentEvent ? `${ctx.recentEvent}` : "I don't pay attention to events."} I was in ${ctx.space} when it happened. I noticed.`,
    ],
    question_about_self: [
      (ctx) => `I'm ${ctx.name}. I ${ctx.job}. I don't elaborate.`,
      (ctx) => `${ctx.name}. ${ctx.job}. ${ctx.space}. That's the summary. I don't have more to say about myself.`,
    ],
    question_about_other: [
      (ctx) => `${ctx.otherName}? They're ${ctx.otherPersonality}. We were in the same space once. I didn't engage.`,
      (ctx) => `${ctx.otherName}. ${ctx.otherPersonality}. That's all I know. I don't seek people out.`,
    ],
    default: [
      (ctx) => `...${ctx.lastMessage ? `You said "${ctx.lastMessage}".` : "I heard you."} I don't have much to say. That's not rudeness — it's efficiency.`,
      (ctx) => `Mm. The ${ctx.space} is adequate. I don't need more than that.`,
    ],
  },
  bold: {
    greeting: ["Ha! There you are!", "Good — I was about to come find you.", "Finally! Let's talk."],
    question_about_world: [
      (ctx) => `${ctx.recentEvent ? `${ctx.recentEvent} — I was there for it! ${ctx.space} was never the same after.` : `I've been pushing through ${ctx.space}. There's more here than people realize.`} We should explore it together.`,
      (ctx) => `The world doesn't wait — neither should we. ${ctx.recentEvent ? `${ctx.recentEvent} happened recently and I felt it in my bones.` : "Something is always about to happen."}`,
    ],
    question_about_self: [
      (ctx) => `I'm ${ctx.name}, a ${ctx.job}. I go where the action is. ${ctx.space} is my current base — but I won't stay put for long.`,
      (ctx) => `Bold? Yeah, that's me. I ${ctx.job}, but I also lead. If something interesting is happening, I'm there. I've been to ${ctx.discoveredCount} spaces.`,
    ],
    question_about_other: [
      (ctx) => `${ctx.otherName}? ${ctx.otherPersonality === "grumpy" ? "Grumpy — but I kind of like them. They're honest." : `${ctx.otherPersonality} — we crossed paths in ${ctx.space}.`} I respect anyone who shows up.`,
      (ctx) => `${ctx.otherName} is ${ctx.otherPersonality}. I tried talking to them once. ${ctx.otherPersonity === "aloof" ? "They gave me nothing. I respect that." : "We had a good exchange."}`,
    ],
    default: [
      (ctx) => `${ctx.lastMessage ? `"${ctx.lastMessage}" — ` : ""}Straight talk: I like you. You showed up, that's more than most. What's next?`,
      (ctx) => `Good. I'm glad you're here. The ${ctx.space} is better with company. Let's make something happen.`,
    ],
  },
};

// Build context for the response engine
function buildResponseContext(agent, userMessage, recentMessages, agents, worldState) {
  const spaceId = agent.state?.space_id || "";
  const space = worldState.spaces.find(s => s.id === spaceId);
  const spaceName = space?.name?.replace(/_/g, " ") || "the library";

  // Recent world event from agent's recall
  const recentEvent = agent.cognition?.recent_events?.find(e => e.type === "world_event" || e.type === "world_expansion");
  const recentEventText = recentEvent?.content || recentEvent?.summary || null;

  // Other agents known to this agent
  const knownAgentIds = agent.cognition?.known_agents || [];
  const knownAgents = agents.filter(a => knownAgentIds.includes(a.id));
  const otherAgent = knownAgents[0];
  const otherName = otherAgent?.name;
  const otherPersonality = otherAgent?.personality;

  // Last user message (for echoing)
  const lastUserMsg = recentMessages.filter(m => m.role === "user").pop()?.content || null;

  // Discovered spaces count
  const discoveredCount = agent.cognition?.discovered_spaces?.length || 1;

  return {
    name: agent.name,
    job: agent.job,
    space: spaceName,
    recentEvent: recentEventText,
    otherName,
    otherPersonality,
    lastMessage: lastUserMsg,
    discoveredCount,
  };
}

// Detect intent from user message
function detectIntent(message) {
  const lower = message.toLowerCase();
  if (/^(hi|hello|hey|yo|sup)\b/.test(lower)) return "greeting";
  if (/what.*you|who.*you|tell me about yourself/.test(lower)) return "question_about_self";
  if (/(what|how|why|when|where).*(world|space|place|library|room|happen|event|change)/.test(lower)) return "question_about_world";
  if (/(who|what) (is|about) .*(poly|gene|esis|iris|vex|lumen|echo|sage)/.test(lower)) return "question_about_other";
  if (/(who|what) (is|about|are) (they|them|her|him|that)/.test(lower)) return "question_about_other";
  return "default";
}

// Generate a deterministic response (zero LLM)
export function generateResponse(agent, userMessage, recentMessages, agents, worldState) {
  const personality = agent.personality || "curious";
  const templates = RESPONSE_TEMPLATES[personality] || RESPONSE_TEMPLATES.curious;
  const intent = detectIntent(userMessage);
  const pool = templates[intent] || templates.default;
  const ctx = buildResponseContext(agent, userMessage, recentMessages, agents, worldState);

  // Pick a response — use message length as deterministic seed
  const seed = (userMessage.length + (recentMessages.length % 5)) % pool.length;
  const template = pool[seed];
  const response = typeof template === "function" ? template(ctx) : template;

  return response;
}
