---
title: Guía de administración de la Biblioteca
dg-publish: false
---

# Biblioteca editorial: guía de administración

Esta guía es una referencia para editar las notas desde Obsidian. Su `dg-publish: false` impide que se incluya en el sitio generado, pero el archivo sigue formando parte del repositorio público. No guardes información privada aquí.

## Carpetas

Mantén cada nivel debajo de `biblioteca/obras/`:

```text
biblioteca/
  index.md
  obras/
    {obra-slug}/
      obra.md
      volumenes/
        {volumen-slug}/
          volumen.md
          capitulos/
            {capitulo-slug}.md
```

Los slugs se escriben en minúsculas, con letras sin acentos, números y guiones. Las rutas se calculan desde los metadatos; no añadas `permalink` a las notas de obra, volumen o capítulo.

## Obra

```yaml
---
title: ""
dg-publish: false
libraryType: work
libraryId: ""
librarySlug: ""
libraryAuthor: ""
libraryDescription: ""
librarySynopsis: ""
libraryCover: ""
libraryCoverAlt: ""
libraryGenres: []
libraryTags: []
libraryStatus: ""
libraryOrder: 0
---
```

`libraryId` es estable y único. `librarySlug` forma la URL. Si se omite `libraryAuthor`, la Biblioteca atribuye la obra a Krozzii. Descripción, sinopsis, portada, géneros, etiquetas, estado y orden son opcionales. El orden es un entero no negativo; si se omite, se ordena por título.

## Volumen

```yaml
---
title: ""
dg-publish: false
libraryType: volume
libraryId: ""
librarySlug: ""
libraryWorkId: ""
libraryWorkSlug: ""
libraryNumber: 1
libraryOrder: 0
libraryDescription: ""
libraryCover: ""
libraryCoverAlt: ""
---
```

`libraryWorkId` debe coincidir con el ID de una obra publicada y `libraryWorkSlug` con su slug. `libraryNumber` es único dentro de esa obra. El orden editorial es opcional; si se omite, se usa el número del volumen.

## Capítulo

```yaml
---
title: ""
dg-publish: false
libraryType: chapter
libraryId: ""
librarySlug: ""
libraryWorkId: ""
libraryWorkSlug: ""
libraryVolumeId: ""
libraryVolumeSlug: ""
libraryNumber: 1
libraryReadingOrder: 1
libraryPublishedAt: ""
libraryDescription: ""
---
```

Los IDs y slugs deben coincidir con la obra y el volumen publicados. `libraryNumber` no se repite dentro del volumen. `libraryReadingOrder` determina los enlaces anterior y siguiente; puede omitirse para usar el número de capítulo. La fecha puede omitirse o escribirse como `YYYY-MM-DD`.

El cuerpo de esta nota es el texto narrativo del capítulo. Para insertar ilustraciones usa imágenes Markdown con texto alternativo y una ruta del sitio, por ejemplo:

```md
![Descripción accesible de la ilustración](/img/ruta-de-la-ilustracion.jpg)
```

Los archivos de imagen locales se sirven desde `src/site/img`. También se admite HTML `<figure>` con `<figcaption>` cuando una ilustración independiente necesita pie de imagen.

## Publicación y relaciones

- Solo `dg-publish: true` genera una página pública o incluye una nota en las colecciones.
- Mantén en `false` los borradores y las plantillas. La regla no los hace privados: el repositorio es público.
- Publica primero la obra y el volumen antes de publicar sus descendientes. El build detiene la publicación si falta una relación, se repite un ID, un número de capítulo/volumen o una ruta.
- El catálogo lista obras publicadas, la obra lista volúmenes publicados y el volumen lista capítulos publicados. La navegación entre capítulos se calcula con el orden de lectura.
- No uses `hide` como control de publicación ni de privacidad; `dg-publish` es la autorización efectiva.
