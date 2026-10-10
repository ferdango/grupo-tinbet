# Grupo Tinbet — Sitio web

Página **Home** de Grupo Tinbet maquetada en HTML, CSS y JavaScript sin dependencias,
a partir del frame *Home* del Figma del proyecto y del **Manual de marca 2026**.

**Sitio publicado:** https://ferdango.github.io/grupo-tinbet/

## Estructura

```
index.html            Marcado de la página Home
css/styles.css        Estilos (tokens de color y tipografía del manual de marca)
js/main.js            Interacciones
assets/logos/         Logotipos y símbolo en SVG (exportados del manual de marca)
assets/img/           Fotografías y fondos optimizados en WebP
```

## Secciones

1. Header fijo con menú móvil
2. Hero con video
3. Principios que nos guían (mazo de tarjetas interactivo)
4. Valores (carrusel deslizable)
5. Video del equipo
6. Áreas de negocio (Gaming & Entretenimiento / Obras por impuestos)
7. Talento (+300 profesionales, contador animado)
8. Mosaico de fotografías con parallax
9. Innovación (lista con avance automático)
10. Ecosistema Grupo Tinbet
11. Preguntas frecuentes (acordeón)
12. Lo último (carrusel de notas y videos)
13. Footer

## Marca

- **Colores principales:** `#042b1e`, `#00b300`, `#057c02`, `#49c905`, `#93e61a`, `#ffb100`
- **Tipografía web:** Montserrat (Google Fonts, licencia OFL). La fuente principal del manual
  es **Aeonik**; su licencia (This Is Our Shop EULA) es comercial, así que no se incluye en este
  repositorio público. Si se cuenta con licencia web, basta con añadir los archivos `.woff2`
  y declarar el `@font-face` correspondiente: `--font` ya incluye `"Aeonik"` como alternativa.

## Videos

Los botones de reproducción abren un modal. Para asignar un video, completa el atributo
`data-video` del botón con un enlace de YouTube o un archivo `.mp4`:

```html
<button class="play-btn" data-video-open data-video="https://youtu.be/XXXXXXXXXXX">…</button>
```

Si el atributo está vacío se muestra el mensaje "Video próximamente".

## Desarrollo local

```bash
python3 -m http.server 5173
```

Luego abre http://localhost:5173.
