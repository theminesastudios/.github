// Feedback postcard: opened by tapping the Minesa logo.
import { createShaderFill } from "./shaders/shader-fill.js?v=7";
import * as glowingWave from "./shaders/custom-effects/glowing-wave.js?v=7";

const FEEDBACK_EMAIL = "support@theminesa.studio";
// The site is static (GitHub Pages), so cards are relayed to the inbox by FormSubmit. Its very
// first submission sends a one-time activation mail to FEEDBACK_EMAIL; cards are delivered
// once that link is confirmed. Until then (or if the relay is down) the mail app opens instead.
const RELAY_URL = `https://formsubmit.co/ajax/${FEEDBACK_EMAIL}`;
const CARD_WIDTH = 865;
const CARD_HEIGHT = 600;
const COMPACT_QUERY = window.matchMedia("(max-width: 700px)");
const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

const dialog = document.getElementById("feedback");
const form = document.getElementById("fb-form");
const card = dialog.querySelector(".fb-card");
const stage = dialog.querySelector(".fb-stage");
const textarea = document.getElementById("fb-text");
const fromInput = document.getElementById("fb-from");
const status = dialog.querySelector(".fb-status");
const flipButton = dialog.querySelector("[data-feedback-flip]");
const shaderCanvas = dialog.querySelector('[data-shader="glowing-wave"]');

let shader = null;
let flipTimer = null;

// Stamp shader, with the parameters authored on the Figma node (STAMP 4 > ACI).
const STAMP_SHADER = {
  setup: glowingWave.setup,
  render: glowingWave.render,
  manifest: glowingWave.manifest,
  params: {
    transform: { x: 50, y: 50, radius: 36, angle: -44 },
    amplitude: 5.800000190734863,
    waveColor: { r: 0.4901960790157318, g: 0.3803921639919281, b: 0.32549020648002625, a: 1 },
    offset: 45.29999923706055,
    zoom: 2.759999990463257,
    glowIntensity: 1.3600000143051147,
  },
};

function setSide(side) {
  card.dataset.side = side;
  flipButton.textContent = side === "back" ? "See the front" : "Turn the card over";
}

// The left half of the card (message area plus margin), in design px.
const WRITING_WIDTH = 440;
let writing = false;
let writingAddress = false;

function fitCard() {
  const compact = COMPACT_QUERY.matches;
  let zoom;
  if (compact && writing) {
    // Writing on a phone: the card zooms so its left half fills the width. The 22px
    // handwriting then renders at ~17px, legible and above iOS's 16px auto-zoom threshold.
    zoom = (window.innerWidth - 32) / WRITING_WIDTH;
  } else {
    zoom = Math.min(
      1,
      (window.innerWidth - 32) / CARD_WIDTH,
      Math.max(window.innerHeight - 220, 240) / CARD_HEIGHT,
    );
  }
  form.classList.toggle("is-writing", compact && writing);
  form.classList.toggle("is-writing-address", compact && writing && writingAddress);
  stage.style.setProperty("--fb-zoom", zoom.toFixed(3));
}

// Animate the zoom by FLIP on the card's frame. (Not a view transition: rendering is held
// during one, which drops focus from the field you just tapped.)
const stageFrame = dialog.querySelector(".fb-stage-frame");
function setWriting(next, { address = false } = {}) {
  if ((writing === next && writingAddress === address) || !COMPACT_QUERY.matches) {
    writing = next;
    writingAddress = address;
    return;
  }
  writing = next;
  writingAddress = address;
  const before = stageFrame.getBoundingClientRect();
  fitCard();
  if (REDUCED_MOTION.matches) return;
  const after = stageFrame.getBoundingClientRect();
  if (!after.width) return;
  stageFrame.animate(
    [
      {
        transformOrigin: "0 0",
        transform: `translate(${before.left - after.left}px, ${before.top - after.top}px) scale(${before.width / after.width})`,
      },
      { transformOrigin: "0 0", transform: "none" },
    ],
    { duration: 350, easing: "cubic-bezier(0.22, 1, 0.36, 1)" },
  );
}

textarea.addEventListener("focus", () => setWriting(true));
textarea.addEventListener("blur", () => setWriting(false));
fromInput.addEventListener("focus", () => setWriting(true, { address: true }));
fromInput.addEventListener("blur", () => setWriting(false));
// Enter in the name field moves on to the note rather than sending the card.
fromInput.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  textarea.focus();
});

// Card art is lazy so the home page stays light; start fetching once someone heads for the logo.
let warmed = false;
function warmUp() {
  if (warmed) return;
  warmed = true;
  dialog.querySelectorAll('img[loading="lazy"]').forEach((img) => {
    img.loading = "eager";
  });
}

function open(event) {
  event?.preventDefault();
  warmUp();
  if (dialog.open) return;
  document.dispatchEvent(new CustomEvent("feedback:open"));
  status.textContent = "";
  fitCard();
  dialog.showModal();

  if (!shader && shaderCanvas.isConnected) {
    shader = createShaderFill(shaderCanvas, STAMP_SHADER);
  }

  // The card arrives picture-side up, then turns over to the side you write on. On phones the
  // note isn't focused automatically, so the keyboard doesn't jump up uninvited.
  const focusNote = () => !COMPACT_QUERY.matches && textarea.focus({ preventScroll: true });
  if (REDUCED_MOTION.matches) {
    setSide("back");
    focusNote();
  } else {
    setSide("front");
    flipTimer = setTimeout(() => {
      setSide("back");
      setTimeout(focusNote, 450);
    }, 650);
  }
}

function close() {
  dialog.close();
}

dialog.addEventListener("close", () => {
  clearTimeout(flipTimer);
  writing = false;
  shader?.destroy();
  shader = null;
  if (location.hash === "#feedback") {
    history.replaceState(null, "", location.pathname + location.search);
  }
  // Opened from a link with no invoker focused: land back on the logo.
  if (document.activeElement === document.body) {
    document.querySelector("[data-feedback-open]")?.focus({ preventScroll: true });
  }
});

// Clicking the dimmed area around the card closes it.
dialog.addEventListener("click", (event) => {
  if (event.target === dialog) close();
});

flipButton.addEventListener("click", () => {
  setSide(card.dataset.side === "back" ? "front" : "back");
});

let sending = false;

function postCard() {
  card.classList.remove("is-posted");
  void card.offsetWidth;
  card.classList.add("is-posted");
}

// Fallback: hand the card to the visitor's mail app, addressed and filled in.
function openMailApp(subject, body) {
  window.location.href = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (sending) return;
  const text = textarea.value.trim();
  if (!text) {
    setSide("back");
    status.textContent = "Write a few words on the card first.";
    textarea.focus();
    return;
  }
  // A bot that fills the hidden field gets a quiet "sent" and nothing is relayed.
  if (form.elements._honey?.value) {
    postCard();
    status.textContent = "Thank you! Your card is on its way.";
    return;
  }

  const from = fromInput.value.trim();
  const subject = from ? `Feedback from ${from}` : "Feedback from theminesa.studio";
  const body = from ? `${text}\n\n— ${from}` : text;

  sending = true;
  form.classList.add("is-sending");
  status.textContent = "Sending your card…";
  try {
    const response = await fetch(RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        _subject: subject,
        _template: "box",
        _captcha: "false",
        name: from || "Anonymous",
        message: text,
        page: location.href,
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || String(result.success) !== "true") throw new Error(result.message || response.status);
    postCard();
    textarea.value = "";
    status.textContent = `Thank you${from ? `, ${from}` : ""}! Your card is on its way to ${FEEDBACK_EMAIL}.`;
  } catch {
    // Relay unavailable (or not activated yet): fall back to the visitor's mail app.
    postCard();
    openMailApp(subject, body);
    status.textContent = `We couldn't post it from here, so your mail app should open with the card addressed to ${FEEDBACK_EMAIL}.`;
  } finally {
    sending = false;
    form.classList.remove("is-sending");
  }
});

dialog.querySelector("[data-feedback-close]").addEventListener("click", close);
document.querySelectorAll("[data-feedback-open]").forEach((link) => {
  link.addEventListener("click", open);
  link.addEventListener("pointerenter", warmUp, { once: true });
  link.addEventListener("focus", warmUp, { once: true });
});
window.addEventListener("resize", () => dialog.open && fitCard());
COMPACT_QUERY.addEventListener("change", () => dialog.open && fitCard());

// theminesa.studio/#feedback opens the card directly (the card itself prints THEMINESA.STUDIO/FEEDBACK).
const openFromHash = () => location.hash === "#feedback" && open();
window.addEventListener("hashchange", openFromHash);
openFromHash();
