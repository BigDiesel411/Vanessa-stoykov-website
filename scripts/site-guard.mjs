#!/usr/bin/env node
// Regression guard for problems hit the week of 2026-10-27 to 11-02:
// a bad GitHub Desktop stash that committed raw merge-conflict markers,
// a leftover CDATA close bracket ("]]>") rendering as visible text, the
// same numbered-duplicate files ("Name 2.html") reappearing, a mailto:
// link replacing a working form, the legal footer disappearing from
// pages, and the Formspree form ID changing.
//
// No dependencies — only Node builtins. Run with:
//   node scripts/site-guard.mjs
//
// Exits 1 (and prints every offending file) if any FAIL-level problem
// is found. WARN-level problems are reported but don't fail the run.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(fileURLToPath(import.meta.url), '../..');
const EXCLUDE_DIRS = new Set(['.git', 'node_modules']);

// Pre-existing " 2"/" 3"/etc. duplicate files, known today and scheduled
// for deletion in a separate PR. Warn (don't fail) on exactly these; any
// OTHER file matching the same naming pattern is new and must fail.
const KNOWN_DUPLICATES = new Set([
  'GuideOffer.dc 2.html',
  'MD-Episode-1-Marriage-Over-Business-Next.dc 2.html',
  'MD-Episode-2-House-On-The-Line.dc 2.html',
  'MD-Episode-3-Investment-Property-Now.dc 2.html',
  'MoneyDilemmas.dc 2.html',
  'ThankYou-BankOfMumAndDad.dc 2.html',
  'ThankYou-DivorceGuide.dc 2.html',
  'ThankYou-PropertyGuide.dc 2.html',
  'VSP-Episode-1-The-Power-Of-Time.dc 2.html',
  'VSP-Episode-2-The-Power-Of-Focus.dc 2.html',
  'VSP-Episode-3-The-Power-Of-Belief.dc 2.html',
  'VSP-Episode-4-Desires-And-Choices.dc 2.html',
  'VSP-Episode-5-Action.dc 2.html',
  'VanessaStoykovPodcast.dc 2.html',
  'money-dilemmas 2.js',
]);

// Pages that carried the legal footer disclaimer as of 2026-11-02 (the
// day this guard was written), excluding the " 2"/" 3" duplicates above.
// Add a page's relative path here once it's meant to carry the footer —
// the guard then requires it to actually contain the sentence below.
const FOOTER_BASELINE = [
  "About.dc.html",
  "Author-AndrewBeks.dc.html",
  "Author-AnnikaBradley.dc.html",
  "Author-AntoinetteColbran.dc.html",
  "Author-AntonyPerring.dc.html",
  "Author-ConradFrancis.dc.html",
  "Author-JoshuaPennell.dc.html",
  "Author-JulieHyde.dc.html",
  "Author-KathySkantzos.dc.html",
  "Author-KimPayne.dc.html",
  "Author-LouJohnson.dc.html",
  "Author-MarkHoy.dc.html",
  "Author-MichaelCrooks.dc.html",
  "Author-NatalliaSmith.dc.html",
  "Author-RebeccaPritchard.dc.html",
  "Author-ShayneSommer.dc.html",
  "Author-SidLal.dc.html",
  "Author-VanessaStoykov.dc.html",
  "Author-WayneLeggett.dc.html",
  "Authors.dc.html",
  "Books.dc.html",
  "Contact.dc.html",
  "Episode-1-Debt-And-Money-Stress.dc.html",
  "Episode-2-Starting-Over-After-Divorce.dc.html",
  "Episode-3-Helping-Adult-Children.dc.html",
  "EvolutionMediaGroup.dc.html",
  "FindAnAdvisor.dc.html",
  "Guides.dc.html",
  "Homepage.dc.html",
  "LegalDisclaimer.dc.html",
  "MD-Episode-1-Marriage-Over-Business-Next.dc.html",
  "MD-Episode-2-House-On-The-Line.dc.html",
  "MD-Episode-3-Investment-Property-Now.dc.html",
  "MoneyDilemmas.dc.html",
  "Podcasts.dc.html",
  "Privacy.dc.html",
  "SearchResults.dc.html",
  "Speaking.dc.html",
  "ThankYou-BankOfMumAndDad.dc.html",
  "ThankYou-DivorceGuide.dc.html",
  "ThankYou-PropertyGuide.dc.html",
  "Topic-AdultChildren.dc.html",
  "Topic-AgeingParents.dc.html",
  "Topic-CareerIncome.dc.html",
  "Topic-Investing.dc.html",
  "Topic-MoneyMindset.dc.html",
  "Topic-Property.dc.html",
  "Topic-Relationships.dc.html",
  "Topic-Retirement.dc.html",
  "UnlearnMoneyQuiz.dc.html",
  "VSP-Episode-1-The-Power-Of-Time.dc.html",
  "VSP-Episode-2-The-Power-Of-Focus.dc.html",
  "VSP-Episode-3-The-Power-Of-Belief.dc.html",
  "VSP-Episode-4-Desires-And-Choices.dc.html",
  "VSP-Episode-5-Action.dc.html",
  "VanessaStoykovPodcast.dc.html",
  "adultchildren/guarantor-for-your-adult-childs-home-loan.html",
  "adultchildren/supporting-adult-children-fairness-and-boundaries.html",
  "adultchildren/supporting-adult-children-protect-their-future.html",
  "adultchildren/supporting-adult-children-where-to-draw-the-line.html",
  "ageingparents/About.dc.html",
  "ageingparents/Author-VanessaStoykov.dc.html",
  "ageingparents/Authors.dc.html",
  "ageingparents/Books.dc.html",
  "ageingparents/Contact.dc.html",
  "ageingparents/Episode-1-Debt-And-Money-Stress.dc.html",
  "ageingparents/Episode-2-Starting-Over-After-Divorce.dc.html",
  "ageingparents/Episode-3-Helping-Adult-Children.dc.html",
  "ageingparents/FindAnAdvisor.dc.html",
  "ageingparents/Guides.dc.html",
  "ageingparents/Podcasts.dc.html",
  "ageingparents/SearchResults.dc.html",
  "ageingparents/Speaking.dc.html",
  "ageingparents/Topic-AdultChildren.dc.html",
  "ageingparents/Topic-AgeingParents.dc.html",
  "ageingparents/Topic-CareerIncome.dc.html",
  "ageingparents/Topic-Investing.dc.html",
  "ageingparents/Topic-MoneyMindset.dc.html",
  "ageingparents/Topic-Property.dc.html",
  "ageingparents/Topic-Relationships.dc.html",
  "ageingparents/Topic-Retirement.dc.html",
  "ageingparents/UnlearnMoneyQuiz.dc.html",
  "ageingparents/VSP-Episode-1-The-Power-Of-Time.dc.html",
  "ageingparents/VSP-Episode-2-The-Power-Of-Focus.dc.html",
  "ageingparents/VSP-Episode-3-The-Power-Of-Belief.dc.html",
  "ageingparents/VSP-Episode-4-Desires-And-Choices.dc.html",
  "ageingparents/VSP-Episode-5-Action.dc.html",
  "ageingparents/VanessaStoykovPodcast.dc.html",
  "ageingparents/adultchildren/guarantor-for-your-adult-childs-home-loan.html",
  "ageingparents/adultchildren/supporting-adult-children-fairness-and-boundaries.html",
  "ageingparents/adultchildren/supporting-adult-children-protect-their-future.html",
  "ageingparents/adultchildren/supporting-adult-children-where-to-draw-the-line.html",
  "ageingparents/aged-care-planning-three-costly-mistakes.html",
  "ageingparents/aged-care-the-great-divide.html",
  "ageingparents/ageingparents/aged-care-planning-three-costly-mistakes.html",
  "ageingparents/ageingparents/inheritance-is-not-a-financial-plan.html",
  "ageingparents/ageingparents/talk-to-parents-before-a-crisis.html",
  "ageingparents/ageingparents/what-do-your-parents-own-and-owe.html",
  "ageingparents/ageingparents/when-you-become-parent-to-your-parents.html",
  "ageingparents/ageingparents/who-pays-for-ageing-parents.html",
  "ageingparents/careerincome/career-you-built-isnt-what-you-want.html",
  "ageingparents/careerincome/financial-cost-of-staying-in-a-job-you-hate.html",
  "ageingparents/careerincome/income-is-your-biggest-financial-asset.html",
  "ageingparents/careerincome/not-too-old-to-earn-more.html",
  "ageingparents/careerincome/pay-rise-conversation-women-delay.html",
  "ageingparents/divorce/Topic-Divorce.dc.html",
  "ageingparents/divorce/after-divorce-should-you-keep-the-family-home.html",
  "ageingparents/divorce/divorce-financial-lessons-for-women-after-50.html",
  "ageingparents/divorce/divorce-three-mistakes-women-over-50-must-avoid.html",
  "ageingparents/divorce/divorce-weddings-and-money.html",
  "ageingparents/divorce/how-to-survive-a-divorce.html",
  "ageingparents/divorce/inheritance-and-divorce-what-happens-to-your-money.html",
  "ageingparents/inheritance-is-not-a-financial-plan.html",
  "ageingparents/inheritance/Topic-Inheritance.dc.html",
  "ageingparents/inheritance/estate-planning-when-theres-no-will.html",
  "ageingparents/inheritance/handling-unequal-wills-and-family-emotions.html",
  "ageingparents/inheritance/inheritance-avoiding-family-conflict-caring-for-parents.html",
  "ageingparents/inheritance/inheritance-end-of-life-money-mistakes.html",
  "ageingparents/inheritance/inheritance-in-second-relationships.html",
  "ageingparents/inheritance/inheritance-planning-for-dementia-three-mistakes.html",
  "ageingparents/inheritance/inheritance-tax-what-your-family-really-pays.html",
  "ageingparents/inheritance/navigating-family-disputes-after-a-will.html",
  "ageingparents/inheritance/the-inheritance-wake-up-call.html",
  "ageingparents/inheritance/when-parents-leave-more-to-one-child.html",
  "ageingparents/investing/how-much-investment-risk-can-you-handle.html",
  "ageingparents/investing/how-to-start-investing.html",
  "ageingparents/investing/investing-isnt-just-for-wealthy-people.html",
  "ageingparents/investing/investing-mistakes-when-markets-fall.html",
  "ageingparents/investing/investing-or-following-the-crowd.html",
  "ageingparents/investing/investment-conversation-every-couple-needs.html",
  "ageingparents/investing/pay-off-debt-or-start-investing.html",
  "ageingparents/investing/property-or-shares-which-is-right.html",
  "ageingparents/investing/time-matters-more-than-perfect-investment.html",
  "ageingparents/investing/what-is-an-etf.html",
  "ageingparents/investing/women-investing-in-midlife.html",
  "ageingparents/moneymindset/financial-decisions-made-from-fear.html",
  "ageingparents/moneymindset/stop-saying-im-bad-with-money.html",
  "ageingparents/moneymindset/the-account-youve-never-opened.html",
  "ageingparents/moneymindset/three-ways-to-improve-your-money-mindset.html",
  "ageingparents/moneymindset/what-does-enough-look-like.html",
  "ageingparents/moneymindset/where-your-money-habits-came-from.html",
  "ageingparents/moneymindset/why-more-income-doesnt-feel-secure.html",
  "ageingparents/property/bank-of-mum-and-dad-help-or-headache.html",
  "ageingparents/property/buying-a-home-or-an-identity.html",
  "ageingparents/property/five-conversations-before-buying-property-together.html",
  "ageingparents/property/stay-or-sell-property-in-your-50s.html",
  "ageingparents/property/timely-advice-massive-tax-savings.html",
  "ageingparents/property/why-property-fomo-is-expensive.html",
  "ageingparents/relationships/blended-family-finances-rebuilding-trust.html",
  "ageingparents/relationships/could-you-afford-to-leave-your-relationship.html",
  "ageingparents/relationships/financial-infidelity-hidden-money.html",
  "ageingparents/relationships/money-conversation-couples-should-have.html",
  "ageingparents/relationships/should-you-combine-finances-after-50.html",
  "ageingparents/relationships/when-one-person-earns-more.html",
  "ageingparents/relationships/why-smart-couples-still-fight-about-money.html",
  "ageingparents/retirement/retirement-asset-rich-cash-poor.html",
  "ageingparents/retirement/retirement-designing-a-purposeful-next-chapter.html",
  "ageingparents/retirement/retirement-turning-savings-into-a-life.html",
  "ageingparents/talk-to-parents-before-a-crisis.html",
  "ageingparents/what-do-your-parents-own-and-owe.html",
  "ageingparents/when-you-become-parent-to-your-parents.html",
  "ageingparents/who-pays-for-ageing-parents.html",
  "bank-of-mum-and-dad-help-or-headache.html",
  "blended-family-finances-rebuilding-trust.html",
  "buying-a-home-or-an-identity.html",
  "career-you-built-isnt-what-you-want.html",
  "careerincome/10-side-hustle-ideas-for-mums-on-maternity-leave.html",
  "careerincome/cancer-doesnt-care-if-you-have-insurance-or-not.html",
  "careerincome/career-you-built-isnt-what-you-want.html",
  "careerincome/financial-cost-of-staying-in-a-job-you-hate.html",
  "careerincome/income-is-your-biggest-financial-asset.html",
  "careerincome/mum-to-be-turns-maternity-leave-into-thriving-business.html",
  "careerincome/not-too-old-to-earn-more.html",
  "careerincome/pay-rise-conversation-women-delay.html",
  "careerincome/take-a-chance-on-you.html",
  "could-you-afford-to-leave-your-relationship.html",
  "divorce/Topic-Divorce.dc.html",
  "divorce/after-divorce-should-you-keep-the-family-home.html",
  "divorce/divorce-financial-lessons-for-women-after-50.html",
  "divorce/divorce-three-mistakes-women-over-50-must-avoid.html",
  "divorce/divorce-weddings-and-money.html",
  "divorce/how-to-survive-a-divorce.html",
  "divorce/inheritance-and-divorce-what-happens-to-your-money.html",
  "financial-cost-of-staying-in-a-job-you-hate.html",
  "financial-decisions-made-from-fear.html",
  "financial-infidelity-hidden-money.html",
  "five-conversations-before-buying-property-together.html",
  "how-much-investment-risk-can-you-handle.html",
  "how-to-start-investing.html",
  "income-is-your-biggest-financial-asset.html",
  "inheritance-is-not-a-financial-plan.html",
  "inheritance/Topic-Inheritance.dc.html",
  "inheritance/a-dark-approach-to-leaving-a-legacy.html",
  "inheritance/estate-planning-when-theres-no-will.html",
  "inheritance/handling-unequal-wills-and-family-emotions.html",
  "inheritance/how-much-will-you-get-the-great-australian-wealth-transfer.html",
  "inheritance/inheritance-avoiding-family-conflict-caring-for-parents.html",
  "inheritance/inheritance-end-of-life-money-mistakes.html",
  "inheritance/inheritance-in-second-relationships.html",
  "inheritance/inheritance-planning-for-dementia-three-mistakes.html",
  "inheritance/inheritance-tax-what-your-family-really-pays.html",
  "inheritance/lattes-and-legacies.html",
  "inheritance/navigating-family-disputes-after-a-will.html",
  "inheritance/the-inheritance-wake-up-call.html",
  "inheritance/when-parents-leave-more-to-one-child.html",
  "investing-isnt-just-for-wealthy-people.html",
  "investing-mistakes-when-markets-fall.html",
  "investing-or-following-the-crowd.html",
  "investing/four-tips-to-stay-super-calm-and-carry-on.html",
  "investing/how-much-investment-risk-can-you-handle.html",
  "investing/how-to-protect-yourself-from-a-fraudster.html",
  "investing/how-to-start-investing.html",
  "investing/investing-isnt-just-for-wealthy-people.html",
  "investing/investing-mistakes-when-markets-fall.html",
  "investing/investing-or-following-the-crowd.html",
  "investing/investment-conversation-every-couple-needs.html",
  "investing/pay-off-debt-or-start-investing.html",
  "investing/property-or-shares-which-is-right.html",
  "investing/should-you-invest-in-a-friends-business.html",
  "investing/time-matters-more-than-perfect-investment.html",
  "investing/what-is-an-etf.html",
  "investing/women-investing-in-midlife.html",
  "investment-conversation-every-couple-needs.html",
  "money-conversation-couples-should-have.html",
  "moneymindset/10-ways-to-reduce-food-waste-and-save-real-money.html",
  "moneymindset/books-that-might-just-change-your-life-these-holidays.html",
  "moneymindset/financial-decisions-made-from-fear.html",
  "moneymindset/i-was-very-scared-inside-an-ato-scam.html",
  "moneymindset/millennials-vs-gen-x.html",
  "moneymindset/money-stress-relief-how-pets-help-you-reset.html",
  "moneymindset/permission-to-pursue-happiness.html",
  "moneymindset/resilience-is-the-new-black.html",
  "moneymindset/stop-saying-im-bad-with-money.html",
  "moneymindset/the-account-youve-never-opened.html",
  "moneymindset/the-agreement-to-guilt-free.html",
  "moneymindset/the-socialite-and-the-sous-chef.html",
  "moneymindset/three-ways-to-improve-your-money-mindset.html",
  "moneymindset/vale-carla-zampatti.html",
  "moneymindset/what-does-enough-look-like.html",
  "moneymindset/when-conversations-lead-to-more-than-words.html",
  "moneymindset/where-your-money-habits-came-from.html",
  "moneymindset/why-more-income-doesnt-feel-secure.html",
  "not-too-old-to-earn-more.html",
  "pay-off-debt-or-start-investing.html",
  "pay-rise-conversation-women-delay.html",
  "property-or-shares-which-is-right.html",
  "property/bank-of-mum-and-dad-help-or-headache.html",
  "property/buying-a-home-or-an-identity.html",
  "property/five-conversations-before-buying-property-together.html",
  "property/stay-or-sell-property-in-your-50s.html",
  "property/timely-advice-massive-tax-savings.html",
  "property/why-property-fomo-is-expensive.html",
  "relationships/blended-family-finances-rebuilding-trust.html",
  "relationships/can-a-saver-truly-love-an-entertainer.html",
  "relationships/could-you-afford-to-leave-your-relationship.html",
  "relationships/financial-infidelity-hidden-money.html",
  "relationships/money-conversation-couples-should-have.html",
  "relationships/romance-risk-profile-safe-or-sparkling.html",
  "relationships/should-you-combine-finances-after-50.html",
  "relationships/what-is-contribution-splitting.html",
  "relationships/when-one-person-earns-more.html",
  "relationships/why-i-wrote-my-book.html",
  "relationships/why-smart-couples-still-fight-about-money.html",
  "retirement-turning-savings-into-a-life.html",
  "retirement/navigating-your-50s-a-womans-guide-to-financial-freedom-in-retirement.html",
  "retirement/retirement-asset-rich-cash-poor.html",
  "retirement/retirement-designing-a-purposeful-next-chapter.html",
  "retirement/retirement-turning-savings-into-a-life.html",
  "should-you-combine-finances-after-50.html",
  "stay-or-sell-property-in-your-50s.html",
  "stop-saying-im-bad-with-money.html",
  "supporting-adult-children-fairness-and-boundaries.html",
  "talk-to-parents-before-a-crisis.html",
  "three-ways-to-improve-your-money-mindset.html",
  "time-matters-more-than-perfect-investment.html",
  "timely-advice-massive-tax-savings.html",
  "what-do-your-parents-own-and-owe.html",
  "what-does-enough-look-like.html",
  "what-is-an-etf.html",
  "when-one-person-earns-more.html",
  "when-you-become-parent-to-your-parents.html",
  "where-your-money-habits-came-from.html",
  "who-pays-for-ageing-parents.html",
  "why-more-income-doesnt-feel-secure.html",
  "why-property-fomo-is-expensive.html",
  "why-smart-couples-still-fight-about-money.html",
  "women-investing-in-midlife.html",
];

const FOOTER_SENTENCE = 'The information on this website is provided for general educational and informational purposes';
const FORMSPREE_ID = 'formspree.io/f/mwlperzr';
const FORMSPREE_FILES = ['Contact.dc.html', 'money-dilemmas.js'];

// "Name 2.ext", "Name 3.ext", etc. — a space, one or more digits, then
// the extension, right at the end of the basename.
const DUP_NAME_RE = /^(.+) \d+(\.[^./\\]+)$/;

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join('/');
}

function walk(dir, files, dirs) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (EXCLUDE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      dirs.push(full);
      walk(full, files, dirs);
    } else {
      files.push(full);
    }
  }
}

const allFiles = [];
const allDirs = [];
walk(ROOT, allFiles, allDirs);
const htmlJsFiles = allFiles.filter((f) => f.endsWith('.html') || f.endsWith('.js'));
const scannableFiles = htmlJsFiles.filter((f) => !KNOWN_DUPLICATES.has(path.basename(f)));

const fails = [];
const warns = [];

function readText(f) {
  return fs.readFileSync(f, 'utf8');
}

// 1. Merge-conflict markers
for (const f of scannableFiles) {
  const lines = readText(f).split('\n');
  lines.forEach((rawLine, i) => {
    const line = rawLine.replace(/\r$/, '');
    if (line.startsWith('<<<<<<<') || line === '=======' || line.startsWith('>>>>>>>')) {
      fails.push(`${rel(f)}:${i + 1} — merge-conflict marker left in the file ("${line.trim()}")`);
    }
  });
}

// 2. Stray "]]>" immediately before "</x-dc>"
for (const f of scannableFiles) {
  if (!f.endsWith('.html')) continue;
  const lines = readText(f).split('\n');
  lines.forEach((rawLine, i) => {
    if (!rawLine.includes(']]>')) return;
    const next = lines[i + 1];
    if (next !== undefined && next.trim() === '</x-dc>') {
      fails.push(`${rel(f)}:${i + 1} — stray "]]>" renders as visible text right before </x-dc>`);
    }
  });
}

// 3. Numbered-duplicate files and folders ("Name 2.ext")
for (const f of htmlJsFiles) {
  const base = path.basename(f);
  if (!DUP_NAME_RE.test(base)) continue;
  if (KNOWN_DUPLICATES.has(base)) {
    warns.push(`${rel(f)} — known leftover duplicate, scheduled for deletion separately`);
  } else {
    fails.push(`${rel(f)} — new numbered-duplicate file (matches "Name 2.ext"); duplicates like this caused problems this week and should not be committed`);
  }
}
for (const d of allDirs) {
  const base = path.basename(d);
  if (DUP_NAME_RE.test(base)) {
    fails.push(`${rel(d)}/ — numbered-duplicate folder (matches "Name 2")`);
  }
}

// 4. mailto: links
for (const f of scannableFiles) {
  const lines = readText(f).split('\n');
  lines.forEach((line, i) => {
    if (/mailto:/i.test(line)) {
      fails.push(`${rel(f)}:${i + 1} — mailto: link found; enquiries must go through a real form, not the user's mail app`);
    }
  });
}

// 5. Legal footer disclaimer baseline
for (const relPath of FOOTER_BASELINE) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    warns.push(`${relPath} — listed in the footer baseline but no longer exists; remove it from FOOTER_BASELINE in scripts/site-guard.mjs`);
    continue;
  }
  if (!readText(full).includes(FOOTER_SENTENCE)) {
    fails.push(`${relPath} — missing the legal footer disclaimer sentence ("${FOOTER_SENTENCE}…")`);
  }
}

// 6. Formspree endpoint
for (const relPath of FORMSPREE_FILES) {
  const full = path.join(ROOT, relPath);
  if (!fs.existsSync(full)) {
    fails.push(`${relPath} — file not found, cannot verify it still posts to ${FORMSPREE_ID}`);
    continue;
  }
  if (!readText(full).includes(FORMSPREE_ID)) {
    fails.push(`${relPath} — no longer contains ${FORMSPREE_ID}; the contact/enquiry form endpoint may have changed or broken`);
  }
}

// ---- report ----
if (warns.length) {
  console.log(`WARNINGS (${warns.length}, not blocking):`);
  for (const w of warns) console.log('  - ' + w);
  console.log('');
}

if (fails.length) {
  console.log(`FAILURES (${fails.length}):`);
  for (const f of fails) console.log('  - ' + f);
  console.log(`\nsite-guard found ${fails.length} problem(s). Fix them before merging.`);
  process.exitCode = 1;
} else {
  console.log(`site-guard passed — no regressions found.${warns.length ? ` (${warns.length} warning(s) above, not blocking.)` : ''}`);
}
