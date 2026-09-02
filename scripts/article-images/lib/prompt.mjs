import { BRAND, TOPIC_LABELS } from './config.mjs';

export const STYLE_GUIDE =
  `Editorial photography for Vanessa Stoykov, an Australian financial-wellbeing brand ` +
  `for confident adults. Real, warm, dignified people — never stiff stock-photo poses. ` +
  `Natural Australian light, shallow depth of field, contemporary interiors or outdoor settings. ` +
  `Lean the wardrobe, props, or background into this palette: deep navy blue (${BRAND.navy}) as ` +
  `the dominant tone, warm gold (${BRAND.gold}) as a small bright accent (light, object, or detail), ` +
  `and soft light blue (${BRAND.lightBlue}) and soft dusty pink (${BRAND.softPink}) as gentle ` +
  `supporting tones in lighting, wardrobe, or background elements. Photorealistic only — no ` +
  `illustration, no cartoon style, no text, no logos, no watermarks.`;

const TONE_NOTE =
  'Favour a moment of quiet resolve, connection, or clarity over anything literal or graphic — ' +
  'this audience wants to feel understood, not unsettled.';

// ── Casting: vary who's depicted, per-article but deterministic ────────────
// The same article always casts the same person(s) across its hero and
// thumbnail (and re-runs), but different articles land on different
// gender/ethnicity/age combinations so a topic folder doesn't read as one
// person photographed ten times.

const ETHNICITIES = [
  'Anglo-Celtic Australian',
  'Aboriginal or Torres Strait Islander Australian',
  'Chinese-Australian',
  'Indian-Australian',
  'Italian-Australian',
  'Vietnamese-Australian',
  'Lebanese-Australian',
  'Greek-Australian',
  'Filipino-Australian',
  'African-Australian',
];

const GENDERS = ['a woman', 'a man'];

const OLDER_AGES = ['in their early 60s', 'in their late 60s', 'in their 70s', 'in their early 80s'];
const YOUNGER_ADULT_AGES = ['in their early 30s', 'in their late 30s', 'in their 40s'];
const BROAD_ADULT_AGES = ['in their 30s', 'in their 40s', 'in their 50s', 'in their 60s', 'in their 70s'];

// Topics whose subjects should generally read as older (60s-80s).
const OLDER_SKEWED_TOPICS = new Set(['retirement', 'ageingparents']);

// djb2-ish string hash — deterministic, no crypto needed, just spread.
function hashString(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function seededPick(list, seed) {
  return list[seed % list.length];
}

function detectGenderHint(text) {
  if (/\bcouples?\b/i.test(text)) return 'couple';
  if (/\b(woman|women|wife|mother|daughter|sister|grandmother)\b/i.test(text)) return 'female';
  if (/\b(man|men|husband|father|son|brother|grandfather)\b/i.test(text)) return 'male';
  return null;
}

function castSingle(seedBase, ages, forcedGender) {
  const ethnicity = seededPick(ETHNICITIES, hashString(`${seedBase}|eth`));
  const age = seededPick(ages, hashString(`${seedBase}|age`));
  const gender =
    forcedGender === 'female'
      ? 'a woman'
      : forcedGender === 'male'
        ? 'a man'
        : seededPick(GENDERS, hashString(`${seedBase}|gender`));
  return `${gender} of ${ethnicity} background, ${age}`;
}

function castCouple(seedBase, ages) {
  const ethnicity = seededPick(ETHNICITIES, hashString(`${seedBase}|eth`));
  const age = seededPick(ages, hashString(`${seedBase}|age`));
  return `a couple of ${ethnicity} background, both ${age}`;
}

/**
 * Build the casting instruction for one article. `seedBase` should be
 * stable per article (topic + title) and identical between its hero and
 * thumb prompts, so the same person shows up in both images.
 */
function buildCasting(topic, seedBase, placeholderText) {
  if (topic === 'adultchildren') {
    // A mix of a younger adult and their older parent — cast independently
    // so they vary in gender/ethnicity and don't need to visually match.
    const younger = castSingle(`${seedBase}|younger`, YOUNGER_ADULT_AGES);
    const older = castSingle(`${seedBase}|older`, OLDER_AGES);
    return (
      `Depict two people: an adult child — ${younger} — and their ageing parent — ${older}.`
    );
  }

  const ages = OLDER_SKEWED_TOPICS.has(topic) ? OLDER_AGES : BROAD_ADULT_AGES;
  const hint = detectGenderHint(placeholderText || '');

  if (hint === 'couple') {
    return `Depict ${castCouple(seedBase, ages)}.`;
  }
  return `Depict ${castSingle(seedBase, ages, hint)}.`;
}

function buildPrompt({ title, topic, hero, framingInstruction }) {
  const brief = hero?.placeholder || title;
  const seedBase = `${topic}::${title}`;
  const casting = buildCasting(topic, seedBase, brief);

  return [
    STYLE_GUIDE,
    '',
    `Article: "${title}" (topic: ${TOPIC_LABELS[topic] || topic}).`,
    `Scene brief from the author: ${brief}.`,
    casting,
    framingInstruction,
    TONE_NOTE,
  ].join('\n');
}

export function buildHeroPrompt({ title, topic, hero }) {
  return buildPrompt({
    title,
    topic,
    hero,
    framingInstruction:
      'Create a single photorealistic 16:9 hero image capturing this moment or theme with warmth ' +
      'and emotional honesty, leaving clean negative space suitable for a website banner.',
  });
}

export function buildThumbPrompt({ title, topic, hero }) {
  return buildPrompt({
    title,
    topic,
    hero,
    framingInstruction:
      'Create a simple, tightly-cropped photorealistic image with one clear focal subject, designed ' +
      'to read well as a small article thumbnail. Keep the composition uncluttered.',
  });
}
