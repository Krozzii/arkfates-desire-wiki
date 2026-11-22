(() => {
  const ADMIN_ORIGIN = "http://127.0.0.1:3001";
  const PREVIEW_ORIGIN = "http://127.0.0.1:3002";
  const desktopNavigation = document.querySelector(".studio-nav");
  const mobileNavigationPanel = document.querySelector(".mobile-navigation-panel");
  mobileNavigationPanel.replaceChildren(...[...desktopNavigation.children].map((item) => item.cloneNode(true)));
  const fields = [...document.querySelectorAll("[data-field]")];
  const state = {
    server: null,
    config: null,
    savedConfig: null,
    externalState: null,
    selected: "",
    dirty: false,
    previewBuild: false,
  };
  const previewFrame = document.querySelector("#site-preview");
  const previewStage = document.querySelector("#preview-stage");
  const notice = document.querySelector("#editor-notice");
  const toast = document.querySelector("#toast");
  const conflictPanel = document.querySelector("#conflict-panel");
  let toastTimer;
  document.querySelectorAll("#homepage-form fieldset, [data-alignment], #media-search, #media-select, #media-upload").forEach((control) => {
    control.disabled = true;
  });

  const clone = (value) => JSON.parse(JSON.stringify(value));
  const getPath = (object, path) => path.split(".").reduce((value, key) => value?.[key], object);
  const setPath = (object, path, value) => {
    const parts = path.split(".");
    const last = parts.pop();
    const parent = parts.reduce((target, key) => target[key], object);
    parent[last] = value;
  };

  async function request(url, options = {}) {
    const response = await fetch(url, {cache: "no-store", ...options});
    let payload;
    try { payload = await response.json(); } catch { payload = {}; }
    if (!response.ok) {
      const error = new Error(payload.error || `La solicitud falló (${response.status}).`);
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function notify(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
  }

  function showNotice(message, isError = false) {
    notice.textContent = message;
    notice.classList.toggle("is-error", isError);
    notice.hidden = !message;
  }

  function formatTime(value) {
    if (!value) return "Sin registro";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "Fecha no disponible";
    return new Intl.DateTimeFormat("es", {dateStyle: "medium", timeStyle: "short"}).format(date);
  }

  function setInputValues() {
    for (const input of fields) {
      const value = getPath(state.config, input.dataset.field);
      input.value = value ?? "";
      updateOutput(input);
    }
    document.querySelectorAll("[data-alignment]").forEach((button) => {
      const active = button.dataset.alignment === state.config.hero.alignment;
      button.setAttribute("aria-pressed", String(active));
    });
    renderMediaSelect();
  }

  function updateOutput(input) {
    const output = document.querySelector(`[data-output="${CSS.escape(input.dataset.field)}"]`);
    if (!output) return;
    const unit = input.dataset.field === "hero.height" ? " vh" : input.dataset.field === "hero.gradientAngle" ? "°" : "%";
    output.value = `${input.value}${unit}`;
    output.textContent = output.value;
  }

  function sendPreviewConfig() {
    if (!previewFrame.contentWindow || !state.config) return;
    previewFrame.contentWindow.postMessage({type: "arkfates-studio:apply", config: state.config}, PREVIEW_ORIGIN);
  }

  function renderMediaSelect() {
    const select = document.querySelector("#media-select");
    const query = document.querySelector("#media-search").value.trim().toLocaleLowerCase("es");
    const current = state.config.hero.image;
    select.replaceChildren(new Option("Sin imagen", ""));
    const assets = (state.server?.media || []).filter((item) => item.name.toLocaleLowerCase("es").includes(query));
    if (assets.length === 0 && query) select.add(new Option("No hay coincidencias", "", true, true));
    for (const asset of assets) {
      const value = `${asset.kind}:${asset.ref}`;
      const label = `${asset.name}${asset.kind === "upload" ? " · local" : " · sitio"}`;
      select.add(new Option(label, value, false, current.kind === asset.kind && current.ref === asset.ref));
    }
    if (current.kind === "none") select.value = "";
    else select.value = `${current.kind}:${current.ref}`;
  }

  function updateDirtyState() {
    state.dirty = JSON.stringify(state.config) !== JSON.stringify(state.savedConfig);
    document.querySelector("#save-draft").textContent = state.dirty ? "Guardar borrador" : state.server?.hasDraft ? "Borrador guardado" : "Guardar borrador";
    document.querySelector("#save-draft").disabled = !state.dirty;
    document.querySelector("#discard-draft").disabled = !state.server?.hasDraft && !state.dirty;
    document.querySelector("#refresh-preview").disabled = state.dirty || state.previewBuild;
    document.querySelector("#preview-message").textContent = state.dirty
      ? "Cambios sin guardar: se muestran solo en esta sesión."
      : state.server?.preview.current
        ? `Eleventy generado ${formatTime(state.server.preview.generatedAt)}.`
        : "Hay un borrador nuevo; genera la vista previa para actualizar el HTML de Eleventy.";
  }

  function updateDashboard() {
    const site = state.server.publicSite;
    document.querySelector("#site-status").textContent = site.generated ? "Página disponible" : "Aún no generado";
    document.querySelector("#site-time").textContent = site.generated ? `dist/index.html · ${formatTime(site.generatedAt)}` : "No existe dist/index.html en este momento.";

    document.querySelector("#draft-status").textContent = state.server.hasDraft ? "Borrador guardado" : "Sin borrador";
    document.querySelector("#draft-time").textContent = state.server.hasDraft ? `Portada · ${formatTime(state.server.draftModifiedAt)}` : "Sin cambios guardados desde el Studio";
    document.querySelector("#recent-change").textContent = state.server.hasDraft
      ? `Borrador de portada guardado el ${formatTime(state.server.draftModifiedAt)}.`
      : "Todavía no hay borradores guardados desde el Studio.";

    document.querySelector("#preview-status").textContent = !state.server.preview.generated
      ? "Pendiente"
      : state.server.preview.current ? "Actualizada" : "Necesita regenerarse";
    document.querySelector("#preview-time").textContent = state.server.preview.generated
      ? `Salida temporal · ${formatTime(state.server.preview.generatedAt)}`
      : "La salida se mantiene fuera de dist.";
    updateDirtyState();
  }

  function flatten(value, prefix = "", output = {}) {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [key, item] of Object.entries(value)) flatten(item, prefix ? `${prefix}.${key}` : key, output);
    } else output[prefix] = String(value ?? "");
    return output;
  }

  function showConflict(latest) {
    state.externalState = latest;
    const before = flatten(state.config);
    const after = flatten(latest.homepage);
    const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])]
      .filter((key) => before[key] !== after[key]);
    const list = document.querySelector("#external-diff");
    list.replaceChildren();
    if (!changed.length) {
      const item = document.createElement("li");
      item.textContent = "El archivo cambió, pero sus valores editables coinciden con esta sesión.";
      list.append(item);
    } else {
      for (const key of changed) {
        const item = document.createElement("li");
        const label = document.createElement("strong");
        const values = document.createElement("span");
        label.textContent = key;
        values.textContent = `Studio: ${before[key] ?? "—"} / Archivo: ${after[key] ?? "—"}`;
        item.append(label, values);
        list.append(item);
      }
    }
    document.querySelector("#conflict-summary").textContent = "Compara los valores antes de elegir qué versión conservar. No se sobrescribió el archivo externo.";
    conflictPanel.hidden = false;
    showNotice("Se detectó un cambio externo. Revisa la comparación antes de guardar otra vez.", true);
  }

  async function loadState() {
    const latest = await request("/api/state");
    state.server = latest;
    state.config = clone(latest.homepage);
    state.savedConfig = clone(latest.homepage);
    setInputValues();
    document.querySelectorAll("#homepage-form fieldset, [data-alignment], #media-search, #media-select, #media-upload").forEach((control) => {
      control.disabled = false;
    });
    updateDashboard();
    sendPreviewConfig();
  }

  async function regeneratePreview() {
    if (state.dirty) {
      showNotice("Guarda el borrador antes de generar su vista de Eleventy.");
      return;
    }
    if (state.previewBuild) return;
    state.previewBuild = true;
    updateDirtyState();
    document.querySelector("#refresh-preview").textContent = "…";
    showNotice("Eleventy está generando la vista previa en una carpeta temporal.");
    try {
      const result = await request("/api/preview", {method: "POST"});
      state.server = result.state;
      updateDashboard();
      previewFrame.src = `${PREVIEW_ORIGIN}/?v=${Date.now()}`;
      showNotice("La portada fue generada por Eleventy. Los archivos de dist no se tocaron.");
      notify("Vista previa de Eleventy actualizada.");
    } catch (error) {
      showNotice(error.message, true);
    } finally {
      state.previewBuild = false;
      document.querySelector("#refresh-preview").textContent = "↻";
      updateDirtyState();
    }
  }

  async function saveDraft() {
    if (!state.dirty) return;
    showNotice("Validando y guardando el borrador local…");
    try {
      const result = await request("/api/draft", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          config: state.config,
          sourceRevision: state.server.sourceRevision,
          draftRevision: state.server.draftRevision,
        }),
      });
      state.server = result.state;
      state.savedConfig = clone(state.config);
      conflictPanel.hidden = true;
      updateDashboard();
      showNotice("Borrador guardado en este ordenador. No cambió el contenido fuente ni se publicó.");
      notify("Borrador de portada guardado.");
    } catch (error) {
      if (error.status === 409) {
        const latest = await request("/api/state");
        showConflict(latest);
      } else if (error.status === 422) {
        showNotice(error.payload.details?.join(" ") || error.message, true);
      } else showNotice(error.message, true);
    }
  }

  async function discardDraft() {
    if (!state.server.hasDraft) {
      state.config = clone(state.savedConfig);
      setInputValues();
      updateDirtyState();
      sendPreviewConfig();
      showNotice("Se descartaron los cambios que aún no habías guardado.");
      return;
    }
    if (!window.confirm("¿Descartar el borrador local de la portada y recuperar la versión fuente?")) return;
    try {
      const result = await request("/api/draft/discard", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({sourceRevision: state.server.sourceRevision, draftRevision: state.server.draftRevision}),
      });
      state.server = result.state;
      state.config = clone(result.state.homepage);
      state.savedConfig = clone(result.state.homepage);
      conflictPanel.hidden = true;
      setInputValues();
      updateDashboard();
      sendPreviewConfig();
      showNotice("Borrador descartado. Se restauró la configuración de portada guardada.");
    } catch (error) {
      if (error.status === 409) {
        const latest = await request("/api/state");
        showConflict(latest);
      } else showNotice(error.message, true);
    }
  }

  function openHome() {
    document.querySelector("#dashboard-view").hidden = true;
    document.querySelector("#home-view").hidden = false;
    document.querySelector("#breadcrumb-current").textContent = "Inicio";
    document.querySelectorAll("[data-nav-view]").forEach((item) => item.classList.toggle("is-current", item.dataset.navView === "home"));
    if (!state.server.preview.current) regeneratePreview();
    else sendPreviewConfig();
  }

  function openDashboard() {
    document.querySelector("#home-view").hidden = true;
    document.querySelector("#dashboard-view").hidden = false;
    document.querySelector("#breadcrumb-current").textContent = "Panel";
    document.querySelectorAll("[data-nav-view]").forEach((item) => item.classList.toggle("is-current", item.dataset.navView === "dashboard"));
  }

  function updateField(input) {
    let value = input.value;
    if (input.type === "range") value = Number(value);
    setPath(state.config, input.dataset.field, value);
    updateOutput(input);
    sendPreviewConfig();
    updateDirtyState();
  }

  function selectMedia(value) {
    if (!value) {
      state.config.hero.image.kind = "none";
      state.config.hero.image.ref = "";
    } else {
      const divider = value.indexOf(":");
      state.config.hero.image.kind = value.slice(0, divider);
      state.config.hero.image.ref = value.slice(divider + 1);
    }
    sendPreviewConfig();
    updateDirtyState();
  }

  async function uploadMedia(file) {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showNotice("La imagen supera el límite local de 10 MB.", true);
      return;
    }
    showNotice("Guardando una copia local temporal de la imagen…");
    try {
      const result = await request(`/api/media?filename=${encodeURIComponent(file.name)}`, {
        method: "POST",
        headers: {"Content-Type": file.type},
        body: file,
      });
      state.server.media.push(result.asset);
      state.config.hero.image.kind = "upload";
      state.config.hero.image.ref = result.asset.ref;
      if (!state.config.hero.image.alt) state.config.hero.image.alt = "";
      setInputValues();
      sendPreviewConfig();
      updateDirtyState();
      showNotice("Imagen guardada en la biblioteca temporal local. Guarda el borrador para conservar la selección.");
    } catch (error) { showNotice(error.message, true); }
    finally { document.querySelector("#media-upload").value = ""; }
  }

  document.querySelectorAll("[data-nav-view]").forEach((item) => item.addEventListener("click", (event) => {
    event.preventDefault();
    if (item.dataset.navView === "dashboard") openDashboard();
    if (item.dataset.navView === "home" || item.dataset.navView === "preview") openHome();
    document.querySelector(".mobile-navigation").open = false;
  }));
  document.querySelectorAll("[data-open-home]").forEach((button) => button.addEventListener("click", openHome));
  document.querySelector("#save-draft").addEventListener("click", saveDraft);
  document.querySelector("#discard-draft").addEventListener("click", discardDraft);
  document.querySelector("#refresh-preview").addEventListener("click", regeneratePreview);
  document.querySelector("#media-search").addEventListener("input", renderMediaSelect);
  document.querySelector("#media-select").addEventListener("change", (event) => selectMedia(event.target.value));
  document.querySelector("#media-upload").addEventListener("change", (event) => uploadMedia(event.target.files?.[0]));
  fields.forEach((input) => input.addEventListener(input.type === "range" || input.type === "color" ? "input" : "input", () => updateField(input)));
  document.querySelectorAll("[data-alignment]").forEach((button) => button.addEventListener("click", () => {
    state.config.hero.alignment = button.dataset.alignment;
    setInputValues();
    sendPreviewConfig();
    updateDirtyState();
  }));
  document.querySelectorAll("[data-viewport]").forEach((button) => button.addEventListener("click", () => {
    const mobile = button.dataset.viewport === "mobile";
    previewStage.classList.toggle("is-mobile", mobile);
    document.querySelectorAll("[data-viewport]").forEach((item) => {
      const active = item === button;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-pressed", String(active));
    });
  }));
  previewFrame.addEventListener("load", sendPreviewConfig);
  window.addEventListener("message", (event) => {
    if (event.source !== previewFrame.contentWindow || event.origin !== PREVIEW_ORIGIN) return;
    if (event.data?.type !== "arkfates-studio:selected") return;
    state.selected = String(event.data.component || "");
    const labels = {hero: "Hero", title: "Título", description: "Descripción", kicker: "Línea editorial", "hero-image": "Imagen del hero"};
    document.querySelector("#selection-state").textContent = labels[state.selected] || "Componente seleccionado";
    document.querySelector("#selected-label").textContent = labels[state.selected] || "Componente seleccionado";
    document.querySelector("#inspector-empty").hidden = true;
    const target = {hero: "hero", title: "title", description: "description", kicker: "kicker", "hero-image": "hero-image"}[state.selected];
    previewFrame.contentWindow.postMessage({type: "arkfates-studio:select", component: target}, PREVIEW_ORIGIN);
  });

  document.querySelector("#reload-external").addEventListener("click", () => {
    if (!state.externalState) return;
    state.server = state.externalState;
    state.config = clone(state.externalState.homepage);
    state.savedConfig = clone(state.externalState.homepage);
    state.externalState = null;
    conflictPanel.hidden = true;
    setInputValues();
    updateDashboard();
    sendPreviewConfig();
    showNotice("Se cargó la versión actual del archivo.");
  });
  document.querySelector("#reapply-local").addEventListener("click", async () => {
    if (!state.externalState) return;
    state.server = state.externalState;
    state.externalState = null;
    conflictPanel.hidden = true;
    state.dirty = true;
    await saveDraft();
  });

  loadState().then(() => {
    if (!state.server.preview.generated) regeneratePreview();
  }).catch((error) => {
    document.querySelector("#site-status").textContent = "No disponible";
    showNotice(error.message, true);
  });
})();
