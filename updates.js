// Updates (blog). Renders the list (updates.html, #updates-list) or a single post
// (update.html?post=<slug>, #update-post) from window.MINESA_UPDATES (data/updates.js).
// Runs synchronously at the end of <body>, so the page is complete on its first paint; a
// post's Markdown text (data/updates/<slug>.md) is fetched and rendered after that.
(function () {
  const SITE = "https://theminesa.studio";
  const PROJECT_MARKS = {
    "Dungeon Blitz R": "assets/updates/dungeon-blitz-mark.svg",
    "Dungeon Blitz": "assets/updates/dungeon-blitz-mark.svg",
  };
  // A card's and a post's side label: the version when a post has one, else the project.
  const sideLabel = (post) => post.version || post.project;

  const posts = (window.MINESA_UPDATES || []).slice().sort((a, b) => b.date.localeCompare(a.date));
  const dateFormat = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
  const formatDate = (iso) => dateFormat.format(new Date(`${iso}T00:00:00Z`));
  const postUrl = (post) => `./update.html?post=${encodeURIComponent(post.slug)}`;

  // Shared names let the art, side label and date morph from the card into the post.
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
        el("span", { class: "u-sr", text: `${post.project}${post.version ? ` ${post.version}` : ""}: ${post.title}. ` }),
        mark
          ? el("img", { class: "update-card__mark", src: mark, alt: "", width: "26", height: "20" })
          : el("span", { class: "update-card__project", text: post.project }),
        el("span", { class: "update-card__row" }, [
          morph(el("span", { class: "update-card__version", "aria-hidden": "true", text: sideLabel(post) }), "version", post),
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
    const title = `${post.title} · ${post.project}${post.version ? ` ${post.version}` : ""}`;
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
    const content = el("div", { class: "post-content", "aria-busy": "true" });
    article.append(
      el("p", { class: "post-kicker", text: post.kicker || "Weekly Updates" }),
      el("div", { class: "post-hero" }, [
        morph(el("span", { class: "post-hero__version", text: sideLabel(post) }), "version", post),
        morph(art(post, "post-hero__art", "eager"), "art", post),
        morph(el("time", { class: "post-hero__date", datetime: post.date, text: formatDate(post.date) }), "date", post),
      ]),
      el("div", { class: "post-body" }, [el("h1", { class: "post-title", text: post.title }), content]),
    );
    if (newer || older) {
      article.append(
        el("nav", { class: "post-pager", "aria-label": "More updates" }, [
          older ? el("a", { href: postUrl(older), rel: "prev", text: `← ${formatDate(older.date)}` }) : el("span"),
          newer ? el("a", { href: postUrl(newer), rel: "next", text: `${formatDate(newer.date)} →` }) : el("span"),
        ]),
      );
    }

    // The text arrives after the first paint; until then (or if it can't load) the summary
    // stands in, so the page is never empty.
    const showSummary = () => {
      content.replaceChildren(el("p", { text: post.summary || "" }));
      content.removeAttribute("aria-busy");
    };
    if (!post.body) showSummary();
    else {
      fetch(post.body)
        .then((response) => (response.ok ? response.text() : Promise.reject(response.status)))
        .then((markdown) => {
          content.innerHTML = renderMarkdown(markdown);
          content.removeAttribute("aria-busy");
          content.classList.add("is-loaded");
        })
        .catch(showSummary);
    }
  }

  // ---------- Markdown ----------
  // A small renderer for the posts: headings, paragraphs, nested lists, quotes, rules, fenced
  // code, and inline **bold**, *italic*, `code`, links and images. Everything is escaped first,
  // so a post can't inject markup.
  function renderMarkdown(source) {
    const escape = (text) =>
      text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const safeUrl = (url) => (/^(https?:|mailto:|\.{0,2}\/|#|[\w-]+\.)/i.test(url) ? url : "#");

    function inline(text) {
      const codes = [];
      let html = escape(text).replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(code) - 1}\u0000`);
      html = html
        .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, src) => `<img src="${safeUrl(src)}" alt="${alt}" loading="lazy">`)
        .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
          const external = /^https?:/i.test(href) ? ' rel="noopener" target="_blank"' : "";
          return `<a href="${safeUrl(href)}"${external}>${label}</a>`;
        })
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, "$1<em>$2</em>")
        .replace(/(^|[^_\w])_([^_\s][^_]*?)_(?!\w)/g, "$1<em>$2</em>");
      return html.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
    }

    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let paragraph = [];
    let quote = [];
    const lists = []; // open lists: { indent, tag }

    const flushParagraph = () => {
      if (paragraph.length) out.push(`<p>${inline(paragraph.join(" "))}</p>`);
      paragraph = [];
    };
    const flushQuote = () => {
      if (quote.length) out.push(`<blockquote><p>${inline(quote.join(" "))}</p></blockquote>`);
      quote = [];
    };
    const closeLists = (indent = -1) => {
      while (lists.length && lists[lists.length - 1].indent > indent) {
        out.push(`</li></${lists.pop().tag}>`);
      }
    };
    const flushAll = () => {
      flushParagraph();
      flushQuote();
      closeLists();
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^```/.test(line)) {
        flushAll();
        const code = [];
        while (++i < lines.length && !/^```/.test(lines[i])) code.push(lines[i]);
        out.push(`<pre><code>${escape(code.join("\n"))}</code></pre>`);
        continue;
      }
      if (!line.trim()) {
        flushParagraph();
        flushQuote();
        continue;
      }
      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        flushAll();
        // The post title is the page's h1, so Markdown headings start at h2.
        const level = Math.min(Math.max(heading[1].length, 2), 4);
        out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
        continue;
      }
      if (/^\s*([-*_])(\s*\1){2,}\s*$/.test(line)) {
        flushAll();
        out.push("<hr>");
        continue;
      }
      const quoted = line.match(/^>\s?(.*)$/);
      if (quoted) {
        flushParagraph();
        closeLists();
        quote.push(quoted[1]);
        continue;
      }
      const item = line.match(/^(\s*)([-*+]|\d+[.)])\s+(.*)$/);
      if (item) {
        flushParagraph();
        flushQuote();
        const indent = item[1].replace(/\t/g, "  ").length;
        const tag = /\d/.test(item[2]) ? "ol" : "ul";
        const top = lists[lists.length - 1];
        if (!top || indent > top.indent) {
          lists.push({ indent, tag });
          out.push(`<${tag}><li>${inline(item[3])}`);
        } else {
          closeLists(indent);
          out.push(`</li><li>${inline(item[3])}`);
        }
        continue;
      }
      // A continuation line inside a list item joins that item.
      if (lists.length && /^\s+\S/.test(line) && !paragraph.length) {
        out.push(` ${inline(line.trim())}`);
        continue;
      }
      closeLists();
      flushQuote();
      paragraph.push(line.trim());
    }
    flushAll();
    return out.join("\n");
  }
})();
