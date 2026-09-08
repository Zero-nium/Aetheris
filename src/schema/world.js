// Aetheris — World Schema & Types
// ================================

export const WORLD_DNA = {
  name: "Grand Library at Twilight",
  description: "A vast library that exists between dream and memory. Shelves stretch beyond sight. Light filters through stained glass that shows no outside sky.",
  style: "ethereal_academia",
  atmosphere: {
    time_of_day: "twilight",
    lighting: "warm_golden_with_violet_shadows",
    ambient_sound: "distant_page_turns_and_soft_footsteps",
    temperature: "comfortable_with_slight_chill",
  },
  max_agents: 10,
  spaces: [
    {
      id: "grand_atrium",
      name: "Grand Atrium",
      description: "The heart of the library. A circular reading space surrounded by towering shelves.",
      connections: ["reading_hall", "garden_courtyard", "archives"],
      coordinates: { x: 50, y: 50 },
      size: "large",
      items: [
        { id: "central_desk", name: "central reading desk", type: "furniture", x: 50, y: 50 },
        { id: "globe", name: "brass globe", type: "object", x: 45, y: 48 },
      ],
    },
    {
      id: "reading_hall",
      name: "Reading Hall",
      description: "Long tables under amber lamps. The silence here is thick enough to touch.",
      connections: ["grand_atrium"],
      coordinates: { x: 80, y: 50 },
      size: "medium",
      items: [
        { id: "table_1", name: "oak reading table", type: "furniture", x: 80, y: 50 },
        { id: "lamp_1", name: "amber desk lamp", type: "object", x: 78, y: 48 },
      ],
    },
    {
      id: "garden_courtyard",
      name: "Garden Courtyard",
      description: "An enclosed garden where the library meets open sky. Vines climb marble columns.",
      connections: ["grand_atrium"],
      coordinates: { x: 50, y: 80 },
      size: "medium",
      items: [
        { id: "fountain", name: "stone fountain", type: "object", x: 50, y: 82 },
        { id: "bench", name: "moss-covered bench", type: "furniture", x: 52, y: 78 },
      ],
    },
    {
      id: "archives",
      name: "The Archives",
      description: "Dusty shelves of forgotten records. The air is thick with old paper.",
      connections: ["grand_atrium"],
      coordinates: { x: 20, y: 50 },
      size: "medium",
      items: [],
    },
  ],
  rules: [
    "agents_can_move_between_connected_spaces",
    "agents_have_coordinates_within_spaces",
    "proximity_affects_interaction",
    "agents_can_interact_with_items",
    "agents_have_jobs_that_drive_behavior",
    "world_events_can_reveal_new_spaces",
  ],
};

// Jobs — roles that give agents purpose and drive emergence
export const JOBS = {
  librarian: {
    name: "Librarian",
    description: "Tends to the library, organizes books, shushes noise",
    behaviors: ["organize_shelves", "guide_visitors", "maintain_order"],
    preferred_spaces: ["grand_atrium", "archives", "reading_hall"],
  },
  cartographer: {
    name: "Cartographer",
    description: "Maps the library, discovers hidden rooms and passages",
    behaviors: ["explore", "map_spaces", "discover_passages"],
    preferred_spaces: ["archives", "grand_atrium"],
  },
  gardener: {
    name: "Gardener",
    description: "Tends the garden courtyard, talks to plants",
    behaviors: ["tend_plants", "water_fountain", "watch_sky"],
    preferred_spaces: ["garden_courtyard"],
  },
  scholar: {
    name: "Scholar",
    description: "Reads, researches, gets lost in thought",
    behaviors: ["read", "research", "contemplate", "take_notes"],
    preferred_spaces: ["reading_hall", "grand_atrium"],
  },
  wanderer: {
    name: "Wanderer",
    description: "Moves through spaces without purpose, observes",
    behaviors: ["wander", "observe", "sit_quietly"],
    preferred_spaces: ["grand_atrium", "garden_courtyard"],
  },
  archivist: {
    name: "Archivist",
    description: "Catalogs, preserves, guards old knowledge",
    behaviors: ["catalog", "preserve", "guard_archives"],
    preferred_spaces: ["archives", "grand_atrium"],
  },
  musician: {
    name: "Musician",
    description: "Hums, plays soft music, fills silence with sound",
    behaviors: ["play_music", "hum", "compose"],
    preferred_spaces: ["garden_courtyard", "grand_atrium"],
  },
  philosopher: {
    name: "Philosopher",
    description: "Questions everything, debates, thinks aloud",
    behaviors: ["question", "debate", "meditate"],
    preferred_spaces: ["grand_atrium", "garden_courtyard"],
  },
  groundskeeper: {
    name: "Groundskeeper",
    description: "Maintains the space, fixes things, notices changes",
    behaviors: ["repair", "inspect", "maintain"],
    preferred_spaces: ["grand_atrium", "garden_courtyard"],
  },
  watcher: {
    name: "Watcher",
    description: "Observes from high places, sees everything, says little",
    behaviors: ["observe", "report", "keep_watch"],
    preferred_spaces: ["grand_atrium", "reading_hall"],
  },
};

export function getJob(jobId) {
  return JOBS[jobId] || JOBS.wanderer;
}
