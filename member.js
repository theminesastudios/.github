// Member showcase (Figma: v6/Minesa > Desktop - Team/Member), member.html?user=<key>.
// Renders synchronously from window.MINESA_MEMBERS (data/members.js) so the page is complete on
// its first paint: the avatar, "Meet with" and the name then morph in from the team page.
(function () {
  const SITE = "https://theminesa.studio";
  const SOCIAL_ORDER = ["GitHub", "X", "Instagram"];
  const members = window.MINESA_MEMBERS || {};
  const chips = window.MINESA_CHIPS || {};
  const main = document.getElementById("member");
  if (!main) return;

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (value == null) continue;
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
  }

  const key = (new URLSearchParams(location.search).get("user") || "").toLowerCase();
  const member = Object.hasOwn(members, key) ? members[key] : null;

  if (!member) {
    document.title = "Member not found | The Minesa Studios";
    document.querySelector('meta[name="robots"]')?.setAttribute("content", "noindex");
    main.append(
      el("h1", { class: "m-hero m-hero--missing" }, [el("span", { class: "m-meet", text: "Who's that?" })]),
      el("p", { class: "m-quote" }, [
        "We couldn't find that member. ",
        el("a", { class: "m-inline-link", href: "./team.html", text: "Meet the whole team" }),
        ".",
      ]),
    );
    return;
  }

  // ---------- SEO ----------
  const url = `${SITE}/member.html?user=${key}`;
  const description = `${member.name} (${member.fullName}) at The Minesa Studios: “${member.quote}”`;
  document.title = `Meet with ${member.name} | The Minesa Studios`;
  const setMeta = (selector, value) => document.querySelector(selector)?.setAttribute("content", value);
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', `Meet with ${member.name} | The Minesa Studios`);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:url"]', url);
  document.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
  const sameAs = SOCIAL_ORDER.map((name) => member.socials?.[name]).filter(Boolean);
  document.head.append(
    el("script", {
      type: "application/ld+json",
      text: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        url,
        mainEntity: {
          "@type": "Person",
          name: member.fullName,
          alternateName: member.name,
          description: member.quote,
          image: `${SITE}/${member.avatar}`,
          worksFor: { "@type": "Organization", name: "The Minesa Studios", url: SITE },
          ...(sameAs.length ? { sameAs } : {}),
        },
      }),
    }),
  );

  document.body.dataset.member = key;
  document.body.style.setProperty("--member-color", member.color);

  // ---------- Hero: "Meet with (avatar) Name" ----------
  // view-transition-names match team.html, so these morph from the team lineup. The avatar and
  // name are also a switcher: hovering (or pressing) it lists the other members.
  const others = Object.entries(members).filter(([k]) => k !== key);
  const profile = el(
    "button",
    { class: "m-profile", type: "button", "aria-expanded": "false", "aria-controls": "m-roster" },
    [
      el("span", { class: "m-avatar", style: `view-transition-name: avatar-${key}` }, [
        el("img", { src: member.avatar, alt: "", width: "154", height: "154" }),
      ]),
      el("span", { class: "m-name", style: "view-transition-name: meet-name", text: member.name }),
    ],
  );
  const hero = el("h1", { class: "m-hero" }, [
    el("span", { class: "m-meet", style: "view-transition-name: meet-with", text: "Meet with" }),
    profile,
  ]);
  // The picked mini avatar takes that member's avatar view-transition-name on click, so it
  // morphs into the next page's hero. (Set only then: hidden avatars must not join other
  // transitions, such as going back to the team page.)
  const roster = el("nav", { class: "m-roster", id: "m-roster", "aria-label": "Other members" }, [
    el(
      "ul",
      {},
      others.map(([k, m], index) =>
        el("li", { style: `--i: ${index}` }, [
          el("a", { class: "m-roster__link", href: `./member.html?user=${k}`, style: `--color: ${m.color}` }, [
            el("img", {
              class: "m-roster__avatar",
              src: m.avatar,
              alt: "",
              width: "36",
              height: "36",
              "data-vt": `avatar-${k}`,
            }),
            el("span", { class: "m-roster__name", text: m.name }),
          ]),
        ]),
      ),
    ),
    el("a", { class: "m-roster__all", href: "./team.html", text: "Whole team" }),
  ]);
  const heroWrap = el("div", { class: "m-hero-wrap" }, [hero, roster]);
  roster.addEventListener("click", (e) => {
    const avatar = e.target.closest(".m-roster__link")?.querySelector(".m-roster__avatar");
    if (avatar) avatar.style.viewTransitionName = avatar.dataset.vt;
  });
  // Back/forward restores this page from the cache with the name still set: clear it.
  addEventListener("pageshow", () => {
    roster.querySelectorAll(".m-roster__avatar").forEach((a) => (a.style.viewTransitionName = ""));
    setOpen(false);
  });

  let closeTimer = null;
  const setOpen = (open) => {
    clearTimeout(closeTimer);
    if (open) {
      // Sit the list under the avatar, wherever the heading wrapped it.
      heroWrap.style.setProperty("--roster-x", `${profile.offsetLeft}px`);
      heroWrap.style.setProperty("--roster-y", `${profile.offsetTop + profile.offsetHeight}px`);
    }
    heroWrap.classList.toggle("is-open", open);
    profile.setAttribute("aria-expanded", String(open));
  };
  const closeSoon = () => {
    clearTimeout(closeTimer);
    closeTimer = setTimeout(() => setOpen(false), 220);
  };
  const hoverable = matchMedia("(hover: hover)");
  for (const target of [profile, roster]) {
    target.addEventListener("pointerenter", (e) => e.pointerType === "mouse" && hoverable.matches && setOpen(true));
    target.addEventListener("pointerleave", (e) => e.pointerType === "mouse" && closeSoon());
  }
  profile.addEventListener("click", () => setOpen(profile.getAttribute("aria-expanded") !== "true"));
  heroWrap.addEventListener("focusout", (e) => !heroWrap.contains(e.relatedTarget) && setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && heroWrap.classList.contains("is-open")) {
      setOpen(false);
      profile.focus();
    }
  });
  document.addEventListener("pointerdown", (e) => !heroWrap.contains(e.target) && setOpen(false));

  // ---------- About ----------
  const chip = (id) => {
    const data = chips[id];
    if (!data) return document.createTextNode(id);
    const inner = [
      el("img", { class: "m-chip__icon", src: data.icon, alt: "", width: String(data.width), height: String(data.height) }),
      el("span", { class: "m-chip__label", text: data.label }),
    ];
    return data.href
      ? el("a", { class: "m-chip", href: data.href }, inner)
      : el("span", { class: "m-chip" }, inner);
  };

  const bio = el(
    "div",
    { class: "m-bio" },
    (member.bio || []).map((line, index) =>
      el(
        "p",
        { class: "m-line", style: `--i: ${index}` },
        line.flatMap((part, i) => {
          const node = typeof part === "string" ? document.createTextNode(part) : chip(part.chip);
          return i ? [document.createTextNode(" "), node] : [node];
        }),
      ),
    ),
  );

  const socials = SOCIAL_ORDER.filter((name) => member.socials?.[name]);
  const connect = socials.length
    ? el("div", { class: "m-connect" }, [
        el("h2", { class: "m-connect__title", text: "Connect" }),
        el(
          "ul",
          { class: "m-connect__list" },
          socials.map((name) =>
            el("li", {}, [
              el(
                "a",
                {
                  class: `m-social m-social--${name.toLowerCase()}`,
                  href: member.socials[name],
                  rel: "me noopener",
                  target: "_blank",
                  "aria-label": name === "X" ? `${member.name} on X` : null,
                },
                name === "X" ? [el("img", { src: "assets/member/x.svg", alt: "", width: "16", height: "16" })] : [name],
              ),
            ]),
          ),
        ),
      ])
    : null;

  const signature = member.signature
    ? el("img", {
        class: "m-signature",
        src: member.signature.src,
        alt: `${member.fullName}'s signature`,
        width: String(member.signature.width),
        height: String(member.signature.height),
      })
    : null;

  const about = el(
    "section",
    { class: "m-about", "aria-label": `About ${member.name}` },
    [el("p", { class: "m-quote", text: member.quote }), bio, connect, signature].filter(Boolean),
  );

  main.append(heroWrap, about);

  // ---------- Gallery ----------
  if (member.gallery?.length) {
    main.append(
      el("hr", { class: "m-rule" }),
      el(
        "ul",
        { class: "m-gallery", "aria-label": `${member.name}'s gallery` },
        member.gallery.map((photo, index) =>
          el("li", { class: "m-shot", style: `--i: ${index}` }, [
            el("span", { class: "m-shot__frame" }, [
              el("img", {
                class: "m-shot__img",
                src: photo.src,
                alt: photo.alt,
                width: String(photo.width),
                height: String(photo.height),
                // Eager at low priority: native lazy-loading can stall after a view transition.
                fetchpriority: "low",
                decoding: "async",
                onload: "this.classList.add('is-loaded')",
                onerror: "this.classList.add('is-loaded')",
              }),
            ]),
          ]),
        ),
      ),
    );
  }
})();
