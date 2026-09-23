/**
 * Genera el BORRADOR inicial de mapa/aldea.tmx.
 *
 * Solo sirve para arrancar: a partir de aqui el mapa se edita en Tiled y
 * aldea.tmx es la fuente de verdad. Por eso se niega a sobrescribirlo si ya
 * existe, salvo con --force (y entonces se pierde lo editado a mano).
 *
 *   node tools/generar-mapa.mjs --force
 */
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ESQUINAS, TILESETS } from './mapa/catalogo.mjs';
import { emptyCells } from './mapa/png.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '..');
const out = join(project, 'mapa', 'aldea.tmx');

if (existsSync(out) && !process.argv.includes('--force')) {
  console.error('mapa/aldea.tmx ya existe. Editalo en Tiled, o usa --force para regenerarlo (pierdes los cambios).');
  process.exit(1);
}

export const W = 52;
export const H = 36;
const T = 16;

// ---------------------------------------------------------------------------
// Tilesets
// ---------------------------------------------------------------------------

const sets = {};
let nextGid = 1;
for (const ts of TILESETS) {
  const info = emptyCells(join(project, 'mapa', 'img', `${ts.name}.png`));
  sets[ts.name] = { ...ts, ...info, firstgid: nextGid };
  nextGid += info.cols * info.rows;
}

function gid(set, c, r) {
  const s = sets[set];
  if (!s) throw new Error(`tileset desconocido: ${set}`);
  if (c >= s.cols || r >= s.rows) throw new Error(`${set}: celda ${c},${r} fuera de la hoja`);
  return s.firstgid + r * s.cols + c;
}

// ---------------------------------------------------------------------------
// Capas
// ---------------------------------------------------------------------------

const grid = () => Array.from({ length: H }, () => new Array(W).fill(0));
const suelo = grid();
const terreno = grid();
const bordes = grid();
const detalle = grid();
const objetos = [grid(), grid(), grid()];
const encima = [grid(), grid(), grid(), grid(), grid()];

/** Casillas donde no debe caer decoracion suelta (caminos, agua, edificios). */
const ocupado = Array.from({ length: H }, () => new Array(W).fill(false));
const dentro = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
function ocupar(x, y, w, h) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (dentro(i, j)) ocupado[j][i] = true;
}

// Hierba de base en todo el mapa.
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) suelo[y][x] = gid('hierba', 0, 0);

// ---------------------------------------------------------------------------
// Terreno con autotile (esquinas)
// ---------------------------------------------------------------------------

/** Rejilla de vertices (W+1 x H+1): 1 donde hay material. */
const vgrid = () => Array.from({ length: H + 1 }, () => new Array(W + 1).fill(0));
const agua = vgrid();
const tierra = vgrid();

/** Marca como material un rectangulo de casillas completas. */
function area(v, x, y, w, h) {
  for (let j = y; j <= y + h; j++) for (let i = x; i <= x + w; i++) if (j >= 0 && i >= 0 && j <= H && i <= W) v[j][i] = 1;
}

const INVERSO = Object.fromEntries(Object.entries(ESQUINAS).map(([k, v]) => [v.join(''), k]));

function pintarAutotile(v, set, ox, oy, frame0 = true) {
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const e = [v[y][x], v[y][x + 1], v[y + 1][x + 1], v[y + 1][x]];
      if (!e.some(Boolean)) continue;
      // Las dos diagonales no tienen pieza en el pack: se rellenan.
      const clave = INVERSO[e.join('')] ?? '1,1';
      const [dc, dr] = clave.split(',').map(Number);
      terreno[y][x] = gid(set, ox + dc, oy + dr);
      ocupado[y][x] = true;
    }
  }
  void frame0;
}

// ---------------------------------------------------------------------------
// Relieve: la montana del norte
// ---------------------------------------------------------------------------

/**
 * Pared de piedra que cierra el norte, como en la referencia del pack: la
 * posada, el molino y la mina quedan delante de ella. Se hace con el bloque
 * del acantilado (Stone_Cliff_1_Tile, columnas 1-3): filas 1 hierba de
 * arriba, 2 borde, 3 pared (se repite) y 4 pie de la pared con matas.
 */
const FILAS_MONTANA = [1, 1, 2, 3, 3, 4];
const MONTANA_FIN = 35; // ultima columna de la pared; a la derecha, llano
function montana() {
  FILAS_MONTANA.forEach((fr, y) => {
    for (let x = 0; x <= MONTANA_FIN; x++) {
      terreno[y][x] = gid('acantilado', x === MONTANA_FIN ? 3 : 2, fr);
      ocupado[y][x] = true;
    }
  });
  // Sombra que la pared deja en la hierba (fila 5 del bloque).
  for (let x = 0; x <= MONTANA_FIN; x++) detalle[FILAS_MONTANA.length][x] = gid('acantilado', x === MONTANA_FIN ? 3 : 2, 5);
}

/**
 * Cascada: cada dibujo tiene 3 columnas. La 0 es la orilla izquierda, la 1
 * agua (se repite para ensancharla) y la 2 la orilla derecha. Sus filas van
 * una por detras de las del acantilado: 0 hierba, 1 borde, 2 pared, 3 pie y
 * 4 la espuma sobre el rio.
 */
const FILAS_CASCADA = [0, 0, 1, 2, 2, 3, 4];
function cascada(x, anchoAgua) {
  const cols = [0, ...Array(anchoAgua).fill(1), 2];
  // Arriba (fila 0 de la hoja) el pack apenas cambia de un dibujo a otro y el
  // agua parecia quieta: ahi va el agua animada del rio, con sus orillas.
  const rio = [0, ...Array(anchoAgua).fill(1), 2];
  FILAS_CASCADA.forEach((fr, y) => {
    cols.forEach((c, i) => {
      detalle[y][x + i] = fr === 0 ? gid('agua', rio[i], 1) : gid('cascada', c, fr);
      ocupado[y][x + i] = true;
    });
  });
}

// ---------------------------------------------------------------------------
// Agua y caminos
// ---------------------------------------------------------------------------

// Rio que baja de la cascada hasta el estanque del suroeste.
area(agua, 14, 5, 2, 24);
area(agua, 10, 29, 9, 7);
area(agua, 11, 28, 7, 1);

/**
 * Caminos de tierra. REGLA: nunca tocan el ladrillo. Terminan antes y queda
 * cesped en medio, como en la referencia. El pincel pinta la orilla de hierba
 * alrededor, asi que el camino real ocupa una casilla mas por cada lado.
 */
area(tierra, 1, 6, 11, 2); // explanada de la mina y el molino
area(tierra, 9, 8, 2, 11); // bajada del molino al camino del granero
area(tierra, 1, 19, 11, 2); // camino del granero, hasta el puente
area(tierra, 39, 8, 1, 3); // de la puerta de la casa del noreste hacia abajo
area(tierra, 39, 10, 4, 1); // y hasta el cartel del huerto
area(tierra, 32, 34, 18, 1); // calle del sur: herreria e invernadero
area(tierra, 44, 32, 3, 2);

pintarAutotile(tierra, 'hierba-bordes', 0, 5);
pintarAutotile(agua, 'agua', 0, 0);

montana();
cascada(13, 2);

/**
 * Ladrillo: plaza, mercado y avenida, con el reborde de cesped de la
 * referencia. Va en dos capas:
 *   - `terreno`: el ladrillo (patron de 2x2 que repite) en toda casilla que
 *     toque el area, tambien en la orilla;
 *   - `bordes`: encima, la orla de hierba del bloque 3x3 + 2x2 de la esquina
 *     de Grass_Tiles_1, que es hierba con el centro transparente. Tapa medio
 *     tile de ladrillo y deja el borde irregular, sin corte recto.
 */
const ladrilloV = vgrid();
const ladrillo = (x, y, w, h) => area(ladrilloV, x, y, w, h);
ladrillo(20, 13, 14, 10); // plaza mayor
ladrillo(25, 12, 4, 1); // entrada de la posada
ladrillo(18, 23, 19, 3); // mercado: acaba una fila antes para no tocar el estanque
ladrillo(25, 27, 4, 9); // avenida hasta la entrada del sur
ladrillo(34, 20, 8, 2); // plaza -> capilla

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const e = [ladrilloV[y][x], ladrilloV[y][x + 1], ladrilloV[y + 1][x + 1], ladrilloV[y + 1][x]];
    if (!e.some(Boolean)) continue;
    // El ladrillo nunca pisa el agua: se comeria la orilla de tierra del estanque.
    if (agua[y][x] || agua[y][x + 1] || agua[y + 1][x + 1] || agua[y + 1][x]) continue;
    terreno[y][x] = gid('ladrillo', x % 2, y % 2);
    ocupado[y][x] = true;
    if (e.every(Boolean)) continue;
    const [dc, dr] = (INVERSO[e.join('')] ?? '1,1').split(',').map(Number);
    bordes[y][x] = gid('hierba-bordes', dc, dr);
  }
}

// Huerto: parcelas de tierra arada con borde (bloque 3x3 de FarmLand).
function parcela(x, y, w, h) {
  for (let j = 0; j < h; j++) {
    for (let i = 0; i < w; i++) {
      const c = i === 0 ? 1 : i === w - 1 ? 3 : 2;
      const r = j === 0 ? 0 : j === h - 1 ? 2 : 1;
      terreno[y + j][x + i] = gid('huerto', c, r);
      ocupado[y + j][x + i] = true;
    }
  }
}

// ---------------------------------------------------------------------------
// Sellos: bloques de tiles (edificios, arboles, vallas...)
// ---------------------------------------------------------------------------

const sellos = [];

/**
 * Estampa un bloque de w x h celdas de una hoja en (dx, dy).
 * `base`: cuantas filas de abajo van por debajo de los personajes; el resto
 * va en las capas "encima" (tejados, copas). Por defecto, todo debajo.
 */
function sello(set, sc, sr, w, h, dx, dy, { base = h, capa = null, marcar = true } = {}) {
  sellos.push({ set, sc, sr, w, h, dx, dy, base, capa });
  if (marcar) ocupar(dx, dy, w, h);
}

function colocarSellos() {
  // De norte a sur: lo que queda mas abajo en pantalla se pinta encima.
  sellos.sort((a, b) => a.dy + a.h - (b.dy + b.h));
  for (const s of sellos) {
    const vacias = sets[s.set].empty;
    const celdas = [];
    for (let j = 0; j < s.h; j++) {
      for (let i = 0; i < s.w; i++) {
        const x = s.dx + i;
        const y = s.dy + j;
        if (!dentro(x, y) || vacias[s.sr + j]?.[s.sc + i] !== false) continue;
        const grupo = s.capa === 'detalle' ? null : j >= s.h - s.base ? objetos : encima;
        celdas.push({ x, y, g: gid(s.set, s.sc + i, s.sr + j), grupo });
      }
    }
    if (s.capa === 'detalle') {
      for (const c of celdas) detalle[c.y][c.x] = c.g;
      continue;
    }
    // Cada grupo va a la primera capa que deje todo lo ya pintado por debajo.
    for (const grupo of [objetos, encima]) {
      const mias = celdas.filter((c) => c.grupo === grupo);
      if (!mias.length) continue;
      let nivel = 0;
      for (const c of mias) for (let n = 0; n < grupo.length; n++) if (grupo[n][c.y][c.x]) nivel = Math.max(nivel, n + 1);
      if (nivel >= grupo.length) nivel = grupo.length - 1;
      for (const c of mias) grupo[nivel][c.y][c.x] = c.g;
    }
  }
  sellos.length = 0;
}

/**
 * Chimeneas: [x, y] en pixeles dentro del dibujo de cada edificio (la boca de
 * la chimenea). Al estampar el edificio se anade su punto de humo, asi que si
 * se mueve el edificio, el humo va con el.
 */
const CHIMENEAS = {
  posada: [
    [17, 34],
    [106, 27],
  ],
  'casa-1': [[64, 26]],
  'casa-4': [[86, 19]],
  'casa-3': [[112, 30]],
  herreria: [[64, 24]],
};
const HUMO = [];
/** Halos que se encienden de noche: farolas, antorchas, la boca de la mina. */
const LUCES = [[4.5, 6.2]];
function edificio(set, w, h, x, y, opciones) {
  sello(set, 0, 0, w, h, x, y, opciones);
  for (const [cx, cy] of CHIMENEAS[set] ?? []) HUMO.push([x + cx / T, y + cy / T]);
}

// --- norte: mina, molino, posada ----------------------------------------------
sello('cueva', 0, 0, 3, 3, 3, 4);
// Vagonetas: cada una ocupa 1x2 casillas (Minecrats: col 0 de frente, col 1 de lado).
sello('vagonetas', 1, 6, 1, 2, 7, 6);
sello('vagonetas', 0, 2, 1, 2, 1, 6);
// Vetas de mineral en roca (columnas 1-4 de Ores; las 5-7 son iconos sueltos).
sello('minerales', 2, 2, 1, 1, 0, 7);
sello('minerales', 3, 4, 1, 1, 6, 9);
sello('minerales', 1, 0, 1, 1, 3, 9);
sello('decorado', 0, 12, 1, 2, 0, 8); // pila de lena
sello('decorado', 1, 12, 1, 2, 1, 9);
sello('decorado', 6, 11, 2, 2, 5, 9); // roca grande

edificio('molino', 4, 7, 8, 0);
sello('molino-aspas', 0, 0, 4, 5, 8, -1, { base: 0 });

edificio('posada', 15, 12, 20, 1);
// Rocas y matas al pie de la montana, rompiendo la linea recta.
for (const [c, r, x] of [
  [3, 6, 18],
  [4, 9, 19],
  [5, 5, 34],
  [7, 6, 17],
  [0, 5, 35],
]) sello('decorado', c, r, 1, 1, x, 6);

// --- noreste: casa y huerto -----------------------------------------------------
edificio('casa-1', 6, 8, 37, 1);
parcela(44, 2, 7, 3);
parcela(44, 6, 7, 3);

// --- oeste: granero, puente, corral, pescador -------------------------------------
edificio('granero', 8, 9, 0, 9);
sello('barriles', 1, 0, 1, 2, 8, 16); // barril de agua junto al granero
sello('decorado', 1, 12, 1, 2, 7, 16); // pila de lena
sello('barriles', 1, 0, 1, 2, 0, 16);

// Puente de madera: extremo izquierdo, tablones que se repiten, extremo derecho.
sello('puente', 0, 1, 1, 3, 12, 19, { capa: 'detalle' });
for (let x = 13; x <= 16; x++) sello('puente', 1, 1, 1, 3, x, 19, { capa: 'detalle' });
sello('puente', 2, 1, 1, 3, 17, 19, { capa: 'detalle' });

edificio('casa-3', 9, 8, -1, 27);
sello('barriles', 1, 2, 1, 2, 2, 33); // barriles con flores a la puerta
sello('barriles', 3, 2, 1, 2, 6, 33);
sello('decorado', 1, 6, 1, 1, 7, 26);

// --- centro ------------------------------------------------------------------------
sello('fuente', 0, 0, 2, 3, 26, 16);
edificio('capilla', 7, 9, 38, 12);
edificio('casa-4', 7, 6, 45, 14);

// --- sur -------------------------------------------------------------------------
edificio('herreria', 10, 8, 31, 26);
edificio('invernadero', 6, 8, 43, 24);
sello('barca', 0, 0, 3, 3, 14, 31, { capa: 'detalle' });

// Puestos del mercado (cuatro toldos distintos).
[18, 21].forEach((x, i) => sello('puestos', i * 3, 0, 3, 3, x, 23, { base: 1 }));
[30, 33].forEach((x, i) => sello('puestos', 6 + i * 3, 0, 3, 3, x, 23, { base: 1 }));

// ---------------------------------------------------------------------------
// Objetos de la plaza y el pueblo
// ---------------------------------------------------------------------------

const farola = (x, y) => {
  sello('farolas', 0, 0, 1, 3, x, y, { base: 1 });
  LUCES.push([x + 0.5, y + 0.8]);
};
const antorcha = (x, y, base = 1) => {
  sello('antorcha', 0, 0, 1, 3, x, y, { base });
  LUCES.push([x + 0.5, y + 0.6]);
};
const banco = (x, y, frame = 1) => sello('bancos', frame * 2, 0, 2, 2, x, y);
const maceta = (x, y, c, r) => sello('flores', c, r, 1, 1, x, y);
/** Barril con flores (fila de abajo de barrels.png): c 0-5 = verde, morado, rojo, rosa, coral, azul. */
const barrilFlores = (x, y, c) => sello('barriles', c, 2, 1, 2, x, y);
/** Jardinera de ladrillo con plantas (Planters, fila 3): 3x1. */
const jardinera = (x, y) => sello('maceteros', 0, 3, 3, 1, x, y);

farola(20, 12);
farola(33, 12);
farola(20, 20);
farola(33, 20);
farola(24, 28);
farola(29, 28);
farola(24, 33);
farola(29, 33);
farola(37, 21);
farola(8, 20);
farola(18, 20);
antorcha(2, 4, 3); // boca de la mina
antorcha(6, 4, 3);
antorcha(24, 14);
antorcha(29, 14);
banco(23, 19);
banco(29, 19);
sello('pozo', 0, 0, 2, 3, 31, 14);

// Jarrones y barriles con flores a la puerta de cada casa y por la plaza.
barrilFlores(24, 11, 1);
barrilFlores(29, 11, 3);
maceta(21, 13, 6, 0);
maceta(32, 13, 7, 2);
maceta(21, 22, 8, 4);
maceta(32, 22, 5, 1);
barrilFlores(35, 7, 2);
barrilFlores(42, 8, 5);
sello('maceteros', 3, 3, 2, 1, 36, 9); // jardineras a los lados del camino, sin pisarlo
sello('maceteros', 3, 4, 2, 1, 41, 9);
barrilFlores(0, 25, 4);
barrilFlores(40, 31, 3);
barrilFlores(42, 30, 0);
barrilFlores(38, 19, 1);
barrilFlores(44, 18, 4);
jardinera(21, 21);
jardinera(30, 21);
sello('barriles', 3, 0, 1, 2, 36, 24);
sello('cesta', 0, 0, 2, 1, 24, 26);

// Setos a los lados de la entrada de la posada y de la plaza.
sello('seto', 1, 0, 3, 1, 21, 12);
sello('seto', 1, 0, 3, 1, 30, 12);
sello('seto', 0, 0, 1, 3, 19, 15);
sello('seto', 0, 0, 1, 3, 34, 15);
sello('seto', 0, 0, 1, 3, 23, 29);
sello('seto', 0, 0, 1, 3, 30, 29);

// Banderines a la entrada de la plaza y de la avenida.
sello('banderines', 0, 0, 4, 2, 25, 21, { base: 0 });
sello('decorado', 4, 15, 2, 2, 24, 33, { base: 1 });
sello('decorado', 4, 15, 2, 2, 28, 33, { base: 1 });

// Carteles: los que abren panel llevan su objeto en la capa "carteles".
sello('carteles', 0, 3, 2, 3, 11, 8);
sello('carteles', 0, 6, 2, 3, 42, 9);
sello('carteles', 0, 9, 2, 3, 29, 32);

// Corral: valla (esquinas y tramos de la hoja de vallas).
function corral(x, y, w, h, v = 'vallas') {
  for (let i = 0; i < w; i++) {
    const c = i === 0 ? 1 : i === w - 1 ? 3 : 2;
    sello(v, c, 1, 1, 1, x + i, y);
    // La valla de abajo tapa a los animales que pasan por detras.
    sello(v, c, 3, 1, 1, x + i, y + h - 1, { base: 0 });
  }
  for (let j = 1; j < h - 1; j++) {
    // Laterales con el poste vertical suelto (columna 0): las piezas del
    // bloque 3x3 llevan un travesano hacia dentro.
    sello(v, 0, 1, 1, 1, x, y + j);
    sello(v, 0, 1, 1, 1, x + w - 1, y + j);
  }
}
corral(1, 22, 9, 5);
ocupar(1, 22, 9, 5); // sin flores sueltas dentro del corral
sello('abrevaderos', 1, 0, 2, 2, 6, 23);

corral(43, 1, 9, 9, 'valla-blanca');
sello('espantapajaros', 0, 0, 2, 2, 47, 4, { base: 0 });

// Cultivos en las parcelas.
// Cultivos maduros (columna 5 de Crops) en todas las casillas de las parcelas, una
// especie por fila como en la referencia: trigo, trigo, zanahoria / col, berenjena, calabaza.
[1, 1, 5].forEach((fila, j) => { for (let x = 44; x <= 50; x++) sello('cultivos', 5, fila, 1, 1, x, 2 + j, { capa: 'detalle' }); });
[15, 7, 11].forEach((fila, j) => { for (let x = 44; x <= 50; x++) sello('cultivos', 5, fila, 1, 1, x, 6 + j, { capa: 'detalle' }); });

// Detalle del agua: nenufares, juncos, rocas y peces.
for (const [set, x, y] of [
  ['nenufar-verde', 11, 31],
  ['nenufar-flor', 17, 30],
  ['nenufar-rojo', 12, 34],
  ['nenufar-verde', 15, 12],
  ['nenufar-flor', 14, 24],
  ['juncos', 10, 29],
  ['juncos-2', 18, 29],
  ['juncos', 14, 9],
  ['juncos-2', 15, 15],
  ['juncos', 15, 26],
  ['roca-agua', 17, 34],
  ['roca-agua', 15, 8],
  ['peces', 13, 30],
  ['peces', 14, 17],
]) sello(set, 0, 0, 1, 1, x, y, { capa: 'detalle' });

colocarSellos();

// ---------------------------------------------------------------------------
// Vegetacion: bosque en los bordes y detalle por la hierba
// ---------------------------------------------------------------------------

// mulberry32: ruido reproducible, el mismo mapa cada vez que se genera.
let semilla = 7;
const azar = () => {
  semilla = (semilla + 0x6d2b79f5) | 0;
  let t = Math.imul(semilla ^ (semilla >>> 15), 1 | semilla);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const entre = (a, b) => a + Math.floor(azar() * (b - a + 1));

const ARBOLES = [
  // Solo las variantes con sombra: la tercera de cada hoja no la trae.
  { set: 'roble-grande', w: 4, h: 5, frames: [4] },
  { set: 'abeto-grande', w: 4, h: 5, frames: [4] },
  { set: 'roble-mediano', w: 2, h: 3, frames: [2] },
  { set: 'abeto-mediano', w: 2, h: 3, frames: [2] },
  { set: 'abedul-mediano', w: 2, h: 3, frames: [2] },
  { set: 'abedul-grande', w: 2, h: 5, frames: [2] },
];

function libre(x, y, w, h) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (dentro(i, j) && ocupado[j][i]) return false;
  return true;
}

function bosque(zona, n, tipos, base = 0) {
  const nuevos = [];
  for (let k = 0, intentos = 0; k < n && intentos < n * 40; intentos++) {
    const tipo = tipos[entre(0, tipos.length - 1)];
    const a = ARBOLES.find((t) => t.set === tipo);
    const x = entre(zona.x - 1, zona.x + zona.w - a.w + 1);
    const y = entre(zona.y - 1, zona.y + zona.h - a.h + 1);
    // El pie del arbol (las dos filas de abajo) no puede pisar nada.
    if (!libre(Math.max(0, x), Math.max(0, y + a.h - 2), a.w, 2)) continue;
    const frame = a.frames[entre(0, a.frames.length - 1)];
    nuevos.push({ ...a, frame, x, y });
    ocupar(x, y + a.h - 2, a.w, 2);
    k++;
  }
  if (process.env.DEBUG) console.log('bosque', JSON.stringify(zona), n, '->', nuevos.length);
  sellos.length = 0;
  for (const t of nuevos) sello(t.set, t.frame, 0, t.w, t.h, t.x, t.y, { base, marcar: false });
  colocarSellos();
}

// Bosque cerrando los bordes (puede salirse del mapa: queda recortado).
bosque({ x: 48, y: 20, w: 4, h: 16 }, 12, ['abeto-grande', 'roble-grande', 'abeto-mediano']);
bosque({ x: -2, y: 32, w: 3, h: 5 }, 3, ['roble-grande', 'abeto-grande', 'roble-mediano']);
bosque({ x: 48, y: 9, w: 4, h: 4 }, 2, ['roble-grande', 'abeto-mediano']);

// Arboles encima de la montana, por detras de la posada y del molino.
for (const [set, frame, w, h, x, y] of [
  ['abeto-grande', 4, 4, 5, 16, -3],
  ['roble-grande', 4, 4, 5, -1, -3],
  ['abeto-mediano', 2, 2, 3, 6, -1],
  ['roble-mediano', 2, 2, 3, 33, -1],
  ['abeto-grande', 4, 4, 5, 30, -3],
]) sello(set, frame, 0, w, h, x, y, { marcar: false });
colocarSellos();

// Grupos sueltos dentro del pueblo (el tronco queda por debajo de los vecinos).
bosque({ x: 19, y: 28, w: 5, h: 8 }, 6, ['roble-mediano', 'abedul-mediano', 'abedul-grande'], 2);
bosque({ x: 10, y: 21, w: 3, h: 6 }, 2, ['abedul-grande', 'roble-mediano'], 2);
bosque({ x: 17, y: 7, w: 2, h: 5 }, 2, ['abedul-grande', 'roble-mediano'], 2);
bosque({ x: 42, y: 10, w: 3, h: 10 }, 3, ['roble-mediano', 'abeto-mediano'], 2);
bosque({ x: 36, y: 22, w: 7, h: 4 }, 3, ['roble-mediano', 'abedul-mediano'], 2);
bosque({ x: 29, y: 29, w: 2, h: 5 }, 1, ['abedul-grande'], 2);

// Troncos caidos, tocones y rocas grandes: lo que llena la hierba en la referencia.
for (const [c, r, w, h, x, y] of [
  [2, 7, 2, 1, 21, 9 + 0],
  [4, 7, 2, 1, 44, 21],
  [0, 10, 2, 1, 46, 11],
  [1, 6, 1, 1, 19, 26],
  [2, 9, 1, 1, 40, 23],
  [4, 11, 2, 2, 11, 1],
  [4, 13, 2, 2, 47, 12],
  [6, 15, 1, 2, 12, 26],
  [6, 15, 1, 2, 42, 28],
]) if (libre(x, y, w, h)) sello('decorado', c, r, w, h, x, y);
colocarSellos();

// Detalle suelto por la hierba: flores, matas, setas, piedras.
function esparcir(n, capa, piezas, zona = { x: 0, y: 0, w: W, h: H }) {
  for (let k = 0, intentos = 0; k < n && intentos < n * 30; intentos++) {
    const x = entre(zona.x, zona.x + zona.w - 1);
    const y = entre(zona.y, zona.y + zona.h - 1);
    if (!libre(x, y, 1, 1) || detalle[y][x]) continue;
    const [set, c, r] = piezas[entre(0, piezas.length - 1)];
    if (capa === 'detalle') detalle[y][x] = gid(set, c, r);
    else {
      for (const g of objetos) {
        if (!g[y][x]) {
          g[y][x] = gid(set, c, r);
          break;
        }
      }
    }
    ocupado[y][x] = true;
    k++;
  }
}

const FLORES = [];
for (let c = 0; c < 5; c++) for (const r of [0, 1, 2, 3, 4, 5]) FLORES.push(['flores', c, r]);
esparcir(90, 'detalle', FLORES);
esparcir(70, 'detalle', [
  ['hierba-alta', 0, 0],
  ['hierba-alta-2', 0, 0],
  ['hierba-flor', 0, 0],
  ['hierba-flor-2', 0, 0],
  ['hierba-flor-3', 0, 0],
]);
esparcir(10, 'detalle', [['setas', 0, 0]]);
// Matas de hierba oscura del propio tileset de hierba: rompen el verde liso.
esparcir(120, 'detalle', [
  ['hierba-bordes', 5, 9],
  ['hierba-bordes', 6, 9],
  ['hierba-bordes', 7, 9],
]);
esparcir(40, 'detalle', [
  ['decorado', 6, 3],
  ['decorado', 7, 3],
  ['decorado', 8, 3],
  ['decorado', 6, 2],
]);
esparcir(26, 'objetos', [
  ['decorado', 5, 5],
  ['decorado', 3, 9],
  ['decorado', 5, 9],
  ['decorado', 6, 9],
  ['decorado', 7, 9],
]);
esparcir(14, 'detalle', [
  ['decorado', 0, 5],
  ['decorado', 1, 5],
  ['decorado', 3, 6],
  ['decorado', 4, 6],
  ['decorado', 1, 6],
]);

// ---------------------------------------------------------------------------
// Objetos: vecinos, carteles, animales y efectos
// ---------------------------------------------------------------------------

let nextObjectId = 1;
const px = (t) => Math.round(t * T);
const prop = (name, value, type = 'string', propertytype) =>
  `<property name="${name}"${type !== 'string' ? ` type="${type}"` : ''}${propertytype ? ` propertytype="${propertytype}"` : ''} value="${value}"/>`;

/** Vecino: el primer punto es su casa (los pies); si hay mas, pasea entre ellos. */
function vecino(id, sprite, puntos, mirada = 'down') {
  const [x0, y0] = puntos[0];
  const props = `<properties>${prop('sprite', sprite, 'string', 'sprite-vecino')}${prop('mirada', mirada, 'string', 'mirada')}</properties>`;
  const forma =
    puntos.length > 1
      ? `<polyline points="${puntos.map(([x, y]) => `${px(x - x0)},${px(y - y0)}`).join(' ')}"/>`
      : '<point/>';
  return ` <object id="${nextObjectId++}" name="${id}" type="vecino" x="${px(x0)}" y="${px(y0)}">${props}${forma}</object>`;
}

function cartel(id, x, y) {
  return ` <object id="${nextObjectId++}" name="${id}" type="cartel" x="${px(x)}" y="${px(y)}"><point/></object>`;
}

function animales(especie, tipo, cantidad, x, y, w, h) {
  const props = `<properties>${prop('especie', especie, 'string', 'especie')}${prop('tipo', tipo, 'string', 'tipo-animal')}${prop('cantidad', cantidad, 'int')}</properties>`;
  return ` <object id="${nextObjectId++}" name="${especie}" type="animales" x="${px(x)}" y="${px(y)}" width="${px(w)}" height="${px(h)}">${props}</object>`;
}

function efecto(tipo, x, y) {
  return ` <object id="${nextObjectId++}" type="${tipo}" x="${px(x)}" y="${px(y)}"><point/></object>`;
}

const VECINOS = [
  vecino('bienvenida', 'npc_chloe', [[26.5, 33.5], [26.5, 29.5]]),
  vecino('sobre-mi', 'npc_katy', [[27, 13.4], [23, 13.4], [30, 13.4]]),
  vecino('proyectos', 'npc_bob', [[26, 26.6], [22, 26.6], [31, 26.6]]),
  vecino('backend', 'npc_jack', [[36, 35], [32, 35]]),
  vecino('datos', 'npc_mike', [[4.5, 7.8], [8, 7.8]]),
  vecino('ia', 'npc_buba', [[45.5, 33.2], [48, 33.2]]),
  vecino('certificaciones', 'npc_bruno', [[41, 21.6], [38, 21.6]]),
  vecino('contacto', 'npc_fin', [[9, 32]], 'right'),
];

const CARTELES = [cartel('redes', 12, 11), cartel('aprendiendo', 43, 12)];

const ANIMALES = [
  animales('cow', 'walker', 1, 2.6, 23.4, 5.2, 1.6),
  animales('sheep', 'walker', 2, 2.6, 23.4, 5.2, 1.6),
  animales('pig', 'walker', 1, 2.6, 24, 5, 1),
  animales('chicken', 'walker', 2, 2.6, 23.4, 5.2, 1.6),
  animales('rooster', 'walker', 1, 3, 23.6, 4, 1.2),
  animales('chicken', 'walker', 2, 8.2, 11, 1.2, 4),
  animales('duck', 'swimmer', 2, 10.5, 29.5, 3, 4),
  animales('duck', 'swimmer', 1, 14.2, 20.5, 1.4, 5),
  animales('swan', 'swimmer', 1, 15.5, 28.5, 2, 2),
  animales('butterfly', 'flyer', 2, 21, 14, 11, 7),
  animales('butterfly', 'flyer', 2, 36, 26, 6, 6),
  animales('bee', 'flyer', 4, 44, 2, 7, 7),
];

const EFECTOS = [...HUMO.map(([x, y]) => efecto('humo', x, y)), ...LUCES.map(([x, y]) => efecto('luz', x, y))];

// ---------------------------------------------------------------------------
// TMX
// ---------------------------------------------------------------------------

let nextLayerId = 1;
const csv = (g) => g.map((row) => row.join(',')).join(',\n');
function capa(name, g, encimaDe = false) {
  const props = encimaDe ? `<properties>${prop('encima', 'true', 'bool')}</properties>` : '';
  return ` <layer id="${nextLayerId++}" name="${name}" width="${W}" height="${H}">${props}\n  <data encoding="csv">\n${csv(g)}\n</data>\n </layer>`;
}
function grupoObjetos(name, objs, color) {
  return ` <objectgroup id="${nextLayerId++}" name="${name}" color="${color}">\n${objs.join('\n')}\n </objectgroup>`;
}

const tilesets = TILESETS.map((ts) => ` <tileset firstgid="${sets[ts.name].firstgid}" source="tilesets/${ts.name}.tsx"/>`);
const capas = [
  capa('suelo', suelo),
  capa('terreno', terreno),
  capa('bordes', bordes),
  capa('detalle', detalle),
  capa('objetos', objetos[0]),
  capa('objetos-2', objetos[1]),
  capa('objetos-3', objetos[2]),
  capa('encima', encima[0], true),
  capa('encima-2', encima[1], true),
  capa('encima-3', encima[2], true),
  capa('encima-4', encima[3], true),
  capa('encima-5', encima[4], true),
  grupoObjetos('vecinos', VECINOS, '#e9b44c'),
  grupoObjetos('carteles', CARTELES, '#ff7a00'),
  grupoObjetos('animales', ANIMALES, '#55aaff'),
  grupoObjetos('efectos', EFECTOS, '#cccccc'),
];

const tmx = `<?xml version="1.0" encoding="UTF-8"?>
<map version="1.10" tiledversion="1.12.2" orientation="orthogonal" renderorder="right-down" width="${W}" height="${H}" tilewidth="${T}" tileheight="${T}" infinite="0" nextlayerid="${nextLayerId}" nextobjectid="${nextObjectId}">
${tilesets.join('\n')}
${capas.join('\n')}
</map>
`;

writeFileSync(out, tmx);
console.log(`Borrador escrito en mapa/aldea.tmx (${W}x${H}).`);
