// Index of the Updates posts (updates.html, update.html?post=<slug>).
// Loaded as a plain script so both pages render on first paint (no fetch), which lets the
// cover art, label and date morph between the list and the post with a view transition.
//
// Each post's text is Markdown in data/updates/<slug>.md (headings, lists, **bold**, links,
// `code`, quotes). To publish a post, add its Markdown file and an entry here.
// date is ISO (YYYY-MM-DD). version is optional: posts without one show the project instead.
window.MINESA_UPDATES = [
  {
    slug: "2026-10-17",
    date: "2026-10-17",
    project: "Dungeon Blitz R",
    image: "assets/dungeon-blitz-r/main-bg.webp",
    imageWidth: 2560,
    imageHeight: 1186,
    imageAlt:
      "Dungeon Blitz R key art: a mage, a warrior and a rogue charge at a red, fox-like beast on a sunny hillside.",
    title: "Ruby charms, new stable prices and a smoother start",
    summary:
      "Ruby charms grant twice the Critical Bonus, mounts and pets are repriced, the studio gets its own guild banner, and the game loads again for everyone.",
    body: "data/updates/2026-10-17.md",
  },
  {
    slug: "2026-10-16",
    date: "2026-10-16",
    project: "Dungeon Blitz R",
    image: "assets/updates/2026-10-16-mica-art.webp",
    imageWidth: 1500,
    imageHeight: 855,
    imageAlt:
      "Mica's painting of a knight in gold-trimmed armour riding a spiked blue beast past a striped tent in a sunny village.",
    title: "Rankings, resumable runs and the Green Knight",
    summary:
      "Global rankings, dungeon runs that survive a disconnect, the Green Knight's Hallow's Eve arena and a long list of crash fixes.",
    body: "data/updates/2026-10-16.md",
  },
];
