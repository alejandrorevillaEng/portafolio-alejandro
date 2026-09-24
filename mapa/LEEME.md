# El mapa de la aldea, en Tiled

Todo lo que se ve en la aldea se dibuja aquí, con tiles de 16×16 del pack Cute
Fantasy RPG. El juego no coloca nada por su cuenta: lo que pintes es lo que sale.

## Flujo de trabajo

1. Abre **`aldea.tiled-project`** con Tiled (1.10 o más nuevo) y, desde el panel de
   proyecto, **`aldea.tmx`**. Abrir el proyecto importa: trae los desplegables de
   sprites y especies y el comando de exportar.
2. Pinta y guarda (Ctrl+S).
3. Exporta a la web: **Ctrl+Shift+E** (menú *Archivo → Comandos → Exportar a la
   web*) o, desde la carpeta del proyecto, `npm run mapa`.
4. Con `npm run dev` abierto, recarga el navegador.

No uses *Exportar como…* de Tiled: el exportador de `npm run mapa` incrusta los
tilesets, arregla las rutas de las imágenes, copia solo los PNG que se usan y
comprueba que los vecinos existen en el contenido.

## Capas

El orden de las capas es el orden de dibujo, de abajo arriba.

| Capa | Qué va | Respecto a vecinos y animales |
|---|---|---|
| `suelo` | hierba de fondo | debajo |
| `terreno` | caminos, agua, ladrillo, huerto, la montaña de piedra | debajo |
| `bordes` | la orla de césped sobre el ladrillo (bloque 3×3 + 2×2 de arriba a la izquierda de `hierba-bordes`) | debajo |
| `detalle` | cascada, puente, flores, matas, nenúfares, cultivos, la barca | debajo |
| `objetos`, `-2`, `-3` | edificios, troncos, vallas, bancos, farolas | debajo |
| `encima`, `-2` … `-5` | tejados, copas de árbol, aspas del molino | **encima** |

Lo que decide si una capa va por encima de los personajes es la propiedad booleana
**`encima = true`**; el nombre da igual. Para una capa nueva por encima, duplica una
de las `encima`.

Regla práctica: un vecino que pasa **por delante** de algo no necesita nada (los
personajes siempre se dibujan sobre las capas `objetos`). Solo lo que un vecino o un
animal puede tener **delante** de él (la copa de un árbol que tapa a quien pasa por
detrás, la valla de abajo del corral) va en una capa `encima`.

Hay varias capas de cada tipo porque en una capa de tiles una casilla solo guarda un
tile: si dos árboles se solapan, el segundo va en la capa siguiente, y el que está
más al sur (más abajo en pantalla) debe ir en la capa de más arriba.

## Pinceles de terreno (autotile)

El agua y los caminos se pintan con el **pincel de terreno** (tecla T, panel
*Terrain Sets*): `Agua` en el tileset `agua`, `Tierra` y `Piedra` en
`hierba-bordes`. Pinta sobre la capa `terreno` y Tiled pone solo los bordes y las
esquinas. El pack no trae las piezas de las dos diagonales: evita dos charcas que se
toquen solo por una esquina.

El ladrillo de la plaza es un bloque de 2×2 (las cuatro casillas de arriba a la
izquierda del tileset `ladrillo`): selecciónalas juntas y pinta con ese bloque.

## Reglas de estilo (sacadas de la referencia del pack)

- **El ladrillo lleva reborde de césped.** Pinta el ladrillo una casilla más ancho
  de lo que quieres y, en la capa `bordes`, pon encima la orla de hierba: el bloque
  3×3 + 2×2 de arriba a la izquierda de `hierba-bordes` (hierba con el centro
  transparente). Sigue las mismas esquinas que el agua, sin corte recto.
- **El ladrillo y la tierra no se tocan.** Un camino de tierra termina una o dos
  casillas antes del ladrillo y entre los dos queda césped. El pincel de tierra ya
  pinta su propia orilla de hierba, así que deja al menos una casilla libre.
- **Montaña al norte.** La pared de piedra es el bloque del tileset `acantilado`
  (columnas 1-3): fila 1 hierba de arriba, 2 borde, 3 pared (se repite para
  hacerla más alta), 4 pie con matas y 5 la sombra sobre la hierba (va en
  `detalle`). La columna 3 es el final de la pared por la derecha.
- **Cascada.** Tileset `cascada`: columna 3 orilla izquierda, 4 agua (se repite),
  5 orilla derecha. Sus filas van una por detrás de las de la montaña (0 hierba,
  1 borde, 2 pared, 3 pie, 4 espuma), y va en `detalle` sobre el río.
- **Decoración a la puerta de las casas.** Barriles con flores (fila 2 de
  `barriles`), macetas (`flores`, columnas 5-9), jardineras (`maceteros`, fila 3), y
  por la hierba troncos, tocones, rocas y pilas de leña (`decorado`).

## Edificios, árboles y decoración

Cada hoja del pack es un tileset. Para poner un edificio, selecciona su bloque entero
arrastrando sobre el tileset y estámpalo. Lo habitual es poner la mitad de abajo en
`objetos` y el tejado en `encima`, pero si nadie pasa por detrás puede ir entero en
`objetos`.

Los tilesets con animación se ven animados en el propio Tiled: agua, peces, fuente,
antorchas, hoguera, aspas del molino, barca, banderines, nenúfares, juncos, hierba
alta y setas. Estampa siempre el **primer dibujo** (la columna de la izquierda de la
tira); el resto lo pone la animación.

## Objetos

Las capas de objetos no se ven en el juego: dicen dónde está cada cosa.

- **`vecinos`** — un objeto de clase `vecino` por NPC. El **nombre** es su id en
  `src/content/es.json` (`bienvenida`, `sobre-mi`, `proyectos`, `backend`, `datos`,
  `ia`, `certificaciones`, `contacto`). Propiedades: `sprite` y `mirada`. Un punto =
  se queda quieto ahí; una polilínea (tecla L) = pasea entre sus puntos, y el primero
  es su casa. El punto marca **dónde pisa**, no el centro del dibujo.
- **`carteles`** — clase `cartel`, nombre = id en `signs` (`redes`, `aprendiendo`).
  Ponlo al pie del cartel dibujado: el marcador dorado sale encima.
- **`animales`** — rectángulos de clase `animales` con `especie`, `tipo`
  (`walker` anda, `swimmer` nada, `flyer` vuela) y `cantidad`. Los animales no salen
  del rectángulo: dibújalo por dentro de la valla o de la orilla.
- **`efectos`** — puntos de clase `humo` (justo en la boca de una chimenea: ahí nace la bocanada animada y la columna de humo) y `luz` (halo
  que se enciende al anochecer: farolas, ventanas, antorchas).

## Añadir una hoja del pack como tileset

1. Añade una línea a `TILESETS` en `tools/mapa/catalogo.mjs` (con `anim` si es una
   tira animada, con `wang` si es un bloque de autotile 3×3 + 2×2).
2. `npm run tilesets` (solo reescribe los `.tsx`, nunca toca `aldea.tmx`).
3. En Tiled: *Mapa → Añadir tileset externo* y elige el nuevo `.tsx`.

No borres ni renombres un tileset que el mapa ya usa: los tiles pintados con él se
quedarían sin imagen.

## Tamaño del mapa

52×36 tiles (832×576 px). Si lo cambias (*Mapa → Redimensionar*), cambia también
`MAP_W`/`MAP_H` en `src/config.ts` y el `aspect-ratio` de `#stage-frame` en
`index.html` y `src/ui/styles.css`: la cámara es fija y encaja el mapa entero.
