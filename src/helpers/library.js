const LIBRARY_TYPES = new Set(["work", "volume", "chapter"]);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ID_PATTERN = /^[a-z0-9][a-z0-9._:-]*$/;

function fail(page, message) {
  const inputPath = page && page.inputPath ? ` (${page.inputPath})` : "";
  throw new Error(`[library] ${message}${inputPath}`);
}

function requiredString(data, name, page) {
  const value = data[name];
  if (typeof value !== "string" || !value.trim()) {
    fail(page, `"${name}" must be a non-empty string.`);
  }
  return value.trim();
}

function requiredSlug(data, name, page) {
  const value = requiredString(data, name, page);
  if (!SLUG_PATTERN.test(value)) {
    fail(page, `"${name}" must be a lowercase URL slug (letters, numbers, hyphens).`);
  }
  return value;
}

function requiredId(data, name, page) {
  const value = requiredString(data, name, page);
  if (!ID_PATTERN.test(value)) {
    fail(page, `"${name}" must be a stable lowercase identifier.`);
  }
  return value;
}

function positiveInteger(data, name, page) {
  const value = data[name];
  if (!Number.isInteger(value) || value < 1) {
    fail(page, `"${name}" must be a positive integer.`);
  }
  return value;
}

function optionalOrder(data, name, page) {
  const value = data[name];
  if (value === undefined || value === null || value === "") return undefined;
  if (!Number.isInteger(value) || value < 0) {
    fail(page, `"${name}" must be a non-negative integer.`);
  }
  return value;
}

function optionalString(data, name, page) {
  const value = data[name];
  if (value === undefined || value === null || value === "") return;
  if (typeof value !== "string") {
    fail(page, `"${name}" must be a string when provided.`);
  }
}

function optionalStringList(data, name, page) {
  const value = data[name];
  if (value === undefined || value === null) return;
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    fail(page, `"${name}" must be a list of strings when provided.`);
  }
}

function libraryPermalink(data) {
  if (!data || data.libraryType === undefined) return undefined;
  if (!LIBRARY_TYPES.has(data.libraryType)) {
    throw new Error(`[library] Unknown libraryType "${data.libraryType}".`);
  }

  const slug = requiredSlug(data, "librarySlug");
  if (data.libraryType === "work") {
    return `/biblioteca/${slug}/`;
  }

  const workSlug = requiredSlug(data, "libraryWorkSlug");
  if (data.libraryType === "volume") {
    return `/biblioteca/${workSlug}/${slug}/`;
  }

  const volumeSlug = requiredSlug(data, "libraryVolumeSlug");
  return `/biblioteca/${workSlug}/${volumeSlug}/${slug}/`;
}

function isLibraryFile(page) {
  return String(page.filePathStem || "")
    .replaceAll("\\", "/")
    .startsWith("/notes/biblioteca/obras/");
}

function compareTitle(a, b) {
  return String(a.data.title).localeCompare(String(b.data.title), "es", {
    sensitivity: "base",
  });
}

function compareOrder(a, b, field, fallbackField) {
  const first = a.data[field] ?? a.data[fallbackField] ?? Number.MAX_SAFE_INTEGER;
  const second = b.data[field] ?? b.data[fallbackField] ?? Number.MAX_SAFE_INTEGER;
  return first - second || compareTitle(a, b);
}

function assertUnique(records, keyFor, label) {
  const keys = new Map();
  for (const record of records) {
    const key = keyFor(record);
    const prior = keys.get(key);
    if (prior) {
      fail(record, `Duplicate ${label} "${key}"; it is also used by ${prior.inputPath || prior.data.title}.`);
    }
    keys.set(key, record);
  }
}

function buildLibraryCollections(notePages) {
  const publicPages = (notePages || []).filter(
    (page) => page.data && page.data["dg-publish"] === true,
  );
  const candidates = publicPages.filter(
    (page) => page.data.libraryType !== undefined || isLibraryFile(page),
  );

  for (const page of candidates) {
    const data = page.data;
    if (!LIBRARY_TYPES.has(data.libraryType)) {
      fail(page, `"libraryType" must be one of: ${Array.from(LIBRARY_TYPES).join(", ")}.`);
    }
    requiredId(data, "libraryId", page);
    requiredSlug(data, "librarySlug", page);
    requiredString(data, "title", page);
    optionalString(data, "libraryDescription", page);
    optionalString(data, "libraryCover", page);
    optionalString(data, "libraryCoverAlt", page);
    optionalStringList(data, "libraryGenres", page);
    optionalStringList(data, "libraryTags", page);
    libraryPermalink(data);

    if (data.libraryType === "work") {
      optionalString(data, "libraryAuthor", page);
      optionalString(data, "librarySynopsis", page);
      optionalString(data, "libraryStatus", page);
      optionalOrder(data, "libraryOrder", page);
    } else if (data.libraryType === "volume") {
      requiredId(data, "libraryWorkId", page);
      requiredSlug(data, "libraryWorkSlug", page);
      positiveInteger(data, "libraryNumber", page);
      optionalOrder(data, "libraryOrder", page);
    } else {
      requiredId(data, "libraryWorkId", page);
      requiredId(data, "libraryVolumeId", page);
      requiredSlug(data, "libraryWorkSlug", page);
      requiredSlug(data, "libraryVolumeSlug", page);
      positiveInteger(data, "libraryNumber", page);
      optionalOrder(data, "libraryReadingOrder", page);
      if (
        data.libraryPublishedAt !== undefined &&
        data.libraryPublishedAt !== null &&
        !(data.libraryPublishedAt instanceof Date) &&
        typeof data.libraryPublishedAt !== "string"
      ) {
        fail(page, '"libraryPublishedAt" must be a date or ISO date string.');
      }
      if (data.libraryPublishedAt && Number.isNaN(new Date(data.libraryPublishedAt).getTime())) {
        fail(page, '"libraryPublishedAt" must be a valid date.');
      }
    }
  }

  const works = candidates.filter((page) => page.data.libraryType === "work");
  const volumes = candidates.filter((page) => page.data.libraryType === "volume");
  const chapters = candidates.filter((page) => page.data.libraryType === "chapter");

  assertUnique(candidates, (page) => page.data.libraryId, "libraryId");
  assertUnique(candidates, (page) => libraryPermalink(page.data), "library route");
  assertUnique(
    volumes,
    (page) => `${page.data.libraryWorkId}:${page.data.libraryNumber}`,
    "volume number within a work",
  );
  assertUnique(
    chapters,
    (page) => `${page.data.libraryVolumeId}:${page.data.libraryNumber}`,
    "chapter number within a volume",
  );
  assertUnique(
    chapters,
    (page) => `${page.data.libraryVolumeId}:${page.data.libraryReadingOrder ?? page.data.libraryNumber}`,
    "reading order within a volume",
  );

  const worksById = new Map(works.map((page) => [page.data.libraryId, page]));
  const volumesById = new Map(volumes.map((page) => [page.data.libraryId, page]));

  for (const volume of volumes) {
    const work = worksById.get(volume.data.libraryWorkId);
    if (!work) {
      fail(volume, `No published work has libraryId "${volume.data.libraryWorkId}".`);
    }
    if (work.data.librarySlug !== volume.data.libraryWorkSlug) {
      fail(volume, '"libraryWorkSlug" does not match the referenced work.');
    }
  }

  for (const chapter of chapters) {
    const work = worksById.get(chapter.data.libraryWorkId);
    const volume = volumesById.get(chapter.data.libraryVolumeId);
    if (!work) {
      fail(chapter, `No published work has libraryId "${chapter.data.libraryWorkId}".`);
    }
    if (!volume) {
      fail(chapter, `No published volume has libraryId "${chapter.data.libraryVolumeId}".`);
    }
    if (volume.data.libraryWorkId !== chapter.data.libraryWorkId) {
      fail(chapter, 'The referenced volume does not belong to "libraryWorkId".');
    }
    if (
      work.data.librarySlug !== chapter.data.libraryWorkSlug ||
      volume.data.librarySlug !== chapter.data.libraryVolumeSlug
    ) {
      fail(chapter, "The work or volume slug does not match the referenced entity.");
    }
  }

  const libraryPageSet = new Set(candidates);
  const libraryRoutes = new Set(candidates.map((page) => libraryPermalink(page.data)));
  for (const page of publicPages) {
    if (!libraryPageSet.has(page) && page.url && libraryRoutes.has(page.url)) {
      fail(page, `Its permalink conflicts with a generated library route "${page.url}".`);
    }
  }

  return {
    works: works.sort((a, b) => compareOrder(a, b, "libraryOrder", "libraryOrder")),
    volumes: volumes.sort((a, b) =>
      a.data.libraryWorkId.localeCompare(b.data.libraryWorkId) ||
      compareOrder(a, b, "libraryOrder", "libraryNumber"),
    ),
    chapters: chapters.sort((a, b) =>
      a.data.libraryWorkId.localeCompare(b.data.libraryWorkId) ||
      a.data.libraryVolumeId.localeCompare(b.data.libraryVolumeId) ||
      compareOrder(a, b, "libraryReadingOrder", "libraryNumber"),
    ),
  };
}

function libraryVolumesFor(volumes, workId) {
  return (volumes || []).filter(
    (page) =>
      page.data["dg-publish"] === true && page.data.libraryWorkId === workId,
  );
}

function libraryChaptersForVolume(chapters, workId, volumeId) {
  return (chapters || []).filter(
    (page) =>
      page.data["dg-publish"] === true &&
      page.data.libraryWorkId === workId &&
      page.data.libraryVolumeId === volumeId,
  );
}

function libraryById(pages, id) {
  return (pages || []).find((page) => page.data.libraryId === id) || null;
}

function libraryChapterNavigation(chapters, currentId) {
  const index = (chapters || []).findIndex(
    (page) => page.data.libraryId === currentId,
  );
  return {
    previous: index > 0 ? chapters[index - 1] : null,
    next: index >= 0 && index < chapters.length - 1 ? chapters[index + 1] : null,
  };
}

function readingTime(html) {
  const text = String(html || "")
    .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&(?:nbsp|#160);/gi, " ")
    .replace(/&(?:amp|lt|gt|quot|#39);/gi, " ");
  const words = text.match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu) || [];
  return words.length ? Math.ceil(words.length / 220) : 0;
}

function publicationDateISO(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function formatPublicationDate(value) {
  const iso = publicationDateISO(value);
  if (!iso) return "";
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${iso}T00:00:00Z`));
}

module.exports = {
  buildLibraryCollections,
  formatPublicationDate,
  libraryById,
  libraryChapterNavigation,
  libraryChaptersForVolume,
  libraryPermalink,
  libraryVolumesFor,
  publicationDateISO,
  readingTime,
};
