module.exports = [
  { slug: "personajes", title: "Personajes" },
  { slug: "habilidades", title: "Habilidades y capacidades" },
  { slug: "transformaciones", title: "Transformaciones" },
  { slug: "razas", title: "Razas y especies" },
  { slug: "organizaciones", title: "Organizaciones y facciones" },
  { slug: "universos", title: "Universos y dimensiones" },
  { slug: "cosmologia", title: "Cosmología" },
  { slug: "lugares", title: "Lugares" },
  { slug: "objetos", title: "Objetos" },
  { slug: "tecnologia", title: "Tecnología" },
  { slug: "eventos", title: "Acontecimientos" },
  { slug: "cronologia", title: "Cronología" },
  { slug: "sistemas", title: "Sistemas y conceptos" },
  { slug: "relaciones", title: "Relaciones" },
].map((category) => ({
  ...category,
  url: `/enciclopedia/${category.slug}/`,
}));
