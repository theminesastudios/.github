// Updates (blog). Renders the list (updates.html, #updates-list) or a single post
// (update.html?post=<slug>, #update-post) from window.MINESA_UPDATES (data/updates.js).
// Runs synchronously at the end of <body>, so the page is complete on its first paint.
(function () {
  const SITE = "https://theminesa.studio";
  const PROJECT_MARKS = {
    "Dungeon Blitz": "assets/updates/dungeon-blitz-mark.svg",
  };

  const posts = (window.MINESA_UPDATES || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const formatDate = (iso) => dateFormat.format(new Date(`${iso}T00:00:00Z`));
  const postUrl = (post) => `./update.html?post=${encodeURIComponent(post.slug)}`;

  // Shared names let the art, version and date morph from the card into the post.
  const morph = (node, part, post) => {
    node.style.viewTransitionName = `update-${part}-${post.slug.replace(/[^a-z0-9-]/gi, "")}`;
    return node;
  };

  function el(tag, props = {}, children = []) {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(props)) {
      if (key === "class") node.className = value;
      else if (key === "text") node.textContent = value;
      else if (key in node && typeof value !== "string") node[key] = value;
      else node.setAttribute(key, value);
    }
    node.append(...children);
    return node;
  }

  const art = (post, className, loading) =>
    el("img", {
      class: className,
      src: post.image,
      alt: post.imageAlt || "",
      width: String(post.imageWidth || 958),
      height: String(post.imageHeight || 646),
      decoding: "async",
      loading,
    });

  // ---------- List ----------
  const list = document.getElementById("updates-list");
  if (list) {
    if (!posts.length) {
      list.replaceWith(el("p", { class: "updates-empty", text: "No updates yet. Check back soon." }));
    }
    posts.forEach((post, index) => {
      const mark = PROJECT_MARKS[post.project];
      const card = el("a", { class: "update-card", href: postUrl(post) }, [
        el("span", { class: "u-sr", text: `${post.project} ${post.version}: ${post.title}. ` }),
        mark
          ? el("img", { class: "update-card__mark", src: mark, alt: "", width: "26", height: "20" })
          : el("span", { class: "update-card__project", text: post.project }),
        el("span", { class: "update-card__row" }, [
          morph(el("span", { class: "update-card__version", "aria-hidden": "true", text: post.version }), "version", post),
          morph(art(post, "update-card__art", index < 4 ? "eager" : "lazy"), "art", post),
          morph(el("time", { class: "update-card__date", datetime: post.date, text: formatDate(post.date) }), "date", post),
        ]),
      ]);
      card.querySelector(".update-card__art").alt = "";
      list.append(el("li", { class: "update-item", style: `--i: ${index}` }, [card]));
    });

    // Cards come in once their art has loaded (or after 2s). Arriving by view transition from
    // a post, they show at once so the art can morph back into place.
    const ready = () => list.classList.add("is-ready");
    const decoding = [...list.querySelectorAll("img")].map((img) => img.decode().catch(() => {}));
    Promise.race([Promise.all(decoding), new Promise((r) => setTimeout(r, 2000))]).then(ready);
    addEventListener("pagereveal", (event) => {
      if (!event.viewTransition) return;
      list.classList.add("no-enter");
      ready();
    });
  }

  // ---------- Single post ----------
  const article = document.getElementById("update-post");
  if (article) {
    const slug = new URLSearchParams(location.search).get("post");
    const index = posts.findIndex((p) => p.slug === slug);
    const post = posts[index];

    if (!post) {
      document.title = "Update not found | The Minesa Studios";
      document.querySelector('meta[name="robots"]')?.setAttribute("content", "noindex");
      article.append(
        el("p", { class: "post-kicker", text: "Update not found" }),
        el("p", { class: "post-missing" }, [
          "That post has moved or never existed. ",
          el("a", { href: "./updates.html", text: "See all updates" }),
          ".",
        ]),
      );
      return;
    }

    const url = `${SITE}/update.html?post=${encodeURIComponent(post.slug)}`;
    const title = `${post.title} · ${post.project} ${post.version}`;
    document.title = `${title} | The Minesa Studios`;
    const setMeta = (selector, value) => document.querySelector(selector)?.setAttribute("content", value);
    setMeta('meta[name="description"]', post.summary);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', post.summary);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[property="og:image"]', `${SITE}/${post.image}`);
    document.querySelector('link[rel="canonical"]')?.setAttribute("href", url);
    document.head.append(
      el("script", {
        type: "application/ld+json",
        text: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: post.title,
          description: post.summary,
          datePublished: post.date,
          image: `${SITE}/${post.image}`,
          url,
          about: { "@type": "VideoGame", name: post.project },
          publisher: { "@type": "Organization", name: "The Minesa Studios", url: SITE },
        }),
      }),
    );

    const newer = posts[index - 1];
    const older = posts[index + 1];
    article.append(
      el("p", { class: "post-kicker", text: `${post.project} Updates` }),
      el("div", { class: "post-hero" }, [
        morph(el("span", { class: "post-hero__version", text: post.version }), "version", post),
        morph(art(post, "post-hero__art", "eager"), "art", post),
        morph(el("time", { class: "post-hero__date", datetime: post.date, text: formatDate(post.date) }), "date", post),
      ]),
      el("div", { class: "post-body" }, [
        el("h1", { class: "post-title", text: post.title }),
        ...(post.summary ? [el("p", { text: post.summary })] : []),
        ...(post.body || []).map((text) => el("p", { text })),
        ...(post.changes?.length
          ? [el("ul", { class: "post-changes" }, post.changes.map((text) => el("li", { text })))]
          : []),
      ]),
    );
    if (newer || older) {
      article.append(
        el("nav", { class: "post-pager", "aria-label": "More updates" }, [
          older ? el("a", { href: postUrl(older), rel: "prev", text: `← ${older.version}` }) : el("span"),
          newer ? el("a", { href: postUrl(newer), rel: "next", text: `${newer.version} →` }) : el("span"),
        ]),
      );
    }
  }
})();
