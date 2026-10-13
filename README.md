# Grupo Tinbet — Sitio web

Sitio de Grupo Tinbet maquetado en HTML, CSS y JavaScript sin dependencias, a partir de los
frames del Figma del proyecto y del **Manual de marca 2026**.

**Sitio publicado:** https://ferdango.github.io/grupo-tinbet/

## Estructura

```
index.html            Página Home
obras-por-impuestos.html  Página "Obras por impuestos" (vertical Inversiones, línea amarilla)
areas-de-negocio.html     Página "Áreas de negocio" (directorio de empresas con filtros)
personas-y-talento.html   Página "Personas y talento" (cultura, comunidad y vacantes)
lo-ultimo.html        Página "Lo último" (noticias con destacados, filtros y "Ver más")
nota.html             Plantilla de nota individual (single blog)
css/styles.css        Estilos (tokens de color y tipografía del manual de marca)
js/main.js            Interacciones
assets/logos/         Logotipos y símbolo en SVG (exportados del manual de marca)
assets/img/           Fotografías y fondos optimizados en WebP
```

## Secciones del Home

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

## Obras por impuestos

`obras-por-impuestos.html` sigue el frame *Obras por impuesto* del Figma (escritorio y móvil) con la
**línea gráfica amarilla** de la vertical Inversiones: amarillo `#ffb100`, marrón `#532c00` y fondos
crema (`--c-inv-cream`, `--c-inv-sand`). El `<body class="theme-inv">` cambia a esa línea los acentos
compartidos (barra de progreso, menú, botones, footer, carrusel de noticias).

- **Cabecera:** cuatro fotos escalonadas que crecen al cargar (en móvil pasan a slider horizontal).
- **Declaración:** el titular se ilumina palabra por palabra con el scroll (`data-scroll-words`).
- **Cómo transforma comunidades:** slider de textos "1 de 2" (`data-slider` / `data-slide`).
- **Nuestras obras:** mapa con pines y banner con la obra destacada. Cada pin es un enlace a la ficha
  del proyecto (`href="#id"`) y se ubica con `--x` / `--y` (porcentaje sobre el mapa). En escritorio el pin
  cambia la obra del banner, que avanza sola cada 6 s (`data-autoplay`); en móvil lleva a la ficha.
- **Fichas de proyecto:** galería de fotos con flechas y, en móvil, texto recortado con "Mostrar más".
  El título y la región del banner se leen de la ficha (`.oxi-project__title` y `data-region`), así que
  para sumar una obra basta con agregar su `<article class="oxi-project">` y su pin en el mapa.

Las fotos del banner y de "transforma comunidades" y el mapa venían en verde en el Figma: se recolorearon
a la línea amarilla (`obras-banner.webp`, `obras-comunidades.webp`, `obras-mapa.webp`). Los pines se
dibujan en vector con el símbolo de la marca. La primera ficha usa el contenido del Figma; las fichas de
**Paucartambo** y **Piura** son contenido de ejemplo que debe reemplazarse por la información real.

## Áreas de negocio

`areas-de-negocio.html` sigue el frame *Areas de negocio* del Figma (escritorio y móvil) con la cabecera
de páginas internas del sitio. Cada empresa es un `<article class="brand-card">` con `data-category`
(una o varias categorías separadas por espacios: `igaming`, `construccion`, `inversion`, `servicios`,
`desarrollo`, `infraestructura`) que usan los filtros. Sus colores salen de la vertical con `--v`, `--v-ink`
y `--v-dark`. Mientras no estén los logotipos de cada empresa, la tarjeta muestra el símbolo de Grupo Tinbet
en los colores de su vertical y el nombre; para usar el logo real, reemplaza el contenido de
`.brand-card__logo` por un `<img>`. Las descripciones y categorías son una propuesta a validar.

## Personas y talento

`personas-y-talento.html` sigue el frame *Personas y talento* del Figma: cabecera con collage, cultura con el
mapa del Perú hecho con el símbolo, escalera "Conoce lo que nos mueve" (las tarjetas suben al aparecer),
mosaico del equipo, sección para postular, rotador "El vínculo entre empresa y…" (palabras definidas en
`data-words`), vacantes y llamado "Manos a la obra".

- **Vacantes:** cada vacante es un `<article class="job" data-job>` con `data-contrato`, `data-modalidad`,
  `data-ubicacion` y `data-area`, que coinciden con los `value` de los filtros. Los filtros se aplican con
  "Buscar", aparecen como etiquetas que se pueden quitar y la lista se pagina de a `data-page` vacantes.
  El botón de compartir usa el menú nativo del sistema o copia el enlace (`#id` de la vacante, que abre la
  página donde está). Cada vacante abre un correo a contacto@grupotinbet.com con el puesto en el asunto.
- Las 14 vacantes son **contenido de ejemplo**: deben reemplazarse por las reales o conectarse a la
  plataforma de reclutamiento.

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
