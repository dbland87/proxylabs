const endpoint = process.env.PUBLIC_SIGNUP_ENDPOINT;
const siteKey = process.env.PUBLIC_TURNSTILE_SITE_KEY;
const releaseId = process.env.PUBLIC_RELEASE_ID;

const failures = [];

if (!endpoint) {
  failures.push("PUBLIC_SIGNUP_ENDPOINT is required");
} else {
  try {
    const url = new URL(endpoint);
    if (url.protocol !== "https:") {
      failures.push("PUBLIC_SIGNUP_ENDPOINT must use HTTPS");
    }
  } catch {
    failures.push("PUBLIC_SIGNUP_ENDPOINT must be a valid URL");
  }
}

if (!siteKey) {
  failures.push("PUBLIC_TURNSTILE_SITE_KEY is required");
} else if (/^[123]x0{18}/.test(siteKey)) {
  failures.push("PUBLIC_TURNSTILE_SITE_KEY must not be a Cloudflare test key");
}

if (!releaseId) {
  failures.push("PUBLIC_RELEASE_ID is required");
}

if (failures.length > 0) {
  for (const failure of failures) {
    console.error(`Production configuration error: ${failure}`);
  }
  process.exit(1);
}
