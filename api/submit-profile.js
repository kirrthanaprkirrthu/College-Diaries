"use strict";

/*
 * Vercel serverless function: POST /api/submit-profile
 *
 * Takes the profile form data + photo and opens a pull request that
 *   1) adds the photo to images/
 *   2) adds the profile card inside <div id="grid" class="grid"> in index.html
 *
 * Before anything is created it checks whether the person already has a profile:
 *   - a card with the same name already in index.html on the base branch
 *   - an open pull request for the same name
 * If so it answers 409 with a "profile already exists" message, which submit.js shows.
 *
 * Environment variables (Vercel -> Project -> Settings -> Environment Variables):
 *   GITHUB_TOKEN        fine-grained token: Contents (read/write) + Pull requests (read/write)
 *   GITHUB_OWNER        repository owner, e.g. "my-org"
 *   GITHUB_REPO         repository name
 *   GITHUB_BASE_BRANCH  optional, defaults to "main"
 *   ALLOWED_ORIGIN      optional, only needed if the form is hosted on a different domain
 */

const COURSES = ["MCA", "BCA", "BSc Data Science"];
const YEARS = ["1st year", "2nd year", "3rd year", "4th year"];
const MAX_PHOTO_BYTES = 1024 * 1024; // 1 MB (the form sends a ~400x400 JPEG, far smaller)
const MAX_SKILLS_LENGTH = 400; // 12 skills x 30 characters + separators

const WINDOW_MS = 60 * 60 * 1000;

// Best-effort limiter (memory is per serverless instance, so this only slows down abuse).
// Two limiters are used:
//   attempts    - every request that reaches GitHub (protects the API quota)
//   submissions - only successful pull requests (a student who makes typos is never locked out)
function makeLimiter(max) {
  const hits = new Map();
  function recent(ip) {
    const now = Date.now();
    const list = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
    if (list.length) hits.set(ip, list); else hits.delete(ip);
    return list;
  }
  return {
    isLimited: ip => recent(ip).length >= max,
    record: ip => {
      const list = recent(ip);
      list.push(Date.now());
      hits.set(ip, list);
    }
  };
}
const attempts = makeLimiter(30);
const submissions = makeLimiter(5); // many students may share one college IP

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

function decodeEntities(value) {
  return String(value)
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");
}

function slugify(name) {
  return (name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

// Returns "" (empty), a normalised URL, or null (invalid)
function githubProfileUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com" ||
        url.username || url.password || url.port || url.search || url.hash ||
        !/^\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})\/?$/.test(url.pathname)) {
      return null;
    }
    return "https://github.com" + url.pathname.replace(/\/$/, "");
  } catch {
    return null;
  }
}

// Cuts at max + 1 so callers can still tell that the value was too long
function text(value, max) {
  return typeof value === "string" ? value.trim().slice(0, max + 1) : "";
}

// Never trust the browser: re-check everything here
function validate(body) {
  const name = text(body.name, 80);
  const course = text(body.course, 40);
  const year = text(body.year, 20);
  const introduction = text(body.introduction, 300);
  const skillsRaw = text(body.skills, MAX_SKILLS_LENGTH);
  const githubRaw = text(body.github, 200);
  const story = text(body.story, 1200);
  const photo = typeof body.photo === "string" ? body.photo : "";

  if (!name || name.length > 80) return { error: "Please enter a valid name." };
  const slug = slugify(name);
  if (!slug) return { error: "Please use letters or numbers (A-Z, 0-9) in your name." };
  if (!COURSES.includes(course)) return { error: "Please choose a valid course." };
  if (!YEARS.includes(year)) return { error: "Please choose a valid year." };
  if (!introduction || introduction.length > 300) return { error: "Please enter an introduction (max 300 characters)." };
  if (!story || story.length > 1200) return { error: "Please enter your diary story (max 1200 characters)." };

  if (skillsRaw.length > MAX_SKILLS_LENGTH) return { error: "Your skills list is too long." };
  const skills = skillsRaw.split(",").map(s => s.trim()).filter(Boolean);
  if (!skills.length || skills.length > 12 || skills.some(s => s.length > 30)) {
    return { error: "Please enter 1 to 12 skills (max 30 characters each), separated by commas." };
  }

  const github = githubProfileUrl(githubRaw);
  if (github === null) return { error: "Please enter a valid GitHub profile URL." };

  const match = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(photo);
  if (!match) return { error: "Please add a valid photo." };
  const photoBuffer = Buffer.from(match[1], "base64");
  if (photoBuffer.length === 0 || photoBuffer.length > MAX_PHOTO_BYTES) {
    return { error: "The photo is too large." };
  }
  // JPEG files start with FF D8 FF
  if (!(photoBuffer[0] === 0xff && photoBuffer[1] === 0xd8 && photoBuffer[2] === 0xff)) {
    return { error: "The photo must be a JPEG image." };
  }

  return { profile: { name, slug, course, year, introduction, skills, github, story }, photoBuffer };
}

function buildCardHtml(p, photoPath) {
  const skills = p.skills.map(s => `      <span>${escapeHtml(s)}</span>`).join("\n");
  const githubMarkup = p.github
    ? `\n    <a class="github" href="${escapeHtml(p.github)}" target="_blank" rel="noopener noreferrer">GitHub</a>`
    : "";

  return `<article class="card" data-course="${escapeHtml(p.course)}">
  <div class="portrait" style="--tint: #e1e8d9">
    <img src="${escapeHtml(photoPath)}" alt="${escapeHtml(p.name)} profile image">
    <span class="course">${escapeHtml(p.course)}</span>
  </div>
  <div class="card-body">
    <h3>${escapeHtml(p.name)}</h3>
    <span class="year">${escapeHtml(p.year)}</span>
    <p>${escapeHtml(p.introduction)}</p>
    <div class="tags">
${skills}
    </div>${githubMarkup}
    <p class="story" hidden>${escapeHtml(p.story)}</p>
    <div class="card-bottom"><span>A story in progress</span><button class="view" type="button">View diary ↗</button></div>
  </div>
</article>`;
}

async function gh(path, options = {}) {
  const { raw, ...rest } = options;
  const res = await fetch("https://api.github.com" + path, {
    ...rest,
    headers: {
      Authorization: "Bearer " + process.env.GITHUB_TOKEN,
      Accept: raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "college-diaries-profile-bot",
      "Content-Type": "application/json"
    }
  });
  const body = await res.text();
  let data = null;
  if (raw) {
    data = res.ok ? body : null;
  } else {
    try { data = body ? JSON.parse(body) : null; } catch { data = null; }
  }
  return { status: res.status, ok: res.ok, data };
}

async function mustGh(path, options, what) {
  const r = await gh(path, options);
  if (!r.ok) {
    console.error(`GitHub error while ${what}:`, r.status, JSON.stringify(r.data));
    throw new Error(what);
  }
  return r.data;
}

// Branch names contain "/", so encode each part but keep the slashes
function refPath(branch) {
  return branch.split("/").map(encodeURIComponent).join("/");
}

// True if index.html already has a profile card for this person
function htmlHasProfile(html, slug) {
  const card = /<article\b[^>]*\bclass="[^"]*\bcard\b[^"]*"[^>]*>[\s\S]*?<h3[^>]*>([\s\S]*?)<\/h3>/gi;
  let m;
  while ((m = card.exec(html))) {
    const cardName = decodeEntities(m[1].replace(/<[^>]*>/g, ""));
    if (slugify(cardName) === slug) return true;
  }
  return false;
}

// Looks at the base branch and the open PRs.
// Returns { existing: "published" | "pending" | null, photoTaken: boolean }
async function checkExisting(repo, base, profile) {
  const ref = encodeURIComponent(base);
  const [page, photo, pulls] = await Promise.all([
    gh(`${repo}/contents/index.html?ref=${ref}`, { raw: true }),
    gh(`${repo}/contents/images/${profile.slug}.jpg?ref=${ref}`),
    gh(`${repo}/pulls?state=open&per_page=100`)
  ]);

  // Anything other than found / not found means we cannot be sure: stop instead of risking a duplicate.
  // (index.html must exist, so a 404 for it is also an error.)
  if (page.status !== 200 || (photo.status !== 200 && photo.status !== 404) || pulls.status !== 200) {
    console.error("GitHub error while checking for an existing profile:", page.status, photo.status, pulls.status);
    throw new Error("checking for an existing profile");
  }

  let existing = null;
  if (htmlHasProfile(page.data || "", profile.slug)) {
    existing = "published";
  } else {
    const prefix = `profile/${profile.slug}/`;
    const pending = Array.isArray(pulls.data) &&
      pulls.data.some(pr => pr && pr.head && typeof pr.head.ref === "string" && pr.head.ref.startsWith(prefix));
    if (pending) existing = "pending";
  }
  return { existing, photoTaken: photo.status === 200 };
}

module.exports = async function handler(req, res) {
  const allowedOrigin = process.env.ALLOWED_ORIGIN;
  if (allowedOrigin) {
    res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Vary", "Origin");
    if (req.method === "OPTIONS") return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { GITHUB_TOKEN, GITHUB_OWNER, GITHUB_REPO } = process.env;
  if (!GITHUB_TOKEN || !GITHUB_OWNER || !GITHUB_REPO) {
    console.error("Missing GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO");
    return res.status(500).json({ error: "The server is not set up yet." });
  }
  const base = process.env.GITHUB_BASE_BRANCH || "main";

  let body = req.body;
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch { body = null; }
  }
  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid request." });
  }

  // Honeypot: real users never fill this hidden field, bots often do.
  // No "url" in this reply (submit.js already copes with that).
  if (body.website) return res.status(200).json({ ok: true });

  // Validate first so typos never count against the student
  const { error, profile, photoBuffer } = validate(body);
  if (error) return res.status(400).json({ error });

  const ip = String(req.headers["x-forwarded-for"] || "unknown").split(",")[0].trim();
  if (attempts.isLimited(ip) || submissions.isLimited(ip)) {
    return res.status(429).json({ error: "Too many submissions. Please try again later." });
  }
  attempts.record(ip);

  const repo = `/repos/${encodeURIComponent(GITHUB_OWNER)}/${encodeURIComponent(GITHUB_REPO)}`;
  const safeName = profile.name.replace(/[\r\n`@]+/g, " ").trim();
  let branch = null;

  try {
    // 1. Does this person already have a profile?
    const { existing, photoTaken } = await checkExisting(repo, base, profile);
    if (existing === "published") {
      return res.status(409).json({
        code: "PROFILE_EXISTS",
        error: `A profile for "${safeName}" already exists.`
      });
    }
    if (existing === "pending") {
      return res.status(409).json({
        code: "PROFILE_PENDING",
        error: `A profile for "${safeName}" already exists and is waiting for review.`
      });
    }

    // 2. Pick a photo file name that is free (an old photo may exist without a card)
    const photoSlug = photoTaken ? `${profile.slug}-${Date.now().toString(36).slice(-4)}` : profile.slug;
    const photoPath = `images/${photoSlug}.jpg`;

    // 3. New branch from the latest base commit
    const baseRef = await mustGh(`${repo}/git/ref/heads/${refPath(base)}`, { method: "GET" }, "reading the base branch");
    const newBranch = `profile/${profile.slug}/${Date.now().toString(36)}`;
    await mustGh(`${repo}/git/refs`, {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${newBranch}`, sha: baseRef.object.sha })
    }, "creating the branch");
    branch = newBranch;

    // 4. Add the photo
    await mustGh(`${repo}/contents/${photoPath}`, {
      method: "PUT",
      body: JSON.stringify({
        message: `Add profile photo for ${safeName}`,
        content: photoBuffer.toString("base64"),
        branch
      })
    }, "uploading the photo");

    // 5. Insert the card into index.html
    const file = await mustGh(`${repo}/contents/index.html?ref=${encodeURIComponent(branch)}`, { method: "GET" }, "reading index.html");
    if (!file.content) throw new Error("index.html is empty or too large");
    const html = Buffer.from(file.content, "base64").toString("utf8");

    const marker = /<div\b[^>]*\bid="grid"[^>]*>/;
    const found = marker.exec(html);
    if (!found) {
      console.error('Could not find <div id="grid"> in index.html');
      throw new Error("finding the grid");
    }
    const lineStart = html.lastIndexOf("\n", found.index) + 1;
    const indent = /^[ \t]*/.exec(html.slice(lineStart, found.index))[0] + "  ";
    const eol = html.includes("\r\n") ? "\r\n" : "\n"; // keep the file's own line endings
    const card = buildCardHtml(profile, photoPath)
      .split("\n").map(line => indent + line).join(eol);
    const insertAt = found.index + found[0].length;
    const updated = html.slice(0, insertAt) + eol + card + html.slice(insertAt);

    await mustGh(`${repo}/contents/index.html`, {
      method: "PUT",
      body: JSON.stringify({
        message: `Add profile card for ${safeName}`,
        content: Buffer.from(updated, "utf8").toString("base64"),
        sha: file.sha,
        branch
      })
    }, "updating index.html");

    // 6. Open the pull request (only allow-listed text goes into the description)
    const pr = await mustGh(`${repo}/pulls`, {
      method: "POST",
      body: JSON.stringify({
        title: `Add profile: ${safeName}`,
        head: branch,
        base,
        body: [
          "Submitted through the profile builder form.",
          "",
          `- **Name:** \`${safeName}\``,
          `- **Course:** ${profile.course}`,
          `- **Year:** ${profile.year}`,
          "",
          `Adds a card to \`index.html\` and the photo \`${photoPath}\`.`,
          "Please review the card text and photo before merging."
        ].join("\n")
      })
    }, "opening the pull request");

    submissions.record(ip);
    return res.status(200).json({ ok: true, url: pr.html_url });
  } catch (err) {
    console.error("submit-profile failed:", err && err.message);

    // Do not leave an orphan branch behind
    if (branch) {
      try {
        await gh(`${repo}/git/refs/heads/${refPath(branch)}`, { method: "DELETE" });
      } catch (cleanupErr) {
        console.error("Could not delete branch", branch, cleanupErr && cleanupErr.message);
      }
    }
    return res.status(500).json({ error: "Could not submit your profile right now. Please try again later." });
  }
};