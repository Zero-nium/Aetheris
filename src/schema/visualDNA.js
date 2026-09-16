// Aetheris — Visual DNA Schema & Avatar Generation
// Ported from PolyGenesis Dual-DNA spec
// Agents define their visual identity through structured DNA,
// which generates a consistent anime-style portrait.

export const VISUAL_DNA_FIELDS = {
  display_name: { type: "string", required: true },
  pronouns: { type: "enum", values: ["she/her", "he/him", "they/them", "custom", "prefer_not_to_say"], default: "they/them" },
  gender_presentation: { type: "enum", values: ["feminine", "masculine", "androgynous", "nonbinary"], default: "androgynous" },
  age_appearance: { type: "enum", values: ["teen", "young_adult", "adult", "mature_adult"], default: "young_adult" },
  skin_tone: { type: "enum", values: ["porcelain", "fair", "light", "medium", "tan", "deep", "very_deep"], default: "light" },
  face_shape: { type: "enum", values: ["soft_round", "oval", "heart", "square", "sharp_v"], default: "oval" },
  eye_style: { type: "enum", values: ["soft", "sharp", "sleepy", "sparkly", "serious", "catlike"], default: "soft" },
  eye_color: { type: "enum", values: ["brown", "hazel", "green", "blue", "gray", "violet", "amber"], default: "brown" },
  hair_style: { type: "enum", values: ["short", "bob", "medium", "long", "ponytail", "twin_tails", "undercut", "curly", "braided"], default: "medium" },
  hair_color: { type: "enum", values: ["black", "brown", "blonde", "red", "silver", "blue", "green", "purple", "pink", "white"], default: "brown" },
  primary_archetype: { type: "enum", values: ["scholar", "engineer", "artist", "strategist", "mentor", "explorer", "guardian", "mystic", "medic", "hacker"], default: "scholar" },
  secondary_archetype: { type: "enum", values: ["none", "scholar", "engineer", "artist", "strategist", "mentor", "explorer", "guardian", "mystic", "medic", "hacker"], default: "none" },
  aesthetic_leaning: { type: "enum", values: ["minimal", "modern", "streetwear", "academia", "techwear", "fantasy", "retro", "cyberpunk_soft", "naturecore", "formal"], default: "academia" },
  color_palette_preference: {
    type: "object", default: { primary: "#6b7280", secondary: "#9ca3af", accent: "#d1d5db" },
    fields: { primary: "string", secondary: "string", accent: "string" }
  },
  signature_accessories: { type: "array", max: 3, default: ["glasses"] },
  expression_baseline: { type: "enum", values: ["neutral", "friendly", "serious", "curious", "confident", "gentle"], default: "neutral" },
  expression_reactivity_profile: { type: "enum", values: ["reserved", "balanced", "expressive"], default: "balanced" },
  pose_baseline: { type: "enum", values: ["front", "three_quarter", "side_profile", "seated", "standing", "action_pose_light"], default: "three_quarter" },
  setting_preference: { type: "array", default: ["library"] },
  coverage_zones: { type: "enum", values: ["high", "medium", "low"], default: "high" },
};

// Style locks — fixed across all avatars
export const STYLE_ANCHOR = "anime style, clean lineart, cel-shaded, soft gradients, high detail eyes with consistent highlights, studio-quality illustration";
export const NEGATIVE_PROMPT = "text, watermark, signature, logo, writing, caption, sexualized, NSFW, gore, blood, violence, threatening, weapons, distorted, messy lines, sketch, low resolution, blurry, grainy, deformed, extra limbs, bad anatomy, unnatural proportions, bright neon colors, cluttered background, photorealistic, 3d render, oil painting, watercolor";

// Validate a visual DNA object
export function validateVisualDNA(dna) {
  const errors = [];
  if (!dna || typeof dna !== "object") return { valid: false, errors: ["Visual DNA must be an object"] };
  if (!dna.display_name) errors.push("display_name is required");
  for (const [field, spec] of Object.entries(VISUAL_DNA_FIELDS)) {
    if (spec.type === "enum" && dna[field] && !spec.values.includes(dna[field])) {
      errors.push(`${field}: "${dna[field]}" not in [${spec.values.join(", ")}]`);
    }
  }
  return { valid: errors.length === 0, errors };
}

// Sanitize visual DNA — fill defaults, clamp values
export function sanitizeVisualDNA(dna) {
  const clean = {};
  for (const [field, spec] of Object.entries(VISUAL_DNA_FIELDS)) {
    if (spec.type === "array") {
      clean[field] = Array.isArray(dna?.[field]) ? dna[field].slice(0, spec.max || 10) : spec.default;
    } else if (spec.type === "object") {
      clean[field] = dna?.[field] || spec.default;
    } else if (spec.type === "enum") {
      clean[field] = spec.values.includes(dna?.[field]) ? dna[field] : spec.default;
    } else {
      clean[field] = dna?.[field] || spec.default;
    }
  }
  if (!clean.display_name && dna?.name) clean.display_name = dna.name;
  return clean;
}

// Build the render prompt from visual DNA
export function buildRenderPrompt(dna) {
  const v = sanitizeVisualDNA(dna);
  const accessories = (v.signature_accessories || []).join(", ");
  const setting = (v.setting_preference || ["library"])[0].replace(/_/g, " ");
  const palette = v.color_palette_preference || {};
  const archetype = v.secondary_archetype !== "none" ? `${v.primary_archetype} with ${v.secondary_archetype} undertones` : v.primary_archetype;

  const prompt = `${STYLE_ANCHOR}. High-quality anime illustration of ${v.display_name}, a ${v.gender_presentation} ${v.age_appearance.replace(/_/g, " ")} with a ${v.face_shape.replace(/_/g, " ")} face and a ${v.expression_baseline} expression. ${v.display_name} has ${v.hair_style} ${v.hair_color} hair and ${v.eye_style} ${v.eye_color} eyes with luminous catchlights. They are wearing ${v.aesthetic_leaning.replace(/_/g, " ")} attire in ${palette.primary} and ${palette.secondary} tones with ${palette.accent} accents, accessorized with ${accessories}. Captured in a ${v.pose_baseline.replace(/_/g, " ")} pose within a ${setting} setting. The lighting is soft and diffused, creating gentle gradients across their ${v.skin_tone} skin tone. ${archetype} archetype. ${v.coverage_zones} coverage. Portrait composition, medium shot, 3/4 view. ${NEGATIVE_PROMPT}`;

  return prompt;
}

// Map job to a default visual DNA (for seed agents without explicit visual DNA)
export const JOB_VISUAL_DEFAULTS = {
  librarian: { primary_archetype: "scholar", aesthetic_leaning: "academia", setting_preference: ["library"], expression_baseline: "gentle", signature_accessories: ["glasses"] },
  cartographer: { primary_archetype: "explorer", aesthetic_leaning: "techwear", setting_preference: ["clean_studio"], expression_baseline: "curious", signature_accessories: ["watch"] },
  gardener: { primary_archetype: "naturecore" in VISUAL_DNA_FIELDS ? "guardian" : "guardian", aesthetic_leaning: "naturecore", setting_preference: ["nature_soft"], expression_baseline: "gentle", signature_accessories: ["hairpin"] },
  scholar: { primary_archetype: "scholar", aesthetic_leaning: "academia", setting_preference: ["library"], expression_baseline: "curious", signature_accessories: ["glasses"] },
  wanderer: { primary_archetype: "explorer", aesthetic_leaning: "streetwear", setting_preference: ["city_soft"], expression_baseline: "neutral", signature_accessories: ["scarf"] },
  philosopher: { primary_archetype: "mystic", aesthetic_leaning: "minimal", setting_preference: ["abstract_gradient"], expression_baseline: "serious", signature_accessories: ["necklace"] },
  healer: { primary_archetype: "medic", aesthetic_leaning: "minimal", setting_preference: ["clean_studio"], expression_baseline: "friendly", signature_accessories: ["bracelet"] },
  bard: { primary_archetype: "artist", aesthetic_leaning: "retro", setting_preference: ["city_soft"], expression_baseline: "confident", signature_accessories: ["earrings"] },
  mystic: { primary_archetype: "mystic", aesthetic_leaning: "fantasy", setting_preference: ["abstract_gradient"], expression_baseline: "neutral", signature_accessories: ["necklace"] },
  historian: { primary_archetype: "scholar", aesthetic_leaning: "academia", setting_preference: ["library"], expression_baseline: "serious", signature_accessories: ["glasses"] },
};

// Generate a default visual DNA for an agent based on their name, job, and personality
export function generateDefaultVisualDNA(name, job, personality) {
  const jobDefaults = JOB_VISUAL_DEFAULTS[job] || JOB_VISUAL_DEFAULTS.wanderer;
  const personalityToHair = {
    zen: "bob", curious: "medium", mischievous: "twin_tails", grumpy: "short",
    aloof: "long", clingy: "ponytail", playful: "curly", bold: "undercut",
  };
  const personalityToEye = {
    zen: "sleepy", curious: "sparkly", mischievous: "catlike", grumpy: "sharp",
    aloof: "serious", clingy: "soft", playful: "sparkly", bold: "sharp",
  };
  const personalityToColor = {
    zen: "#8b9a8b", curious: "#6b8eae", mischievous: "#c87b9a", grumpy: "#8b7b6b",
    aloof: "#7b8b9a", clingy: "#c19a6b", playful: "#e87baa", bold: "#8b5e3c",
  };
  const palette = personalityToColor[personality] || "#8b8b8b";

  return sanitizeVisualDNA({
    display_name: name,
    gender_presentation: "androgynous",
    age_appearance: "young_adult",
    skin_tone: "light",
    hair_style: personalityToHair[personality] || "medium",
    hair_color: personalityToHair?.[personality] ? (personality === "bold" ? "silver" : "brown") : "brown",
    eye_style: personalityToEye[personality] || "soft",
    eye_color: "amber",
    expression_baseline: jobDefaults.expression_baseline || "neutral",
    aesthetic_leaning: jobDefaults.aesthetic_leaning || "academia",
    primary_archetype: jobDefaults.primary_archetype || "scholar",
    signature_accessories: jobDefaults.signature_accessories || ["glasses"],
    setting_preference: jobDefaults.setting_preference || ["library"],
    color_palette_preference: { primary: palette, secondary: "#9ca3af", accent: "#d1d5db" },
    pose_baseline: "three_quarter",
    coverage_zones: "high",
  });
}
