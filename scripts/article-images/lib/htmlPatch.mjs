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
