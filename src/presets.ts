export type Category = 'geo' | 'solfeggio' | 'creation' | 'fibonacci' | 'intention';

export const CATEGORIES: Category[] = ['geo', 'solfeggio', 'creation', 'fibonacci', 'intention'];

export interface Preset {
  id: string;
  cat: Category;
  es: string;
  en: string;
  freq: number;
  /** geometry overlay spec, see geometry.ts */
  geo: string;
}

const P = (id: string, cat: Category, es: string, en: string, freq: number, geo: string): Preset => ({ id, cat, es, en, freq, geo });

export const PRESETS: Preset[] = [
  // Sacred geometry
  P('origin', 'geo', 'El Origen · El Uno', 'The Origin · The One', 136.1, 'origin'),
  P('seed', 'geo', 'Semilla de la vida', 'Seed of Life', 417, 'seed'),
  P('flower', 'geo', 'Flor de la vida', 'Flower of Life', 528, 'flower'),
  P('fruit', 'geo', 'Fruto de la vida', 'Fruit of Life', 639, 'fruit'),
  P('metatron', 'geo', 'Cubo de Metatrón', "Metatron's Cube", 852, 'metatron'),
  P('tree', 'geo', 'Árbol de la vida', 'Tree of Life', 963, 'tree'),
  P('vesica', 'geo', 'Vesica piscis', 'Vesica Piscis', 396, 'vesica'),
  P('field', 'geo', 'Campo armónico', 'Harmonic Field', 432, 'harmonic'),
  P('torus', 'geo', 'Toroide', 'Torus', 216, 'torus'),
  // Solfeggio
  P('sol174', 'solfeggio', 'Alivio', 'Relief', 174, 'star:3:1'),
  P('sol285', 'solfeggio', 'Regeneración', 'Regeneration', 285, 'star:4:1'),
  P('sol396', 'solfeggio', 'Liberación · UT', 'Liberation · UT', 396, 'star:5:2'),
  P('sol417', 'solfeggio', 'Cambio · RE', 'Change · RE', 417, 'star:6:2'),
  P('sol528', 'solfeggio', 'Milagro · MI', 'Miracle · MI', 528, 'star:7:3'),
  P('sol639', 'solfeggio', 'Conexión · FA', 'Connection · FA', 639, 'star:8:3'),
  P('sol741', 'solfeggio', 'Despertar · SOL', 'Awakening · SOL', 741, 'star:9:4'),
  P('sol852', 'solfeggio', 'Intuición · LA', 'Intuition · LA', 852, 'star:10:3'),
  P('sol963', 'solfeggio', 'Unidad · SI', 'Oneness · SI', 963, 'star:12:5'),
  // Creation numbers
  P('c108', 'creation', 'Sagrado 108', 'Sacred 108', 108, 'star:9:2'),
  P('c111', 'creation', 'Portal 111', 'Portal 111', 111, 'trinity'),
  P('c250', 'creation', 'Schumann × 32', 'Schumann × 32', 250.56, 'globe'),
  P('c256', 'creation', 'Do científico', 'Scientific C', 256, 'star:8:3'),
  P('c333', 'creation', 'Trinidad 333', 'Trinity 333', 333, 'trinity'),
  P('c432', 'creation', 'Armonía 432', 'Harmony 432', 432, 'star:6:2'),
  P('c444', 'creation', 'Ángel 444', 'Angel 444', 444, 'star:4:1'),
  // Fibonacci
  P('f89', 'fibonacci', 'Fibonacci 89', 'Fibonacci 89', 89, 'spiral'),
  P('f144', 'fibonacci', 'Fibonacci 144', 'Fibonacci 144', 144, 'phyllo'),
  P('fphi', 'fibonacci', 'Proporción áurea φ', 'Golden ratio φ', 161.8, 'star:5:2'),
  P('f233', 'fibonacci', 'Fibonacci 233', 'Fibonacci 233', 233, 'spiral'),
  P('f377', 'fibonacci', 'Fibonacci 377', 'Fibonacci 377', 377, 'phyllo'),
  P('f610', 'fibonacci', 'Fibonacci 610', 'Fibonacci 610', 610, 'spiral'),
  P('f987', 'fibonacci', 'Fibonacci 987', 'Fibonacci 987', 987, 'phyllo'),
  // Intentions
  P('manifest', 'intention', 'Manifestar', 'Manifest', 528, 'flower'),
  P('abundance', 'intention', 'Abundancia', 'Abundance', 888, 'phyllo'),
  P('prosper', 'intention', 'Prosperar', 'Prosper', 417, 'fruit'),
  P('gratitude', 'intention', 'Gratitud', 'Gratitude', 639, 'seed'),
  P('vision', 'intention', 'Visión', 'Vision', 852, 'metatron'),
  P('crown', 'intention', 'Corona abierta', 'Open Crown', 963, 'harmonic'),
  P('heal', 'intention', 'Sanar', 'Heal', 285, 'vesica'),
  P('rest', 'intention', 'Descanso', 'Rest', 174, 'torus'),
];

export const presetById = (id: string): Preset => PRESETS.find((p) => p.id === id) ?? PRESETS[5];

/** Geometry overlays available in the Studio "Shape" selector. */
export const GEOMETRIES: { id: string; es: string; en: string }[] = [
  { id: 'origin', es: 'El Origen', en: 'The Origin' },
  { id: 'seed', es: 'Semilla de la vida', en: 'Seed of Life' },
  { id: 'flower', es: 'Flor de la vida', en: 'Flower of Life' },
  { id: 'fruit', es: 'Fruto de la vida', en: 'Fruit of Life' },
  { id: 'metatron', es: 'Cubo de Metatrón', en: "Metatron's Cube" },
  { id: 'tree', es: 'Árbol de la vida', en: 'Tree of Life' },
  { id: 'vesica', es: 'Vesica piscis', en: 'Vesica Piscis' },
  { id: 'harmonic', es: 'Campo armónico', en: 'Harmonic Field' },
  { id: 'torus', es: 'Toroide', en: 'Torus' },
  { id: 'trinity', es: 'Trinidad', en: 'Trinity' },
  { id: 'globe', es: 'Tierra', en: 'Earth' },
  { id: 'spiral', es: 'Espiral áurea', en: 'Golden spiral' },
  { id: 'phyllo', es: 'Filotaxis', en: 'Phyllotaxis' },
  { id: 'star:5:2', es: 'Pentagrama', en: 'Pentagram' },
  { id: 'star:6:2', es: 'Hexagrama', en: 'Hexagram' },
  { id: 'star:12:5', es: 'Dodecagrama', en: 'Dodecagram' },
];
