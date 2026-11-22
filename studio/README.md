# ARKFATES STUDIO — MVP local

## Iniciar

Desde la raíz de `C:\Proyectos\arkfates-desire-wiki`:

```powershell
npm.cmd run studio
```

Abre `http://127.0.0.1:3001`. El sitio real de previsualización de Eleventy se sirve en `http://127.0.0.1:3002`. Ambos servidores escuchan únicamente en loopback; la vista previa es de solo lectura.

## Decisión de arquitectura

- `Inicio.md` sigue siendo la nota gardenEntry y conserva su permiso `dg-publish: true` y ruta raíz.
- La configuración estructurada que alimenta el hero vive en `.arkfates-studio/homepage.json`. Eleventy la carga desde `src/site/_data/homepage.js`, y la plantilla pública sigue siendo `src/site/_includes/components/homepage.njk`.
- La interfaz local es HTML, CSS y JavaScript servido por un servidor HTTP de Node. No añade un framework de frontend ni dependencias.
- El servidor de administración solo ofrece endpoints fijos de estado, borrador, imágenes y vista previa. No acepta rutas de archivo ni comandos del cliente.
- Eleventy genera la preview mediante su CLI instalado en el proyecto y `--output=.arkfates-studio/preview`. Las carpetas de salida de imágenes, favicons y estilos de plugins también apuntan a esa salida durante la preview.
- `.arkfates-studio/state`, `.arkfates-studio/media` y `.arkfates-studio/preview` están ignorados por Git. `.arkfates-studio/homepage.json` es configuración fuente.

## Guardado, preview y publicación

Editar cambia solo la previsualización interactiva en el navegador. `Guardar borrador` valida el modelo y lo persiste en `.arkfates-studio/state/homepage-draft.json`; no modifica la configuración fuente, no cambia `dg-publish`, no limpia `dist` y no publica ni despliega. `Actualizar vista previa` ejecuta Eleventy hacia la carpeta temporal. `Recuperar versión guardada` descarta el borrador y restaura `.arkfates-studio/homepage.json`.

Las revisiones SHA-256 del archivo fuente y del borrador previenen sobrescrituras si Obsidian u otro editor los cambia desde fuera. En un conflicto, el Studio muestra las diferencias antes de permitir cargar o volver a guardar una versión.

## Alcance de esta entrega

Editor contextual del hero de Inicio: texto, alineación, altura, colores y ángulo del degradado, imagen, texto alternativo, encuadre, zoom y superposición. Acepta imágenes locales PNG, JPEG, WebP, GIF y AVIF de hasta 10 MiB; se valida MIME, firma, tamaño y se asigna un nombre aleatorio sin sobrescribir recursos. Las cargas nuevas permanecen fuera de `src/site` y solo se sirven en la preview local.

Los módulos Enciclopedia, Biblioteca, Novedades, Comunidad, Acerca de, publicación, historial y configuración aparecen como pendientes; no tienen pantallas simuladas. Tampoco existe una acción para adoptar una imagen local a los recursos publicados, gestionar vídeo, sincronizar Git, hacer commits o desplegar. El borrador editorial de página completa y el historial reversible todavía necesitan su propia fase; este MVP solo mantiene un borrador de la configuración del hero y permite descartarlo.
