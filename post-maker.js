// Post maker: writes an Updates post (Markdown, cover art, data/updates.js entry, sitemap line)
// and commits it to master in one commit through the GitHub API. GitHub Pages then deploys it.
// Access is the GitHub token: only an allowed account with write access to the repo can publish.
(function () {
  const OWNER = "theminesastudios";
  const REPO = ".github";
  const BRANCH = "master";
  const ALLOWED = ["neodevils"];
  const TOKEN_KEY = "pm-token";
  const DRAFT_KEY = "pm-draft";
  const API = "https://api.github.com";

  const $ = (sel) => document.querySelector(sel);
  const signin = $("[data-signin]");
  const editor = $("[data-editor]");
  const form = $("[data-post-form]");
  const status = $("[data-post-status]");
  const signinStatus = $("[data-signin-status]");
  const coverPreview = $("[data-cover-preview]");
  let token = "";
  let cover = null;

  const store = {
    get(key) {
      try {
        return localStorage.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(key, value);
      } catch {}
    },
    remove(key) {
      try {
        localStorage.removeItem(key);
      } catch {}
    },
  };

  function say(node, text, error) {
    node.textContent = text;
    node.classList.toggle("is-error", !!error);
  }

  async function gh(path, options = {}) {
    const response = await fetch(`${API}${path}`, {
      ...options,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2022-11-28",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
      },
    });
    if (!response.ok) {
      const detail = await response.json().catch(() => ({}));
      throw new Error(`${response.status} ${detail.message || response.statusText}`);
    }
    return response.status === 204 ? null : response.json();
  }

  async function signIn(value, remember) {
    token = value.trim();
    const user = await gh("/user");
    if (!ALLOWED.includes(user.login.toLowerCase())) throw new Error(`${user.login} is not allowed here`);
    const repo = await gh(`/repos/${OWNER}/${REPO}`);
    if (!repo.permissions?.push) throw new Error("This token can't write to the repository");
    if (remember) store.set(TOKEN_KEY, token);
    signin.hidden = true;
    editor.hidden = false;
    $("[data-user]").textContent = `@${user.login}`;
    $("[data-user]").hidden = false;
    $("[data-signout]").hidden = false;
  }

  $("[data-signin-form]").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.target);
    say(signinStatus, "Checking…");
    try {
      await signIn(data.get("token"), data.get("remember") === "on");
      say(signinStatus, "");
    } catch (error) {
      token = "";
      say(signinStatus, error.message, true);
    }
  });

  $("[data-signout]").addEventListener("click", () => {
    store.remove(TOKEN_KEY);
    location.reload();
  });

  // ---------- Draft and preview ----------
  const fields = ["date", "project", "version", "title", "summary", "imageAlt", "body"];

  function preview() {
    $("[data-preview-title]").textContent = form.title.value;
    $("[data-preview-body]").innerHTML = window.minesaRenderMarkdown
      ? window.minesaRenderMarkdown(form.body.value)
      : "";
    const draft = {};
    fields.forEach((name) => (draft[name] = form[name].value));
    store.set(DRAFT_KEY, JSON.stringify(draft));
  }

  try {
    const draft = JSON.parse(store.get(DRAFT_KEY) || "{}");
    fields.forEach((name) => {
      if (draft[name]) form[name].value = draft[name];
    });
  } catch {}
  if (!form.date.value) form.date.value = new Date().toISOString().slice(0, 10);
  form.addEventListener("input", preview);
  preview();

  $("[data-clear]").addEventListener("click", () => {
    store.remove(DRAFT_KEY);
    form.reset();
    form.date.value = new Date().toISOString().slice(0, 10);
    cover = null;
    coverPreview.hidden = true;
    preview();
  });

  // The cover is re-encoded as WebP in the browser, at most 1920px wide.
  form.cover.addEventListener("change", async () => {
    const file = form.cover.files[0];
    cover = null;
    coverPreview.hidden = true;
    if (!file) return;
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.min(1, 1920 / bitmap.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.86));
      cover = { blob, width: canvas.width, height: canvas.height };
      coverPreview.src = URL.createObjectURL(blob);
      coverPreview.hidden = false;
    } catch (error) {
      say(status, `Couldn't read that image: ${error.message}`, true);
    }
  });

  // ---------- Publish ----------
  const b64Text = (text) => {
    const bytes = new TextEncoder().encode(text);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return btoa(binary);
  };
  const b64Blob = (blob) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  const fromB64 = (b64) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
  const js = (value) => JSON.stringify(value);

  async function readFile(path) {
    const file = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}?ref=${BRANCH}`);
    return fromB64(file.content);
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!token) return;
    const button = form.querySelector('button[type="submit"]');
    const post = {};
    fields.forEach((name) => (post[name] = form[name].value.trim()));
    const slug = post.date;
    if (!cover) return say(status, "Add a cover image first.", true);
    if (!window.confirm(`Publish "${post.title}" to the live site?`)) return;

    button.disabled = true;
    try {
      say(status, "Reading the site…");
      const [indexJs, sitemap] = await Promise.all([readFile("data/updates.js"), readFile("sitemap.xml")]);
      if (indexJs.includes(`slug: ${js(slug)}`)) throw new Error(`A post for ${slug} already exists`);

      const imagePath = `assets/updates/${slug}-cover.webp`;
      const entry = [
        "  {",
        `    slug: ${js(slug)},`,
        `    date: ${js(post.date)},`,
        `    project: ${js(post.project)},`,
        post.version ? `    version: ${js(post.version)},` : null,
        `    image: ${js(imagePath)},`,
        `    imageWidth: ${cover.width},`,
        `    imageHeight: ${cover.height},`,
        `    imageAlt: ${js(post.imageAlt)},`,
        `    title: ${js(post.title)},`,
        `    summary: ${js(post.summary)},`,
        `    body: ${js(`data/updates/${slug}.md`)},`,
        "  },",
      ]
        .filter(Boolean)
        .join("\n");
      const marker = "window.MINESA_UPDATES = [\n";
      if (!indexJs.includes(marker)) throw new Error("data/updates.js has an unexpected shape");
      const newIndex = indexJs.replace(marker, `${marker}${entry}\n`);

      const today = new Date().toISOString().slice(0, 10);
      const postUrl = `https://theminesa.studio/update.html?post=${slug}`;
      let newSitemap = sitemap.replace(
        /(<loc>https:\/\/theminesa\.studio\/updates\.html<\/loc>\s*<lastmod>)[^<]*/,
        `$1${today}`,
      );
      if (!newSitemap.includes(postUrl)) {
        newSitemap = newSitemap.replace(
          /(\s*<url>\s*<loc>https:\/\/theminesa\.studio\/update\.html\?post=)/,
          `\n  <url>\n    <loc>${postUrl}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>0.6</priority>\n  </url>$1`,
        );
      }

      say(status, "Uploading…");
      const blob = (content, encoding) =>
        gh(`/repos/${OWNER}/${REPO}/git/blobs`, { method: "POST", body: JSON.stringify({ content, encoding }) });
      const [image, markdown, index, map] = await Promise.all([
        b64Blob(cover.blob).then((data) => blob(data, "base64")),
        blob(b64Text(`${post.body}\n`), "base64"),
        blob(b64Text(newIndex), "base64"),
        blob(b64Text(newSitemap), "base64"),
      ]);

      say(status, "Committing…");
      const ref = await gh(`/repos/${OWNER}/${REPO}/git/ref/heads/${BRANCH}`);
      const head = await gh(`/repos/${OWNER}/${REPO}/git/commits/${ref.object.sha}`);
      const file = (path, sha) => ({ path, mode: "100644", type: "blob", sha });
      const tree = await gh(`/repos/${OWNER}/${REPO}/git/trees`, {
        method: "POST",
        body: JSON.stringify({
          base_tree: head.tree.sha,
          tree: [
            file(imagePath, image.sha),
            file(`data/updates/${slug}.md`, markdown.sha),
            file("data/updates.js", index.sha),
            file("sitemap.xml", map.sha),
          ],
        }),
      });
      const commit = await gh(`/repos/${OWNER}/${REPO}/git/commits`, {
        method: "POST",
        body: JSON.stringify({
          message: `Updates: ${post.title} (${slug})\n\nPublished with the post maker.`,
          tree: tree.sha,
          parents: [head.sha],
        }),
      });
      await gh(`/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha }),
      });

      store.remove(DRAFT_KEY);
      status.replaceChildren(
        "Published. GitHub Pages will have it live in a minute or two: ",
        Object.assign(document.createElement("a"), { href: postUrl, textContent: postUrl, target: "_blank" }),
      );
      status.classList.remove("is-error");
    } catch (error) {
      say(status, `Not published: ${error.message}`, true);
    } finally {
      button.disabled = false;
    }
  });

  const saved = store.get(TOKEN_KEY);
  if (saved) {
    say(signinStatus, "Signing in…");
    signIn(saved, true)
      .then(() => say(signinStatus, ""))
      .catch((error) => {
        store.remove(TOKEN_KEY);
        token = "";
        say(signinStatus, error.message, true);
      });
  }
})();
