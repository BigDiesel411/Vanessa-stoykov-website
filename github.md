repo: BigDiesel411/Vanessa-stoykov-website
branch: main
path: assets/generated

## Last sync
date: 2026-09-22T02:35:00Z

### Updated in this project
- Nothing to pull. Both changes described upstream were already applied here: the nav is Topics | Guides | Get Advice | About | Work With Vanessa on all 102 pages (no "Free Guides", Courses, Partners, or top-level Books/Podcasts anywhere), and every Lydian Mortgage Connection reference is gone — `Lydian.dc.html` deleted, no nav or footer links remaining.
- Two text matches for "Lydian"/"mortgage calculator" are legitimate prose, not references to the removed page: Andrew Rocks' guest bio on VSP Episode 2 (he chairs Lydian Financial Services — a biographical fact), and the phrase "a mortgage calculator quietly assumes" in the buying-a-home-or-an-identity article. Both left intact.

### 2026-09-22T02:30:00Z

### Updated in this project
- Property, Relationships and AgeingParents hubs: all three already had complete article grids locally (6 / 7 / 6, matching the articles on disk), so nothing structural to pull.
- AgeingParents was the one real gap — wired all 6 images (featured hero + 5 thumbs) from files already in `assets/generated/ageingparents/`.
- Found and fixed 3 mismatched thumbnails that showed the wrong article's image: Relationships money-conversation-couples-should-have and could-you-afford-to-leave-your-relationship, and Property stay-or-sell-property-in-your-50s. Cause was a greedy regex in an earlier wiring pass matching across row boundaries; the per-row pattern is now non-greedy (`(?:(?!</a>)[\s\S])*?`).
- Audited all 10 hubs for the same class of mismatch. Only `rich-or-wealthy-whats-the-difference` still shows a placeholder, which is expected — no generated images upstream.

### 2026-09-22T02:25:00Z

### Updated in this project
- Topic-CareerIncome.dc.html: local already had the full 5-article grid, so the genuine gap was images. Wired all 6 (featured hero + 5 listing thumbs) from the `assets/generated/careerincome/` files already present. Zero placeholders left.
- Selective again rather than wholesale: upstream's copy of this page still has "Free Guides", a Courses nav item, Books and Podcasts at top level, `assets/vslogo-transparent.png`, and an inert `onsubmit="return false;"` newsletter form. Taking it whole would have regressed all of that.
- Used plain `<img>` rather than upstream's `<image-slot src=>`, matching the convention on the other topic hubs.

### 2026-09-22T02:20:00Z

### Updated in this project
- Diffed all 143 upstream files in `assets/generated/` against the project. 93 already present and identical; the other 50 are the legacy `Article-*` set, which lives as siblings inside each topic folder (adultchildren 8, divorce 12, inheritance 20, retirement 6, relationships 4) and is already referenced from there — copying them into `assets/generated/` would only duplicate.
- Verified all 70 sibling image references across those five folders resolve. None broken.
- No file changes needed this sync.
- Note: upstream still carries `Courses.dc.html`, which was deleted here on request. Upstream is behind on that, so it should not be pulled back in.

### 2026-09-22T00:00:00Z
- Checked `uploads/` against upstream: all 13 upstream files already present locally with matching names. Upstream's `uploads/` is a subset of the 198 files here.

## Screen map
| Screen | Built from |
| --- | --- |
| property/*.html, relationships/*.html (10 articles) | assets/generated/{property,relationships}/ |
| moneymindset/*.html (6 articles) | assets/generated/moneymindset/ |
| ageingparents/*.html (6 articles) | assets/generated/ageingparents/ |
| careerincome/*.html (5 articles) | assets/generated/careerincome/ |
| investing/*.html (11 articles) | assets/generated/investing/ |
| Topic-Property.dc.html, Topic-Relationships.dc.html | hero for the featured block, thumb for listing rows |
| adultchildren, divorce, inheritance, retirement (legacy) | sibling images already in each topic folder |
| Contact.dc.html (form logic only) | repo Contact.dc.html `<script data-dc-script>` |

## Still awaiting images
- Finding A Financial Planner guide PDF (card shows COMING SOON until the file is live)
- moneymindset/rich-or-wealthy-whats-the-difference — no generated images upstream

## Open request upstream
24 articles still use a 640x478 `-thumb.jpg` as their second body image, capped at 640px so it isn't upscaled. Only 8 slugs have a full-width `-mid.jpg`. Requesting `-mid` renders for the remaining slugs would let every second figure go full-bleed.

## Sync history
### 2026-09-21T07:15:00Z
- Selective merge, not a wholesale pull: upstream's Guides.dc.html predates this project's nav rename (Guides / Get Advice), the Courses removal, Books+Podcasts moving under About, the wired newsletter form and the Premium Guides section — taking it whole would have regressed all of that. Took only what upstream genuinely had.
- lead-capture.js: adopted upstream's modal-state reset on open. The modal is a shared singleton, so after one submission the next guide inherited a disabled "SENDING..." button and the previous name/email. Kept this project's per-guide endpoints and tag IDs (user-supplied) rather than upstream's single-endpoint + TOPIC approach.
- Pulled the three corrected images for moneymindset/the-account-youve-never-opened and replaced the two user uploads (one was a macabre decaying-hand image, off-tone for the piece). Both new photos viewed before alt text was written.
- Finding A Financial Planner has no live PDF (3 of 4 guides have real files), so its card is now an inert "COMING SOON" rather than a link that 404s.

### 2026-09-17T05:45:00Z
- Diffed all 140 upstream images against the project: 138 already present (50 legacy `Article-*` files live as siblings in their topic folders and are already referenced there, so copying them into `assets/generated/` would only duplicate).
- Pulled the 2 genuinely new files: `timely-advice-massive-tax-savings-hero.jpg` (the hero this article had been awaiting) and `property-jenny-closing.jpg`.
- Wired both figures on property/timely-advice-massive-tax-savings.html — both 1600x893, so both run full-bleed — and repointed og:image / twitter:image / JSON-LD image from the shared default to this article's own hero.
- Alt text on those two figures was initially written without viewing the files and described a for-sale sign that is not in the image. Corrected after inspecting both: figure 1 is a woman handing over house keys indoors, figure 2 is three people at a dining table with a document. Any future image wiring must view the file before writing alt text.
- Replaced the leftover `<image-slot>` in that article's Topic-Property listing row with the real thumb.

### 2026-09-16T12:31:00Z
- Pulled the 3 approved images from PR #16, now promoted out of `needs-review/` into `assets/generated/`: stay-or-sell-property-in-your-50s, could-you-afford-to-leave-your-relationship, money-conversation-couples-should-have (hero + thumb each).
- Wired all three articles: full-bleed 16/9 hero, second figure on the 640x478 thumb capped at 640px (no `-mid` render exists for these slugs yet), and og:image / twitter:image / JSON-LD image repointed from the shared default to each article's own hero.
- Updated the Property and Relationships topic hubs to use the new thumbs in their listing rows.
- Also pulled `timely-advice-massive-tax-savings-thumb.jpg` (still no hero upstream, so that article stays on the placeholder).

### 2026-09-16T12:22Z
- Pulled 7 `-mid.jpg` renders and restored those second figures to full-bleed; fixed broken sibling image paths on the three-ways money mindset article.
- Separately fixed a site-wide defect of my own making: all 65 slug-named articles carried a duplicate title/description/canonical block inherited from the head template, every one pointing at /why-smart-couples-still-fight-about-money. Stripped, asserted one of each per file, and deleted the template files.

### 2026-09-16T06:34Z
- Merged the Contact form fix (Formspree `/f/mwlperzr`, `_gotcha` honeypot); kept this project's richer submit handler and current nav.

### 2026-09-15T00:43Z
- Pulled 57 generated article images; wired 27 articles to real images; repointed og:image/schema images to each article's own hero.

### 2026-09-02T08:53Z
- Initial import of generated article images into the legacy topic folders.
