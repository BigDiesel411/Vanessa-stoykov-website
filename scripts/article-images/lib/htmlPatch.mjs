function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Set (or replace) the src="" attribute on a specific <image-slot id="...">
 * tag within an HTML string. Returns the patched HTML, or null if the slot
 * id wasn't found (caller decides whether that's fatal).
 */
export function setSlotSrc(html, slotId, srcValue) {
  const re = new RegExp(`(<image-slot\\s+id="${escapeRegex(slotId)}"[^>]*?)(\\s*>)`, 's');
  const m = re.exec(html);
  if (!m) return null;

  let attrs = m[1];
  if (/\ssrc="[^"]*"/.test(attrs)) {
    attrs = attrs.replace(/\ssrc="[^"]*"/, ` src="${srcValue}"`);
  } else {
    attrs += ` src="${srcValue}"`;
  }

  return html.slice(0, m.index) + attrs + m[2] + html.slice(m.index + m[0].length);
}

/**
 * Set (or replace) the src="" attribute on the <img> inside the
 * `<figure ... data-image-target="targetFilename" ...>...</figure>` block
 * matching targetFilename — the newer image mechanism used alongside
 * <image-slot> (see extractFigureImage in lib/articles.mjs). Attribute
 * order on the <figure> tag isn't assumed. Returns the patched HTML, or
 * null if no matching figure (or no <img> inside it) was found.
 */
export function setFigureImageSrc(html, targetFilename, srcValue) {
  const figureRe = new RegExp(
    `(<figure\\b[^>]*data-image-target="${escapeRegex(targetFilename)}"[^>]*>)([\\s\\S]*?)(<\\/figure>)`,
    'i'
  );
  const figureMatch = figureRe.exec(html);
  if (!figureMatch) return null;

  const [whole, openTag, inner, closeTag] = figureMatch;
  const imgMatch = /<img\s+([^>]*?)\/?>/i.exec(inner);
  if (!imgMatch) return null;

  let attrs = imgMatch[1];
  if (/\bsrc="[^"]*"/.test(attrs)) {
    attrs = attrs.replace(/\bsrc="[^"]*"/, `src="${srcValue}"`);
  } else {
    attrs = `src="${srcValue}" ${attrs}`;
  }
  const newInner =
    inner.slice(0, imgMatch.index) + `<img ${attrs}>` + inner.slice(imgMatch.index + imgMatch[0].length);

  return html.slice(0, figureMatch.index) + openTag + newInner + closeTag + html.slice(figureMatch.index + whole.length);
}
