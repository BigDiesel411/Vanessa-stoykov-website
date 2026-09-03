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
| `--files-from <path>` | Only articles whose relPath is listed in this file (used by CI) |

## Approving flagged images

Once you've looked through `needs-review/` and are happy with some or all
of it, promote them into the live site:

```
node scripts/article-images/approve-images.mjs               # approve everything pending
node scripts/article-images/approve-images.mjs --only Survive
node scripts/article-images/approve-images.mjs --topic divorce
node scripts/article-images/approve-images.mjs --dry-run      # preview only
```

This moves the approved files from `needs-review/<topic>/` into
`assets/generated/<topic>/` and wires them into the article's hero slot
and the matching Topic-page thumbnail/featured slot — exactly what
`generate-images.mjs` would have done automatically had the article not
been flagged. It only touches entries the generator marked `flagged:
true` in `generation-log.json`, so it's safe to re-run.

## Automatic generation via GitHub Actions

You don't have to run this by hand anymore. `.github/workflows/generate-article-images.yml`
watches for new article files and runs the pipeline automatically:

1. **Trigger**: any push to `main` that adds a new `Article-*.dc.html` file under one
   of the 7 topic folders (a direct push, or a merged PR). It diffs the push to find
   files that were newly *added* — editing an existing article doesn't re-trigger it.
2. **Scope**: only the newly added article(s) are processed (`--files-from`), not the
   whole site — so a single new article doesn't re-touch everything.
3. **Flagging**: identical to a manual run — divorce/inheritance/death/grief articles
   are generated but left in `needs-review/`, unlinked from any page.
4. **Output**: results are pushed to a new branch (`auto/article-images-<run-number>`)
   and opened as a pull request against `main` — never merged automatically. The PR
   body lists which articles were auto-linked vs. flagged for review.
5. **Notification**: the PR requests `BigDiesel411` as reviewer and assignee, which
   sends a GitHub notification (web + email, depending on your GitHub notification
   settings) the moment it opens.

A manual **"Run workflow"** button is also available on the Actions tab (workflow
name **Generate article images**) as a catch-all — it scans every article, but
already-generated ones are skipped automatically, so it's safe to click any time.

### Setting up the `GEMINI_API_KEY` secret

The workflow needs your Gemini API key as a **GitHub Actions secret** — it's kept out
of the repo entirely and only ever injected as an environment variable during the run.

1. Go to your repository on GitHub.
2. Click **Settings** (top tab bar of the repo, not your account settings).
3. In the left sidebar: **Secrets and variables** → **Actions**.
4. Under the **Secrets** tab, click **New repository secret**.
5. **Name**: `GEMINI_API_KEY` (must match exactly — the workflow reads this name).
6. **Secret**: paste your Gemini API key (the same one from `.env` — get a new one at
   https://aistudio.google.com/apikey if you don't have it handy).
7. Click **Add secret**.

That's it — no code change needed, and the key never appears in any file in the repo.

One more repo setting worth checking once: **Settings → Actions → General →
Workflow permissions**, make sure **"Allow GitHub Actions to create and approve pull
requests"** is checked. Without it, the workflow can generate images but will fail at
the final "open a pull request" step.

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
