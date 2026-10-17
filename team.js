// Team page.
// - Arrival: once every photo and avatar has loaded, the portraits rise in one after another
//   and their avatars pop. It plays once.
// - Focus: pointing at someone brings their black & white photo back in colour (team.css),
//   lights up their tag, and the title's last word morphs into their name.

const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");
const COMPACT = window.matchMedia(
  "(max-width: 760px), (max-height: 520px), (orientation: portrait) and (max-width: 1100px)",
);
const STAGE_WIDTH = 1512;

const stage = document.querySelector(".team-stage");
const titleWord = document.querySelector(".team-title-word");
const members = [...document.querySelectorAll(".member")];

// --- Stage scaling -----------------------------------------------------------
// Portraits run to y = 1041 on the stage; show as much of them as the window allows.
const STAGE_MIN_H = 882;
const STAGE_MAX_H = 1041;

function fitStage() {
  const header = document.querySelector(".team-header").offsetHeight;
  // Fit the whole composition (title to the page edge at 882px) in both directions.
  const zoom = COMPACT.matches
    ? 1
    : Math.min(window.innerWidth / STAGE_WIDTH, (window.innerHeight - header) / STAGE_MIN_H);
  stage.style.setProperty("--team-zoom", zoom.toFixed(4));
  const height = Math.min(STAGE_MAX_H, Math.max(STAGE_MIN_H, (window.innerHeight - header) / zoom));
  stage.style.setProperty("--team-stage-h", `${Math.round(height)}px`);
  stage.toggleAttribute("data-tall", !COMPACT.matches && height > STAGE_MIN_H + 1);
}
fitStage();
window.addEventListener("resize", fitStage);

// --- Focus states ------------------------------------------------------------
let active = null;
let leaveTimer = null;

function setActive(next) {
  clearTimeout(leaveTimer);
  if (active === next) return;
  active = next;
  for (const m of members) m.el.classList.toggle("is-active", m === next);
  morphTitle(next ? next.name : "team", next ? next.color : null, { quiet: !next });
}

// Leaving waits a moment: sliding from one person to the next goes straight from name to
// name instead of flashing back to "team" in between.
function scheduleLeave(m) {
  clearTimeout(leaveTimer);
  leaveTimer = setTimeout(() => active === m && setActive(null), 260);
}

let titleTimer = null;
function morphTitle(word, color, { quiet = false } = {}) {
  const current = titleWord.querySelector(".team-title-text");
  clearTimeout(titleTimer);
  titleWord.style.setProperty("--team-word-color", color || "var(--team-blue)");
  if (current.textContent === word && !current.classList.contains("is-leaving")) return;
  if (REDUCED_MOTION.matches) {
    current.textContent = word;
    return;
  }
  current.classList.remove("is-entering");
  current.classList.toggle("is-quiet", quiet);
  current.classList.add("is-leaving");
  titleTimer = setTimeout(() => {
    current.textContent = word;
    current.classList.remove("is-leaving");
    void current.offsetWidth;
    current.classList.add("is-entering");
  }, quiet ? 180 : 200);
}

// --- Figma crop ----------------------------------------------------------------
// Lay the <img> out so its box shows exactly the data-crop region (works in every browser,
// unlike object-view-box).
function applyCrop(img) {
  const [x, y, w, h] = img.dataset.crop.split(/\s+/).map(Number);
  const keep = parseFloat(getComputedStyle(img).getPropertyValue("--crop-visible")) || 1;
  const vh = h * keep;
  Object.assign(img.style, {
    width: `${100 / w}%`,
    height: `${100 / vh}%`,
    left: `${(-x / w) * 100}%`,
    top: `${(-y / vh) * 100}%`,
  });
}
const croppedImages = [...document.querySelectorAll(".member-portrait img[data-crop]")];
croppedImages.forEach(applyCrop);
COMPACT.addEventListener("change", () => croppedImages.forEach(applyCrop));

// --- Arrival -----------------------------------------------------------------
// Decode every photo and avatar first, then play the arrival once. Coming back from a member
// page with a view transition, the line-up is shown at once so it can morph.
const pictures = [...stage.querySelectorAll(".member-portrait img, .member-avatar")];
const loaded = Promise.all(pictures.map((img) => img.decode().catch(() => {})));
const timeout = new Promise((resolve) => setTimeout(resolve, 3000));

function arrive() {
  if (stage.classList.contains("is-ready")) return;
  const animate = !REDUCED_MOTION.matches && !document.documentElement.classList.contains("team-no-arrival");
  if (animate) stage.classList.add("is-arriving");
  stage.classList.add("is-ready");
  if (!animate) return;
  // Once the last tag has landed, drop the arrival styles so nothing can replay them.
  const lastTag = stage.querySelector(".member:last-child .member-tag");
  lastTag?.addEventListener("animationend", () => stage.classList.remove("is-arriving"), { once: true });
}

if (document.documentElement.classList.contains("team-no-arrival")) arrive();
else Promise.race([loaded, timeout]).then(arrive);
// pagereveal may also come after this module runs: same treatment.
addEventListener("pagereveal", (event) => {
  if (!event.viewTransition) return;
  document.documentElement.classList.add("team-no-arrival");
  stage.classList.remove("is-arriving");
  arrive();
});

// --- Setup -------------------------------------------------------------------

members.forEach((el, index) => {
  const m = {
    el,
    name: el.querySelector(".member-name").textContent.trim(),
    color: getComputedStyle(el).getPropertyValue("--color").trim(),
  };
  members[index] = m;
  el.style.setProperty("--delay", `${0.35 + index * 0.14}s`);

  const link = el.querySelector(".member-link");
  link.addEventListener("pointerenter", () => setActive(m));
  link.addEventListener("focus", () => setActive(m));
  link.addEventListener("pointerleave", () => scheduleLeave(m));
  link.addEventListener("blur", () => scheduleLeave(m));
});
