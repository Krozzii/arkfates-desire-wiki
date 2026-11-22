import {describe, expect, it} from "vitest";
import schema from "./homepageSchema.js";

const {DEFAULT_HOMEPAGE, isPublicImageReference, validateHomepageConfig} = schema;

describe("ArkFates Studio homepage schema", () => {
  it("accepts the existing home hero defaults without changing the publication model", () => {
    const result = validateHomepageConfig(DEFAULT_HOMEPAGE);
    expect(result.ok).toBe(true);
    expect(result.value.hero.titleFirst).toBe("ArkFates");
    expect(result.value.hero.titleSecond).toBe("Desiré");
    expect(result.value.hero.image.kind).toBe("none");
    expect(result.value).not.toHaveProperty("dg-publish");
  });

  it("rejects extra properties and unsafe style values", () => {
    const input = JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE));
    input.hero.backgroundStart = "url(javascript:alert(1))";
    input.hero.onClick = "run arbitrary action";
    const result = validateHomepageConfig(input);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("backgroundStart");
    expect(result.errors.join(" ")).toContain("onClick");
  });

  it("only accepts a local image reference and requires its alternative text", () => {
    expect(isPublicImageReference("/img/cover/arkfates.webp")).toBe(true);
    expect(isPublicImageReference("/img/../../.env")).toBe(false);
    expect(isPublicImageReference("https://example.test/cover.png")).toBe(false);

    const input = JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE));
    input.hero.image = {...input.hero.image, kind: "site", ref: "/img/cover.webp", alt: ""};
    const missingAlt = validateHomepageConfig(input, {siteAssetExists: () => true});
    expect(missingAlt.ok).toBe(false);
    expect(missingAlt.errors.join(" ")).toContain("texto alternativo");

    input.hero.image.alt = "Portada de ArkFates Desiré";
    expect(validateHomepageConfig(input, {siteAssetExists: () => true}).ok).toBe(true);
  });

  it("requires uploaded media ids to exist in the local library", () => {
    const input = JSON.parse(JSON.stringify(DEFAULT_HOMEPAGE));
    input.hero.image = {...input.hero.image, kind: "upload", ref: "a".repeat(24), alt: "Imagen editorial"};
    expect(validateHomepageConfig(input).ok).toBe(false);
    expect(validateHomepageConfig(input, {assetExists: () => true}).ok).toBe(true);
  });
});
