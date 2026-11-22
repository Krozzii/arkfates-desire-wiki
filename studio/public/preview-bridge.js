(() => {
  const studioOrigin = "http://127.0.0.1:3001";
  const style = document.createElement("style");
  style.id = "arkfates-studio-selection-style";
  style.textContent = "[data-studio-selected='true']{outline:2px solid #D4B77D!important;outline-offset:4px!important;cursor:crosshair!important} [data-studio-component]{cursor:crosshair}";
  document.head.append(style);

  const hero = () => document.querySelector("[data-studio-component='hero']");
  const applyConfig = (config) => {
    if (!config || !config.hero || !hero()) return;
    const root = hero();
    const values = config.hero;
    root.dataset.studioAlignment = values.alignment;
    root.style.setProperty("--af-hero-height", `${values.height}vh`);
    root.style.setProperty("--af-hero-gradient-angle", `${values.gradientAngle}deg`);
    root.style.setProperty("--af-hero-gradient-start", values.backgroundStart);
    root.style.setProperty("--af-hero-gradient-end", values.backgroundEnd);
    root.style.setProperty("--af-hero-accent", values.accent);
    root.style.setProperty("--af-hero-image-x", `${values.image.positionX}%`);
    root.style.setProperty("--af-hero-image-y", `${values.image.positionY}%`);
    root.style.setProperty("--af-hero-image-zoom", `${values.image.zoom}%`);
    root.style.setProperty("--af-hero-image-overlay", String(values.image.overlay / 100));

    const textFields = [
      ["[data-studio-component='kicker']", values.kicker],
      ["[data-studio-line='first']", values.titleFirst],
      ["[data-studio-line='second']", values.titleSecond],
      ["[data-studio-component='description']", values.description],
    ];
    for (const [selector, text] of textFields) {
      const target = document.querySelector(selector);
      if (target) target.textContent = text;
    }

    const image = root.querySelector("[data-studio-image]");
    if (image) {
      const source = values.image.kind === "site"
        ? values.image.ref
        : values.image.kind === "upload"
          ? `${studioOrigin}/__studio/media/${encodeURIComponent(values.image.ref)}`
          : "";
      image.hidden = !source;
      root.classList.toggle("has-media", Boolean(source));
      image.alt = values.image.alt;
      image.style.objectPosition = `${values.image.positionX}% ${values.image.positionY}%`;
      image.style.transform = `scale(${values.image.zoom / 100})`;
      if (source && image.getAttribute("src") !== source) image.src = source;
      if (!source) image.removeAttribute("src");
    }
  };

  window.addEventListener("message", (event) => {
    if (event.source !== window.parent || event.origin !== studioOrigin) return;
    if (event.data?.type === "arkfates-studio:apply") applyConfig(event.data.config);
    if (event.data?.type === "arkfates-studio:select") {
      const allowed = new Set(["hero", "title", "description", "kicker", "hero-image"]);
      const candidate = allowed.has(event.data.component)
        ? [...document.querySelectorAll("[data-studio-component]")].find((node) => node.dataset.studioComponent === event.data.component)
        : null;
      if (candidate && hero()?.contains(candidate)) candidate.scrollIntoView({block: "nearest"});
    }
  });

  document.addEventListener("click", (event) => {
    const candidate = event.target.closest("[data-studio-component]");
    if (!candidate || !hero()?.contains(candidate)) return;
    event.preventDefault();
    document.querySelectorAll("[data-studio-selected='true']").forEach((node) => {
      node.removeAttribute("data-studio-selected");
    });
    candidate.dataset.studioSelected = "true";
    window.parent.postMessage({
      type: "arkfates-studio:selected",
      component: candidate.dataset.studioComponent,
    }, studioOrigin);
  });
})();
