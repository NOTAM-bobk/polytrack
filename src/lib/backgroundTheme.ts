export type BackgroundType = "shader" | "solid" | "gradient";

export interface BackgroundPreset {
  id: string;
  name: string;
  type: BackgroundType;
  value: string; // CSS background value or color hex
  preview: string; // CSS background for the preview swatch
  description?: string;
}

export interface BackgroundConfig {
  type: BackgroundType;
  id: string;
  value: string;
}

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "shader-halftone",
    name: "Halftone Horizon",
    type: "shader",
    value: "shader",
    preview: "linear-gradient(180deg, #180802 0%, #f0602a 60%, #fff 100%)",
    description: "Animated horizon shader with retro halftone dots",
  },
  // Solis Colors
  {
    id: "solid-onyx",
    name: "Deep Onyx",
    type: "solid",
    value: "#09090b",
    preview: "#09090b",
    description: "Ultra-dark neutral slate (Default classic)",
  },
  {
    id: "solid-pitch",
    name: "Pure Pitch",
    type: "solid",
    value: "#000000",
    preview: "#000000",
    description: "Deepest black for maximum 3D contrast",
  },
  {
    id: "solid-navy",
    name: "Midnight Navy",
    type: "solid",
    value: "#080e18",
    preview: "#080e18",
    description: "Dark nautical navy blue",
  },
  {
    id: "solid-slate",
    name: "Cyber Slate",
    type: "solid",
    value: "#11161d",
    preview: "#11161d",
    description: "Cool charcoal graphite",
  },
  {
    id: "solid-emerald",
    name: "Deep Emerald",
    type: "solid",
    value: "#051610",
    preview: "#051610",
    description: "Subtle dark forest emerald",
  },
  {
    id: "solid-wine",
    name: "Imperial Wine",
    type: "solid",
    value: "#150818",
    preview: "#150818",
    description: "Regal dark amethyst plum",
  },
  {
    id: "solid-crimson",
    name: "Velvet Crimson",
    type: "solid",
    value: "#180608",
    preview: "#180608",
    description: "Dark rich burgundy wine",
  },
  {
    id: "solid-indigo",
    name: "Night Indigo",
    type: "solid",
    value: "#0b0a1e",
    preview: "#0b0a1e",
    description: "Deep indigo with a violet cast",
  },
  {
    id: "solid-teal",
    name: "Deep Lagoon",
    type: "solid",
    value: "#05161a",
    preview: "#05161a",
    description: "Dark teal lagoon water",
  },
  {
    id: "solid-copper",
    name: "Burnt Copper",
    type: "solid",
    value: "#170d07",
    preview: "#170d07",
    description: "Warm dark copper brown",
  },
  {
    id: "solid-rose",
    name: "Dusty Rose",
    type: "solid",
    value: "#170a12",
    preview: "#170a12",
    description: "Muted dark rose plum",
  },
  {
    id: "solid-olive",
    name: "Moss Olive",
    type: "solid",
    value: "#10140a",
    preview: "#10140a",
    description: "Earthy dark olive green",
  },
  {
    id: "solid-steel",
    name: "Gunmetal Steel",
    type: "solid",
    value: "#14171c",
    preview: "#14171c",
    description: "Neutral cool gunmetal grey",
  },
  // Gradients
  {
    id: "grad-cosmic",
    name: "Cosmic Void",
    type: "gradient",
    value: "linear-gradient(135deg, #09090b 0%, #160e28 50%, #0c1a2c 100%)",
    preview: "linear-gradient(135deg, #09090b 0%, #160e28 50%, #0c1a2c 100%)",
    description: "Deep galactic purple and ocean night",
  },
  {
    id: "grad-cyber",
    name: "Neon Midnight",
    type: "gradient",
    value: "linear-gradient(135deg, #090214 0%, #16093b 50%, #102958 100%)",
    preview: "linear-gradient(135deg, #090214 0%, #16093b 50%, #102958 100%)",
    description: "Electric cyberpunk indigo and blue",
  },
  {
    id: "grad-sunset",
    name: "Ember Sunset",
    type: "gradient",
    value: "linear-gradient(135deg, #18070d 0%, #2d0e20 50%, #3e1526 100%)",
    preview: "linear-gradient(135deg, #18070d 0%, #2d0e20 50%, #3e1526 100%)",
    description: "Warm crimson and dark rose ember",
  },
  {
    id: "grad-aurora",
    name: "Boreal Aurora",
    type: "gradient",
    value: "linear-gradient(135deg, #02140e 0%, #072a1e 50%, #0b3d2b 100%)",
    preview: "linear-gradient(135deg, #02140e 0%, #072a1e 50%, #0b3d2b 100%)",
    description: "Mystic emerald and jade glow",
  },
  {
    id: "grad-ocean",
    name: "Abyssal Ocean",
    type: "gradient",
    value: "linear-gradient(135deg, #030a16 0%, #071936 50%, #0d2c5a 100%)",
    preview: "linear-gradient(135deg, #030a16 0%, #071936 50%, #0d2c5a 100%)",
    description: "Deep oceanic midnight depths",
  },
  {
    id: "grad-carbon",
    name: "Carbon Radial",
    type: "gradient",
    value: "radial-gradient(ellipse at 50% 0%, #242831 0%, #121419 60%, #08090a 100%)",
    preview: "radial-gradient(ellipse at 50% 0%, #242831 0%, #121419 60%, #08090a 100%)",
    description: "Sleek top-lit studio spotlight",
  },
  {
    id: "grad-amber",
    name: "Molten Amber",
    type: "gradient",
    value: "linear-gradient(135deg, #160a04 0%, #2a1506 50%, #3e2008 100%)",
    preview: "linear-gradient(135deg, #160a04 0%, #2a1506 50%, #3e2008 100%)",
    description: "Rich dark honey and molten bronze",
  },
  {
    id: "grad-violet",
    name: "Twilight Violet",
    type: "gradient",
    value: "linear-gradient(135deg, #0b0713 0%, #1d0f2e 50%, #2b1245 100%)",
    preview: "linear-gradient(135deg, #0b0713 0%, #1d0f2e 50%, #2b1245 100%)",
    description: "Soft dusk violet fading to black",
  },
  {
    id: "grad-mint",
    name: "Mint Dusk",
    type: "gradient",
    value: "linear-gradient(160deg, #04110d 0%, #0a2620 50%, #0f3a2c 100%)",
    preview: "linear-gradient(160deg, #04110d 0%, #0a2620 50%, #0f3a2c 100%)",
    description: "Cool mint over deep pine",
  },
  {
    id: "grad-glacier",
    name: "Glacier Blue",
    type: "gradient",
    value: "linear-gradient(135deg, #050b14 0%, #0a2033 50%, #12405c 100%)",
    preview: "linear-gradient(135deg, #050b14 0%, #0a2033 50%, #12405c 100%)",
    description: "Icy arctic blue depths",
  },
  {
    id: "grad-orchid",
    name: "Neon Orchid",
    type: "gradient",
    value: "linear-gradient(135deg, #12040f 0%, #2b0a26 50%, #45123d 100%)",
    preview: "linear-gradient(135deg, #12040f 0%, #2b0a26 50%, #45123d 100%)",
    description: "Electric magenta orchid glow",
  },
  {
    id: "grad-steel",
    name: "Steel Haze",
    type: "gradient",
    value: "radial-gradient(ellipse at 30% 10%, #2a2f36 0%, #14171c 65%, #0a0b0d 100%)",
    preview: "radial-gradient(ellipse at 30% 10%, #2a2f36 0%, #14171c 65%, #0a0b0d 100%)",
    description: "Brushed metal studio light",
  },
  {
    id: "grad-sakura",
    name: "Sakura Night",
    type: "gradient",
    value: "linear-gradient(140deg, #100810 0%, #25121f 55%, #3a1b2c 100%)",
    preview: "linear-gradient(140deg, #100810 0%, #25121f 55%, #3a1b2c 100%)",
    description: "Warm blossom pink dusk",
  },
];

const STORAGE_KEY = "polytrack_background_theme";

export const DEFAULT_BACKGROUND: BackgroundConfig = {
  type: "shader",
  id: "shader-halftone",
  value: "shader",
};

export function loadBackgroundConfig(): BackgroundConfig {
  if (typeof window === "undefined") return DEFAULT_BACKGROUND;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_BACKGROUND;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.type === "string" && typeof parsed.id === "string") {
      return {
        type: parsed.type,
        id: parsed.id,
        value: parsed.value || (BACKGROUND_PRESETS.find((p) => p.id === parsed.id)?.value ?? DEFAULT_BACKGROUND.value),
      };
    }
  } catch {}
  return DEFAULT_BACKGROUND;
}

export function saveBackgroundConfig(config: BackgroundConfig): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent("polytrack_background_change", { detail: config }));
  } catch {}
}

export function onBackgroundConfigChange(callback: (config: BackgroundConfig) => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = (event: Event) => {
    const customEvent = event as CustomEvent<BackgroundConfig>;
    if (customEvent.detail) {
      callback(customEvent.detail);
    }
  };
  window.addEventListener("polytrack_background_change", handler);
  return () => window.removeEventListener("polytrack_background_change", handler);
}
