// Chaque quiz met sous tension une partie du cycle combiné (schéma de l'accueil).
// La couleur suit le flux de la section : gaz, fumées, électricité, eau-vapeur, réseau.
export const SECTIONS = {
  q1: { name: 'Turbine à gaz', short: 'Turbine à gaz', flow: 'Gaz et air', color: '#ed7f06', tint: '#fde6cc' },
  q2: { name: 'Chaudière de récupération', short: 'Chaudière', flow: 'Fumées chaudes', color: '#c8553d', tint: '#f7ddd7' },
  q3: { name: 'Alternateur et réseau', short: 'Alternateur', flow: 'Électricité', color: '#f5c242', tint: '#fdf0cc' },
  q4: { name: 'Cycle eau-vapeur', short: 'Eau-vapeur', flow: 'Eau et vapeur', color: '#3f80c4', tint: '#dbe8f5' },
  examen: { name: 'Mise sur le réseau', short: 'Réseau', flow: 'Vers Abidjan', color: '#0d9330', tint: '#d6efdc' },
}
export const ORDER = ['q1', 'q2', 'q3', 'q4', 'examen']

// Barème du document (sur 15), appliqué au prorata : calculé côté base (quiz_level).
export const LEVELS = {
  'a-reprendre': { name: 'À reprendre', ink: '#b3392f', bg: '#fbe3e0' },
  acquis: { name: 'Acquis', ink: '#a85200', bg: '#fff3cc' },
  expert: { name: 'Niveau expert', ink: '#0b7a28', bg: '#e1f3e5' },
}

// Niveaux des questions de l'examen
export const EXAM_LEVELS = { 1: 'Fondamental', 2: 'Intermédiaire', 3: 'Avancé', 4: 'Expert' }
