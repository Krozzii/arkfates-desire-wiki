---
title: Guía para publicar contenido
dg-publish: false
---

# Guía para publicar contenido

Esta guía vive en el repositorio público. No escribas contraseñas, datos privados ni borradores confidenciales aquí. `dg-publish: false` evita que la nota aparezca en el sitio generado, pero no oculta el archivo del repositorio.

## Enciclopedia

Guarda cada ficha en la carpeta de su categoría dentro de `enciclopedia/`, por ejemplo `enciclopedia/personajes/`. Conserva el `index.md` de la categoría. Una ficha requiere al menos:

```yaml
---
title: "Título de la ficha"
dg-publish: false
permalink: /enciclopedia/personajes/slug-de-la-ficha/
editorialType: encyclopediaEntry
encyclopediaCategory: personajes
encyclopediaCategoryTitle: Personajes
---
```

Añade únicamente información que exista y esté autorizada. El diseño admite descripción, historia, características, habilidades, transformaciones, relaciones, apariciones e imagen; los campos vacíos se omiten.

## Biblioteca

Usa `biblioteca/obras/` y la jerarquía Obra → Volumen → Capítulo. La guía de campos y relaciones está en `biblioteca/GUIA_EDITORIAL.md`. Crea las notas con `dg-publish: false`; publícalas solo cuando estén listas y sus entidades ascendientes estén publicadas.

## Novedades

Crea un archivo Markdown por anuncio en `novedades/articulos/`. La ruta pública se calcula desde el nombre del archivo. Metadatos:

```yaml
---
title: "Título del anuncio"
dg-publish: false
newsPublishedAt: 2026-01-31
newsSummary: "Resumen breve opcional."
---
```

Escribe el anuncio debajo del frontmatter. La portada muestra hasta tres novedades y `/novedades/` las lista por fecha más reciente. No inventes una fecha: omite `newsPublishedAt` si aún no corresponde.

## Vista local y publicación

El servidor de desarrollo de Eleventy reconstruye el sitio al guardar Markdown. La política actual exige el booleano `dg-publish: true`, así que las notas en borrador no aparecerán en esa vista local ni en el sitio público. Al cambiarlo a `true`, la página y sus índices se generan; después puedes revisar el cambio y subirlo a GitHub para que el despliegue configurado regenere el sitio.

El repositorio es público: una nota en `false` sigue siendo visible para quien explore GitHub. No guardes secretos ni información privada en notas.
