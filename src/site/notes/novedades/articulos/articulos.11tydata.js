module.exports = {
  editorialType: "newsArticle",
  eleventyComputed: {
    permalink: (data) => `/novedades/${data.page.fileSlug}/`,
  },
};
