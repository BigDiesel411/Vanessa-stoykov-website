import { BRAND, TOPIC_LABELS } from './config.mjs';

export const STYLE_GUIDE =
  `Editorial photography for Vanessa Stoykov, an Australian financial-wellbeing brand ` +
  `for confident adults 50+. Real, warm, dignified people — never stiff stock-photo poses. ` +
  `Natural Australian light, shallow depth of field, contemporary interiors or outdoor settings. ` +
  `Lean the wardrobe, props, or background into this palette: deep navy blue (${BRAND.navy}) as ` +
  `the dominant tone, warm gold (${BRAND.gold}) as a small bright accent (light, object, or detail), ` +
  `and soft light blue (${BRAND.lightBlue}) and soft dusty pink (${BRAND.softPink}) as gentle ` +
  `supporting tones in lighting, wardrobe, or background elements. Photorealistic only — no ` +
  `illustration, no cartoon style, no text, no logos, no watermarks.`;

const TONE_NOTE =
  'Favour a moment of quiet resolve, connection, or clarity over anything literal or graphic — ' +
  'this audience wants to feel understood, not unsettled.';

export function buildHeroPrompt({ title, topic, hero }) {
  const brief = hero?.placeholder || title;
  return [
    STYLE_GUIDE,
    '',
    `Article: "${title}" (topic: ${TOPIC_LABELS[topic] || topic}).`,
    `Scene brief from the author: ${brief}.`,
    `Create a single photorealistic 16:9 hero image capturing this moment or theme with warmth ` +
      `and emotional honesty, leaving clean negative space suitable for a website banner. ${TONE_NOTE}`,
  ].join('\n');
}

export function buildThumbPrompt({ title, topic, hero }) {
  const brief = hero?.placeholder || title;
  return [
    STYLE_GUIDE,
    '',
    `Article: "${title}" (topic: ${TOPIC_LABELS[topic] || topic}).`,
    `Scene brief: ${brief}.`,
    `Create a simple, tightly-cropped photorealistic image with one clear focal subject, designed ` +
      `to read well as a small article thumbnail. Keep the composition uncluttered. ${TONE_NOTE}`,
  ].join('\n');
}
