export interface MapInfo {
  id: string;
  name: string;
  cup: string;
}

const RAW_MAPS: Omit<MapInfo, "cup">[] = [
  { id: "MBC", name: "Circuit Mario Bros" },
  { id: "CC", name: "Trophéopolis" },
  { id: "WS", name: "Mont Tchou Tchou" },
  { id: "DKS", name: "Spatioport DK" },
  { id: "rDH", name: "Désert du Soleil" },
  { id: "rSGB", name: "Souk Maskass" },
  { id: "rWS", name: "Stade Wario" },
  { id: "rAF", name: "Bateau Volant" },
  { id: "rDKP", name: "Alpes DK" },
  { id: "SP", name: "Pic de l'observatoire" },
  { id: "rSHS", name: "Cité Sorbet" },
  { id: "rWSh", name: "Galion de Wario" },
  { id: "rKTB", name: "Plage Koopa" },
  { id: "FO", name: "Savane Sauvage" },
  { id: "PS", name: "Stade Peach" },
  { id: "rPB", name: "Plage Peach" },
  { id: "SSS", name: "Cité Fleur-de-sel" },
  { id: "rDDJ", name: "Jungle Dino Dino" },
  { id: "GBR", name: "Bloc ? Antique" },
  { id: "CCF", name: "Chutes Cheep Cheep" },
  { id: "DD", name: "Gouffre Pissenlit" },
  { id: "BCi", name: "Cinéma Boo" },
  { id: "DBB", name: "Fournaise Osseuse" },
  { id: "rMMM", name: "Prairie Meuh Meuh" },
  { id: "rCM", name: "Montagne Choco" },
  { id: "rTF", name: "Usine Toad" },
  { id: "BC", name: "Château de Bowser" },
  { id: "AH", name: "Chemin du Chêne" },
  { id: "rMC", name: "Circuit Mario" },
  { id: "RR", name: "Route Arc-en-ciel" },
  { id: "rMC1", name: "SNES Circuit Mario 1" },
  { id: "rMC2", name: "SNES Circuit Mario 2" },
  { id: "rMC3", name: "SNES Circuit Mario 3" },
  { id: "rGV1", name: "SNES Vallée Fantôme 1" },
  { id: "rGV2", name: "SNES Vallée Fantôme 2" },
  { id: "rGV3", name: "SNES Vallée Fantôme 3" },
  { id: "rVL1", name: "SNES Lac Vanille 1" },
  { id: "rKB1", name: "SNES Plage Koopa 1" },
  { id: "rCI1", name: "SNES Ile Choco 1" },
  { id: "rCI2", name: "SNES Ile Choco 2" },
];

/** Coupes des 30 premières maps, groupées par 4 dans l'ordre du tableau. */
export const CUP_ORDER = [
  "Mushroom Cup",
  "Flower Cup",
  "Star Cup",
  "Shell Cup",
  "Banana Cup",
  "Leaf Cup",
  "Lightning Cup",
  "Special Cup",
];

/** Les 10 dernières maps forment une seule catégorie "Retro". */
export const RETRO_CUP = "Retro";

/** Nombre de maps dans chaque coupe de CUP_ORDER, dans l'ordre. */
const CUP_SIZES = [4, 4, 4, 3, 4, 4, 4, 3];

const CUP_BY_INDEX: string[] = CUP_ORDER.flatMap((cup, i) =>
  Array(CUP_SIZES[i]).fill(cup),
);

export const MAPS: MapInfo[] = RAW_MAPS.map((map, index) => ({
  ...map,
  cup: CUP_BY_INDEX[index] ?? RETRO_CUP,
}));

const MAPS_BY_ID = new Map(MAPS.map((m) => [m.id, m]));

export const getMapById = (id: string): MapInfo | undefined =>
  MAPS_BY_ID.get(id);

export const getMapName = (id: string): string => getMapById(id)?.name ?? id;
