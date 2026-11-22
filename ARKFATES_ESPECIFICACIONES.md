# PROYECTO: ARKFATES DESIRÉ — PLATAFORMA OFICIAL

Actúa como desarrollador web senior, arquitecto frontend y diseñador UI/UX especializado en plataformas editoriales, enciclopedias digitales y sitios web de franquicias narrativas.

Tu tarea es transformar el repositorio existente en la plataforma oficial de **ArkFates Desiré**, una obra original creada por Krozzii.

No quiero una plantilla genérica de wiki. Quiero una plataforma editorial y enciclopédica profesional, visualmente distintiva, preparada para crecer junto con la obra.

# 1. CONTEXTO DEL PROYECTO EXISTENTE

Repositorio:
https://github.com/Krozzii/arkfates-desire-wiki

Rama principal: main.

El proyecto existente utiliza:
- Digital Garden.
- Eleventy 3.
- Sass.
- Markdown.
- Node.js 22.
- GitHub.
- Vercel.

La estructura existente incluye, entre otros:

- `.eleventy.js`
- `package.json`
- `src/site/styles/style.scss`
- `src/site/styles/custom-style.scss`
- `src/site/notes/Inicio.md`
- `src/site/notes/notes.json`
- `src/site/_data/meta.js`
- `src/site/_includes/layouts/note.njk`
- Plantillas de navegación y sidebar.
- Directorios de contenido, imágenes y configuraciones.

El archivo `custom-style.scss` es el punto de partida preferente para la personalización visual.

La página `Inicio.md` es actualmente la portada publicada y tiene configurado el permalink `/inicio/` y la etiqueta `gardenEntry`.

Antes de modificar cualquier cosa, inspecciona el repositorio y comprende cómo funciona realmente.

# 2. REGLAS FUNDAMENTALES

- No migres el proyecto a Quartz ni a otra plataforma.
- No sustituyas Digital Garden ni Eleventy.
- No reconstruyas todo desde cero.
- No elimines funcionalidades existentes que puedan seguir siendo útiles.
- No rompas los enlaces, permalinks ni metadatos.
- No inventes contenido narrativo, personajes, capítulos ni acontecimientos.
- No inventes enlaces de Discord ni de otras plataformas.
- No publiques borradores ni información narrativa que no esté autorizada.
- No introduzcas dependencias innecesarias.
- No modifiques configuraciones sensibles ni expongas credenciales.
- Mantén el nombre de la obra exactamente como ArkFates Desiré.
- La identidad pública del creador es Krozzii. No incluyas su nombre personal.

Si encuentras una limitación de Digital Garden, busca primero una solución compatible con la arquitectura actual.

# 3. IDENTIDAD VISUAL

Quiero una combinación de estética editorial vintage, minimalismo premium y presentación cinematográfica AAA.

La web debe transmitir:
- Profesionalismo.
- Autoridad editorial.
- Misterio.
- Amplitud de universo.
- Calidad de una franquicia narrativa oficial.
- Sensación de estar entrando en un archivo de conocimiento importante.

## Paleta de colores

Utiliza como punto de partida:

- Carbón: `#171716`
- Negro profundo: `#111110`
- Marfil: `#EEE9DD`
- Dorado principal: `#B79A63`
- Dorado luminoso: `#D4B77D`
- Tinta: `#191817`
- Rojo secundario: `#8F2930`

La identidad debe ser dual:

PORTADA:
- Fondo oscuro.
- Composición cinematográfica.
- Títulos editoriales.
- Dorado como acento.
- Espacios amplios.
- Jerarquía visual marcada.

INTERIORES:
- Fondo marfil o papel.
- Texto oscuro.
- Líneas divisorias sutiles.
- Dorado utilizado con moderación.
- Excelente legibilidad.
- Interfaz ordenada y refinada.

No quiero:
- Una wiki genérica.
- Estética futurista recargada.
- Exceso de degradados.
- Exceso de tarjetas.
- Bordes y efectos decorativos innecesarios.
- Colores saturados como acento dominante.

## Tipografía

Define una combinación editorial:

- Serif elegante para títulos y encabezados importantes.
- Sans-serif moderna para navegación, interfaces y textos auxiliares.
- Tipografía de lectura cómoda para capítulos extensos.

Inspecciona primero las fuentes que ya utiliza el proyecto. Prioriza las fuentes locales existentes.

Mantén una jerarquía tipográfica coherente en toda la plataforma.

# 4. NAVEGACIÓN PRINCIPAL

La navegación debe tener estas secciones:

1. Inicio.
2. Enciclopedia.
3. Biblioteca.
4. Novedades.
5. Comunidad.
6. Acerca de.

El buscador global debe estar accesible desde la navegación o desde un elemento visual claramente identificable.

La navegación debe ser responsive y funcionar correctamente en móviles.

# 5. PORTADA — INICIO

La portada debe ser la presentación oficial de ArkFates Desiré.

Debe incluir:

- Hero principal cinematográfico.
- Nombre ArkFates Desiré.
- Presentación breve de la obra.
- Firma de autoría: Krozzii.
- Acceso destacado a la Biblioteca.
- Acceso destacado a la Enciclopedia.
- Capítulos recientes.
- Novedades recientes.
- Obras destacadas.
- Acceso a la comunidad oficial.
- Pie de página con créditos y derechos.

La portada debe sentirse como la web oficial de una franquicia narrativa, no como una página de documentación.

No inventes ilustraciones oficiales ni utilices imágenes de personajes que no hayan sido proporcionadas. Puedes diseñar composiciones tipográficas y utilizar recursos gráficos neutros.

# 6. ENCICLOPEDIA

La enciclopedia será uno de los dos pilares fundamentales.

Debe permitir documentar progresivamente:

- Personajes.
- Habilidades y capacidades.
- Transformaciones.
- Razas y especies.
- Organizaciones y facciones.
- Universos y dimensiones.
- Cosmología.
- Lugares.
- Objetos y tecnologías.
- Acontecimientos.
- Cronología.
- Sistemas y conceptos.
- Relaciones entre artículos.

## Referencias cruzadas

Los artículos deben poder enlazarse entre sí.

Por ejemplo:
Un personaje puede enlazar a sus habilidades, acontecimientos, lugares y personajes relacionados.

Debe existir navegación contextual y enlaces internos coherentes.

## Evolución del canon y spoilers

La información debe incorporarse progresivamente según el avance de la obra.

No quiero que una ficha revele desde el principio toda la evolución de un personaje.

Diseña una estructura de metadatos que permita asociar artículos o información con un capítulo, acontecimiento o punto de publicación.

La arquitectura debe facilitar que, en el futuro, el contenido no autorizado todavía pueda mantenerse sin publicar.

No implementes un sistema complejo de cuentas ni permisos privados por ahora.

No inventes información para completar artículos vacíos.

# 7. BIBLIOTECA — PRIORIDAD EDITORIAL

Esta sección será el centro de publicación de las historias.

Debe permitir organizar:

OBRA → TEMPORADAS → CAPÍTULOS.

Cada obra tendrá una ficha de presentación con:

- Título.
- Formato.
- Sinopsis.
- Descripción.
- Portada, si existe.
- Temporadas.
- Capítulos publicados.

El lector debe poder abrir cualquier capítulo publicado sin estar obligado a leer los anteriores.

No implementes bloqueos de lectura cronológica.

## Lector de capítulos

Diseña una experiencia de lectura tipo libro digital:

- Fondo marfil.
- Tipografía serif cómoda.
- Columna central de lectura.
- Ancho de texto controlado.
- Márgenes amplios.
- Jerarquía clara de títulos.
- Separación adecuada entre párrafos.
- Diseño responsive.
- Navegación al capítulo anterior y siguiente.
- Acceso al índice de capítulos.
- Identificación de obra y temporada.
- Número y título del capítulo.
- Fecha de publicación.
- Tiempo estimado de lectura, si puede calcularse correctamente.
- Posibilidad de incluir ilustraciones dentro del capítulo.
- Enlace para volver a la obra.

La tipografía de lectura debe ser consistente. No añadas un selector de fuentes.

No bloquees el zoom ni las funciones de accesibilidad del navegador.

# 8. FORMATOS FUTUROS

La plataforma no debe quedar limitada exclusivamente a novelas.

Prepara una arquitectura de publicaciones que permita diferenciar en el futuro:

## Novelas
Primera modalidad que se implementará.

## Manga
Futura modalidad con:
- Colecciones independientes.
- Volúmenes.
- Capítulos.
- Lector visual de páginas e imágenes.

No implementes todavía el lector de manga.

## Anime
Futura modalidad audiovisual.

La intención es que las fichas y la información de episodios puedan mostrarse en la web, mientras que la distribución del contenido audiovisual se realizará mediante plataformas externas autorizadas.

No implementes un reproductor ni alojamiento de vídeo por ahora.

Estos formatos futuros deben ser considerados en la organización conceptual, sin desarrollar funcionalidades que todavía no necesitamos.

# 9. NOVEDADES

Crea una sección editorial para publicar:

- Nuevos capítulos.
- Anuncios oficiales.
- Actualizaciones de obras.
- Incorporación de artículos.
- Ilustraciones.
- Comunicados.
- Noticias del proyecto.

Debe poder mostrar las publicaciones más recientes y enlazar al contenido correspondiente.

No inventes noticias ni fechas.

# 10. COMUNIDAD

La comunidad oficial se organizará en Discord.

La web debe tener:
- Presentación de la comunidad.
- Acceso al servidor oficial.
- Explicación de su función.
- Posibilidad de mostrar futuras convocatorias.

Las postulaciones, roles, selección de testers, artistas, escritores, moderadores y otros colaboradores se gestionarán inicialmente en Discord.

No construyas todavía un sistema propio de registro, solicitudes, cuentas ni panel de administración.

El enlace de invitación debe ser configurable y no debe inventarse.

# 11. ACERCA DE

Incluye un espacio para:

- Presentación de ArkFates Desiré.
- Información sobre su creador: Krozzii.
- Propósito del proyecto.
- Créditos.
- Derechos de autor.
- Información de contacto y enlaces oficiales cuando estén configurados.

No inventes información biográfica ni datos de contacto.

# 12. MONETIZACIÓN FUTURA

La monetización no se implementará todavía.

Sin embargo, la arquitectura editorial debe permitir contemplar posteriormente:

- Acceso anticipado a capítulos.
- Material adicional para seguidores.
- Contenido complementario.
- Posibles modalidades de apoyo.

No implementes pasarelas de pago, suscripciones ni restricciones de lectura en esta etapa.

La primera prioridad es construir audiencia y ofrecer una experiencia pública de calidad.

# 13. DISEÑO RESPONSIVE Y CALIDAD

La web debe funcionar en:

- Escritorio.
- Portátiles.
- Tablets.
- Móviles.

Prioriza:
- Velocidad de carga.
- Accesibilidad.
- Legibilidad.
- Navegación intuitiva.
- Consistencia visual.
- SEO básico.
- Metadatos adecuados.
- Estructura semántica.
- Respeto a las preferencias de movimiento reducido.

# 14. IMPLEMENTACIÓN Y CONTROL DE CAMBIOS

Antes de empezar:

1. Inspecciona la estructura real del proyecto.
2. Identifica cómo se generan las páginas y las colecciones.
3. Comprueba los estilos existentes.
4. Identifica las plantillas de navegación y contenido.
5. Identifica las convenciones de publicación de Digital Garden.
6. Comprueba qué funcionalidades ya existen para no duplicarlas.

Después implementa la plataforma respetando las convenciones existentes.

Trabaja de forma organizada y evita modificar archivos que no sean necesarios.

Si una funcionalidad no puede implementarse correctamente con la arquitectura actual, documenta la limitación y ofrece la alternativa compatible más sencilla.

No sustituyas contenido real por ejemplos ficticios.

Si faltan capítulos o artículos, crea las plantillas y estructuras necesarias, pero no inventes su contenido.

# 15. VALIDACIÓN FINAL

Cuando termines:

1. Ejecuta la compilación del proyecto.
2. Corrige errores que hayas introducido.
3. Comprueba que los enlaces internos funcionen.
4. Comprueba que la navegación móvil funcione.
5. Comprueba que las páginas publicadas sigan siendo accesibles.
6. Comprueba que la portada y los interiores respeten la identidad visual.
7. Revisa que los capítulos sean legibles.
8. Comprueba que las modificaciones no rompan la publicación en Vercel.

Presenta un informe final con:

- Archivos modificados.
- Nuevos archivos creados.
- Funcionalidades implementadas.
- Funcionalidades preparadas para el futuro.
- Problemas encontrados.
- Resultado de la compilación.
- Pasos manuales que todavía necesite realizar el propietario.

No hagas push, no publiques y no realices commits sin autorización.

# RESULTADO ESPERADO

Quiero una plataforma oficial de ArkFates Desiré que combine una enciclopedia profunda y una biblioteca narrativa profesional.

Debe sentirse como el hogar digital de un universo literario que está creciendo y que, en el futuro, podrá expandirse hacia manga, anime, colaboraciones y otros proyectos.

La prioridad es construir una base sólida, elegante, funcional y ampliable, sin perder la identidad editorial y cinematográfica definida en este documento.