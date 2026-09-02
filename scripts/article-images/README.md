# Article image generator (Gemini / Nano Banana Pro)

Generates a hero image and a thumbnail for each article, styled to the
brand palette (navy `#001E60`, gold `#FFB81C`, light blue `#8ABADD`, soft
pink `#F09491`), and links them into the site's `.dc.html` files
automatically. Articles about **divorce, death, grief, or inheritance**
are generated but routed to `needs-review/` instead of being wired into
any page, so a human signs off before they go live.

## 1. Get a Gemini API key

1. Go to https://aistudio.google.com/apikey and sign in with your Google
   account.
2. Click **Create API key**.
3. Copy the key it gives you — you'll paste it in step 2 below.

## 2. Paste your key — exactly where

This is the only place your key goes. It never gets written into any
script file, so it can't accidentally end up in a commit.

1. In the repo root (same folder as this `scripts/` directory), copy the
   example file:
   ```
   cp scripts/article-images/.env.example .env
   ```
2. Open the new `.env` file at the **repo root** in any text editor.
3. Replace `your-key-here` with the key you copied:
   ```
   GEMINI_API_KEY=AIzaSy...................
   ```
4. Save the file.

`.env` is listed in `.gitignore`, so `git status` should never show it as
a change to commit. If it ever does, don't commit it — check your
`.gitignore`.

## 3. Preview first (no API calls, no cost)

```
node scripts/article-images/generate-images.mjs --dry-run
```

This walks every article, shows which ones will be auto-published vs.
flagged for review, and prints the exact prompt that would be sent for
each hero/thumbnail image — without calling the API or touching any file.

## 4. Run a single test article

Once your key is in `.env`:

```
node scripts/article-images/generate-images.mjs --only SavingsToLife
```

`--only` matches on any substring of the article's path, so this runs
just `retirement/Article-Retirement-SavingsToLife.dc.html`. It will:

- Call Gemini twice (hero + thumbnail) for that one article.
- Save the images under `assets/generated/retirement/`.
- Patch the article's own hero `<image-slot>` and the matching thumbnail
  slot on `Topic-Retirement.dc.html` to point at the new files.

Open the article file in a browser (or the design canvas) to see it
actually working before running the rest.

## 5. Run everything

```
node scripts/article-images/generate-images.mjs
```

Runs are idempotent — an article that already has generated images is
skipped on the next run unless you pass `--force`. Progress is written to
`scripts/article-images/generation-log.json` after every article, so a
run that's interrupted partway through can just be re-run.

Useful flags:

| Flag             | What it does                                             |
|------------------|-----------------------------------------------------------|
| `--dry-run`      | Print prompts and decisions, make no API calls or writes |
| `--only <text>`  | Only articles whose path contains `<text>`                |
| `--topic <name>` | Only one topic folder                                     |
| `--limit <n>`    | Stop after `n` articles                                   |
| `--force`        | Regenerate even if images already exist                   |

## How flagging works

An article is routed to `needs-review/<topic>/` instead of being linked
into the site when:

- its topic folder is `divorce` or `inheritance`, **or**
- its title/body text mentions death, dying, grief, bereavement, funerals,
  palliative care, terminal illness, widowhood, end of life, dementia, or
  divorce — regardless of which topic folder it's filed under.

The image still gets generated (so there's something concrete to review),
it's just never referenced from any `.dc.html` page. See
`lib/review.mjs` to adjust the keyword list.

## How images get matched to prompts

Every `<image-slot>` in this site already carries a human-written
`placeholder="Photo: ..."` caption describing what should go there — the
script reuses that as the scene brief, combined with the article's title,
topic, and the brand style guide (see `lib/prompt.mjs`). The hero image
also gets reused for a topic page's "latest article" featured banner when
one exists, since that's the same photo at a wider crop.

## Where things go

```
assets/generated/<topic>/<article-slug>-hero.<ext>
assets/generated/<topic>/<article-slug>-thumb.<ext>
needs-review/<topic>/<article-slug>-hero.<ext>    (flagged articles)
needs-review/<topic>/<article-slug>-thumb.<ext>
scripts/article-images/generation-log.json         (run history / idempotency)
```
