const COLOR = /^#[0-9a-fA-F]{6}$/;
const ASSET_ID = /^[a-f0-9]{24}$/;
function isPublicImageReference(value) {
  if (typeof value !== "string" || !value.startsWith("/img/") || value.includes("\\") || value.includes("%")) return false;
  const parts = value.slice(5).split("/");
  if (!parts.length || parts.some((part) => !part || part === "." || part === ".." || !/^[A-Za-z0-9_. -]+$/.test(part))) return false;
  return /\.(?:png|jpe?g|webp|gif|avif|svg)$/i.test(parts.at(-1));
}
const ALIGNMENTS = new Set(["left", "center", "right"]);
const IMAGE_KINDS = new Set(["none", "site", "upload"]);

const DEFAULT_HOMEPAGE = Object.freeze({
  version: 1,
  hero: Object.freeze({
    kicker: "Archivo oficial · Universo narrativo",
    titleFirst: "ArkFates",
    titleSecond: "Desiré",
    description:
      "El hogar oficial de una obra original creada por Krozzii: un espacio para sus relatos y el conocimiento de su universo.",
    alignment: "left",
    height: 58,
    backgroundStart: "#111110",
    backgroundEnd: "#171716",
    gradientAngle: 135,
    accent: "#B79A63",
    image: Object.freeze({
      kind: "none",
      ref: "",
      alt: "",
      positionX: 50,
      positionY: 50,
      zoom: 100,
      overlay: 52,
    }),
  }),
});

function isRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOnlyKeys(value, allowed, path, errors) {
  if (!isRecord(value)) {
    errors.push(`${path} debe ser un objeto.`);
    return false;
  }
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) errors.push(`${path}.${key} no está permitido.`);
  }
  return true;
}

function textValue(value, name, errors, maxLength, allowEmpty = false) {
  if (typeof value !== "string") {
    errors.push(`${name} debe ser texto.`);
    return "";
  }
  const trimmed = value.trim();
  if ((!allowEmpty && trimmed.length === 0) || trimmed.length > maxLength) {
    errors.push(`${name} debe contener ${allowEmpty ? "hasta" : "entre 1 y"} ${maxLength} caracteres.`);
  }
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(trimmed)) {
    errors.push(`${name} contiene caracteres de control no permitidos.`);
  }
  return trimmed;
}

function numberValue(value, name, errors, minimum, maximum) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    errors.push(`${name} debe ser un entero entre ${minimum} y ${maximum}.`);
  }
  return Number.isInteger(value) ? value : minimum;
}

function colorValue(value, name, errors) {
  if (typeof value !== "string" || !COLOR.test(value)) {
    errors.push(`${name} debe ser un color hexadecimal #RRGGBB.`);
    return "#111110";
  }
  return value.toUpperCase();
}

function validateHomepageConfig(input, {assetExists = () => false, siteAssetExists = () => false} = {}) {
  const errors = [];
  if (!hasOnlyKeys(input, ["version", "hero"], "configuración", errors)) {
    return {ok: false, errors};
  }
  if (input.version !== 1) errors.push("La versión de configuración debe ser 1.");
  if (!hasOnlyKeys(
    input.hero,
    [
      "kicker", "titleFirst", "titleSecond", "description", "alignment", "height",
      "backgroundStart", "backgroundEnd", "gradientAngle", "accent", "image",
    ],
    "hero",
    errors,
  )) {
    return {ok: false, errors};
  }

  const hero = input.hero;
  const imageAllowed = ["kind", "ref", "alt", "positionX", "positionY", "zoom", "overlay"];
  if (!hasOnlyKeys(hero.image, imageAllowed, "hero.image", errors)) {
    return {ok: false, errors};
  }

  const image = hero.image;
  if (!IMAGE_KINDS.has(image.kind)) errors.push("hero.image.kind no está permitido.");
  const kind = IMAGE_KINDS.has(image.kind) ? image.kind : "none";
  const ref = textValue(image.ref, "hero.image.ref", errors, 240, true);
  const alt = textValue(image.alt, "hero.image.alt", errors, 200, true);
  if (kind !== "none" && !alt) errors.push("Escribe un texto alternativo para la imagen del hero.");
  if (kind === "site" && !isPublicImageReference(ref)) {
    errors.push("La imagen publicada debe apuntar a un archivo de imagen dentro de /img/.");
  } else if (kind === "site" && !siteAssetExists(ref)) {
    errors.push("La imagen seleccionada ya no existe en los recursos del sitio.");
  }
  if (kind === "upload" && (!ASSET_ID.test(ref) || !assetExists(ref))) {
    errors.push("La imagen temporal ya no está disponible en la biblioteca local.");
  }
  if (kind === "none" && ref !== "") errors.push("hero.image.ref debe estar vacío si no hay imagen.");

  const alignment = ALIGNMENTS.has(hero.alignment) ? hero.alignment : "left";
  if (!ALIGNMENTS.has(hero.alignment)) errors.push("hero.alignment no está permitido.");

  const normalized = {
    version: 1,
    hero: {
      kicker: textValue(hero.kicker, "hero.kicker", errors, 100),
      titleFirst: textValue(hero.titleFirst, "hero.titleFirst", errors, 40),
      titleSecond: textValue(hero.titleSecond, "hero.titleSecond", errors, 40),
      description: textValue(hero.description, "hero.description", errors, 320),
      alignment,
      height: numberValue(hero.height, "hero.height", errors, 38, 92),
      backgroundStart: colorValue(hero.backgroundStart, "hero.backgroundStart", errors),
      backgroundEnd: colorValue(hero.backgroundEnd, "hero.backgroundEnd", errors),
      gradientAngle: numberValue(hero.gradientAngle, "hero.gradientAngle", errors, 0, 360),
      accent: colorValue(hero.accent, "hero.accent", errors),
      image: {
        kind,
        ref,
        alt,
        positionX: numberValue(image.positionX, "hero.image.positionX", errors, 0, 100),
        positionY: numberValue(image.positionY, "hero.image.positionY", errors, 0, 100),
        zoom: numberValue(image.zoom, "hero.image.zoom", errors, 100, 180),
        overlay: numberValue(image.overlay, "hero.image.overlay", errors, 0, 85),
      },
    },
  };

  return {ok: errors.length === 0, errors, value: normalized};
}

module.exports = {DEFAULT_HOMEPAGE, isPublicImageReference, validateHomepageConfig};
