# Grupo Tinbet — Sitio web

Página **Home** de Grupo Tinbet maquetada en HTML, CSS y JavaScript sin dependencias,
a partir del frame *Home* del Figma del proyecto y del **Manual de marca 2026**.

**Sitio publicado:** https://ferdango.github.io/grupo-tinbet/

## Estructura

```
index.html            Página Home
lo-ultimo.html        Página "Lo último" (noticias con destacados, filtros y "Ver más")
nota.html             Plantilla de nota individual (single blog)
css/styles.css        Estilos (tokens de color y tipografía del manual de marca)
js/main.js            Interacciones
assets/logos/         Logotipos y símbolo en SVG (exportados del manual de marca)
assets/img/           Fotografías y fondos optimizados en WebP
```

## Secciones

1. Header transparente sobre el hero, menú desplegable de verticales y barra de progreso
2. Hero con composición de formas del manual (fotos recortadas dentro de las formas, parallax)
3. Accesos rápidos a las 3 verticales
4. Sobre Grupo Tinbet (contadores y video del equipo)
5. Cinta animada con las verticales
6. Verticales de negocio en tarjetas apiladas al hacer scroll
7. Principios que nos guían: la sección queda fijada y las tarjetas se apilan una por una con el scroll
8. Valores (tarjetas con efecto 3D)
9. Talento (+300 profesionales, figuras laterales animadas con el scroll) y mosaico con parallax
10. Innovación: el titular se pinta de verde palabra por palabra y la lista se abre ítem por ítem con el scroll
11. Lo último (carrusel de notas y videos)
12. Preguntas frecuentes
13. Llamado a la acción y footer

## Marca

- **Colores principales:** `#042b1e`, `#00b300`, `#057c02`, `#49c905`, `#93e61a`
- **Verticales:** Entretenimiento `#f741f3` (magenta, con `#3c163d`), Inversiones `#ffb100`
  (amarillo, con `#532c00`) y Seguridad `#0b0b0b` (negro). Están definidas como variables en
  `css/styles.css` (`--c-ent`, `--c-inv`, `--c-seg`).
- **Elementos gráficos:** las formas (`#x-*`, `#kite-*`, `#chev-*`) y el símbolo (`#sym-*`) se
  exportaron en vector desde los archivos del manual y están en el sprite SVG al inicio de
  `index.html`; se reutilizan con `<use href="#...">` y se colorean por CSS.
- **Tipografía web:** Montserrat (Google Fonts, licencia OFL). La fuente principal del manual
  es **Aeonik**; su licencia (This Is Our Shop EULA) es comercial, así que no se incluye en este
  repositorio público. Si se cuenta con licencia web, basta con añadir los archivos `.woff2`
  y declarar el `@font-face` correspondiente: `--font` ya incluye `"Aeonik"` como alternativa.

Las escenas fijadas (Principios y lista de Innovación) se activan en pantallas de al menos
861 px y 1101 px de ancho respectivamente; en pantallas más pequeñas, o si el sistema pide
reducir el movimiento, funcionan con clic. Su duración se ajusta con la altura de la pista en
`css/styles.css` (`.principles__track`, `.innovation__track--words`, `.innovation__track--features`).

## Carruseles

Los carruseles (noticias del Home, destacados de Lo último y noticias relacionadas) avanzan solos
en bucle infinito: se pausan al pasar el mouse, al tocarlos o fuera de pantalla. El intervalo se
cambia con el atributo `data-autoplay` (en milisegundos) del contenedor `data-carousel-root`.

## Lo último y notas

- Cada tarjeta de `lo-ultimo.html` tiene `data-category` (`obras`, `entretenimiento`, `seguridad`,
  `impacto`, `deportes`, `digital`) que usan los filtros; se muestran 8 y "Ver más noticias" carga 8 más.
- `nota.html` es la plantilla de nota: cabecera, imagen o video, contenido (`.prose`), botones para
  compartir y carrusel de noticias relacionadas. Para una nota nueva, duplica el archivo y cambia el contenido.

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
