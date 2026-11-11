// Les trois quiz, indépendants : chacun a sa couleur et son nombre de barres (1 à 3),
// repris partout où un score s'affiche (QuizBadge). Chaque quiz réussi met aussi sous
// tension une partie du cycle combiné (schéma de l'accueil).
export const SECTIONS = {
  debutant: { name: 'Débutant', short: 'Débutant', bars: 1, plant: 'la turbine à gaz', color: '#3f9b5a', tint: '#dff1e4', ink: '#0b6a24' },
  intermediaire: { name: 'Intermédiaire', short: 'Intermédiaire', bars: 2, plant: 'la chaudière et le cycle eau-vapeur', color: '#ed7f06', tint: '#fde6cc', ink: '#994a00' },
  expert: { name: 'Expert', short: 'Expert', bars: 3, plant: 'l’alternateur et le réseau', color: '#c8553d', tint: '#f7ddd7', ink: '#9a3322' },
}
export const ORDER = ['debutant', 'intermediaire', 'expert']

// Appréciation selon la part de bonnes réponses, calculée côté serveur (quiz_level) :
// moins de 8/15 à reprendre, de 8/15 à moins de 12/15 acquis, au-delà maîtrisé.
export const LEVELS = {
  'a-reprendre': { name: 'À reprendre', ink: '#b3392f', bg: '#fbe3e0' },
  acquis: { name: 'Acquis', ink: '#a85200', bg: '#fff3cc' },
  expert: { name: 'Maîtrisé', ink: '#0b7a28', bg: '#e1f3e5' },
}
