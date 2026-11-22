import { describe, expect, it } from "vitest";
import library from "./library.js";

const {
  buildLibraryCollections,
  libraryChapterNavigation,
  libraryPermalink,
  publicationDateISO,
  readingTime,
} = library;

function note(data, url = "") {
  return {
    data: { title: "Título de prueba", "dg-publish": true, ...data },
    filePathStem: "/notes/biblioteca/obras/prueba/obra",
    inputPath: "library-test.md",
    url,
  };
}

function libraryNotes() {
  const work = note(
    {
      libraryType: "work",
      libraryId: "obra-prueba",
      librarySlug: "obra-prueba",
    },
    "/biblioteca/obra-prueba/",
  );
  const volume = note(
    {
      libraryType: "volume",
      libraryId: "volumen-prueba",
      librarySlug: "volumen-1",
      libraryWorkId: "obra-prueba",
      libraryWorkSlug: "obra-prueba",
      libraryNumber: 1,
    },
    "/biblioteca/obra-prueba/volumen-1/",
  );
  const firstChapter = note(
    {
      libraryType: "chapter",
      libraryId: "capitulo-1",
      librarySlug: "capitulo-1",
      libraryWorkId: "obra-prueba",
      libraryWorkSlug: "obra-prueba",
      libraryVolumeId: "volumen-prueba",
      libraryVolumeSlug: "volumen-1",
      libraryNumber: 1,
    },
    "/biblioteca/obra-prueba/volumen-1/capitulo-1/",
  );
  const secondChapter = note(
    {
      libraryType: "chapter",
      libraryId: "capitulo-2",
      librarySlug: "capitulo-2",
      libraryWorkId: "obra-prueba",
      libraryWorkSlug: "obra-prueba",
      libraryVolumeId: "volumen-prueba",
      libraryVolumeSlug: "volumen-1",
      libraryNumber: 2,
      libraryReadingOrder: 2,
    },
    "/biblioteca/obra-prueba/volumen-1/capitulo-2/",
  );
  return { work, volume, firstChapter, secondChapter };
}

describe("library editorial model", () => {
  it("builds canonical work, volume and chapter routes", () => {
    expect(
      libraryPermalink({ libraryType: "work", librarySlug: "obra-prueba" }),
    ).toBe("/biblioteca/obra-prueba/");
    expect(
      libraryPermalink({
        libraryType: "volume",
        librarySlug: "volumen-1",
        libraryWorkSlug: "obra-prueba",
      }),
    ).toBe("/biblioteca/obra-prueba/volumen-1/");
    expect(
      libraryPermalink({
        libraryType: "chapter",
        librarySlug: "capitulo-1",
        libraryWorkSlug: "obra-prueba",
        libraryVolumeSlug: "volumen-1",
      }),
    ).toBe("/biblioteca/obra-prueba/volumen-1/capitulo-1/");
  });

  it("keeps only explicitly published entities in the public collections", () => {
    const { work, volume, firstChapter } = libraryNotes();
    const draft = note({
      libraryType: "chapter",
      libraryId: "borrador",
      librarySlug: "borrador",
      libraryWorkId: "obra-prueba",
      libraryWorkSlug: "obra-prueba",
      libraryVolumeId: "volumen-prueba",
      libraryVolumeSlug: "volumen-1",
      libraryNumber: 2,
      "dg-publish": false,
    });
    const missingFlag = note({
      libraryType: "chapter",
      libraryId: "sin-publicar",
      librarySlug: "sin-publicar",
      libraryWorkId: "obra-prueba",
      libraryWorkSlug: "obra-prueba",
      libraryVolumeId: "volumen-prueba",
      libraryVolumeSlug: "volumen-1",
      libraryNumber: 3,
    });
    delete missingFlag.data["dg-publish"];

    const result = buildLibraryCollections([
      work,
      volume,
      firstChapter,
      draft,
      missingFlag,
    ]);
    expect(result.works).toHaveLength(1);
    expect(result.volumes).toHaveLength(1);
    expect(result.chapters.map((page) => page.data.libraryId)).toEqual([
      "capitulo-1",
    ]);
  });

  it("orders sibling chapters for previous and next navigation", () => {
    const { work, volume, firstChapter, secondChapter } = libraryNotes();
    const result = buildLibraryCollections([
      work,
      volume,
      secondChapter,
      firstChapter,
    ]);
    const firstNavigation = libraryChapterNavigation(
      result.chapters,
      "capitulo-1",
    );
    const secondNavigation = libraryChapterNavigation(
      result.chapters,
      "capitulo-2",
    );
    expect(firstNavigation.previous).toBeNull();
    expect(firstNavigation.next.data.libraryId).toBe("capitulo-2");
    expect(secondNavigation.previous.data.libraryId).toBe("capitulo-1");
    expect(secondNavigation.next).toBeNull();
  });

  it("rejects unresolved hierarchy links and duplicate generated URLs", () => {
    const { volume } = libraryNotes();
    expect(() => buildLibraryCollections([volume])).toThrow(/No published work/);

    const { work, volume: validVolume, firstChapter } = libraryNotes();
    const conflictingPage = note(
      { "dg-publish": true, libraryType: undefined },
      "/biblioteca/obra-prueba/volumen-1/capitulo-1/",
    );
    conflictingPage.filePathStem = "/notes/otra/nota";
    expect(() =>
      buildLibraryCollections([work, validVolume, firstChapter, conflictingPage]),
    ).toThrow(/permalink conflicts/);
  });

  it("calculates reading time and normalizes publication dates", () => {
    expect(readingTime(`<p>${"palabra ".repeat(220)}</p>`)).toBe(1);
    expect(readingTime(`<p>${"palabra ".repeat(221)}</p>`)).toBe(2);
    expect(publicationDateISO("2026-11-21")).toBe("2026-11-21");
  });
});
