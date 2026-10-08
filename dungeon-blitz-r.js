(function () {
	const RELEASE_API =
		"https://api.github.com/repos/theminesastudios/dungeon-blitz-r-launcher/releases/latest";

	// Which release file each device gets. Linux has no build yet, so it falls back to the
	// release page like an unknown device does.
	const ASSETS = {
		"win-x64": { name: "Windows", detail: "Windows 64-bit installer", pattern: /-win-x64-setup\.exe$/ },
		"win-ia32": { name: "Windows", detail: "Windows 32-bit installer", pattern: /-win-ia32-setup\.exe$/ },
		mac: { name: "macOS", detail: "macOS disk image", pattern: /-mac-x64\.dmg$/ },
	};

	const buttons = document.querySelectorAll("[data-launcher-download]");
	const labelEl = document.querySelector("[data-launcher-label]");
	const metaEl = document.querySelector("[data-launcher-meta]");
	const assetLinks = document.querySelectorAll("[data-launcher-asset]");
	const otherEl = document.querySelector("[data-launcher-other]");
	if (!buttons.length) return;

	function detectPlatform() {
		const ua = navigator.userAgent || "";
		const touchMac = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
		if (/Android|iPhone|iPad|iPod|Mobile/i.test(ua) || touchMac) return "mobile";
		if (/Windows/i.test(ua)) return /Win64|x64|WOW64|amd64/i.test(ua) ? "win-x64" : "win-ia32";
		if (/Macintosh|Mac OS X/i.test(ua)) return "mac";
		if (/Linux|X11|CrOS/i.test(ua)) return "linux";
		return "unknown";
	}

	const platform = detectPlatform();
	const target = ASSETS[platform];

	// The launcher is desktop-only, so a phone or tablet gets the buttons disabled. This keys on
	// the device rather than the viewport: a narrow desktop window can still download.
	if (platform === "mobile") {
		buttons.forEach(function (button) {
			button.removeAttribute("href");
			button.setAttribute("aria-disabled", "true");
			button.classList.add("is-disabled");
		});
		if (metaEl) metaEl.hidden = true;
		if (otherEl) otherEl.hidden = true;
		return;
	}

	if (labelEl && target) labelEl.textContent = "Download for " + target.name;
	if (metaEl && platform === "linux") {
		metaEl.textContent = "A Linux build is not available yet. Windows and macOS for now.";
	}

	// Without the release list every link keeps pointing at the release page, which still works.
	fetch(RELEASE_API, { headers: { Accept: "application/vnd.github+json" } })
		.then(function (res) {
			if (!res.ok) throw new Error("GitHub responded " + res.status);
			return res.json();
		})
		.then(function (release) {
			const assets = Array.isArray(release.assets) ? release.assets : [];
			const version = String(release.tag_name || "").replace(/^v/, "");

			function urlFor(key) {
				const match = assets.find(function (asset) {
					return ASSETS[key].pattern.test(asset.name);
				});
				return match ? match.browser_download_url : null;
			}

			assetLinks.forEach(function (link) {
				const url = urlFor(link.dataset.launcherAsset);
				if (url) link.href = url;
			});

			if (!target) return;
			const url = urlFor(platform);
			if (!url) return;
			buttons.forEach(function (button) {
				button.href = url;
			});
			if (metaEl) {
				metaEl.textContent = (version ? "Version " + version + " · " : "") + target.detail;
			}
		})
		.catch(function (err) {
			console.warn("Could not load the latest launcher release:", err);
		});
})();
