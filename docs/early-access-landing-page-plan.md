# Wakewalkers Early-Access Landing Page Plan

Status: production backend staged; frontend cutover pending
Updated: 2026-08-20

## Goal

Replace the current Proxy Labs placeholder with a focused Wakewalkers landing
page that:

- uses the approved Wakewalkers splash artwork as the page background;
- lets a visitor submit an email address for an early-access invite;
- rejects automated submissions with Cloudflare Turnstile;
- preserves campaign attribution for marketing analysis; and
- continues to publish at `https://proxylabs.gg/` with GitHub Pages.

The page should remain small and direct. It is not a general studio site, a
product tour, or an account-registration flow.

## Technical decision

Use **Astro in its default static-output mode**, deployed to GitHub Pages with
Astro's official GitHub Action.

Plain HTML would have the fewest source files, but it would leave asset
organization, local development, environment configuration, page composition,
and production builds as one-off conventions. Astro provides those basics with
little runtime cost and still emits ordinary static HTML, CSS, and JavaScript.
It does not require a server process in production.

Do not add React, Vue, Svelte, Tailwind, a form-state library, or a component
kit. They do not reduce the work for a single email form. Use an Astro page,
one small form component, scoped CSS, the browser's native form APIs, and a
short client-side TypeScript module.

The repository pins its supported Node version in `.node-version`, declares
the runtime requirement in `package.json`, and pins pnpm and Astro. The owner
does not need to scaffold or configure Astro manually. Owner involvement is
limited to production-account access or approval when the Turnstile widget and
secret are created.

References:

- [Astro static rendering](https://docs.astro.build/en/basics/rendering-modes/)
- [Astro deployment to GitHub Pages](https://docs.astro.build/en/guides/deploy/github/)
- [Cloudflare Turnstile implicit rendering](https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/)

## System shape

### Static site

Repository: `/Users/dbland/Projects/proxylabs-site`

- Astro generates the production site into `dist/`.
- GitHub Actions builds and deploys `dist/` to GitHub Pages.
- `public/CNAME` contains `proxylabs.gg` so the custom domain survives every
  build.
- The public Turnstile site key and public signup endpoint are supplied through
  `PUBLIC_` build variables.
- No secret is stored in the website repository or GitHub Pages output.

### Signup service

Repository: `/Users/dbland/Projects/steppy-monsters-backend`

- A dedicated Supabase Edge Function accepts public signup requests.
- The function validates the Turnstile token with Cloudflare before writing.
- A dedicated Postgres table stores normalized unique emails, submission time,
  and campaign attribution.
- The table has RLS enabled and no public read policy.
- The Turnstile secret and Supabase service credential remain server-side.

GitHub Pages remains only the static host. It never receives or stores the
signup list.

## Page design

- Use the canonical portrait splash art as the dominant background.
- Use the canonical Wakewalkers wordmark.
- On portrait screens, render the splash art full-bleed.
- On wider screens, keep the complete focal composition visible. A darkened or
  softly blurred enlargement may fill the side space behind a centered,
  uncropped image.
- Place a small, high-contrast signup panel over a naturally dark part of the
  art.
- Keep motion optional and respect `prefers-reduced-motion`.
- Do not generate or introduce additional artwork.

Source assets:

- `/Users/dbland/Projects/steppy-monsters/assets/branding/wakewalkers_key_art_portrait.png`
- `/Users/dbland/Projects/steppy-monsters/assets/branding/wakewalkers_wordmark.png`

The site copies these into its own `public/assets/` directory and produces
optimized AVIF/WebP variants. The source files remain unchanged.

## Approved copy

Use only the following short, conventional language. Do not add flavor text,
explanatory paragraphs, taglines, lore, or consent language.

| Surface | Copy |
|---|---|
| Page title | `Wakewalkers Early Access` |
| Metadata description | `Sign up for Wakewalkers early access.` |
| Heading | `Sign up for early access` |
| Email label | `Email address` |
| Email placeholder | `you@example.com` |
| Submit button | `Join the waitlist` |
| Submitting state | `Submitting…` |
| Success message | `You're on the list.` |
| Invalid email | `Enter a valid email address.` |
| Missing verification | `Complete the verification.` |
| General failure | `Something went wrong. Try again.` |

There is no supporting paragraph, consent text, consent checkbox, newsletter
language, or privacy footnote in this version. Turnstile may display its own
provider-controlled interface and links.

## Form behavior

1. The browser validates the required email field.
2. Cloudflare Turnstile runs in managed mode using implicit rendering.
3. Submission sends the email, Turnstile token, landing path, UTM parameters,
   and supported ad-click identifiers to the Edge Function.
4. The function validates method, origin, body size, email shape, and the
   Turnstile token.
5. The function inserts the normalized email or treats an existing email as a
   successful idempotent submission.
6. The page replaces the form with the approved success message.
7. On a recoverable failure, the form is re-enabled and Turnstile is reset.

The endpoint returns the same public success response for a new address and a
duplicate address. It does not expose the signup list or reveal server errors.

## Stored data

Minimum fields:

- normalized email;
- creation timestamp;
- `utm_source`;
- `utm_medium`;
- `utm_campaign`;
- `utm_term`;
- `utm_content`;
- landing path; and
- `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `ttclid`, `li_fat_id`,
  and `twclid` when present.

Do not store a raw IP address. Do not create an authentication user for a
waitlist submission. Do not build an administration interface for the MVP;
authorized users can inspect or export the table through Supabase Studio.

## Deployment

The existing site must remain available throughout the build and rollout because
an Apple reviewer may visit it without notice. Development happens on a
separate branch. The current root `index.html`, root `CNAME`, and legacy Pages
configuration remain untouched until the replacement has passed its readiness
checks.

1. Build and validate the Astro site away from the live `main` branch.
2. Deploy the database migration.
3. Configure the production Turnstile widget and server secret.
4. Deploy and smoke-test the signup Edge Function.
5. Configure the public endpoint and site key as GitHub build variables.
6. Produce and inspect the exact GitHub Pages artifact, including `CNAME`.
7. Merge the ready candidate without removing the legacy root fallback.
8. Prepare a `gh-pages` rollback branch containing the unchanged legacy page,
   `CNAME`, and `.nojekyll`.
9. Change Pages from legacy branch publishing to GitHub Actions, then
   immediately run the manual workflow with its default `legacy` target. The
   workflow verifies the known production-page hash and deploys identical
   content. Monitor the public URL throughout this short transition.
10. Confirm the page is still byte-identical and the custom domain and HTTPS
    configuration remain healthy.
11. Run the same workflow with its explicit `astro` target only after the
    identical-site rehearsal succeeds.
12. Verify the new page and a real signup while the previous deployment and
    prepared `gh-pages` branch remain available for rollback.

If GitHub cannot preserve the previous deployment during the first workflow
cutover, use a deployment method that replaces the legacy branch artifact only
after the Astro output is complete. Never publish an intermediate source tree
that lacks a working root page.

No DNS migration or hosting-provider change is planned.
Automatic deployment on pushes stays disabled until the first successful
cutover; both rehearsal and launch are explicit manual workflow runs.

## Definition of done

- `https://proxylabs.gg/` renders the Wakewalkers splash page on current mobile
  and desktop browsers.
- The page contains only the approved copy.
- The page contains no consent text or consent checkbox.
- A valid human submission creates one database row.
- Duplicate emails do not create additional rows.
- Missing, invalid, expired, and replayed Turnstile tokens are rejected.
- UTM attribution is stored with the signup.
- The signup table cannot be read from a public browser client.
- No private key or service credential appears in the built site.
- The Astro production build and GitHub Pages deployment complete successfully.
- The existing Proxy Labs page remains reachable until the successful new
  artifact replaces it.
- A tested rollback can restore the previous deployment without DNS changes.
