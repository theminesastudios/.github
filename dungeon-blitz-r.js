// Dungeon Blitz: R page: the class & discipline picker, the nav's current section, and the
// launcher download (the right installer for this device, from the latest GitHub release).
(function () {
	const ASSET = "assets/dungeon-blitz-r";

	// ---------- Classes & disciplines ----------
	// Names, descriptions and talent trees come from the game client (DungeonBlitz.swf); art is
	// exported from UI_1 / UI_4 / UI_Library with ffdec.
	// Each discipline's backdrop is its level-10 tower from the player's keep (LevelsHome.swf,
	// names from BuildingTypes), tinted with an accent colour taken from its art.
	const TOWERS = {
		sentinel: { name: "Stormgaze Refuge", accent: "#3fb7c9" },
		justicar: { name: "Flamefury Dais", accent: "#e0832b" },
		templar: { name: "Templar Citadel", accent: "#d9b75a" },
		executioner: { name: "Elysian Soultrap", accent: "#46b6d6" },
		shadowwalker: { name: "Twisted Nethertotem", accent: "#7d5fd6" },
		soulthief: { name: "Soulthief Lair", accent: "#5f7fd9" },
		flameseer: { name: "Magmaheart Furnace", accent: "#e2552a" },
		frostwarden: { name: "Coldsnap Conduit", accent: "#7cc6ef" },
		necromancer: { name: "Necromancer Tower", accent: "#6fbf62" },
	};

	const discipline = (slug, name, treeName, description) => ({
		slug,
		name,
		description,
		portrait: `${ASSET}/disciplines/${slug}.svg`,
		tree: { name: treeName, icon: `${ASSET}/talents/${slug}.svg` },
		tower: { art: `${ASSET}/towers/${slug}.webp`, ...TOWERS[slug] },
	});

	const CLASSES = [
		{
			slug: "paladin",
			name: "Paladin",
			tree: { name: "Martial Techniques", icon: `${ASSET}/talents/paladin.svg` },
			disciplines: [
				discipline("sentinel", "Sentinel", "Chivalric Prowess", "Blessed by the Storm Gods, you draw enemy wrath upon your impregnable form and focus the tempest until you become the Lightning Avatar and smite all who stand before you."),
				discipline("justicar", "Justicar", "Sacred Castigations", "With righteous fury from the Flame of Justice coursing through your body, you leap into the fray, a blaze of attacks swirling through the enemy ranks."),
				discipline("templar", "Templar", "Theurgical Devotions", "Infused with the Numinous Essence, you shine a searing, sacred light into the darkest places, healing the worthy and inflicting blinding agony upon the wicked."),
			],
		},
		{
			slug: "rogue",
			name: "Rogue",
			tree: { name: "Tricks o’ Trade", icon: `${ASSET}/talents/rogue.svg` },
			disciplines: [
				discipline("executioner", "Viperblade", "Ambush & Onslaught", "You have forsaken all safety for the Pure Death; you know the perfect strike, the incurable venom, the hidden cut that dooms your chosen foe to certain annihilation."),
				discipline("shadowwalker", "Shadowstalker", "From the Shadows", "You have sacrificed yourself to the Shadow Court, becoming a deadly trickster who strikes from afar, appears everywhere at once, and terrorizes enemies from the darkness."),
				discipline("soulthief", "Soulthief", "The Dark Arts", "You have mastered the heresies of the Codex Carnifex; you know that true pain comes with the death of the soul and that true victory takes a foe’s life force as your dark reward."),
			],
		},
		{
			slug: "mage",
			name: "Mage",
			tree: { name: "Wizardry Guild", icon: `${ASSET}/talents/mage.svg` },
			disciplines: [
				discipline("flameseer", "Flameseer", "Infernal Circle", "Touched by an Essence of Fire, you throw caution to the wind with every explosive inferno you unleash upon the enemy, incinerating all but leaving you vulnerable among the ashes."),
				discipline("frostwarden", "Frostbringer", "Winter Order", "Channeling the Eternal Winter, your icy conjurations keep the enemy hordes at bay and protect you from harm while a frozen doom descends upon all who oppose you."),
				discipline("necromancer", "Necromancer", "Accursed Coven", "Tainted by the Curse of Undeath, you fear no foe, raising armies of hungry ghouls to feast upon your unfortunate enemies, your own power and immortal essence grows with every victim they claim."),
			],
		},
	];

	function el(tag, props, children) {
		const node = document.createElement(tag);
		for (const [key, value] of Object.entries(props || {})) {
			if (value == null) continue;
			if (key === "class") node.className = value;
			else if (key === "text") node.textContent = value;
			else node.setAttribute(key, value);
		}
		(children || []).forEach((child) => node.append(child));
		return node;
	}

	const img = (src, props) => el("img", Object.assign({ src, alt: "" }, props));

	// A WAI-ARIA radio group: arrows (and Home/End) move both focus and selection.
	function radioKeys(buttons, select) {
		buttons.forEach((button, index) => {
			button.addEventListener("keydown", (event) => {
				const step = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[event.key];
				let next;
				if (step) next = (index + step + buttons.length) % buttons.length;
				if (event.key === "Home") next = 0;
				if (event.key === "End") next = buttons.length - 1;
				if (next === undefined) return;
				event.preventDefault();
				select(next);
				buttons[next].focus();
			});
		});
	}

	const stage = document.querySelector("[data-class-showcase]");
	if (stage) {
		let classIndex = 0;
		// Each class remembers its own discipline; the middle one is the design's default.
		const disciplineByClass = CLASSES.map(() => 1);

		const classButtons = CLASSES.map((c, i) =>
			el("button", { type: "button", role: "radio", class: `dbr-class-thumb dbr-class-slot-${i}` }, [
				img(c.tree.icon, { width: "120", height: "120" }),
				el("span", { class: "dbr-class-label", text: c.name }),
			]),
		);
		const discTree = el("li", { class: "dbr-ability" });
		const classTree = el("li", { class: "dbr-ability" });
		const name = el("h3", { class: "dbr-class-name" });
		const badge = el("p", { class: "dbr-class-badge" });
		const desc = el("p", { class: "dbr-class-desc" });
		const discGroup = el("div", { class: "dbr-disciplines", role: "radiogroup" });
		const live = el("p", { class: "dbr-sr-only", "aria-live": "polite" });

		// Two stacked backdrops: the new tower fades in over the old one.
		const backdrops = [0, 1].map(() => img(null, { class: "dbr-tower", "aria-hidden": "true", decoding: "async" }));
		let frontBackdrop = 0;
		const towerCaption = el("p", { class: "dbr-tower-caption" });

		stage.append(
			el("div", { class: "dbr-towers", "aria-hidden": "true" }, backdrops),
			el("div", { class: "dbr-class-picker", role: "radiogroup", "aria-label": "Class" }, classButtons),
			el("div", { class: "dbr-class-showcase" }),
			el("div", { class: "dbr-class-info" }, [
				el("ul", { class: "dbr-class-abilities", "aria-label": "Talent trees" }, [
					discTree,
					el("li", { class: "dbr-ability-sep", "aria-hidden": "true" }),
					classTree,
				]),
				name,
				badge,
				desc,
				discGroup,
				towerCaption,
			]),
			live,
		);

		function render(announce) {
			const gameClass = CLASSES[classIndex];
			const d = gameClass.disciplines[disciplineByClass[classIndex]];

			classButtons.forEach((button, i) => {
				const on = i === classIndex;
				button.classList.toggle("is-selected", on);
				button.setAttribute("aria-checked", String(on));
				button.tabIndex = on ? 0 : -1;
			});

			// A fresh <img> replays the portrait's entrance animation.
			const portrait = img(d.portrait, {
				class: "dbr-class-hero",
				width: "472",
				height: "472",
				alt: `${d.name}, ${gameClass.name} discipline portrait`,
			});
			stage.querySelector(".dbr-class-showcase").replaceChildren(portrait);

			discTree.replaceChildren(img(d.tree.icon, { class: "is-ringed", width: "16", height: "16" }), d.tree.name);
			classTree.replaceChildren(img(gameClass.tree.icon, { width: "16", height: "16" }), gameClass.tree.name);
			name.textContent = d.name;
			name.classList.toggle("is-long", d.name.length > 8);
			badge.textContent = gameClass.name;
			desc.textContent = d.description;

			discGroup.setAttribute("aria-label", `${gameClass.name} disciplines`);
			const buttons = gameClass.disciplines.map((item, i) => {
				const on = i === disciplineByClass[classIndex];
				const button = el(
					"button",
					{
						type: "button",
						role: "radio",
						"aria-label": item.name,
						"aria-checked": String(on),
						class: `dbr-discipline${on ? " is-selected" : ""}`,
					},
					[img(item.portrait, { width: "75", height: "75" })],
				);
				button.tabIndex = on ? 0 : -1;
				button.addEventListener("click", () => selectDiscipline(i, true));
				return button;
			});
			radioKeys(buttons, (i) => selectDiscipline(i, true));
			discGroup.replaceChildren(img(`${ASSET}/disciplines-bg.webp`, { class: "dbr-disciplines-bg", "aria-hidden": "true" }), ...buttons);

			// Backdrop: this discipline's keep tower and accent colour.
			const section = stage.closest(".dbr-classes");
			if (section) section.style.setProperty("--dbr-accent", d.tower.accent);
			const current = backdrops[frontBackdrop];
			if (!current.getAttribute("src")) {
				current.src = d.tower.art;
				current.classList.add("is-shown");
			} else if (current.getAttribute("src") !== d.tower.art) {
				const next = backdrops[1 - frontBackdrop];
				const show = () => {
					next.classList.add("is-shown");
					current.classList.remove("is-shown");
					frontBackdrop = 1 - frontBackdrop;
				};
				next.src = d.tower.art;
				next.decode().then(show, show);
			}
			towerCaption.replaceChildren("Keep tower: ", el("strong", { text: d.tower.name }));

			if (announce) live.textContent = `${d.name}, ${gameClass.name}. ${d.description}`;
			return buttons;
		}

		function selectClass(i) {
			classIndex = i;
			render(true);
		}

		function selectDiscipline(i, keepFocus) {
			disciplineByClass[classIndex] = i;
			const buttons = render(true);
			if (keepFocus) buttons[i].focus();
		}

		classButtons.forEach((button, i) => button.addEventListener("click", () => selectClass(i)));
		radioKeys(classButtons, selectClass);
		render(false);
	}

	// ---------- Nav: the section crossing the upper third of the window is current ----------
	const navLinks = [...document.querySelectorAll(".dbr-nav-item[data-section]")];
	const sections = navLinks.map((link) => document.getElementById(link.dataset.section)).filter(Boolean);
	if (sections.length && "IntersectionObserver" in window) {
		const observer = new IntersectionObserver(
			(entries) => {
				for (const entry of entries) {
					if (!entry.isIntersecting) continue;
					navLinks.forEach((link) => {
						const on = link.dataset.section === entry.target.id;
						link.classList.toggle("is-active", on);
						if (on) link.setAttribute("aria-current", "location");
						else link.removeAttribute("aria-current");
					});
				}
			},
			{ rootMargin: "-30% 0px -60% 0px" },
		);
		sections.forEach((section) => observer.observe(section));
	}

	// ---------- Launcher download ----------
	const RELEASE_API = "https://api.github.com/repos/theminesastudios/dungeon-blitz-r-launcher/releases/latest";

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

	// The launcher is desktop-only, so a phone or tablet gets it disabled and keeps the browser
	// option. This keys on the device rather than the viewport: a narrow desktop window can
	// still download.
	if (platform === "mobile") {
		buttons.forEach((button) => {
			button.removeAttribute("href");
			button.setAttribute("aria-disabled", "true");
			button.classList.add("is-disabled");
		});
		if (metaEl) metaEl.textContent = "Desktop only (Windows and macOS)";
		if (otherEl) otherEl.hidden = true;
		return;
	}

	if (labelEl && target) labelEl.textContent = `Download for ${target.name}`;
	if (metaEl && platform === "linux") metaEl.textContent = "No Linux build yet: Windows and macOS";

	// Without the release list every link keeps pointing at the release page, which still works.
	fetch(RELEASE_API, { headers: { Accept: "application/vnd.github+json" } })
		.then((res) => {
			if (!res.ok) throw new Error(`GitHub responded ${res.status}`);
			return res.json();
		})
		.then((release) => {
			const assets = Array.isArray(release.assets) ? release.assets : [];
			const version = String(release.tag_name || "").replace(/^v/, "");
			const urlFor = (key) => {
				const match = assets.find((asset) => ASSETS[key].pattern.test(asset.name));
				return match ? match.browser_download_url : null;
			};

			assetLinks.forEach((link) => {
				const url = urlFor(link.dataset.launcherAsset);
				if (url) link.href = url;
			});

			if (!target) return;
			const url = urlFor(platform);
			if (!url) return;
			buttons.forEach((button) => {
				button.href = url;
			});
			if (metaEl) metaEl.textContent = (version ? `Version ${version} · ` : "") + target.detail;
		})
		.catch((err) => {
			console.warn("Could not load the latest launcher release:", err);
		});
})();
