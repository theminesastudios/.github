// Posts for the Updates pages (updates.html, update.html?post=<slug>), newest first.
// Loaded as a plain script so the pages render on first paint (no fetch), which lets the
// cover art morph between the list and the post with a cross-document view transition.
// date is ISO (YYYY-MM-DD); body paragraphs and changes are plain text.
window.MINESA_UPDATES = [
  {
    slug: "v1-25-0",
    version: "v1.25.0",
    date: "2026-08-20",
    project: "Dungeon Blitz",
    image: "assets/updates/v1.25.0.png",
    imageWidth: 958,
    imageHeight: 646,
    imageAlt: "A Rogue in a red cape crouches with a glowing blade beside a training dummy.",
    title: "Viperblade & Flurry of Daggers",
    summary: "Viper ranged-attack poison now stacks with Flurry poison.",
    changes: ["Flurry poison max stacks: 8 → 16.", "Flurry poison DoT ratio: 1 → 0.8."],
  },
];
