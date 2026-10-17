// Index of the Updates posts (updates.html, update.html?post=<slug>).
// Loaded as a plain script so both pages render on first paint (no fetch), which lets the
// cover art, label and date morph between the list and the post with a view transition.
//
// Each post's text is Markdown in data/updates/<slug>.md (headings, lists, **bold**, links,
// `code`, quotes). To publish a post, add its Markdown file and an entry here.
// date is ISO (YYYY-MM-DD). version is optional: posts without one show the project instead.
window.MINESA_UPDATES = [
  {
    slug: "2026-10-16",
    date: "2026-10-16",
    project: "Dungeon Blitz R",
    image: "assets/updates/2026-10-16-mica-art.webp",
    imageWidth: 1500,
    imageHeight: 855,
    imageAlt:
      "Mica's painting of a knight in gold-trimmed armour riding a spiked blue beast past a striped tent in a sunny village.",
    title: "Rankings, resumable runs, Ruby charms and the Green Knight",
    summary:
      "Global rankings, dungeon runs that survive a disconnect, the Green Knight's Hallow's Eve arena, stronger Ruby charms and a long list of crash fixes.",
    body: "data/updates/2026-10-16.md",
  },
];
