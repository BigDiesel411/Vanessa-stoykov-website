import fs from 'node:fs/promises';
import path from 'node:path';
import { REPO_ROOT, TOPICS } from './config.mjs';

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

/** Find every Article-*.dc.html file under each topic folder. */
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
      if (/^Article-.*\.dc\.html$/.test(file)) {
        const absPath = path.join(dir, file);
        articles.push({ topic, file, absPath, relPath: path.join(topic, file) });
      }
    }
  }
  return articles;
}

/**
 * Parse one article file: title, every <image-slot> (id + placeholder
 * caption written by whoever built the page — a ready-made scene brief),
 * and the full plain-text body for keyword scanning.
 */
export async function parseArticle(absPath) {
  const html = await fs.readFile(absPath, 'utf8');

  const titleMatch = html.match(/ARTICLE<\/div>\s*<h2[^>]*>(.*?)<\/h2>/s);
  const title = titleMatch ? stripTags(titleMatch[1]) : path.basename(absPath);

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

  const hero = slots.find((s) => s.id.endsWith('-hero')) || null;
  const others = slots.filter((s) => s !== hero);

  // Scope keyword scanning to the actual article body — the shared nav and
  // footer on every page link to every topic (including "Divorce") and
  // would otherwise false-positive every single article.
  const sectionStart = html.indexOf('<section style="padding:72px 24px 0;">');
  const footerStart = html.indexOf('<footer');
  const bodyHtml =
    sectionStart !== -1 && footerStart !== -1
      ? html.slice(sectionStart, footerStart)
      : html;
  const bodyText = stripTags(bodyHtml);

  return { absPath, title, slots, hero, others, bodyText, html };
}
