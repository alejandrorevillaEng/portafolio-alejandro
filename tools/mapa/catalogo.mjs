// Tilesets del mapa: hoja del pack, nombre y si tiene animacion o autotile.
// Todo se corta en celdas de 16x16.

const T = 'Tiles';
const B = 'Buildings/Buildings';
const O = 'Outdoor decoration';
const OA = 'Outdoor decoration/Outdoor_Decor_Animations';

// anim: tira horizontal de `frames` dibujos de `ancho` px, `ms` por dibujo.
// wang: autotile del pack (bloque 3x3 + 2x2 debajo); x/y es la esquina del 3x3.
export const TILESETS = [
  // --- suelo -----------------------------------------------------------------
  { name: 'hierba', src: `${T}/Grass/Grass_1_Middle.png` },
  {
    name: 'hierba-bordes',
    src: `${T}/Grass/Grass_Tiles_1.png`,
    wang: [
      { name: 'Tierra', color: '#e4a672', x: 0, y: 5 },
      { name: 'Piedra', color: '#7a86a8', x: 3, y: 5 },
    ],
  },
  {
    name: 'agua',
    src: `${T}/Water/Water_Tile_1_Anim.png`,
    anim: { frames: 8, ancho: 48, ms: 160 },
    wang: [{ name: 'Agua', color: '#2d8cf0', x: 0, y: 0 }],
  },
  { name: 'agua-lisa', src: `${T}/Water/Water_Middle_Anim_1.png`, anim: { frames: 8, ancho: 16, ms: 160 } },
  { name: 'peces', src: `${T}/Water/Fish_Animated_Tile.png`, anim: { frames: 16, ancho: 16, ms: 140 } },
  { name: 'ladrillo', src: `${T}/Pavement_Tiles.png` },
  { name: 'adoquin', src: `${T}/Cobble_Road/Cobble_Road_2.png` },
  { name: 'huerto', src: `${T}/FarmLand/FarmLand_Tile.png` },
  { name: 'seto', src: `${T}/Hedge_Tiles.png` },
  { name: 'acantilado', src: `${T}/Cliff/Stone_Cliff_1_Tile.png` },
  { name: 'cueva', src: `${T}/Cliff/Stone_Cliff_1_Cave_Entrance.png` },
  { name: 'puente', src: `${T}/Bridge/Bridge_Wood.png` },
  { name: 'mantas', src: `${T}/Picnic_Blankets.png` },

  // --- edificios -------------------------------------------------------------
  { name: 'posada', src: `${B}/Unique_Buildings/Inn/Inn_Red.png` },
  { name: 'capilla', src: `${B}/Unique_Buildings/Church/Church_Red.png` },
  { name: 'herreria', src: `${B}/Unique_Buildings/Blacksmith_House/Blacksmith_House_Red.png` },
  { name: 'granero', src: `${B}/Unique_Buildings/Barn/Barn_Red_Red.png` },
  { name: 'gallinero', src: `${B}/Unique_Buildings/Coop/Coop_Red_Red.png` },
  { name: 'invernadero', src: `${B}/Unique_Buildings/Greenhouse/GreenHouse_Green.png` },
  { name: 'silo', src: `${B}/Unique_Buildings/Silo/Silo.png` },
  { name: 'molino', src: `${B}/Unique_Buildings/Windmill/Windmill.png` },
  { name: 'molino-aspas', src: `${B}/Unique_Buildings/Windmill/Windmill_Sail_Anim.png`, anim: { frames: 4, ancho: 64, ms: 140 } },
  { name: 'puestos', src: `${B}/Unique_Buildings/Stalls/Market_Stalls.png` },
  { name: 'casa-1', src: `${B}/Houses/Wood/House_1_Wood_Red_Red.png` },
  { name: 'casa-2', src: `${B}/Houses/Wood/House_2_Wood_Red_Red.png` },
  { name: 'casa-3', src: `${B}/Houses/Wood/House_3_Wood_Green_Red.png` },
  { name: 'casa-4', src: `${B}/Houses/Wood/House_4_Wood_Red_Red.png` },
  { name: 'casa-pescador', src: `${B}/Unique_Buildings/Fisherman_House/Fisherman_House_Red_Red.png` },
  { name: 'cobertizo', src: `${B}/Unique_Buildings/Shed/Shed_Red_Red.png` },

  // --- arboles ---------------------------------------------------------------
  { name: 'roble-grande', src: 'Trees/Big_Oak_Tree.png' },
  { name: 'roble-mediano', src: 'Trees/Medium_Oak_Tree.png' },
  { name: 'roble-pequeno', src: 'Trees/Small_Oak_Tree.png' },
  { name: 'abeto-grande', src: 'Trees/Big_Spruce_tree.png' },
  { name: 'abeto-mediano', src: 'Trees/Medium_Spruce_Tree.png' },
  { name: 'abeto-pequeno', src: 'Trees/Small_Spruce_Tree.png' },
  { name: 'abedul-grande', src: 'Trees/Big_Birch_Tree.png' },
  { name: 'abedul-mediano', src: 'Trees/Medium_Birch_Tree.png' },
  { name: 'frutal', src: 'Trees/Big_Fruit_Tree.png' },

  // --- decoracion ------------------------------------------------------------
  { name: 'decorado', src: `${O}/Outdoor_Decor.png` },
  { name: 'flores', src: `${O}/Flowers.png` },
  { name: 'vallas', src: `${O}/Fences.png` },
  { name: 'valla-blanca', src: `${O}/White_Fence.png` },
  { name: 'valla-piedra', src: `${O}/Stone_Fence_Small.png` },
  { name: 'bancos', src: `${O}/Benches.png` },
  { name: 'barriles', src: `${O}/barrels.png` },
  { name: 'heno', src: `${O}/Hay_Bales.png` },
  { name: 'pozo', src: `${O}/Well.png` },
  { name: 'abrevaderos', src: `${O}/Water_Troughs.png` },
  { name: 'espantapajaros', src: `${O}/Scarecrows.png` },
  { name: 'carteles', src: `${O}/Signs.png` },
  { name: 'farolas', src: `${O}/Lanter_Posts.png` },
  { name: 'minerales', src: `${O}/Ores.png` },
  { name: 'vagonetas', src: `${O}/Minecrats.png` },
  { name: 'nidos', src: `${O}/Nests.png` },
  { name: 'cesta', src: `${O}/Picnic_Basket.png` },
  { name: 'cultivos', src: 'Crops/Crops.png' },
  { name: 'decorado-agua', src: `${T}/Water/Water_Decoration.png` },

  // --- decoracion animada ----------------------------------------------------
  { name: 'fuente', src: `${OA}/Other_Animations/Fountain_Anim.png`, anim: { frames: 8, ancho: 32, ms: 110 } },
  { name: 'antorcha', src: `${O}/Big_Torch_Anim.png`, anim: { frames: 8, ancho: 16, ms: 100 } },
  { name: 'hoguera', src: `${OA}/Other_Animations/Campfire_Anim.png`, anim: { frames: 4, ancho: 32, ms: 120 } },
  { name: 'barca', src: `${OA}/Other_Animations/Boat_Anim.png`, anim: { frames: 4, ancho: 48, ms: 260 } },
  { name: 'banderines', src: `${OA}/Other_Animations/Pole_and_Bunting_1_Anim.png`, anim: { frames: 4, ancho: 64, ms: 180 } },
  { name: 'nenufar-verde', src: `${OA}/Water_Decor_Animations/Water_Plants/Lillypad_Green_1_Anim.png`, anim: { frames: 8, ancho: 16, ms: 220 } },
  { name: 'nenufar-flor', src: `${OA}/Water_Decor_Animations/Water_Plants/Lillypad_Purple_2_Anim.png`, anim: { frames: 8, ancho: 16, ms: 220 } },
  { name: 'nenufar-rojo', src: `${OA}/Water_Decor_Animations/Water_Plants/Lillypad_Red_3_Anim.png`, anim: { frames: 8, ancho: 16, ms: 220 } },
  { name: 'juncos', src: `${OA}/Water_Decor_Animations/Water_Plants/Cattail_1_Anim.png`, anim: { frames: 8, ancho: 16, ms: 200 } },
  { name: 'juncos-2', src: `${OA}/Water_Decor_Animations/Water_Plants/Cattail_3_Anim.png`, anim: { frames: 8, ancho: 16, ms: 200 } },
  { name: 'roca-agua', src: `${OA}/Water_Decor_Animations/Water_Rocks/Rock_4_Water_Anim.png`, anim: { frames: 8, ancho: 16, ms: 200 } },
  { name: 'hierba-alta', src: `${OA}/Grass_Animations/Grass_1_Anim.png`, anim: { frames: 8, ancho: 16, ms: 180 } },
  { name: 'hierba-alta-2', src: `${OA}/Grass_Animations/Grass_2_Anim.png`, anim: { frames: 8, ancho: 16, ms: 180 } },
  { name: 'hierba-flor', src: `${OA}/Grass_Animations/Flower_Grass_1_Anim.png`, anim: { frames: 8, ancho: 16, ms: 180 } },
  { name: 'hierba-flor-2', src: `${OA}/Grass_Animations/Flower_Grass_5_Anim.png`, anim: { frames: 8, ancho: 16, ms: 180 } },
  { name: 'hierba-flor-3', src: `${OA}/Grass_Animations/Flower_Grass_9_Anim.png`, anim: { frames: 8, ancho: 16, ms: 180 } },
  // cada Waterfall_N es un color distinto, no un frame
  { name: 'cascada', src: `${T}/Waterfall/Waterfall_1.png`, anim: { frames: 6, ancho: 48, ms: 110 } },
  { name: 'puente-2', src: `${T}/Bridge/Bridge_Wood_1.png` },
  { name: 'maceteros', src: 'Buildings/House_Decor/Planters.png' },
  { name: 'fogata-campamento', src: `${O}/Camp_Decor.png` },
  { name: 'setas', src: `${OA}/Muschroom_Animations/muschroom_1_Anim.png`, anim: { frames: 6, ancho: 16, ms: 200 } },
];

// [arriba-izq, arriba-der, abajo-der, abajo-izq]; 1 = material, 0 = hierba
export const ESQUINAS = {
  '0,0': [0, 0, 1, 0],
  '1,0': [0, 0, 1, 1],
  '2,0': [0, 0, 0, 1],
  '0,1': [0, 1, 1, 0],
  '1,1': [1, 1, 1, 1],
  '2,1': [1, 0, 0, 1],
  '0,2': [0, 1, 0, 0],
  '1,2': [1, 1, 0, 0],
  '2,2': [1, 0, 0, 0],
  '0,3': [1, 1, 0, 1],
  '1,3': [1, 1, 1, 0],
  '0,4': [1, 0, 1, 1],
  '1,4': [0, 1, 1, 1],
};
