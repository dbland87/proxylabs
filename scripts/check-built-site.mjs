import { readFile, readdir, stat } from "node:fs/promises";
import { join, relative } from "node:path";

const distDir = new URL("../dist/", import.meta.url);
const distPath = distDir.pathname;

const requiredFiles = [
  "CNAME",
  "index.html",
  "assets/wakewalkers-splash.avif",
  "assets/wakewalkers-splash.webp",
  "assets/wakewalkers-splash.png",
  "assets/wakewalkers-wordmark.avif",
  "assets/wakewalkers-wordmark.webp",
  "assets/wakewalkers-wordmark.png",
];

const requiredCopy = [
  "Wakewalkers Early Access",
  "Sign up for Wakewalkers early access.",
  "Sign up for early access",
  "Email address",
  "you@example.com",
  "Join the waitlist",
  "Submitting…",
  "You're on the list.",
  "Enter a valid email address.",
  "Complete the verification.",
  "Something went wrong. Try again.",
];

const expectedVisibleBodyCopy = [
  "Sign up for early access",
  "Email address",
  "Join the waitlist",
  "You're on the list.",
].join(" ");

const forbiddenCopy = [
  "The world wakes in your wake",
  "step-powered creature adventure",
  "consent",
  "newsletter",
  "unsubscribe",
  "privacy footnote",
];

const forbiddenSecrets = [
  "SUPABASE_SERVICE_ROLE_KEY",
  "TURNSTILE_SECRET_KEY",
  "CLOUDFLARE_SECRET_KEY",
];

const failures = [];

for (const file of requiredFiles) {
  try {
    const fileStat = await stat(join(distPath, file));
    if (!fileStat.isFile() || fileStat.size === 0) {
      failures.push(`${file} is missing or empty`);
    }
  } catch {
    failures.push(`${file} is missing`);
  }
}

const cname = (await readFile(join(distPath, "CNAME"), "utf8")).trim();
if (cname !== "proxylabs.gg") {
  failures.push("CNAME must contain exactly proxylabs.gg");
}

const indexHtml = await readFile(join(distPath, "index.html"), "utf8");
for (const copy of requiredCopy) {
  if (!indexHtml.includes(copy)) {
    failures.push(`required copy is missing: ${copy}`);
  }
}

if (!indexHtml.includes("data-release=")) {
  failures.push("release marker is missing");
}

const bodyHtml = indexHtml.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i)?.[1];
if (!bodyHtml) {
  failures.push("body markup is missing");
} else {
  const visibleBodyCopy = bodyHtml
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  if (visibleBodyCopy !== expectedVisibleBodyCopy) {
    failures.push(
      `visible body copy differs from the approved whitelist: ${visibleBodyCopy}`,
    );
  }
}

const textFiles = [];
const visit = async (directory) => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await visit(path);
    } else if (/\.(?:css|html|js|json|txt|xml)$/i.test(entry.name)) {
      textFiles.push(path);
    }
  }
};
await visit(distPath);

for (const path of textFiles) {
  const content = await readFile(path, "utf8");
  for (const copy of forbiddenCopy) {
    if (content.toLowerCase().includes(copy.toLowerCase())) {
      failures.push(`${relative(distPath, path)} contains forbidden copy: ${copy}`);
    }
  }
  for (const secret of forbiddenSecrets) {
    if (content.includes(secret)) {
      failures.push(`${relative(distPath, path)} contains secret identifier: ${secret}`);
    }
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`Built-site check failed: ${failure}`);
  process.exit(1);
}

console.log("Built-site checks passed.");
