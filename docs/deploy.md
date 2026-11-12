# Deploy and cutover runbook

The site is built and published by GitHub Actions
(`.github/workflows/deploy.yml`) on every push to `main`, and on demand
(Actions → "Deploy to GitHub Pages" → "Run workflow"). Nothing is deployed
from a laptop. This page lists the steps that only the repository owner can
do on GitHub, in order.

Repository: `marsbroshok/iknowyoucanseeme.xyz` · Site:
<https://www.iknowyoucanseeme.xyz> · Old Hugo site: git tag `legacy-hugo`.

## 0. Before pushing (on your machine)

```bash
npm ci
npm run check            # exit code must be 0
npm run test:e2e         # exit code must be 0
npm run verify:clean-clone   # optional: rehearses the GitHub job from a fresh clone
```

`verify:clean-clone` installs from the public npm registry, exactly like
GitHub. If this machine cannot reach `registry.npmjs.org`, skip it: the
first GitHub run (step 5) does the same check.

## 1. Pages source → GitHub Actions

GitHub → repository → **Settings → Pages → Build and deployment → Source:
GitHub Actions**. (The old Hugo site was already deployed by an Actions
workflow, so this is probably already set; check it.)

## 2. Custom domain and HTTPS

Same page (**Settings → Pages**):

- **Custom domain:** `www.iknowyoucanseeme.xyz` → Save. With Actions
  deployments this setting is what counts; `public/CNAME` only documents it.
- Wait for "DNS check successful", then tick **Enforce HTTPS**.

## 3. Deployment environment

**Settings → Environments → `github-pages` → Deployment branches and tags:**
`main` must be allowed (the default "Selected branches: main" is fine).

## 4. Repository variables

**Settings → Secrets and variables → Actions → Variables tab → New
repository variable.** These are *variables*, not secrets: both values are
public in the HTML anyway.

| Name | Value | If missing |
|---|---|---|
| `PUBLIC_WEB3FORMS_KEY` | Access key from <https://web3forms.com> (sent to the artist's email) | The contact page shows only the email address, no form |
| `PUBLIC_GOATCOUNTER_CODE` | The `<code>` of your `<code>.goatcounter.com` site (create it at <https://www.goatcounter.com>; lowercase letters, digits, dashes) | No analytics script at all |

A wrong GoatCounter value (for example the full URL) makes the build fail
on purpose; use only the code.

## 5. Push `main` and the tag

```bash
git push origin main
git push origin legacy-hugo
```

Then open **Actions → "Deploy to GitHub Pages"** and watch the run:

1. **Lint workflows (actionlint)** passes.
2. **Install dependencies** (`npm ci`) passes. This is the first install
   from the public npm registry on GitHub: it proves the committed
   `package-lock.json` has no private registry URLs and that every
   integrity hash matches the public tarballs (ADR 0004). If it fails with
   `ENOTFOUND`/`E404` on a strange host, run `npm run lockfile:normalize`,
   commit and push again.
3. **Check** and **Build site** pass; **deploy** shows the page URL.

## 6. DNS / HTTPS check

```bash
dig +short www.iknowyoucanseeme.xyz CNAME     # → marsbroshok.github.io.
curl -sI https://www.iknowyoucanseeme.xyz/en/ | head -1          # → HTTP/2 200
curl -sI http://iknowyoucanseeme.xyz/ | grep -i '^location'      # → https://www.iknowyoucanseeme.xyz/
curl -s https://www.iknowyoucanseeme.xyz/dreamland/ | grep refresh   # → url=/en/territories/dreamland/
curl -s https://www.iknowyoucanseeme.xyz/en/ | grep -c gc.zgo.at      # → 1 when GoatCounter is set
```

In a browser: `/` picks the language, `/fr/` and `/en/` load, a work page
shows its image, the contact form appears (if the key is set) and a test
message arrives, the GoatCounter dashboard shows the visit (it can take a
minute), `/fr/labels/` prints on A4.

## Rollback to the Hugo site

Use **A** within 30 days of the last Hugo deployment, otherwise **B**.

**A. Re-run the last Hugo deployment (no git changes).** Actions → filter
by workflow **"Deploy website to GitHub Pages"** (the old Hugo workflow) →
open its last successful run → **Re-run all jobs**. A re-run uses the old
commit and its workflow file, so it rebuilds and republishes the Hugo site.

**B. Redeploy `legacy-hugo` with a new commit (always works, nothing is
deleted from history).**

```bash
git switch -c rollback-hugo main
git rm -r -q .                    # empty the working tree (tracked files only)
git checkout legacy-hugo -- .     # put back exactly the Hugo files
git commit -m "revert: restore the Hugo site from legacy-hugo"
git push origin rollback-hugo:main
```

The push brings back the Hugo workflow (`publish.yaml`), which deploys the
Hugo site. To return to the Astro site later, revert that commit on `main`
and push.

Never force-push `main` to roll back.
