# VISIÓN POR MÉXICO — sitio estático (V2)

Catálogo de armazones con consulta por WhatsApp, selección obligatoria de estado y mapa de referencia. Web estática (HTML, CSS y JavaScript sin dependencias) preparada para GitHub Pages.

## Contenido de esta carpeta

```text
SITIO_GITHUB/              ← carpeta raíz que se publica
  index.html               página única con todas las secciones
  styles.css               hoja de estilos
  script.js                lógica: estado, catálogo, filtros, ficha, WhatsApp, mapa
  README.md                este archivo
  .nojekyll                evita el procesado Jekyll en GitHub Pages
  assets/logo/             logotipos originales y favicon (sin modificar)
  assets/catalogo/         7 fotografías originales (.jpg) y sus versiones .webp
  data/catalogo.json       fuente única del catálogo (7 productos)
```

No hay proceso de compilación. Todas las rutas son relativas (`./assets/...`, `./data/...`), por lo que el sitio funciona en `usuario.github.io/repositorio/`.

## Publicar en GitHub Pages

1. Crea un repositorio (por ejemplo `vision-por-mexico`).
2. Sube **el contenido** de esta carpeta a la raíz del repositorio (el `index.html` debe quedar en la raíz, no dentro de `SITIO_GITHUB/`).
3. En el repositorio: *Settings → Pages → Build and deployment → Source: Deploy from a branch*; rama `main`, carpeta `/ (root)`. Guarda.
4. En uno o dos minutos el sitio queda en `https://USUARIO.github.io/vision-por-mexico/`.
5. Para publicar cambios, basta con subir los archivos modificados a `main`.

## Probar en local

El catálogo se lee con `fetch('./data/catalogo.json')`. Los navegadores bloquean esa lectura cuando la página se abre como archivo (`file://`), así que usa un servidor HTTP local:

```bash
cd SITIO_GITHUB
python -m http.server 8000
# abre http://localhost:8000/
```

Si abres `index.html` directamente, la página muestra un aviso en la sección de armazones explicando que se necesita un servidor local.

## Cómo funciona

- **Acceso por estado.** Primera pantalla con búsqueda sobre las 32 entidades (coincidencia por cualquier secuencia de letras, sin distinguir acentos ni mayúsculas; selección por clic, flechas y Enter; no se selecciona implícitamente la primera coincidencia). El estado se guarda en `localStorage` (clave `vpm.estado`), con respaldo en `sessionStorage` o memoria si el navegador lo bloquea, y **siempre se valida contra el listado oficial** al recuperarlo. Mientras no hay estado válido, header, contenido y footer quedan `inert`. Los enlaces generales de WhatsApp, llamada y correo del propio selector funcionan sin estado.
- **Cambiar estado.** Botón en el header, en el paso 01 de "Cómo cotizar" y dentro de cada ficha.
- **Catálogo.** Se construye desde `data/catalogo.json`. Búsqueda por marca/modelo, filtro de forma (derivado del campo `categoria`: redondo, rectangular, aviador), orden alfabético y conteo dinámico. Con la última fila incompleta, una celda de cierre ofrece un enlace real a WhatsApp.
- **Ficha rápida.** `<dialog>` nativo: panel lateral en escritorio, hoja inferior en móvil. Escape, botón y clic en el fondo cierran; el foco vuelve al control que la abrió. Las dos variantes SENMA SM653 se enlazan entre sí ("Otro color del mismo modelo").
- **Enlaces profundos.** `index.html#armazon=senma-sm2017` abre la ficha. Sin estado válido, primero aparece el selector y después se reanuda la ficha. Identificadores: `senma-sm2017`, `senma-sm653-azul`, `senma-sm653-cafe`, `hashtag-hp1012-c2`, `senma-sm961`, `senma-sm956`, `senma-sm982`.
- **WhatsApp.** Todos los enlaces apuntan a `https://wa.me/526645002820` con el texto codificado mediante `encodeURIComponent`. Mensaje de ficha: `Hola, me interesa el armazón SENMA SM2017 (47□21-145). Mi estado es Baja California. ¿Podrían confirmarme disponibilidad, opciones de lentes y cotización?`. El enlace general añade el estado sólo si ya fue elegido. Nada se envía sin un clic del usuario.
- **Movimiento.** Entrada escalonada del hero, revelado único por `IntersectionObserver`, hover de tarjetas a escala 1.02 y subrayado animado. Con `prefers-reduced-motion: reduce` se desactivan transiciones, transformaciones y scroll suave.
- **Mapa.** `iframe` público de Google Maps (sin API key) apuntando a las coordenadas de referencia, con el enlace "Abrir ubicación compartida" siempre visible y un módulo alternativo que aparece si el navegador está sin conexión o el iframe no carga en 12 s.

## Tarifas regionales (preparadas, no visibles)

En `script.js`, el objeto `PRICING` contiene la bandera `SHOW_PUBLIC_PRICES: false` y las tarifas **de tipos de lentes** (no de armazones):

| Región | Entidades | Monofocales desde | Bifocales desde | Progresivos desde |
|---|---|---|---|---|
| Norte | Baja California, Baja California Sur, Chihuahua, Coahuila, Durango, Nuevo León, Sinaloa, Sonora, Tamaulipas | 650 MXN | 1 500 MXN | 2 000 MXN |
| Resto | las otras 23 entidades | 599 MXN | 1 200 MXN | 1 500 MXN |

Para activarlas en el futuro: cambiar `SHOW_PUBLIC_PRICES` a `true`. La función `renderLensPricing()` mostrará entonces, dentro de la sección "Tipos de lentes", una tabla "desde" calculada con `getRegion(estado)` a partir del estado validado, con la nota de que no incluye el armazón. Con la bandera en `false` el contenedor `#lens-pricing` permanece vacío y oculto, y ningún importe se renderiza en la interfaz. Importante: los valores viven en un archivo estático y son legibles en el código fuente; la bandera controla la interfaz, no es un mecanismo de seguridad.

## Pendientes de validación antes de publicar

- [ ] **Pin del mapa.** El enlace `https://maps.app.goo.gl/3Nv4jX43NmfQKKZd7` redirige a un registro antiguo ("Spasios Workspace") con coordenadas aproximadas `32.5208119,-117.0212388`. El iframe usa esas coordenadas como *mapa de referencia* y así está etiquetado. **Confirmar con la responsable que el marcador corresponde a la entrada actual de Coworking Blvd N.º 9370**; si no se corrobora, retirar el `iframe` (bloque `#map` en `index.html`) y conservar sólo el enlace externo y el texto aprobado.
- [ ] **Domicilio completo.** Sólo se muestra `Coworking Blvd · N.º 9370 · Tijuana, Baja California`. Calle, colonia y código postal no se han incluido porque no están confirmados. No usar `9730`, `9730-1A` ni `1A`.
- [ ] **Días de atención.** Sólo está confirmado el horario 10:00 a. m. a 5:00 p. m.; el sitio indica "Consulta los días de atención".
- [ ] **Disponibilidad y precio por armazón.** El JSON tiene `precio: null` y `disponibilidad: "Por confirmar"`; la interfaz no muestra ninguno de los dos.
- [ ] **Aviso de privacidad.** No se ha redactado ni enlazado ninguno. Cuando exista, añadir el enlace en el footer (`.footer__bottom`).
- [ ] **Imagen Open Graph.** Se usa `assets/catalogo/senma-sm2017.jpg` como vista previa al compartir; sustituir si se prefiere otra.
- [ ] **Términos comerciales** (envíos, devoluciones, garantías) no se mencionan porque no están confirmados.

## Pruebas realizadas

Entorno: Chromium 141 controlado con Playwright, servidor `python -m http.server` sirviendo el sitio en la subruta `/SITIO_GITHUB/` para reproducir la ruta de GitHub Pages. 49 comprobaciones automáticas superadas, además de capturas en 360, 390, 768, 1024 y 1440 px revisadas una a una.

| # | Prueba del encargo | Resultado |
|---|---|---|
| 1 | Sin estado: aparece el selector, el contenido queda `inert` y "Ver catálogo" está deshabilitado. Un enlace profundo `#armazon=senma-sm956` no abre la ficha hasta elegir estado y la reanuda después. | Superada |
| 2 | `baj` → Baja California, Baja California Sur · `sina` → Sinaloa · `mex` → Ciudad de México, Estado de México · `yuca` → Yucatán · `NUEVO` y `Méx` ignoran mayúsculas y acentos · Enter sin opción activa no selecciona la primera coincidencia. | Superada |
| 3 | 32 entidades en la lista, en orden alfabético; la región norte contiene exactamente 9. | Superada |
| 4 | Baja California → `norte`; Jalisco → `resto`; cambiar entre ellas actualiza el chip del header y el mensaje de la ficha abierta. Un valor inválido guardado (`Narnia`) se rechaza y vuelve a pedir el estado. | Superada |
| 5 | Búsqueda de importes en el texto del DOM (`$`, `MXN`, 599/650/1200/1500/2000, "pesos", "desde $"): sin coincidencias; `#lens-pricing` vacío y oculto. | Superada |
| 6 | Siete tarjetas con marca, modelo, medida, color, `alt` específico e imagen cargada desde `…/SITIO_GITHUB/assets/catalogo/*.webp`. Filtros: "hash" → 1, Aviador → 3, Rectangular → 3, Redondo → 1, orden A–Z correcto, sin resultados → aviso con "Limpiar filtros". | Superada |
| 7 | El enlace de la ficha SM2017 con Baja California es exactamente `https://wa.me/526645002820?text=` + mensaje codificado; no se abre ninguna ventana hasta el clic; el clic abre una pestaña nueva hacia `wa.me`. | Superada |
| 8 | La ficha abre con clic y con Enter; al abrir, el foco está en "Cerrar"; Escape, el botón y el clic en el fondo la cierran; el foco regresa a "Ver modelo"; el hash pasa de `#armazon=…` a `#armazones`. El `<dialog>` modal deja el fondo inaccesible al teclado. "Otro color del mismo modelo" cambia entre SM653 azul y café. | Superada |
| 9 | Presentes y exactos: `https://wa.me/526645002820`, `tel:+526645002820`, `mailto:contacto@visionpormexico.com`, Instagram, Facebook y `https://maps.app.goo.gl/3Nv4jX43NmfQKKZd7`. Todos los `target="_blank"` llevan `rel="noopener noreferrer"`. | Superada |
| 10 | El `iframe` apunta a `https://www.google.com/maps?q=32.5208119%2C-117.0212388&z=16&output=embed`; el enlace "Abrir ubicación compartida" es visible siempre; advertencia de validar el pin incluida arriba. | Superada (ver limitación) |
| 11 | Sin scroll horizontal en 360, 390, 768, 1024 y 1440 px (`scrollWidth` = ancho de ventana). Con `prefers-reduced-motion: reduce` no hay scroll suave y el contenido se muestra sin animación. Menú móvil abre, navega y cierra; zonas clicables ≥ 40 px. | Superada |
| 12 | Sin `href="#"` ni enlaces vacíos, sin imágenes rotas, sin errores de consola generados por el sitio. | Superada |

## Limitaciones reales

- **Red del entorno de pruebas.** El entorno donde se ejecutaron las pruebas bloquea el acceso a Google Fonts y a Google Maps. Por eso las capturas se revisaron con las fuentes de respaldo (sans serif del sistema) y el mapa aparece como caja vacía. Los únicos errores de consola registrados corresponden a esos recursos externos bloqueados. Hay que abrir el sitio publicado en un navegador con internet para ver Barlow Condensed / DM Sans y el mapa real.
- **Detección de fallo del mapa.** Un `iframe` de otro dominio no informa al script si su contenido falló: Chrome dispara `load` incluso ante un error de red. El módulo alternativo se muestra si el navegador está sin conexión o si el `iframe` no dispara `load` en 12 s; en el resto de casos el visitante siempre tiene el enlace "Abrir ubicación compartida".
- **Navegadores.** Sólo se probó en Chromium. No se ha verificado visualmente en Safari, Firefox ni en dispositivos físicos.
- **`<dialog>` e `inert`.** Se usan las API nativas (Chrome 102+, Safari 15.4+/16, Firefox 98+/112+). En navegadores muy antiguos la ficha se abre sin bloqueo modal del fondo.
- **El control por estado es de interfaz**, no una protección de datos: el catálogo y las tarifas preparadas son legibles en el código.

## Mantenimiento

- Para añadir o corregir un armazón, edita `data/catalogo.json` (campos: `id`, `marca`, `modelo`, `medida`, `categoria`, `color`, `imagen`, `imagenOriginal`). La forma del filtro se deduce de `categoria` (debe contener "redondo", "rectangular" o "aviador").
- Teléfono, WhatsApp y correo están en `index.html` y en la constante `CONTACT` de `script.js`.
- Textos de las secciones: directamente en `index.html`.
