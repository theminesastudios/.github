// Team members for member.html?user=<key> (Figma: v6/Minesa > Desktop - Team/Member).
// A plain script, so the page renders on its first paint and the avatar and name can morph in
// from the team page with a cross-document view transition.
//
// bio: one array per line. Strings are muted text; { chip } inserts a highlighted project
// from MINESA_CHIPS. socials are shown in the order GitHub, X, Instagram.
window.MINESA_CHIPS = {
  minesa: {
    label: "Minesa Studios",
    icon: "assets/navigation-assets/Logo.svg",
    width: 20,
    height: 19.4,
    href: "./index.html",
  },
  "mini-interaction": {
    label: "mini-interaction",
    icon: "assets/member/chip-mini-interaction.svg",
    width: 38,
    height: 19,
    href: "https://theminesastudios.github.io/mini-interaction-website/",
  },
  darkvoid: {
    label: "DarkVoid",
    icon: "assets/member/chip-darkvoid.svg",
    width: 19,
    height: 19,
  },
  "dungeon-blitz": {
    label: "Dungeon Blitz: R",
    icon: "assets/updates/dungeon-blitz-mark.svg",
    width: 24.57,
    height: 19,
    href: "./dungeon-blitz-r.html",
  },
};

window.MINESA_MEMBERS = {
  cheetoo: {
    name: "Cheetoo",
    fullName: "Paul I.",
    color: "#f8ade3",
    avatar: "assets/team/avatar-cheetoo.svg",
    quote: "Code like a cheetoo.",
    bio: [
      ["I am member of", { chip: "minesa" }, "since 2025."],
      ["I am working as maintainer on", { chip: "dungeon-blitz" }, "preservation project."],
    ],
    socials: {},
    signature: { src: "assets/signatures/cheetoo.svg", width: 395, height: 248 },
    gallery: [],
  },
  telahair: {
    name: "Telahair",
    fullName: "Arda A.",
    color: "#9977f7",
    avatar: "assets/team/avatar-telahair.svg",
    quote: "From one game to the next.",
    bio: [
      ["I am member of", { chip: "minesa" }, "since 2025."],
      ["I am working as maintainer on", { chip: "dungeon-blitz" }, "preservation project."],
    ],
    socials: {
      Instagram: "https://www.instagram.com/ardaarican39/",
    },
    signature: { src: "assets/signatures/telahair.svg", width: 232, height: 102 },
    gallery: [],
  },
  neo: {
    name: "Neo",
    fullName: "Ibrahim G.",
    color: "#fc546d",
    avatar: "assets/team/avatar-neo.svg",
    quote: "Design first. Developer second.",
    bio: [
      ["I am the owner and designer at", { chip: "minesa" }, "since 2021."],
      ["Now, I am building", { chip: "mini-interaction" }, "for hosting Discord apps that only command matters."],
      ["I have designed && coded the website of", { chip: "darkvoid" }, "for the gamers who wants the safest game experience."],
      ["Additionally, I've contributed", { chip: "dungeon-blitz" }, "preservation project to make the game have a comeback."],
    ],
    socials: {
      GitHub: "https://github.com/Neodevils",
      X: "https://x.com/neodevils_",
      Instagram: "https://www.instagram.com/neodevils_/",
    },
    signature: { src: "assets/member/signature-neo.svg", width: 133, height: 100 },
    gallery: [
      { src: "assets/member/neo-1.webp", width: 1160, height: 1160, alt: "Neo's shadow stretched across stone paving." },
      { src: "assets/member/neo-2.webp", width: 768, height: 768, alt: "A painted portrait of Neo looking to the side." },
    ],
  },
  mica: {
    name: "Mica",
    fullName: "Micha Joy J. T.",
    color: "#7375ff",
    avatar: "assets/team/avatar-mica.svg",
    quote: "Together, we weave the visions of your heart, blending your dreams with my artistry.",
    bio: [
      ["I am co-owner and the artist at", { chip: "minesa" }, "since 2021."],
      ["I created over 100 pieces of art and sold them to more than 10 clients."],
    ],
    socials: {
      GitHub: "https://github.com/michii18",
      X: "https://x.com/1828Mich",
    },
    signature: { src: "assets/signatures/mica.svg", width: 250, height: 105 },
    gallery: [
      { src: "assets/member_assets/image_mica_1.png", width: 580, height: 362, alt: "Mica's framed painting of a family portrait." },
      { src: "assets/member_assets/image_mica_2.png", width: 580, height: 362, alt: "Mica's painting of two koi circling a lotus flower." },
    ],
  },
};
