# La aldea · Portfolio de Alejandro Revilla

Portfolio jugable en pixel art. En vez de una página con scroll, una aldea viva que se
ve entera de un vistazo: los vecinos pasean, trabajan y charlan por su cuenta, y cada
uno guarda una parte del perfil. Se pulsa el icono de su oficio que flota sobre él (el pico
del minero, la caña del pescador…) y se abre su sección a pantalla completa.

No hay personaje que mover: la cámara es fija y encaja la aldea entera en pantalla. El
botón **Leer el perfil** (tecla `Q`) abre además el perfil completo, donde cada apartado se lee de
un clic, sin buscarlo en el mapa.

Hecho con **Phaser 3 + TypeScript + Vite**, y el mapa con **[Tiled](https://www.mapeditor.org/)**.
Sin backend: se publica como sitio estático.

> **Los sprites no están en este repositorio.** Son del pack de pago
> [Cute Fantasy RPG](https://kenmi-art.itch.io/cute-fantasy-rpg) de Kenmi, cuya licencia
> permite usarlos en proyectos pero no redistribuirlos. Para compilar hace falta tener el
> pack (ver "Créditos"); la web publicada sí los incluye, como cualquier juego.

## Arrancar

```bash
npm install
npm run dev
```

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo en http://localhost:5173 |
| `npm run build` | Comprueba assets, tipa y compila a `dist/` |
| `npm run preview` | Sirve el `dist/` ya compilado |
| `npm run mapa` | Exporta `mapa/aldea.tmx` (Tiled) a `public/mapa/aldea.json` |
| `npm run tilesets` | Regenera los tilesets de Tiled desde `tools/mapa/catalogo.mjs` |
| `npm run assets` | Copia a `public/assets` los sprites sueltos declarados en `assets.ts` |
| `npm run check:assets` | Avisa de rutas de sprites rotas (también las del mapa) |
| `npm run check:seo` | Comprueba que el texto para buscadores de `index.html` sigue al día con `es.json` |

## Cómo está organizado

```
mapa/                   EL MAPA, en Tiled (ver mapa/LEEME.md)
├─ aldea.tiled-project  proyecto: tipos de objeto y el comando "Exportar a la web"
├─ aldea.tmx            el mapa: suelo, edificios, decoración, vecinos, animales
├─ tilesets/*.tsx       un tileset por hoja del pack (con animaciones y autotile)
└─ img/                 los PNG de esos tilesets
public/mapa/            lo que exporta `npm run mapa` (no se edita a mano)
src/
├─ main.ts              arranque de Phaser
├─ config.ts            constantes (tamaño del mapa, velocidades, capas)
├─ content/
│  ├─ es.json en.json   TODO el texto del portfolio
│  └─ index.ts          tipos e idioma
├─ world/
│  ├─ mapa.ts           lee el mapa exportado: vecinos, carteles, animales, efectos
│  ├─ animatedTiles.ts  reproduce las animaciones de tiles de Tiled (agua, fuente...)
│  ├─ assets.ts         sprites sueltos: vecinos, animales, nubes
│  └─ animations.ts     animaciones de personajes y animales
├─ entities/            Npc, Animal, Marker (el icono pulsable), SpeechBubble
├─ systems/             bus de eventos entre el juego y la interfaz
├─ scenes/              PreloadScene, WorldScene
└─ ui/                  interfaz en DOM (no canvas)
   ├─ ui.ts             cabecera, bienvenida, diálogo, paneles y perfil completo
   ├─ panels.ts         el cuerpo de cada tipo de panel
   ├─ dom.ts            abrir/cerrar capas con transición y foco en modales
   └─ styles.css        sistema de diseño (tokens arriba del archivo)
tools/                  exportador, generador de tilesets y comprobaciones
```

Tres reglas que mantienen esto ampliable:

1. **El código no contiene ni un texto del portfolio.** Todo está en `content/*.json`.
2. **El juego no toca el DOM y la interfaz no toca Phaser.** Se hablan por
   `systems/bus.ts`.
3. **El mapa no está en el código.** Suelo, edificios, árboles, vallas, flores y
   también dónde vive cada vecino y dónde pasta cada animal se dibujan en Tiled.

## Recetas

### Editar el mapa

Abre `mapa/aldea.tiled-project` con Tiled, y dentro, `aldea.tmx`. Pinta, guarda y
exporta con **Ctrl+Shift+E** (o `npm run mapa`). Con `npm run dev` abierto, recarga
la página y ya está. Los detalles —qué va en cada capa, cómo se pinta el agua,
cómo se mueve a un vecino— están en **`mapa/LEEME.md`**.

### Diseño de la interfaz

Dirección: **hoja técnica**. Cada sección se abre a pantalla completa como la ficha
de un componente: referencia `AR·03 / 10`, título grande, filetes (2 px de tinta
abren cada bloque, 1 px gris separa filas), tablas que se leen en segundos y una
barra fija abajo con anterior / índice / siguiente. Con las flechas ← → del teclado,
o deslizando en el móvil, se pasa de hoja. El sistema completo (colores, tipos,
reglas) está en la cabecera de `src/ui/styles.css`. Lo esencial:
**un solo acento verde, que significa "verificado / leído"**; los logos de
tecnologías son el único color extra; la monoespaciada, solo para cifras.

Paneles, índice, diálogo y bienvenida viven en `#overlay-root`, fijo a la ventana,
**fuera** del marco del mapa. Los botones sobre el mapa y la ayuda van en `#ui-root`.
En móvil y tablet en vertical aparece una cabecera y el mapa se arrastra en
horizontal; la zona pulsable de cada marcador mide al menos 44 px.

### Orden de las secciones

`order` en `content/*.json` decide el orden del índice, el número de hoja (el mismo
en el índice, en la hoja y en la etiqueta del marcador del mapa) y los botones
"Anterior / Siguiente". Cada panel lleva `title`, `place` (el lugar de la aldea,
debajo del título) y `summary` (una línea para el índice).

### Iconos

Un SVG por icono en `src/ui/iconos/`; el nombre del archivo (sin `.svg`) es lo que
va en el campo `icon` del JSON. Si falta el archivo, salen las iniciales. De dónde
sacar más está en `src/ui/iconos/LEEME.md`.

### Foto, CV, capturas e insignias

Mete los archivos en `public/perfil/` y pon su ruta en el JSON (en `es.json` y
`en.json`). Con la ruta vacía no se muestra nada, y si la ruta apunta a un archivo
que no existe, el hueco desaparece sin dejar un marco roto.

| Qué | Dónde | Ejemplo |
| --- | --- | --- |
| Foto | `panels["sobre-mi"].photo` | `"perfil/foto.jpg"` (vertical, 4:5) |
| CV | `panels["sobre-mi"].cv` | `"perfil/cv-alejandro-revilla.pdf"` |
| Captura de un proyecto | `panels.proyectos.items[n].image` | `"perfil/scanner-fructosa.png"` (16:9) |
| Insignia | `panels.certificaciones.shelves[n].items[m].badge` | `"perfil/insignias/ccna-itn.png"` |
| Verificación | `…items[m].verify` | el enlace público de Credly / Cisco / Oracle |

### Añadir un proyecto al mercado

Abre `src/content/es.json` y `en.json`, y añade un bloque al array
`panels.proyectos.items`:

```json
{
  "name": "mi-proyecto",
  "status": "En desarrollo",
  "stack": [
    { "name": "Java", "icon": "java" },
    { "name": "Spring Boot", "icon": "spring" }
  ],
  "text": "Dos líneas de qué resuelve.",
  "link": "https://github.com/alejandrorevillaEng/mi-proyecto",
  "linkText": "Ver en GitHub",
  "image": ""
}
```

Ya está: el proyecto aparece solo. Si quieres además un puesto nuevo en el mapa,
estámpalo en Tiled desde el tileset `puestos`.

### Añadir una skill

En `panels.<seccion>.groups`, añade al array `items` del grupo que toque:

```json
{ "name": "Docker", "icon": "docker", "evidence": "Proyecto mi-proyecto" }
```

`evidence` es opcional y solo debe decir algo que sea verdad y se pueda comprobar
(una certificación, un proyecto). Sin ella, la celda queda vacía.

### Añadir un vecino

1. En `src/content/*.json`, un bloque nuevo dentro de `npcs` con `name`, `role`,
   `dialogue` (2-3 líneas) y `panel`.
2. En el mismo archivo, el panel que abre, dentro de `panels`. Reutiliza un `type`
   existente: `texto`, `skills`, `proyectos`, `certificaciones` o `contacto`.
3. En Tiled, en la capa de objetos `vecinos`, un punto (se queda quieto) o una
   polilínea (pasea) con la clase `vecino`, el **nombre** igual al `id` del JSON y
   el `sprite` elegido en el desplegable.

No hace falta tocar TypeScript. `npm run mapa` avisa si el nombre no existe en el JSON.

### Añadir un cartel que abra un panel, sin NPC

Un bloque en `signs` del JSON y, en Tiled, un punto de clase `cartel` en la capa
`carteles` con el mismo nombre, puesto al pie del cartel dibujado.

Para que una sección nueva salga en el perfil completo y en "Anterior / Siguiente",
añade su id a `order` en los dos JSON. No hace falta tocar la interfaz.

### Cambiar lo que dice un vecino al pasear (charla ambiental)

`chatter`, junto a `dialogue`, en el bloque del vecino dentro de `content/*.json`.
Son frases sueltas que se muestran en un bocadillo de vez en cuando, sin relación con
el diálogo del panel; con 2-3 por vecino basta.

### Si un personaje o un animal se anima raro

Las filas de las hojas de sprites están mapeadas en `CHAR_ROWS`, `WORK_ROW` y
`ANIMAL_ROWS` (`src/world/assets.ts`). Son el único sitio donde se define qué fila es
andar hacia arriba, de perfil o la animación de oficio.

## Publicar en GitHub Pages

```bash
npm run deploy
```

Compila y sube `dist/` a la rama `gh-pages`, que es la que sirve GitHub Pages. La
web queda en https://alejandrorevillaEng.github.io/portafolio-alejandro-prueba1/.
`base: './'` en `vite.config.ts` hace que funcione con cualquier nombre de repositorio.

## Créditos

- Sprites y tiles: [Cute Fantasy RPG](https://kenmi-art.itch.io/cute-fantasy-rpg), de
  Kenmi (licencia de pago). No se incluyen en el repositorio porque la licencia no
  permite redistribuirlos. Para trabajar en local, el pack va en la carpeta padre del
  proyecto; `npm run tilesets` copia a `mapa/img` los tilesets del catálogo y
  `npm run assets` copia a `public/assets` los sprites sueltos de `assets.ts`.
- Iconos de la interfaz: [Devicon](https://devicon.dev) (MIT),
  [Simple Icons](https://simpleicons.org) (CC0) y [Phosphor](https://phosphoricons.com) (MIT).
