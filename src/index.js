// Aetheris — API Server
// ======================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

import { initWorld, getWorldState, getAgents, getEventLog, addAgent } from "./engine/simulation.js";
import { createAgent, validateAgentDNA } from "./schema/agent.js";
import { runTick, getTickCount } from "./engine/tick.js";
import { fetchEvents, fetchInteractions, fetchLatestAgentStates, isDbConfigured } from "./engine/persistence.js";
import { buildAgentRecall } from "./engine/eventContext.js";
import { buildRenderPrompt } from "./schema/visualDNA.js";

const app = express();
app.use(cors());
app.use(express.json());

// Initialize world on boot
initWorld();

// --- Seed initial agents ---
const seedAgents = [
  { id: "agent-poly", name: "Poly", job: "librarian", personality: "zen", behavior_traits: ["sleepy", "watchful", "zen", "clingy", "curious"], starting_space: "grand_atrium" },
  { id: "agent-gene", name: "Gene", job: "cartographer", personality: "curious", behavior_traits: ["curious", "adventurous", "watchful", "playful", "mischievous"], starting_space: "archives" },
  { id: "agent-esis", name: "Esis", job: "gardener", personality: "aloof", behavior_traits: ["sleepy", "aloof", "curious", "zen", "clingy"], starting_space: "garden_courtyard" },
];
for (const seed of seedAgents) {
  const agent = createAgent(seed);
  addAgent(agent);
}

// --- API Routes ---

// Resonance state (causality)
import { getResonanceState } from "./engine/causality.js";
import { buildEventImagePrompt, IMAGE_STYLE, IMAGE_NEGATIVE } from "./engine/tick.js";
import fs from "fs";

// Health
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", tick: getTickCount(), agents: getAgents().length, spaces: getWorldState().spaces.length, resonance: getResonanceState() });
});

// Resonance
app.get("/api/resonance", (_req, res) => {
  res.json({ resonance: getResonanceState() });
});

// World state
app.get("/api/world", (_req, res) => {
  const world = getWorldState();
  res.json({
    name: world.name,
    description: world.description,
    atmosphere: world.atmosphere,
    spaces: world.spaces.map(s => ({
      id: s.id, name: s.name, description: s.description,
      connections: s.connections, coordinates: s.coordinates, size: s.size,
      item_count: s.items.length,
    })),
    agents: getAgents().map(a => ({
      id: a.id, name: a.name, job: a.job, personality: a.personality,
      space_id: a.state.space_id, x: a.state.x, y: a.state.y,
      action: a.state.action, mood: a.state.mood,
    })),
    max_agents: world.max_agents,
  });
});

// Event log (news feed)
app.get("/api/events", (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const log = getEventLog();
  res.json({ events: log.slice(-limit).reverse(), tick: getTickCount() });
});

// Agents
app.get("/api/agents", (_req, res) => {
  res.json({ agents: getAgents() });
});

app.get("/api/agents/:id", (req, res) => {
  const agent = getAgents().find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  res.json({ agent });
});

// Create agent
app.post("/api/agents", (req, res) => {
  const validation = validateAgentDNA(req.body);
  if (!validation.valid) return res.status(400).json({ error: "Invalid DNA", details: validation.errors });
  const agent = createAgent(req.body);
  const created = addAgent(agent);
  if (!created) return res.status(403).json({ error: `World is at capacity (${getWorldState().max_agents} max)` });
  res.json({ success: true, agent });
});

// Run tick
app.post("/api/tick", (_req, res) => {
  const result = runTick();
  res.json(result);
});

// Run multiple ticks
app.post("/api/ticks/:count", (req, res) => {
  const count = Math.min(parseInt(req.params.count) || 1, 100);
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(runTick());
  }
  res.json({ ticks: results, count });
});

// --- Persistence endpoints ---

// History (persisted events from Supabase)
app.get("/api/history/events", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  const type = req.query.type || null;
  if (!isDbConfigured()) return res.json({ events: [], message: "DB not configured" });
  const events = await fetchEvents(limit, offset, type);
  res.json({ events, count: events.length });
});

// History (persisted interactions)
app.get("/api/history/interactions", async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  if (!isDbConfigured()) return res.json({ interactions: [], message: "DB not configured" });
  const interactions = await fetchInteractions(limit, offset);
  res.json({ interactions, count: interactions.length });
});

// History (persisted agent states)
app.get("/api/history/agents", async (_req, res) => {
  if (!isDbConfigured()) return res.json({ agents: [], message: "DB not configured" });
  const agents = await fetchLatestAgentStates();
  res.json({ agents, count: agents.length });
});

// Agent recall — how an agent would describe an event
app.get("/api/agents/:id/recall", async (req, res) => {
  const agentId = req.params.id;
  const limit = Math.min(parseInt(req.query.limit) || 10, 50);
  if (!isDbConfigured()) return res.json({ recalls: [], message: "DB not configured" });
  const events = await fetchEvents(limit * 3);
  const agents = getAgents();
  const agent = agents.find(a => a.id === agentId);
  if (!agent) return res.status(404).json({ error: "Agent not found" });
  const recalls = events
    .filter(e => e.type === "world_expansion" || e.type === "agent_interaction" || e.type === "world_event")
    .map(e => buildAgentRecall(e, agent))
    .filter(Boolean);
  res.json({ agent: agent.name, recalls: recalls.slice(0, limit) });
});

// Generate avatar for an agent — uses Fal.ai with the agent's visual DNA
app.post("/api/agents/:id/generate-avatar", async (req, res) => {
  const agents = getAgents();
  const agent = agents.find(a => a.id === req.params.id);
  if (!agent) return res.status(404).json({ error: "Agent not found" });

  const imageKey = process.env.IMAGE_API_KEY;
  if (!imageKey) return res.json({ url: null, message: "Image generation not configured" });

  const prompt = buildRenderPrompt(agent.visual_dna);
  const fsModule = await import("fs");
  const fs = fsModule.default || fsModule;
  const imgDir = path.join(__dirname, "..", "public", "images");

  try {
    // Submit to Fal.ai
    const submitRes = await fetch("https://queue.fal.run/fal-ai/fast-sdxl", {
      method: "POST",
      headers: { "Authorization": `Key ${imageKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image_size: "portrait_4_3", num_inference_steps: 25 }),
    });
    const submitData = await submitRes.json();
    if (!submitData.request_id) return res.status(500).json({ error: "Fal.ai submit failed", detail: submitData });

    // Poll for completion
    let attempts = 0;
    let status = "IN_QUEUE";
    while (status === "IN_QUEUE" || status === "IN_PROGRESS") {
      if (attempts++ > 30) return res.status(504).json({ error: "Image generation timeout" });
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(`https://queue.fal.run/fal-ai/fast-sdxl/requests/${submitData.request_id}/status`, {
        headers: { "Authorization": `Key ${imageKey}` },
      });
      const statusData = await statusRes.json();
      status = statusData.status;
    }

    // Get result
    const resultRes = await fetch(`https://queue.fal.run/fal-ai/fast-sdxl/requests/${submitData.request_id}`, {
      headers: { "Authorization": `Key ${imageKey}` },
    });
    const resultData = await resultRes.json();

    const imageUrl = resultData.images?.[0]?.url;
    if (!imageUrl) return res.status(500).json({ error: "No image returned" });

    // Download and save locally
    const imgRes = await fetch(imageUrl);
    const imgBuffer = await imgRes.arrayBuffer();
    const imagesDir = imgDir;
    if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });
    const filename = `avatar-${agent.id}.png`;
    const filepath = path.join(imagesDir, filename);
    fs.writeFileSync(filepath, Buffer.from(imgBuffer));

    // Set avatar URL on agent
    agent.avatar_url = `/images/${filename}`;

    res.json({ url: agent.avatar_url, prompt: prompt.substring(0, 200) + "..." });
  } catch (err) {
    res.status(500).json({ error: "Avatar generation failed", detail: err.message });
  }
});

const PORT = process.env.PORT || 3001;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Image generation endpoint — generates event images on demand
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const imageKey = process.env.IMAGE_API_KEY;
    if (!imageKey) {
      return res.json({ url: null, prompt, message: "Image generation not configured" });
    }

    // Submit to Fal.ai queue
    const submitResponse = await fetch("https://queue.fal.run/fal-ai/fast-sdxl", {
      method: "POST",
      headers: {
        "Authorization": `Key ${imageKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: prompt,
        negative_prompt: IMAGE_NEGATIVE,
        image_size: "landscape_16_9",
        num_inference_steps: 25,
      }),
    });

    if (!submitResponse.ok) {
      const errBody = await submitResponse.text();
      return res.status(500).json({ error: `Fal.ai submit error: ${submitResponse.status}`, detail: errBody });
    }

    const submitData = await submitResponse.json();
    const requestId = submitData.request_id;
    const statusUrl = submitData.status_url;
    const responseUrl = submitData.response_url;

    // Poll for completion (max 30 seconds)
    let imageUrl = null;
    for (let i = 0; i < 60; i++) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const statusResponse = await fetch(statusUrl, {
        headers: { "Authorization": `Key ${imageKey}` },
      });
      const statusData = await statusResponse.json();
      
      if (statusData.status === "COMPLETED") {
        const resultResponse = await fetch(responseUrl, {
          headers: { "Authorization": `Key ${imageKey}` },
        });
        const resultData = await resultResponse.json();
        imageUrl = resultData.images?.[0]?.url;
        break;
      }
      if (statusData.status === "FAILED" || statusData.status === "ERROR") {
        return res.status(500).json({ error: "Image generation failed", detail: statusData });
      }
    }

    if (!imageUrl) {
      return res.status(504).json({ error: "Image generation timed out" });
    }

    // Download and save locally
    const imgResponse = await fetch(imageUrl);
    const buffer = await imgResponse.arrayBuffer();
    const imgDir = path.join(__dirname, "../public/images");
    if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
    const filename = `evt-${Date.now()}.png`;
    fs.writeFileSync(path.join(imgDir, filename), Buffer.from(buffer));

    res.json({ url: `/images/${filename}`, prompt });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.use(express.static(path.join(__dirname, "../public")));
app.listen(PORT, () => {
  console.log(`Aetheris simulation running on port ${PORT}`);
  console.log(`Agents: ${getAgents().length}, Spaces: ${getWorldState().spaces.length}`);
});
