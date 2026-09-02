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
];

export const TOPIC_LABELS = {
  divorce: 'Divorce',
  retirement: 'Retirement',
  inheritance: 'Inheritance & Estate Planning',
  moneymindset: 'Money Mindset',
  relationships: 'Relationships',
  adultchildren: 'Adult Children',
  ageingparents: 'Ageing Parents',
};

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
