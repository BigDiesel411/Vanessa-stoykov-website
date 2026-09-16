import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT, TOPICS, ROOT_ARTICLES } from './config.mjs';

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(html) {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// Filenames under a topic folder that are never articles, regardless of
// which naming convention future articles use. Add to this list rather
// than tightening the article match itself — new patterns like
// "stop-saying-im-bad-with-money.html" should still count as articles.
const NON_ARTICLE_PATTERNS = [
  /^Topic-.*\.html$/i, // per-topic index/listing pages (Topic-Divorce.dc.html, etc.)
];

/** Any .html file in a topic folder is an article unless it's a known
 *  site-structure page (topic index pages, etc.) or a hidden/dotfile. */
export function isArticleFile(filename) {
  if (filename.startsWith('.')) return false;
  if (!/\.html$/i.test(filename)) return false;
  return !NON_ARTICLE_PATTERNS.some((re) => re.test(filename));
}

/** Find every article file under each topic folder, plus the explicit
 *  ROOT_ARTICLES list of articles authored as flat files at the repo root
 *  (see the comment on ROOT_ARTICLES in config.mjs for why those can't be
 *  discovered by directory scanning). */
export async function discoverArticles() {
  const articles = [];
  for (const topic of TOPICS) {
    const dir = path.join(REPO_ROOT, topic);
    let entries;
    try {
      entries = await fs.readdir(dir);
    } catch {
      continue; // topic folder missing entirely — skip it
    }
    for (const file of entries.sort()) {
      if (isArticleFile(file)) {
        const absPath = path.join(dir, file);
        articles.push({ topic, file, absPath, relPath: path.join(topic, file) });
      }
    }
  }
  for (const { file, topic } of ROOT_ARTICLES) {
    articles.push({ topic, file, absPath: path.join(REPO_ROOT, file), relPath: file });
  }
  return articles;
}

/** Turn a filename into a readable fallback title: hyphens/underscores to
 *  spaces, title-cased — used only when no title markup is found at all. */
function titleFromFilename(absPath) {
  const base = path.basename(absPath).replace(/\.dc\.html$/i, '').replace(/\.html$/i, '');
  return base
    .replace(/[-_]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Try several title conventions, from the site's own design-canvas
 *  template down to a filename-derived guess, so a differently-authored
 *  article (different naming style, not built with the canvas tool)
 *  still gets a usable title for image prompts. */
function extractTitle(html, absPath) {
  const dcMatch = html.match(/ARTICLE<\/div>\s*<h2[^>]*>(.*?)<\/h2>/s);
  if (dcMatch) return stripTags(dcMatch[1]);

  const h1Match = html.match(/<h1[^>]*>(.*?)<\/h1>/is);
  if (h1Match) return stripTags(h1Match[1]);

  const titleTagMatch = html.match(/<title[^>]*>(.*?)<\/title>/is);
  if (titleTagMatch) return stripTags(titleTagMatch[1]);

  const h2Match = html.match(/<h2[^>]*>(.*?)<\/h2>/is);
  if (h2Match) return stripTags(h2Match[1]);

  return titleFromFilename(absPath);
}

/** Scope keyword scanning to the actual article body, not the shared nav
 *  and footer (which link to every topic, including "Divorce", and would
 *  otherwise false-positive every single article). Tries the site's own
 *  design-canvas template markers first, then falls back to generic
 *  <main>/<article>...<footer> boundaries for a differently-built page,
 *  and finally the whole page if neither is found. */
function extractBodyText(html) {
  const dcMarker = '<section style="padding:72px 24px 0;">';
  let start = html.indexOf(dcMarker);

  if (start === -1) {
    const mainMatch = html.match(/<(main|article)[ >]/i);
    if (mainMatch) start = mainMatch.index;
  }

  const footerMatch = html.match(/<footer[ >]/i);
  const footerStart = footerMatch ? footerMatch.index : -1;

  const bodyHtml =
    start !== -1 && footerStart !== -1 && footerStart > start
      ? html.slice(start, footerStart)
      : start !== -1
        ? html.slice(start)
        : html;

  return stripTags(bodyHtml);
}

/**
 * Detect the newer image mechanism used by non-canvas articles: a
 * `<figure data-image-direction="..." data-image-target="X-hero.jpg"
 * data-thumb-target="X-thumb.jpg">` wrapper around a placeholder `<img>`,
 * instead of an `<image-slot>` custom element. Attribute order varies
 * between articles, so each is matched independently.
 *
 * Returns every such figure in document order (usually just one — the
 * hero — but a longer article can have extra body figures further down,
 * e.g. a `-mid.jpg`, with no `data-thumb-target` since only the hero
 * needs a thumbnail). Callers that only care about the hero use index 0.
 */
function extractAllFigureImages(html) {
  const figures = [];
  const figureRe = /<figure\s+([^>]*?)>/gi;
  let m;
  while ((m = figureRe.exec(html))) {
    const attrs = m[1];
    const targetMatch = attrs.match(/\bdata-image-target="([^"]*)"/);
    if (!targetMatch) continue;
    const directionMatch = attrs.match(/\bdata-image-direction="([^"]*)"/);
    const thumbMatch = attrs.match(/\bdata-thumb-target="([^"]*)"/);
    figures.push({
      placeholder: directionMatch ? decodeEntities(directionMatch[1]) : '',
      heroTarget: targetMatch[1],
      thumbTarget: thumbMatch ? thumbMatch[1] : null,
    });
  }
  return figures;
}

/**
 * Parse one article file: title, its hero image mechanism (whichever of
 * <image-slot> or the newer <figure data-image-target> wrapper it uses —
 * see extractFigureImage), and the full plain-text body for keyword
 * scanning.
 *
 * `hero` is normalized across both mechanisms to always carry a
 * `placeholder` (the scene brief). `heroMechanism` tells the caller which
 * one it came from — 'image-slot' patches via setSlotSrc(html, hero.id,
 * ...), 'figure' patches via setFigureImageSrc(html, hero.heroTarget,
 * ...) and additionally names the exact hero/thumb output filenames the
 * article itself expects (hero.heroTarget / hero.thumbTarget). An article
 * with neither mechanism gets hero: null — images still generate, they
 * just have nothing to wire into.
 *
 * `extraFigures` lists any additional `data-image-target` figures beyond
 * the hero (figure-mechanism articles only) — e.g. a `-mid.jpg` body
 * image further down the page. Each entry has the same shape as `hero`
 * (placeholder/heroTarget/thumbTarget) and patches the same way via
 * setFigureImageSrc(html, entry.heroTarget, ...).
 */
export async function parseArticle(absPath) {
  const html = await fs.readFile(absPath, 'utf8');

  const title = extractTitle(html, absPath);

  const slots = [];
  const slotRe = /<image-slot\s+([^>]*?)>/g;
  let m;
  while ((m = slotRe.exec(html))) {
    const attrs = m[1];
    const idMatch = attrs.match(/\bid="([^"]*)"/);
    const placeholderMatch = attrs.match(/\bplaceholder="([^"]*)"/);
    if (!idMatch) continue;
    slots.push({
      id: idMatch[1],
      placeholder: placeholderMatch ? decodeEntities(placeholderMatch[1]) : '',
      hasSrc: /\bsrc="[^"]*"/.test(attrs),
    });
  }

  let hero = slots.find((s) => s.id.endsWith('-hero')) || null;
  let heroMechanism = hero ? 'image-slot' : null;
  let extraFigures = [];

  if (!hero) {
    const figureImages = extractAllFigureImages(html);
    if (figureImages.length) {
      hero = figureImages[0];
      heroMechanism = 'figure';
      extraFigures = figureImages.slice(1);
    }
  }

  const others = slots.filter((s) => s !== hero);
  const bodyText = extractBodyText(html);

  return { absPath, title, slots, hero, heroMechanism, extraFigures, others, bodyText, html };
}
