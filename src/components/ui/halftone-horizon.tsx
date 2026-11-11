"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/utils";

// Tracks the `dark` class on <html>, the class-based dark mode shadcn sets up.
// For colours that live outside CSS: WebGL uniforms, canvas fills and
// motion-animated values can't use Tailwind's `dark:` variant.

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

const getSnapshot = () => document.documentElement.classList.contains("dark");

function useIsDark() {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}

// GLSL shared by the shader backgrounds. Each background supplies `vec3 shade(vec2 frag)`, which
// returns linear RGB for one pixel; HEADER comes before it and FOOTER after.

export const VERT = /* glsl */ `#version 300 es
// one triangle that covers the whole canvas, no buffers needed
void main() {
  vec2 p = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

// 3D simplex noise; shared with any extra passes a background draws (see caustics)
export const NOISE = /* glsl */ `
// 3D simplex noise by Ian McEwan, Ashima Arts, and Stefan Gustavson.
// Copyright (C) 2011 Ashima Arts. Copyright (C) 2011-2016 Stefan Gustavson.
// Distributed under the MIT License: https://github.com/stegu/webgl-noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}
`;

export const HEADER = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 u_res;        // canvas size, device px
uniform float u_dpr;       // device px per css px
uniform float u_time;      // animation clock, seconds (already scaled by speed)
uniform float u_age;       // seconds of motion played since the surface first showed; large when still
uniform vec2 u_pointer;    // pointer position, device px, y up
uniform float u_pointerAmt; // 0..1, eased: how present the pointer is
uniform vec2 u_trail;      // a lazier point following u_pointer, device px, y up
uniform vec3 u_colors[6];  // palette, OKLab
uniform int u_count;       // palette size
uniform vec3 u_bg;         // page background, OKLab
uniform float u_dark;      // 0 light .. 1 dark, eased during a theme change
uniform float u_grain;     // film grain strength
uniform float u_grainSize; // grain speck size, device px
uniform vec3 u_ripples[3]; // click rings: position (device px, y up) and age (seconds)
uniform vec3 u_trailPts[16]; // the pointer's recent path, newest first: position and strength 0..1
uniform int u_trailCount;

out vec4 outColor;

// "Hash without Sine", Copyright (c) 2014 David Hoskins. MIT License:
// https://www.shadertoy.com/view/4djSRW
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

${NOISE}
vec3 oklabToLinear(vec3 c) {
  float l = c.x + 0.3963377774 * c.y + 0.2158037573 * c.z;
  float m = c.x - 0.1055613458 * c.y - 0.0638541728 * c.z;
  float s = c.x - 0.0894841775 * c.y - 1.2914855480 * c.z;
  l = l * l * l; m = m * m * m; s = s * s * s;
  return vec3(
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s
  );
}

vec3 linearToSrgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}

// rings sent out by clicks: 1 on a ring's crest, fading as it travels outward
float ripples(vec2 frag) {
  float sum = 0.0;
  for (int i = 0; i < 3; i++) {
    vec3 r = u_ripples[i];
    if (r.z < 0.0 || r.z > 3.0) continue;
    float d = length(frag - r.xy) - r.z * 460.0 * u_dpr;
    float w = 34.0 * u_dpr;
    float life = 1.0 - r.z / 3.0;
    sum += exp(-d * d / (w * w)) * life * life;
  }
  return sum;
}

// distance from p to the segment between the trail and the pointer: a light shaped like a soft
// comet while the pointer moves, and a plain circle once it rests
float pointerDist(vec2 p, float trail) {
  vec2 a = u_pointer;
  vec2 b = mix(u_pointer, u_trail, trail);
  vec2 ab = b - a;
  float h = clamp(dot(p - a, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
  return length(p - a - ab * h);
}

// the pointer's recent path as a soft stroke: 1 near the newest points, tapering (in width and
// strength) toward the oldest. Each segment between path points is a capsule.
float trailField(vec2 p, float radius) {
  float best = 0.0;
  for (int i = 0; i < 15; i++) {
    if (i + 1 >= u_trailCount) break;
    vec3 a = u_trailPts[i];
    vec3 b = u_trailPts[i + 1];
    vec2 ab = b.xy - a.xy;
    float h = clamp(dot(p - a.xy, ab) / max(dot(ab, ab), 1e-4), 0.0, 1.0);
    float s = mix(a.z, b.z, h);
    float r = radius * (0.35 + 0.65 * s);
    float d = length(p - a.xy - ab * h);
    best = max(best, exp(-d * d / (r * r)) * s);
  }
  if (u_trailCount == 1) {
    float d = length(p - u_trailPts[0].xy);
    best = exp(-d * d / (radius * radius)) * u_trailPts[0].z;
  }
  return best;
}

// mixes two OKLab colours in OKLCH: lightness and chroma blend straight, hue goes the short way
// round, so the middle of a mix stays as vivid as its ends instead of passing through grey
vec3 mixLch(vec3 a, vec3 b, float t) {
  float ca = length(a.yz);
  float cb = length(b.yz);
  float ha = atan(a.z, a.y);
  float hb = atan(b.z, b.y);
  // a near-grey has no real hue of its own: borrow the other colour's
  if (ca < 0.02) ha = hb;
  if (cb < 0.02) hb = ha;
  float dh = mod(hb - ha + 3.14159265, 6.2831853) - 3.14159265;
  float h = ha + dh * t;
  float c = mix(ca, cb, t);
  return vec3(mix(a.x, b.x, t), c * cos(h), c * sin(h));
}

// palette as a ramp, blended in OKLCH: 0 is the first colour, 1 the last
vec3 paletteRampLch(float x) {
  float f = clamp(x, 0.0, 1.0) * float(u_count - 1);
  int i = min(int(floor(f)), u_count - 2);
  return mixLch(u_colors[i], u_colors[i + 1], smoothstep(0.0, 1.0, f - float(i)));
}

// palette as a loop: 0..1 runs through every colour and back to the first
vec3 paletteLoop(float x) {
  float f = fract(x) * float(u_count);
  int i = int(floor(f));
  int j = i + 1 >= u_count ? 0 : i + 1;
  return mix(u_colors[i], u_colors[j], smoothstep(0.0, 1.0, fract(f)));
}

// palette as a ramp: 0 is the first colour, 1 the last
vec3 paletteRamp(float x) {
  float f = clamp(x, 0.0, 1.0) * float(u_count - 1);
  int i = min(int(floor(f)), u_count - 2);
  return mix(u_colors[i], u_colors[i + 1], smoothstep(0.0, 1.0, f - float(i)));
}
`;

export const FOOTER = /* glsl */ `
void main() {
  vec3 c = linearToSrgb(shade(gl_FragCoord.xy));
  // grain, plus a touch of per-pixel dither so slow gradients never band
  c += (hash12(floor(gl_FragCoord.xy / u_grainSize)) - 0.5) * u_grain;
  c += (hash12(gl_FragCoord.xy + 17.0) - 0.5) * (1.5 / 255.0);
  outColor = vec4(c, 1.0);
}
`;

// sRGB hex -> OKLab. Palettes are blended in OKLab in the shaders, so a mix of
// two colours stays as vivid as its ends instead of going grey in the middle.

export type Lab = [number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

const parseHex = (hex: string) => {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h.slice(0, 6), 16);
  if (Number.isNaN(n)) return [0.5, 0.5, 0.5];
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

export function hexToOklab(hex: string): Lab {
  const [r, g, b] = parseHex(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

/**
 * A pre-pass that draws a full-screen "source" image into a mipmapped texture, for backgrounds that
 * work like a post effect: draw something sharp, then blur, streak or disperse it in the main pass
 * (which reads it as u_tex). The mipmaps give cheap wide blurs: textureLod at a higher level.
 *
 * `body` must define `float source(vec2 frag)`, returning brightness (0 and up) at a pixel in
 * device px. It can read u_res, u_dpr, u_time, u_pointer, u_pointerAmt, any float uniform the
 * background passes, and the shared noise (snoise, hash12).
 *
 * The texture is drawn at `scale` of the canvas size; the main pass samples it in canvas uv, so
 * frag coordinates inside `source` are still full canvas px.
 */
export function sourcePass(body: string, scale = 0.5) {
  const FRAG = /* glsl */ `#version 300 es
precision highp float;
uniform vec2 u_res;       // full canvas size, device px
uniform vec2 u_texRes;    // this texture's size
uniform float u_dpr;
uniform float u_time;
uniform vec2 u_pointer;
uniform float u_pointerAmt;
out vec4 outColor;

// "Hash without Sine", Copyright (c) 2014 David Hoskins. MIT License:
// https://www.shadertoy.com/view/4djSRW
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
${NOISE}
${body}

void main() {
  vec2 frag = gl_FragCoord.xy / u_texRes * u_res;
  // stored at a quarter, so an 8-bit target still holds up to 4x
  outColor = vec4(vec3(max(source(frag), 0.0) * 0.25), 1.0);
}
`;

  return (gl: WebGL2RenderingContext): Prepass | null => {
    const program = createProgram(gl, VERT, FRAG);
    if (!program) return null;
    const half = !!gl.getExtension("EXT_color_buffer_float");
    const tex = gl.createTexture();
    const fbo = gl.createFramebuffer();
    let tw = 0;
    let th = 0;
    const locs = new Map<string, WebGLUniformLocation | null>();
    const loc = (name: string) => {
      if (!locs.has(name)) locs.set(name, gl.getUniformLocation(program, name));
      return locs.get(name)!;
    };

    return {
      render(gl, f: FrameInfo) {
        const w = Math.max(1, Math.round(f.width * scale));
        const h = Math.max(1, Math.round(f.height * scale));
        if (w !== tw || h !== th) {
          tw = w;
          th = h;
          gl.bindTexture(gl.TEXTURE_2D, tex);
          if (half) gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
          else gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, w, h);
        gl.useProgram(program);
        gl.uniform2f(loc("u_res"), f.width, f.height);
        gl.uniform2f(loc("u_texRes"), w, h);
        gl.uniform1f(loc("u_dpr"), f.dpr);
        gl.uniform1f(loc("u_time"), f.time);
        gl.uniform2f(loc("u_pointer"), f.pointer[0], f.pointer[1]);
        gl.uniform1f(loc("u_pointerAmt"), f.pointerAmt);
        for (const [name, value] of Object.entries(f.uniforms)) gl.uniform1f(loc(name), value);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.generateMipmap(gl.TEXTURE_2D);
        return tex;
      },
      dispose(gl) {
        gl.deleteProgram(program);
        gl.deleteTexture(tex);
        gl.deleteFramebuffer(fbo);
      },
    };
  };
}

/**
 * The WebGL2 canvas every shader background draws into. It fills its own box, and children render
 * on top of it, so the same element can be a hero, a card or a full page.
 *
 * Kept cheap on purpose:
 *  - nothing is drawn while it's off screen or the tab is hidden,
 *  - resolution is capped (soft gradients look the same at 1.5x), and steps down within seconds on slow devices,
 *  - when nothing moves (animate off, or reduced motion) it draws a single frame and stops,
 *  - a lost GPU context is rebuilt when the browser restores it.
 * Without WebGL2 the box keeps a CSS gradient, which is also what shows before the first frame.
 */

/** What a pre-pass gets each frame. Positions are device px, y up. */
export type FrameInfo = {
  width: number;
  height: number;
  dpr: number;
  time: number;
  pointer: readonly [number, number];
  pointerAmt: number;
  /** click rings: x, y, age in seconds, three per ring */
  ripples: Float32Array;
  uniforms: Record<string, number>;
};

/**
 * Extra GPU work drawn before the main pass each frame, e.g. light rays splatted into a texture.
 * Whatever texture `render` returns is bound to `u_tex` (unit 0) for the main shader.
 */
export type Prepass = {
  render(gl: WebGL2RenderingContext, frame: FrameInfo): WebGLTexture | null;
  dispose(gl: WebGL2RenderingContext): void;
};

export type ShaderSurfaceProps = {
  /** GLSL that defines `vec3 shade(vec2 frag)` (linear RGB) and the extra uniforms it reads. */
  shader: string;
  /** Values for those extra float uniforms, by name. */
  uniforms?: Record<string, number>;
  /** Values for extra vec3 uniforms (e.g. an OKLab colour), by name. */
  vectors?: Record<string, readonly number[]>;
  /** Palette as hex colours, 2 to 6. */
  colors: string[];
  /** Animation speed; 1 is the designed pace. */
  speed: number;
  animate: boolean;
  /** React to the pointer. */
  interactive: boolean;
  grain: number;
  /** Size of a grain speck, css px. */
  grainSize?: number;
  /** Shifts the composition, so two backgrounds with the same settings still differ. */
  seed?: number;
  /** Base colour behind the effect; empty follows the page (white or near-black). */
  background?: string;
  /** Base colour on dark pages, with `background` as the light one: the base then follows the theme. */
  backgroundDark?: string;
  /** A click sends a ring out from the pointer (shaders read u_ripples). */
  ripples?: boolean;
  /**
   * How lazily the light follows the pointer, 0 (locked to it) to 1 (drifts after it). A second
   * point, u_trail, follows the first more lazily still, so fast moves stretch into a soft tail.
   */
  follow?: number;
  /**
   * Seconds a point of the pointer's path stays in u_trailPts. The path is sampled from the
   * smoothed pointer, and each point fades with an ease-in-out, so a trail tapers off softly.
   */
  trailLife?: number;
  /** Sets up a pre-pass (see Prepass); called again if the GPU context is restored. */
  prepass?: (gl: WebGL2RenderingContext) => Prepass | null;
  /**
   * Used instead of `shader` when `prepass` returns null (the device can't run it), for a pre-pass
   * that only saves work: a separate program rather than a branch, as GPUs often run both sides.
   */
  plainShader?: string;
  /** Highest device pixel ratio to render at. */
  maxDpr?: number;
  /**
   * CSS background for the box: shown before the first frame and when WebGL2 isn't available.
   * Gets whether the base is dark and the base colour itself.
   */
  fallback: (dark: boolean, base: string) => string;
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
};

/** Props every shader background takes. */
export type ShaderBackgroundProps = {
  /** Hex colours, 2 to 6, used exactly as given. */
  colors?: string[];
  /** Animation speed; 1 is the designed pace. */
  speed?: number;
  /** Move on its own. Off draws one still frame. */
  animate?: boolean;
  /** React to the pointer. */
  interactive?: boolean;
  /** Film grain strength. */
  grain?: number;
  /** Shifts the composition, so two backgrounds with the same settings still differ. */
  seed?: number;
  className?: string;
  style?: CSSProperties;
  /** Content shown on top of the background. */
  children?: ReactNode;
};

const BG = { light: hexToOklab("#ffffff"), dark: hexToOklab("#0a0a0a") };
const MAX_COLORS = 6;
const RIPPLES = 3; // rings alive at once (must match u_ripples in glsl.ts)
const RIPPLE_LIFE = 3; // seconds
const TRAIL = 16; // path points kept for u_trailPts (must match glsl.ts)
// Resolution steps for a device that can't keep up: judged over each second of motion, a step down
// whenever the frames averaged slower than SLOW_FRAME, until one keeps up or the last is reached.
// A slow shader holds back every frame of the page, scrolling included, so it can't wait long.
const QUALITY = [1, 0.75, 0.5];
const SLOW_FRAME = 1 / 48;
// The first moments aren't judged: the shader compiles then, and a box fading in over another
// (a tab switch) draws both.
const WARM_UP = 0.75;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!;
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS) && !gl.isContextLost()) {
    console.error(gl.getShaderInfoLog(s));
    gl.deleteShader(s);
    return null;
  }
  return s;
}

/** Compiles and links a program; logs and returns null on failure. Also used by pre-passes. */
export function createProgram(gl: WebGL2RenderingContext, vert: string, frag: string) {
  const vs = compile(gl, gl.VERTEX_SHADER, vert);
  const fs = compile(gl, gl.FRAGMENT_SHADER, frag);
  if (!vs || !fs) return null;
  const p = gl.createProgram()!;
  gl.attachShader(p, vs);
  gl.attachShader(p, fs);
  gl.linkProgram(p);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) {
    console.error(gl.getProgramInfoLog(p));
    return null;
  }
  return p;
}

// whether a custom background is dark, so the CSS fallback picks matching colours
const isDarkHex = (hex: string) => hexToOklab(hex)[0] < 0.6;

const toLabArray = (colors: string[]) => {
  const list = colors.filter(Boolean).slice(0, MAX_COLORS);
  if (list.length === 0) list.push("#808080");
  if (list.length === 1) list.push(list[0]);
  const out = new Float32Array(MAX_COLORS * 3);
  list.forEach((c, i) => out.set(hexToOklab(c), i * 3));
  return { data: out, count: list.length };
};

export function ShaderSurface({
  shader,
  uniforms,
  vectors,
  colors,
  speed,
  animate,
  interactive,
  grain,
  grainSize = 1,
  seed = 0,
  background = "",
  backgroundDark = "",
  ripples = false,
  follow = 0.6,
  trailLife = 0.9,
  prepass,
  plainShader,
  maxDpr = 1.5,
  fallback,
  className,
  style,
  children,
}: ShaderSurfaceProps) {
  const root = useRef<HTMLDivElement>(null);
  const dark = useIsDark();
  const [failed, setFailed] = useState(false);
  const colorKey = colors.join(",");

  // latest props, read by the render loop without restarting it
  const latest = { uniforms, vectors, speed, animate, interactive, grain, grainSize, seed, background, backgroundDark, ripples, follow, trailLife, prepass, maxDpr, dark, colorKey };
  const opts = useRef(latest);
  const wake = useRef<() => void>(() => {});
  useEffect(() => {
    opts.current = latest;
    wake.current();
  });

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    // made here rather than in JSX, so every mount (StrictMode mounts twice) gets a fresh context
    const cv = document.createElement("canvas");
    cv.setAttribute("aria-hidden", "true");
    cv.className = "pointer-events-none absolute inset-0 -z-10 size-full";
    const gl = cv.getContext("webgl2", {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFailed(true);
      return;
    }

    let program: WebGLProgram | null = null;
    let pre: Prepass | null = null;
    let locs = new Map<string, WebGLUniformLocation | null>();
    const loc = (name: string) => {
      if (!locs.has(name)) locs.set(name, gl.getUniformLocation(program!, name));
      return locs.get(name)!;
    };
    const build = () => {
      pre = opts.current.prepass?.(gl) ?? null;
      program = createProgram(gl, VERT, HEADER + (!pre && plainShader ? plainShader : shader) + FOOTER);
      locs = new Map();
      if (program) gl.useProgram(program);
      return !!program;
    };
    if (!build()) {
      setFailed(true);
      return;
    }
    el.prepend(cv);

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let cssW = 1;
    let cssH = 1;
    let step = 0; // index into QUALITY
    let quality = QUALITY[0];
    let visible = true;
    let lost = false;
    let raf = 0;
    let last = 0;
    let time = 12; // start mid-motion, so the first frame is already a good composition
    let age = 0; // real seconds of motion since first shown, for intro animations
    // dark-ness of the base: a single custom background decides it, otherwise the page theme, read
    // from the page itself so the very first frame is right (the hook's first value is a guess)
    const pageDark = () => document.documentElement.classList.contains("dark");
    const baseDark = () =>
      opts.current.background && !opts.current.backgroundDark ? isDarkHex(opts.current.background) : pageDark();
    let darkAmt = baseDark() ? 1 : 0;
    let palette = { key: "", data: new Float32Array(MAX_COLORS * 3), count: 2 };
    // target (tx, ty), the light that lerps after it (x, y) and its lazier tail (lx, ly); css px, y up
    const pointer = { x: 0, y: 0, lx: 0, ly: 0, tx: 0, ty: 0, amt: 0, inside: false, seen: false };
    // click rings: css px position (y up) and start time, oldest replaced first
    const rings = Array.from({ length: RIPPLES }, () => ({ x: 0, y: 0, start: -Infinity }));
    const ringData = new Float32Array(RIPPLES * 3);
    // the pointer's recent path, newest first: css px (y up) and the time each point was laid
    const path: { x: number; y: number; t: number }[] = [];
    const pathData = new Float32Array(TRAIL * 3);
    let bgKey = "-";
    let bgLab: readonly number[] = BG.light;
    let bgDarkLab: readonly number[] = BG.dark;
    let judged = 0; // seconds of motion in the current judging window
    let frames = 0;

    const resize = () => {
      const r = el.getBoundingClientRect();
      cssW = Math.max(1, r.width);
      cssH = Math.max(1, r.height);
      const dpr = Math.min(window.devicePixelRatio || 1, opts.current.maxDpr) * quality;
      const bw = Math.max(1, Math.round(cssW * dpr));
      const bh = Math.max(1, Math.round(cssH * dpr));
      if (cv.width !== bw || cv.height !== bh) {
        cv.width = bw;
        cv.height = bh;
      }
    };

    const render = () => {
      if (lost || !program) return;
      const o = opts.current;
      if (palette.key !== o.colorKey) palette = { key: o.colorKey, ...toLabArray(o.colorKey.split(",")) };
      const scale = cv.width / cssW;
      if (bgKey !== o.background + o.backgroundDark) {
        bgKey = o.background + o.backgroundDark;
        bgLab = o.background ? hexToOklab(o.background) : BG.light;
        bgDarkLab = o.background ? hexToOklab(o.backgroundDark || o.background) : BG.dark;
      }
      const bg = bgLab.map((v, i) => v + (bgDarkLab[i] - v) * darkAmt);
      const now = performance.now() / 1000;
      rings.forEach((r, i) => ringData.set([r.x * scale, r.y * scale, now - r.start], i * 3));
      pathData.fill(0);
      path.forEach((p, i) => {
        const a = Math.min(1, (now - p.t) / o.trailLife);
        pathData.set([p.x * scale, p.y * scale, 1 - a * a * (3 - 2 * a)], i * 3); // ease-in-out fade
      });

      let tex: WebGLTexture | null = null;
      if (pre) {
        tex = pre.render(gl, {
          width: cv.width,
          height: cv.height,
          dpr: scale,
          time: time + o.seed * 37.1,
          pointer: [pointer.x * scale, pointer.y * scale],
          pointerAmt: pointer.amt,
          ripples: ringData,
          uniforms: o.uniforms ?? {},
        });
        // put back what the pre-pass may have changed
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.bindVertexArray(null);
        gl.disable(gl.BLEND);
        gl.colorMask(true, true, true, true);
        gl.useProgram(program);
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.uniform1i(loc("u_tex"), 0);
      gl.viewport(0, 0, cv.width, cv.height);
      gl.uniform2f(loc("u_res"), cv.width, cv.height);
      gl.uniform1f(loc("u_dpr"), scale);
      gl.uniform1f(loc("u_time"), time + o.seed * 37.1);
      // with nothing moving, intros are skipped and show their finished state
      gl.uniform1f(loc("u_age"), o.animate && o.speed > 0 && !reduce.matches ? age : 1e4);
      gl.uniform2f(loc("u_pointer"), pointer.x * scale, pointer.y * scale);
      gl.uniform2f(loc("u_trail"), pointer.lx * scale, pointer.ly * scale);
      gl.uniform1f(loc("u_pointerAmt"), pointer.amt);
      gl.uniform3fv(loc("u_colors"), palette.data);
      gl.uniform1i(loc("u_count"), palette.count);
      gl.uniform3f(loc("u_bg"), bg[0], bg[1], bg[2]);
      gl.uniform1f(loc("u_dark"), darkAmt);
      gl.uniform1f(loc("u_grain"), o.grain);
      gl.uniform1f(loc("u_grainSize"), Math.max(1, o.grainSize * scale));
      gl.uniform3fv(loc("u_ripples"), ringData);
      gl.uniform3fv(loc("u_trailPts"), pathData);
      gl.uniform1i(loc("u_trailCount"), path.length);
      for (const [name, value] of Object.entries(o.uniforms ?? {})) gl.uniform1f(loc(name), value);
      for (const [name, [x, y, z]] of Object.entries(o.vectors ?? {})) gl.uniform3f(loc(name), x, y, z);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const active = () => visible && !document.hidden && !lost;
    const schedule = () => {
      if (!raf && active()) raf = requestAnimationFrame(tick);
    };

    const ease = (from: number, to: number, rate: number, dt: number, snap: number) => {
      const v = from + (to - from) * (1 - Math.exp(-rate * dt));
      return Math.abs(to - v) < snap ? to : v;
    };

    function tick(now: number) {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      const o = opts.current;
      const still = reduce.matches;
      const moving = o.animate && o.speed > 0 && !still;
      if (moving) {
        time += dt * o.speed;
        age += dt;
      }

      const darkTo = baseDark() ? 1 : 0;
      // A Theme Switch reveal (data-theme-reveal on <html>) already animates the change; easing
      // here as well would blur the reveal's edge, so the surface snaps to the new theme.
      const revealing = document.documentElement.hasAttribute("data-theme-reveal");
      darkAmt = still || revealing ? darkTo : ease(darkAmt, darkTo, 7, dt, 0.002);
      const amtTo = o.interactive && !still && pointer.inside ? 1 : 0;
      pointer.amt = ease(pointer.amt, amtTo, 3.5, dt, 0.002);
      // exponential lerp, frame-rate independent: 0 follow is nearly locked, 1 drifts well behind
      const rate = 28 * Math.pow(1 / 9, Math.min(1, Math.max(0, o.follow)));
      pointer.x = ease(pointer.x, pointer.tx, rate, dt, 0.1);
      pointer.y = ease(pointer.y, pointer.ty, rate, dt, 0.1);
      pointer.lx = ease(pointer.lx, pointer.x, rate * 0.35, dt, 0.1);
      pointer.ly = ease(pointer.ly, pointer.y, rate * 0.35, dt, 0.1);

      // lay a path point every few px of travel; drop the ones that have faded out
      const t = now / 1000;
      while (path.length && t - path[path.length - 1].t > o.trailLife) path.pop();
      if (pointer.amt > 0 && o.interactive && !still) {
        const head = path[0];
        if (!head || Math.hypot(head.x - pointer.x, head.y - pointer.y) > 6) {
          path.unshift({ x: pointer.x, y: pointer.y, t });
          if (path.length > TRAIL) path.pop();
        }
      }

      render();

      // a step down in resolution each second this device can't keep up
      if (moving && dt > 0 && age > WARM_UP && step < QUALITY.length - 1) {
        judged += dt;
        frames++;
        if (judged >= 1) {
          if (judged / frames > SLOW_FRAME) {
            quality = QUALITY[++step];
            resize();
          }
          judged = 0;
          frames = 0;
        }
      }

      const rippling = rings.some((r) => now / 1000 - r.start < RIPPLE_LIFE);
      const settling =
        rippling ||
        path.length > 0 ||
        darkAmt !== darkTo ||
        pointer.amt !== amtTo ||
        (pointer.amt > 0 &&
          (pointer.x !== pointer.tx || pointer.y !== pointer.ty || pointer.lx !== pointer.x || pointer.ly !== pointer.y));
      if (moving || settling) schedule();
      else last = 0;
    }

    wake.current = () => {
      resize();
      if (!raf && active()) {
        // a prop changed while idle: draw now, then keep going only if something moves
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };

    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      pointer.tx = e.clientX - r.left;
      pointer.ty = r.bottom - e.clientY;
      pointer.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      if (!pointer.seen || pointer.amt === 0) {
        // start the light where the pointer is, instead of sliding in from the last spot
        pointer.x = pointer.lx = pointer.tx;
        pointer.y = pointer.ly = pointer.ty;
        pointer.seen = true;
      }
      if (opts.current.interactive) schedule();
    };
    const onDown = (e: PointerEvent) => {
      onPointer(e);
      if (!opts.current.ripples || !opts.current.interactive || !pointer.inside || reduce.matches) return;
      const oldest = rings.reduce((a, b) => (b.start < a.start ? b : a));
      Object.assign(oldest, { x: pointer.tx, y: pointer.ty, start: performance.now() / 1000 });
      schedule();
    };
    const onLeave = () => {
      pointer.inside = false;
      schedule();
    };
    const onVisibility = () => {
      last = 0;
      schedule();
    };

    const ro = new ResizeObserver(() => {
      resize();
      render(); // redraw at once, so a resize never shows a stretched frame
      schedule();
    });
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      last = 0;
      schedule();
    });
    io.observe(el);

    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onRestored = () => {
      lost = false;
      if (build()) schedule();
      else {
        cv.remove();
        setFailed(true);
      }
    };

    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    window.addEventListener("blur", onLeave);
    document.addEventListener("visibilitychange", onVisibility);
    reduce.addEventListener("change", onVisibility);
    cv.addEventListener("webglcontextlost", onLost);
    cv.addEventListener("webglcontextrestored", onRestored);

    // Over a fallback already on screen (a page still starting up), the first frame fades in
    // rather than popping; anywhere else (off screen, or in a box itself fading in) it just shows.
    const r = el.getBoundingClientRect();
    const seen =
      !reduce.matches &&
      r.bottom > 0 &&
      r.top < innerHeight &&
      (el.checkVisibility?.({ opacityProperty: true, visibilityProperty: true }) ?? false);
    if (seen) {
      cv.style.opacity = "0";
      cv.style.transition = "opacity 500ms ease-out";
    }
    resize();
    render(); // first frame right away, so there's no blank canvas
    if (seen) requestAnimationFrame(() => (cv.style.opacity = "1"));
    schedule();

    return () => {
      cancelAnimationFrame(raf);
      wake.current = () => {};
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerdown", onDown);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      document.removeEventListener("visibilitychange", onVisibility);
      reduce.removeEventListener("change", onVisibility);
      cv.removeEventListener("webglcontextlost", onLost);
      cv.removeEventListener("webglcontextrestored", onRestored);
      pre?.dispose(gl);
      // free the context now: browsers only allow a handful at once
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      cv.remove();
    };
  }, [shader, plainShader]);

  const lightBase = background || "#ffffff";
  const darkBase = backgroundDark || background || "#0a0a0a";
  const light = fallback(isDarkHex(lightBase), lightBase);
  const darkFallback = fallback(isDarkHex(darkBase), darkBase);

  return (
    <div
      ref={root}
      className={cn("relative isolate overflow-hidden [background:var(--shader-fallback)] dark:[background:var(--shader-fallback-dark)]", className)}
      data-fallback={failed || undefined}
      // the fallback for both themes, switched in CSS by the `dark` class, so the server's HTML is
      // right before any script has run
      style={
        {
          "--shader-fallback": light,
          "--shader-fallback-dark": darkFallback,
          ...style,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/** One shade: OKLCH lightness, chroma as a share of the base colour's, and a hue lean in radians. */
export type ShadeStep = readonly [l: number, chroma: number, hue: number];

const encode = (c: number) => {
  const v = c <= 0.0031308 ? c * 12.92 : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(Math.min(1, Math.max(0, v)) * 255)
    .toString(16)
    .padStart(2, "0");
};

// OKLCH -> hex, cutting chroma until the colour fits in sRGB so no shade clips to a harsher hue
export function lchToHex(l: number, c: number, h: number) {
  for (let i = 0; i < 24; i++, c *= 0.9) {
    const a = c * Math.cos(h);
    const b = c * Math.sin(h);
    const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const rgb = [
      4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
      -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
      -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
    ];
    if (rgb.every((v) => v >= -0.001 && v <= 1.001) || i === 23) return `#${rgb.map(encode).join("")}`;
  }
  return "#000000";
}

/** Shades of one colour, one per step, in the order the steps are given. */
export function shadesOf(hex: string, steps: readonly ShadeStep[]) {
  const [, a, b] = hexToOklab(hex);
  const c = Math.hypot(a, b);
  const h = Math.atan2(b, a);
  return steps.map(([l, k, dh]) => lchToHex(l, c * k, h + dh));
}

/** `colors` when it holds 2 or more, else shades of `color`. */
export function paletteOf(color: string, colors: string[] | undefined, steps: readonly ShadeStep[]) {
  const list = colors?.filter(Boolean).slice(0, 6);
  return list && list.length >= 2 ? list : shadesOf(color, steps);
}

// A horizon printed in halftone where it's dark and left smooth where it's light. Night falls from
// one edge over a bright horizon, in bands that arch like the edge of a planet (as in Horizon
// Gradient). The dark part is a screen of dots: small and dim up in the night, growing as the light
// rises until neighbours touch and fuse, leaving only small dark gaps, and then those close too and
// the dots melt into the smooth glow. So the halftone and the gradient are one ramp, with no line
// where one ends. The gaps take a darker shade of the gradient rather than black, so even the
// fused screen stays soft. A slow noise breathes through the bands, and the dots swell and shrink
// with it. The pointer acts as strongly as the night is deep: in full near the dark edge, fading
// through the bands and gone in the light. Under it the screen bulges like a loupe, magnifying the
// dots; its path leaves a trail that prints the smooth light as dots and lifts the dots it
// crosses, fading as it goes; and a click sends a ring of swollen dots out across the screen.
const SHADER = /* glsl */ `
uniform float u_curve;     // how strongly the bands arch
uniform float u_reach;     // how far the dark reaches
uniform float u_softness;  // how gradual the bands are
uniform float u_direction; // edge the dark comes from: 0 top, 1 right, 2 bottom, 3 left
uniform float u_cell;      // dot spacing, css px
uniform float u_dotSize;   // dot size, as a share of the spacing
uniform float u_minDot;    // smallest dot, as a share of the largest
uniform float u_dots;      // how far into the light the halftone reaches
uniform float u_radius;    // pointer reach, css px
uniform float u_lens;      // how strongly the screen bulges under the pointer

// palette as a smooth curve through the stops (Catmull-Rom, in OKLab), so a gradient this large
// melts between colours instead of showing a plateau or a crease at each one
vec3 stop(int i) {
  return u_colors[clamp(i, 0, u_count - 1)];
}

float spline(float a, float b, float c, float d, float s) {
  return 0.5 * (2.0 * b + (c - a) * s + (2.0 * a - 5.0 * b + 4.0 * c - d) * s * s + (3.0 * (b - c) + d - a) * s * s * s);
}

vec3 rampSmooth(float x) {
  float f = clamp(x, 0.0, 1.0) * float(u_count - 1);
  int i = min(int(floor(f)), u_count - 2);
  float s = f - float(i);
  vec3 a = stop(i - 1), b = stop(i), c = stop(i + 1), d = stop(i + 2);
  vec3 lab = vec3(spline(a.x, b.x, c.x, d.x, s), spline(a.y, b.y, c.y, d.y, s), spline(a.z, b.z, c.z, d.z, s));
  float chroma = max(spline(length(a.yz), length(b.yz), length(c.yz), length(d.yz), s), 0.0);
  float len = length(lab.yz);
  if (len > 1e-4) lab.yz *= chroma / len;
  lab.x = clamp(lab.x, 0.0, 1.0);
  return oklabToLinear(lab);
}

float outCubic(float x) {
  x = 1.0 - clamp(x, 0.0, 1.0);
  return 1.0 - x * x * x;
}

// 0 dark .. 1 light at a point (device px)
float toneAt(vec2 frag, float t, float rise) {
  // turn the box so the dark edge is on top; everything below works in that frame
  vec2 f = frag;
  vec2 res = u_res;
  if (u_direction > 2.5) {
    f = vec2(frag.y, u_res.x - frag.x);
    res = u_res.yx;
  } else if (u_direction > 1.5) {
    f = u_res - frag;
  } else if (u_direction > 0.5) {
    f = vec2(u_res.y - frag.y, frag.x);
    res = u_res.yx;
  }
  float aspect = res.x / res.y;
  // x across in units of height, y down from the dark edge
  vec2 p = vec2((f.x / res.x - 0.5) * aspect, 1.0 - f.y / res.y);
  // a narrow box keeps some arch instead of flattening it out
  float k = 1.66 * max(aspect / 1.6, 0.6) / max(u_curve * mix(0.6, 1.0, rise), 0.05);
  vec2 c = vec2(0.05 * sin(t * 0.7), -0.55 + 0.018 * sin(t * 1.1));
  float d = length(vec2((p.x - c.x) / k, p.y - c.y));
  // the arch is strongest near the dark and eases off toward the light, so the lowest bands lie
  // nearly level, as a horizon does
  d = mix(d, p.y - c.y, 0.55 * smoothstep(0.8, 1.35, d));
  d += 0.022 * snoise(vec3(p * 1.1, t * 0.6));
  d -= (u_reach - 1.0) * 0.25 - (1.0 - rise) * 1.1;
  float x = clamp((d - 0.66) / (0.7 * u_softness), 0.0, 1.0);
  return mix(x, x * x * (3.0 - 2.0 * x), 0.5);
}

// how strongly the pointer acts at a point of the given tone: in full where the night is deepest,
// easing off through the bands and gone in the light, so the interaction follows the horizon
float strength(float tone) {
  return 1.0 - smoothstep(0.0, 0.95, tone);
}

// how much the pointer lights a point (device px, y up)
float pointerAt(vec2 p) {
  float r = u_radius * u_dpr;
  return u_pointerAmt * exp(-dot(p - u_pointer, p - u_pointer) / (r * r));
}

vec3 shade(vec2 frag) {
  float t = u_time * 0.1;
  float rise = outCubic(u_age / 2.4);
  float here = toneAt(frag, t, rise);
  vec3 smooth_ = rampSmooth(here);

  // the loupe: the grid is laid out in space pulled in toward the pointer, so the cells (and the
  // tone they read) spread out and grow under it, and settle back into the plain grid around it
  float R = u_radius * u_dpr;
  vec2 q = frag - u_pointer;
  float bulge = u_pointerAmt * u_lens * exp(-dot(q, q) / (R * R)) * strength(here);
  vec2 warped = u_pointer + q * (1.0 - 0.45 * bulge);

  // one tone per dot, read at its centre, so every disc is whole
  float cs = u_cell * u_dpr;
  vec2 c = warped / cs;
  vec2 id = floor(c) + 0.5;
  vec2 center = id * cs;
  float tone = toneAt(center, t, rise);
  // the pointer's light: a soft glow where it rests, the trail along its path and click rings
  float ring = ripples(center);
  float lit = max(max(pointerAt(center) * 0.6, trailField(center, R * 0.6)), ring) * strength(tone);
  // where the halftone gives way to the smooth light: past it the dots have fused
  float end = max(u_dots, 0.02);
  float s = clamp(tone / end, 0.0, 1.0);
  // the pointer's light draws every dot it touches at a clear middle size: small dark dots grow,
  // and fused ones in the light open up into separate dots, so what it prints always reads as dots
  s = mix(s, clamp(s * 0.4 + 0.32, 0.0, 0.6), smoothstep(0.0, 0.6, lit));
  // dots grow with the light; at the end of the screen they overlap their cell's corners (0.71)
  // and the gaps between them close
  float r = u_dotSize * mix(0.5 * u_minDot, 0.74, s * s * (3.0 - 2.0 * s));
  float aa = max(0.75 / cs, length(fwidth(c)) * 0.55);
  float m = 1.0 - smoothstep(r - aa, r + aa, length(c - id));
  // the dot a shade lighter than its tone and the gap a shade darker, so the screen keeps the
  // gradient's average while the gaps never go to black
  vec3 dotColor = rampSmooth(min(tone + 0.18 * (1.0 - s) + lit * 0.2, 1.0));
  vec3 gap = rampSmooth(tone * 0.4);
  vec3 printed = mix(gap, dotColor, m);

  // the screen fades into the smooth light over the last part of its reach; the pointer prints
  // the light wherever it passes
  float screen = 1.0 - smoothstep(end * 0.75, end, tone);
  screen = max(screen, smoothstep(0.05, 0.6, lit));
  vec3 col = mix(smooth_, printed, screen);
  return col;
}
`;

const COLOR = "#f0602a";

// Shades of the colour, darkest first: near-black, a deep ember, the colour itself, then a warm
// glow, a pale haze and near-white. Hue leans red in the dark and toward gold in the light.
const STEPS: ShadeStep[] = [
  [0.1, 0.12, -0.3],
  [0.26, 0.65, -0.18],
  [0.5, 1, -0.05],
  [0.72, 0.85, 0.06],
  [0.88, 0.42, 0.14],
  [0.985, 0.06, 0.18],
];

export type HalftoneHorizonDirection = "top" | "right" | "bottom" | "left";

const DIRECTIONS: HalftoneHorizonDirection[] = ["top", "right", "bottom", "left"];

// where the CSS stand-in's ellipse sits, and its size, for each direction
const FALLBACK = {
  top: "ellipse 140% 95% at 50% -40%",
  right: "ellipse 95% 140% at 140% 50%",
  bottom: "ellipse 140% 95% at 50% 140%",
  left: "ellipse 95% 140% at -40% 50%",
} as const;

export type HalftoneHorizonProps = ShaderBackgroundProps & {
  /** Colour of the sky between the dark and the light; drawn in shades of it. */
  color?: string;
  /** Hex colours, 2 to 6, from the dark edge to the light one. Overrides `color`. */
  colors?: string[];
  /** Edge the dark comes from; the light gathers at the opposite one. */
  direction?: HalftoneHorizonDirection;
  /** How strongly the bands arch; 0 is nearly level. */
  curve?: number;
  /** How far the dark reaches; 1 is the designed height. */
  reach?: number;
  /** How gradual the bands are; higher spreads them over more of the frame. */
  softness?: number;
  /** Distance between dots, in px. */
  spacing?: number;
  /** Dot size, as a share of the spacing; 1 lets the dots fuse just before the light. */
  dotSize?: number;
  /** Smallest dot (in the dark), as a share of a full one; 0 lets dark dots vanish. */
  minDot?: number;
  /** How far into the light the halftone reaches, 0 to 1; past it the gradient is smooth. */
  dots?: number;
  /** How far the pointer's light reaches, in px. */
  radius?: number;
  /** How lazily the light follows the pointer, 0 (locked) to 1 (drifts after it). */
  follow?: number;
  /** How strongly the dots bulge under the pointer, like a loupe; 0 turns it off. */
  lens?: number;
  /** Seconds the pointer's trail takes to fade. */
  trailLength?: number;
  /** A click sends a ring of swollen dots out across the screen. */
  ripples?: boolean;
};

export function HalftoneHorizon({
  color = COLOR,
  colors,
  direction = "top",
  curve = 1,
  reach = 1,
  softness = 1.1,
  spacing = 7,
  dotSize = 1,
  minDot = 0.25,
  dots = 0.7,
  radius = 120,
  speed = 1,
  animate = true,
  interactive = true,
  grain = 0.04,
  seed = 0,
  follow = 0.4,
  lens = 0.6,
  trailLength = 1.2,
  ripples = true,
  ...rest
}: HalftoneHorizonProps) {
  const palette = paletteOf(color || COLOR, colors, STEPS);

  return (
    <ShaderSurface
      shader={SHADER}
      uniforms={{
        u_direction: Math.max(0, DIRECTIONS.indexOf(direction)),
        u_curve: curve,
        u_reach: reach,
        u_softness: softness,
        u_cell: spacing,
        u_dotSize: dotSize,
        u_minDot: minDot,
        u_dots: dots,
        u_radius: radius,
        u_lens: lens,
      }}
      colors={palette}
      speed={speed}
      animate={animate}
      interactive={interactive}
      grain={grain}
      seed={seed}
      follow={follow}
      trailLife={trailLength}
      ripples={ripples}
      maxDpr={2}
      fallback={() =>
        `radial-gradient(${FALLBACK[direction] ?? FALLBACK.top}, ${palette
          .map((c, i) => `${c} ${Math.round(58 + (i / (palette.length - 1)) * 42)}%`)
          .join(", ")})`
      }
      {...rest}
    />
  );
}
