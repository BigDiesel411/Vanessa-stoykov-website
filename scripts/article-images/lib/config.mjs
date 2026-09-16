import path from 'node:path';
import { fileURLToPath } from 'node:url';

// scripts/article-images/lib/config.mjs -> repo root is three levels up.
export const REPO_ROOT = path.resolve(fileURLToPath(import.meta.url), '../../../..');

export const TOPICS = [
  'divorce',
  'retirement',
  'inheritance',
  'moneymindset',
  'relationships',
  'adultchildren',
  'ageingparents',
  'careerincome',
  'investing',
];

export const TOPIC_LABELS = {
  divorce: 'Divorce',
  retirement: 'Retirement',
  inheritance: 'Inheritance & Estate Planning',
  moneymindset: 'Money Mindset',
  relationships: 'Relationships',
  adultchildren: 'Adult Children',
  ageingparents: 'Ageing Parents',
  careerincome: 'Career & Income',
  investing: 'Investing',
  property: 'Property',
};

// Newer articles are sometimes authored as flat files at the repo root
// instead of inside a topic folder (no "property/" folder exists at all,
// and several other topics have root-level articles alongside their
// folder-based ones). discoverArticles() can't find these via directory
// scanning, so they're listed explicitly here with the topic their own
// articleSection metadata declares. A root file already duplicated inside
// a real topic folder (same content, different location) is NOT listed
// here — the folder copy is the canonical one the site actually links to.
export const ROOT_ARTICLES = [
  { file: 'bank-of-mum-and-dad-help-or-headache.html', topic: 'property' },
  { file: 'buying-a-home-or-an-identity.html', topic: 'property' },
  { file: 'five-conversations-before-buying-property-together.html', topic: 'property' },
  { file: 'stay-or-sell-property-in-your-50s.html', topic: 'property' },
  { file: 'timely-advice-massive-tax-savings.html', topic: 'property' },
  { file: 'why-property-fomo-is-expensive.html', topic: 'property' },
  { file: 'could-you-afford-to-leave-your-relationship.html', topic: 'relationships' },
  { file: 'financial-infidelity-hidden-money.html', topic: 'relationships' },
  { file: 'money-conversation-couples-should-have.html', topic: 'relationships' },
  { file: 'when-one-person-earns-more.html', topic: 'relationships' },
  { file: 'why-smart-couples-still-fight-about-money.html', topic: 'relationships' },
];

export const BRAND = {
  navy: '#001E60',
  gold: '#FFB81C',
  lightBlue: '#8ABADD',
  softPink: '#F09491',
};

// Gemini "Nano Banana Pro" image model. Override with GEMINI_IMAGE_MODEL if
// Google renames/versions it (e.g. to a -preview suffix) before this ships.
export const DEFAULT_MODEL = 'gemini-3-pro-image';

export const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const OUTPUT_DIR = path.join(REPO_ROOT, 'assets', 'generated');
export const REVIEW_DIR = path.join(REPO_ROOT, 'needs-review');
export const MANIFEST_PATH = path.join(REPO_ROOT, 'scripts', 'article-images', 'generation-log.json');

export const HERO_IMAGE_CONFIG = { aspectRatio: '16:9', imageSize: '2K' };
export const THUMB_IMAGE_CONFIG = { aspectRatio: '4:3', imageSize: '1K' };
