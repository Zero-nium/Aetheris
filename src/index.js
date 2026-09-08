// Aetheris — API Server
// ======================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import { initWorld, getWorldState, getAgents, getEventLog, addAgent } from "./engine/simulation.js";
import { createAgent, validateAgentDNA } from "./schema/agent.js";
import { runTick, getTickCount } from "./engine/tick.js";

const app = express();
app.use(cors());
app.use(express.json());

// Initialize world on boot
initWorld();

// --- Seed initial agents ---
const seedAgents = [
  { name: "Poly", job: "librarian", personality: "zen", behavior_traits: ["sleepy", "watchful", "zen", "clingy", "curious"], starting_space: "grand_atrium" },
  { name: "Gene", job: "cartographer", personality: "curious", behavior_traits: ["curious", "adventurous", "watchful", "playful", "mischievous"], starting_space: "archives" },
  { name: "Esis", job: "gardener", personality: "aloof", behavior_traits: ["sleepy", "aloof", "curious", "zen", "clingy"], starting_space: "garden_courtyard" },
];
for (const seed of seedAgents) {
  const agent = createAgent(seed);
  addAgent(agent);
}

// --- API Routes ---

// Health
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", tick: getTickCount(), agents: getAgents().length, spaces: getWorldState().spaces.length });
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
  const count = Math.min(parseInt(req.params.count) || 1, 10);
  const results = [];
  for (let i = 0; i < count; i++) {
    results.push(runTick());
  }
  res.json({ ticks: results, count });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Aetheris simulation running on port ${PORT}`);
  console.log(`Agents: ${getAgents().length}, Spaces: ${getWorldState().spaces.length}`);
});
