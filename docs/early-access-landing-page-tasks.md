# Wakewalkers Early-Access Landing Page Tasks

Status: S1, B1, S2, and O1 complete; production functional QA complete
Plan: `docs/early-access-landing-page-plan.md`

| Task | Status |
|---|---|
| S1 — Astro site foundation and artwork | Complete locally |
| B1 — Signup database and Edge Function | Complete and deployed |
| S2 — Form integration | Complete locally |
| O1 — Production configuration and deployment | Complete |
| Q1 — Independent production QA | Functional/security complete; visual cases not run |

## Local verification record

- `PASS` — Astro check and static build on pinned Node 24.
- `PASS` — production-variable guard and built-site checks.
- `PASS` — dependency audit reports no known vulnerabilities.
- `PASS` — root legacy `index.html` SHA-256 still matches the live page:
  `2527589d1567f490ea3999e4129138c20787ea8e99d7a55fcd8ab66cf6cad39b`.
- `PASS` — local database reset applied the waitlist migration.
- `PASS` — 18 focused backend handler/schema tests.
- `PASS` — production migration is present and the Edge Function is deployed.
- `PASS` — production preflight allows only the configured origin; a missing
  CAPTCHA token is rejected with `403 verification_failed`.
- `PASS` — anonymous production table reads return `permission denied`.
- `PASS` — production Astro deployment, release marker, HTTPS, custom domain,
  apex HTTP redirect, and `www` redirect.
- `PASS` — production Turnstile verification and one clearly identified test
  signup: `wakewalkers-qa-1787249164891@example.com`.
- `PASS` — stored landing path, `utm_source`, `utm_medium`, `utm_campaign`, and
  `gclid` match the production test URL.
- `PASS` — duplicate submission succeeds while the database row count remains
  one.
- `PASS` — missing and replayed CAPTCHA tokens, malformed email, disallowed
  origin, wrong method, and anonymous table reads are rejected.
- `PASS` — optimized AVIF/WebP artwork returns HTTP 200 and the production
  artifact contains no server secret identifiers or values.
- `NOT RUN` — screenshot-based mobile/desktop composition review, slow-network
  throttling, and physical Safari/Chrome layout review were not requested in
  this implementation pass.
- `FAIL (unrelated)` — full backend suite: 273 passed and one Spark reward
  assertion failed in the separately landed Spark-stack work. Waitlist tests
  remained green.

## Execution order

Run **S1** and **B1** in parallel. Run **S2** after both finish. Run **O1**
after S2. Run **Q1** after the production deployment.

Agents must check repository status before editing and avoid unrelated changes.
Only one agent should edit the Proxy Labs site application files at a time.
The live legacy GitHub Pages deployment must remain untouched until O1 has a
fully built and validated replacement artifact ready for immediate deployment.

## S1 — Astro site foundation and artwork

Owner: frontend agent
Repository: `/Users/dbland/Projects/proxylabs-site`
Dependencies: none

### Scope

- Convert the two-file site to a minimal Astro static site.
- Preserve the existing root `CNAME` and add the same value to `public/CNAME`.
- Add the official Astro GitHub Pages deployment workflow.
- Keep that workflow manual-only until the first successful production
  cutover. Its default `legacy` target must package the unchanged root page and
  verify its known SHA-256 before upload; its explicit `astro` target builds the
  replacement.
- Add only the dependencies required by Astro and its checks.
- Copy the canonical splash art and wordmark into `public/assets/` without
  changing the originals.
- Generate optimized AVIF/WebP variants with practical fallbacks.
- Build the responsive page composition and the inert form layout.
- Use the exact copy table from the plan. Add no other visible copy.
- Do not connect the form to a live endpoint in this task.

### Expected surfaces

- `package.json` and lockfile
- `astro.config.mjs`
- `src/pages/index.astro`
- `src/components/SignupForm.astro`
- `src/styles/` as needed
- `public/CNAME`
- `public/assets/`
- `.github/workflows/deploy-pages.yml`

### Verification

- Run the Astro type/content check.
- Run the production build.
- Confirm `dist/CNAME` contains exactly `proxylabs.gg`.
- Confirm the legacy root `index.html` and `CNAME` remain functional and
  unchanged during development.
- Confirm the built page contains no consent copy and no unapproved marketing
  copy.
- Confirm the original client-repository artwork is unchanged.

### Handoff

Report the public asset filenames, component boundary, build commands, and any
public configuration variables reserved for S2.

## B1 — Signup database and Edge Function

Owner: backend agent
Repository: `/Users/dbland/Projects/steppy-monsters-backend`
Dependencies: none

### Scope

- Add a migration for a dedicated `early_access_signups` table.
- Normalize emails and enforce case-insensitive uniqueness.
- Store creation time, UTM fields, landing path, and supported ad-click
  identifiers.
- Enable RLS and expose no public select policy.
- Grant writes only to the server-side path required by the Edge Function.
- Add `supabase/functions/early-access-signup/index.ts`.
- Support `POST` and CORS preflight only.
- Apply an exact production-origin allowlist and a controlled local-development
  allowance.
- Validate body size and shape, normalize email, and verify Turnstile through
  Siteverify before inserting.
- Verify the Turnstile response hostname in production.
- Keep duplicate submissions idempotent and return the same success body for a
  new or existing email.
- Do not store raw IP addresses or create Supabase Auth users.
- Add the function's no-JWT configuration and required tests.

### Endpoint contract

Request fields:

- `email`
- `turnstileToken`
- `landingPath`
- `utmSource`
- `utmMedium`
- `utmCampaign`
- `utmTerm`
- `utmContent`
- supported ad-click identifiers

Public responses:

- success: `{ "ok": true }`
- invalid email: `{ "error": "invalid_email" }`
- missing or failed CAPTCHA: `{ "error": "verification_failed" }`
- unsupported request: `{ "error": "invalid_request" }`
- unexpected failure: `{ "error": "internal_error" }`

Do not include database details, Turnstile details, or stack traces in public
responses.

### Verification

- Reset the local database and run the backend test suite.
- Test valid, invalid, duplicate, missing-token, failed-token, expired-token,
  replayed-token, disallowed-origin, preflight, and wrong-method cases.
- Confirm anonymous/public clients cannot select from the signup table.
- Confirm secrets appear only in server-side environment configuration.
- Classify phone-gameplay QA as not applicable because this adds an isolated
  table and function without changing an installed-game path.

### Handoff

Provide the final endpoint URL shape, request/response contract, required
secret names, production origin list, and deployment command.

## S2 — Form integration

Owner: frontend integration agent
Repository: `/Users/dbland/Projects/proxylabs-site`
Dependencies: S1 and B1

### Scope

- Connect the Astro form component to B1's finalized endpoint.
- Read the public endpoint and Turnstile site key from `PUBLIC_` build
  variables.
- Use Cloudflare's implicit Turnstile widget in managed mode; do not add a UI
  framework or community CAPTCHA wrapper.
- Use native form validation and `FormData`.
- Capture UTM and supported ad-click parameters from the landing URL.
- Capture `gclid`, `gbraid`, `wbraid`, `fbclid`, `msclkid`, `ttclid`,
  `li_fat_id`, and `twclid` when present.
- Implement idle, submitting, success, invalid-email, verification-failure,
  and general-failure states using only the approved copy.
- Disable repeated submission while a request is active.
- Restore the form and reset Turnstile after recoverable failures.
- Keep status announcements accessible through an appropriate live region.
- Add no consent text, checkbox, supporting paragraph, flavor text, or
  newsletter language.

### Verification

- Run the Astro check and production build.
- Test with Cloudflare's documented pass and fail test keys.
- Confirm a direct request without a verified token fails.
- Confirm duplicate submission shows success without creating another row.
- Confirm query attribution reaches the request payload.
- Search the built `dist/` output for private credentials and unapproved copy.

### Handoff

Provide the exact GitHub build-variable names and a concise production smoke
test.

## O1 — Production configuration and deployment

Owner: deployment agent
Repositories: both
Dependencies: S2

### Scope

- Create a production Cloudflare Turnstile managed widget for the confirmed
  Proxy Labs hostnames.
- Store the Turnstile secret in Supabase.
- Apply the database migration.
- Deploy the signup Edge Function and smoke-test it before publishing the
  frontend.
- Configure the public site key and endpoint as GitHub repository variables.
- Configure GitHub Pages to deploy through GitHub Actions.
- Deploy the Astro site to the existing custom domain.
- Keep the current legacy deployment serving until the replacement artifact is
  complete and the new deployment can begin immediately.
- Run the manual workflow with `target=legacy` first and confirm that the page
  remains byte-identical before running it with `target=astro`.
- Verify HTTPS and the apex/`www` redirect behavior without changing DNS unless
  an existing record is incorrect.
- Submit one clearly identified production test address and confirm its stored
  attribution. Remove it only if that removal is explicitly safe and targeted.

### Verification

- The backend rejects a request without a valid production token.
- The production form accepts a valid signup.
- The GitHub Pages action is green.
- The custom domain and certificate remain healthy.
- No secret is present in the GitHub Pages artifact.
- The old site stayed reachable until the successful cutover, and its deployment
  identifier or commit remains available for rollback.

## Q1 — Independent production QA

Owner: QA agent
Dependencies: O1

### Cases

- Current iPhone-sized Safari layout.
- Desktop Safari and Chrome layout.
- Narrow-screen Turnstile fit and keyboard navigation.
- Empty and malformed email.
- Missing, failed, expired, and replayed CAPTCHA.
- Successful signup.
- Duplicate signup.
- Failed and slow network with retry.
- UTM and supported ad-click attribution.
- Public database-read attempt.
- Direct endpoint request without a valid CAPTCHA.
- Built-source scan for secrets.
- Exact visible-copy comparison against the approved table.
- Explicit absence of consent text and consent checkbox.
- Background focal composition at portrait and landscape breakpoints.
- Production page weight and layout stability.

Record each case as `PASS`, `FAIL`, or `NOT RUN` with a concrete reason. Do not
describe an unrun case as verified.

## Completion gate

The batch is complete only when S1, B1, S2, O1, and Q1 are complete; the live
page is served from GitHub Pages at `https://proxylabs.gg/`; a production signup
has been observed in the locked-down database; and the QA record contains no
unresolved failure.
