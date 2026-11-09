// Mode borne tactile (application Electron, NUXT_PUBLIC_KIOSK=true) :
// pas de partage, clavier à l'écran, remise à zéro entre deux visiteurs.
// `bridge` : fonctions de l'application (preload Electron), absentes dans un navigateur.
import { STORAGE_KEY, BADGES } from '~/composables/useQuiz'

export function useKiosk () {
  const { public: pub } = useRuntimeConfig()
  const kiosk = pub.kiosk === true || pub.kiosk === 'true' || pub.kiosk === 1
  const idleSeconds = Math.max(20, Number(pub.idleSeconds) || 90)
  const bridge = import.meta.client ? window.kiosk || null : null
  // hors ligne, « Ambassadeur » (partager un résultat) ne peut pas s'obtenir
  const badges = kiosk ? BADGES.filter(b => b.id !== 'partage') : BADGES

  // Visiteur suivant : on efface la progression du joueur (le son garde son réglage)
  // et on recharge l'accueil, ce qui remet aussi à zéro l'état des pages.
  function resetPlayer () {
    try { localStorage.removeItem(STORAGE_KEY) } catch { /* stockage indisponible */ }
    window.location.replace('/')
  }

  return { kiosk, idleSeconds, bridge, badges, resetPlayer }
}
