const fs = require("node:fs");
const path = require("node:path");
const {DEFAULT_HOMEPAGE, isPublicImageReference, validateHomepageConfig} = require("../../../studio/shared/homepageSchema");

const projectRoot = path.resolve(__dirname, "../../..");
const sourcePath = path.join(projectRoot, ".arkfates-studio", "homepage.json");
const draftPath = path.join(projectRoot, ".arkfates-studio", "state", "homepage-draft.json");
const uploadIndexPath = path.join(projectRoot, ".arkfates-studio", "state", "media.json");

function uploadedAssetExists(id) {
  try {
    const assets = JSON.parse(fs.readFileSync(uploadIndexPath, "utf8"));
    return Boolean(assets && assets[id]);
  } catch {
    return false;
  }
}

function publicAssetExists(reference) {
  if (!isPublicImageReference(reference)) return false;
  const mediaRoot = path.join(projectRoot, "src", "site", "img");
  const assetPath = path.resolve(mediaRoot, ...reference.slice(5).split("/"));
  const relative = path.relative(mediaRoot, assetPath);
  if (relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return false;
  try {
    const stat = fs.lstatSync(assetPath);
    return stat.isFile() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

function readConfig(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const result = validateHomepageConfig(parsed, {assetExists: uploadedAssetExists, siteAssetExists: publicAssetExists});
  if (!result.ok) throw new Error(`Invalid ArkFates Studio homepage config: ${result.errors.join(" ")}`);
  return result.value;
}

module.exports = () => {
  let config = DEFAULT_HOMEPAGE;
  try {
    config = readConfig(sourcePath);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }

  const preview = process.env.ARKFATES_STUDIO_PREVIEW === "1";
  if (preview) {
    try {
      config = readConfig(draftPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }

  const hero = {
    ...config.hero,
    image: {...config.hero.image},
    imageOverlayRatio: config.hero.image.overlay / 100,
  };
  if (hero.image.kind === "upload") {
    hero.imageUrl = preview
      ? `http://127.0.0.1:${process.env.ARKFATES_STUDIO_PORT || "3001"}/__studio/media/${hero.image.ref}`
      : "";
  } else if (hero.image.kind === "site") {
    hero.imageUrl = hero.image.ref;
  } else {
    hero.imageUrl = "";
  }

  return {version: 1, hero};
};
