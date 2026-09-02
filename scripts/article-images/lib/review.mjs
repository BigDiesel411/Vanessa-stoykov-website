// Topics that always need a human look before an auto-generated image is
// published, regardless of what any individual article says.
const SENSITIVE_TOPICS = new Set(['divorce', 'inheritance']);

// Content-based backstop: catches death/grief/divorce themes that surface
// in articles filed under a topic that isn't itself sensitive (e.g. an
// "ageing parents" piece about palliative care, or a "money mindset" piece
// that touches on losing a spouse).
const SENSITIVE_KEYWORDS = [
  [/divorc/i, 'divorce'],
  [/\bdeath\b/i, 'death'],
  [/\bdied\b/i, 'died'],
  [/\bdying\b/i, 'dying'],
  [/\bgrief\b/i, 'grief'],
  [/grieving/i, 'grieving'],
  [/bereave/i, 'bereavement'],
  [/funeral/i, 'funeral'],
  [/passed away/i, 'passed away'],
  [/palliative/i, 'palliative care'],
  [/terminal(ly)? ill/i, 'terminal illness'],
  [/\bwidow/i, 'widow(er)'],
  [/end[- ]of[- ]life/i, 'end of life'],
  [/suicide/i, 'suicide'],
  [/dementia/i, 'dementia'],
];

/**
 * Decide whether an article's auto-generated image needs a human check
 * before publishing, per the brand rule: divorce, death, grief, and
 * inheritance topics are never auto-published.
 */
export function assessSensitivity(topic, text) {
  if (SENSITIVE_TOPICS.has(topic)) {
    return { flagged: true, reason: `topic "${topic}" is always reviewed` };
  }
  const hit = SENSITIVE_KEYWORDS.find(([re]) => re.test(text));
  if (hit) {
    return { flagged: true, reason: `content mentions "${hit[1]}"` };
  }
  return { flagged: false, reason: null };
}
