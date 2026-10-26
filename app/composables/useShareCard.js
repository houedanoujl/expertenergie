// Carte de résultat PNG (1200 px de large, hauteur selon le titre) : quiz, score, niveau, réponses justes et fausses,
// et les cinq sections du cycle combiné, allumées selon la progression.
import { SECTIONS, ORDER, LEVELS } from '~/data/sections'
import { formatTime } from '~/composables/useQuiz'

function loadImage (src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

// Coupe un texte en lignes de largeur maximale w
function wrap (g, text, w) {
  const lines = []
  let line = ''
  for (const word of text.split(' ')) {
    const t = line ? `${line} ${word}` : word
    if (g.measureText(t).width > w && line) { lines.push(line); line = word } else line = t
  }
  if (line) lines.push(line)
  return lines
}

export function useShareCard () {
  // r : { name, label, title, score, total, level, duration, rank, players, pattern, quiz }, done : quiz terminés
  async function render (r, done = []) {
    try { await Promise.all([document.fonts.load('800 60px "Baloo 2"'), document.fonts.load('700 30px "Nunito"')]) } catch { /* police de repli */ }
    const W = 1200
    const c = document.createElement('canvas')
    c.width = W
    let g = c.getContext('2d')
    g.font = '800 54px "Baloo 2", sans-serif'
    const title = wrap(g, `${r.label} : ${r.title}`, W - 240).slice(0, 2)
    const top = 225 + title.length * 60 + 40
    const panelBottom = top + 420
    const H = panelBottom + 330
    c.height = H // redimensionner efface le contexte : on le reprend
    g = c.getContext('2d')

    g.fillStyle = '#e6f3f9'
    g.fillRect(0, 0, W, H)

    // panneau principal
    g.fillStyle = '#ffffff'
    g.strokeStyle = '#1f2832'
    g.lineWidth = 6
    g.beginPath(); g.roundRect(60, 60, W - 120, panelBottom - 60, 48); g.fill(); g.stroke()

    g.fillStyle = '#44525f'
    g.font = '700 34px "Nunito", sans-serif'
    g.fillText('Quiz expert énergie · Cycle combiné gaz', 120, 150)

    g.fillStyle = '#1f2832'
    g.font = '800 54px "Baloo 2", sans-serif'
    title.forEach((l, i) => g.fillText(l, 120, 225 + i * 60))

    g.font = '700 36px "Nunito", sans-serif'
    g.fillStyle = '#44525f'
    g.fillText(`${r.name || 'Participant·e'} a obtenu`, 120, top)

    g.fillStyle = '#1f2832'
    g.font = '800 200px "Baloo 2", sans-serif'
    const score = `${r.score}/${r.total}`
    g.fillText(score, 110, top + 190)
    const sw = g.measureText(score).width

    // niveau en pastille
    const lv = LEVELS[r.level]
    if (lv) {
      g.font = '800 44px "Baloo 2", sans-serif'
      const tw = g.measureText(lv.name).width
      const x = Math.min(150 + sw, W - 160 - tw - 60), y = top + 90
      g.fillStyle = lv.bg; g.strokeStyle = lv.ink; g.lineWidth = 5
      g.beginPath(); g.roundRect(x, y, tw + 60, 76, 38); g.fill(); g.stroke()
      g.fillStyle = lv.ink
      g.fillText(lv.name, x + 30, y + 54)
    }

    // pastilles juste / faux
    const dots = r.pattern || []
    const d = Math.min(52, (W - 240) / Math.max(dots.length, 1) - 10)
    dots.forEach((ok, i) => {
      g.fillStyle = ok ? '#0b7a28' : '#b3392f'
      g.beginPath(); g.arc(120 + d / 2 + i * (d + 10), top + 280, d / 2, 0, Math.PI * 2); g.fill()
    })

    g.fillStyle = '#44525f'
    g.font = '700 32px "Nunito", sans-serif'
    const meta = [`${dots.filter(Boolean).length} bonne${dots.filter(Boolean).length > 1 ? 's' : ''} réponse${dots.filter(Boolean).length > 1 ? 's' : ''}`, formatTime(r.duration)]
    if (r.rank) meta.push(`${r.rank === 1 ? '1er' : `${r.rank}e`} sur ${r.players} au classement`)
    g.fillText(meta.join('   ·   '), 120, top + 360)

    // les cinq sections de la centrale
    const n = ORDER.length
    const bw = (W - 120 - (n - 1) * 16) / n
    ORDER.forEach((id, i) => {
      const x = 60 + i * (bw + 16), y = panelBottom + 40
      const on = done.includes(id)
      g.fillStyle = on ? SECTIONS[id].color : '#dfe7ed'
      g.strokeStyle = '#1f2832'; g.lineWidth = 4
      g.beginPath(); g.roundRect(x, y, bw, 110, 28); g.fill(); g.stroke()
      g.fillStyle = '#1f2832'
      let size = 30
      g.font = `800 ${size}px "Baloo 2", sans-serif`
      while (g.measureText(SECTIONS[id].short).width > bw - 28 && size > 18) g.font = `800 ${--size}px "Baloo 2", sans-serif`
      g.textAlign = 'center'
      g.fillText(SECTIONS[id].short, x + bw / 2, y + 66)
      g.textAlign = 'left'
    })

    try {
      const logo = await loadImage('/brand/ciprel.png')
      g.fillStyle = '#ffffff'
      g.beginPath(); g.roundRect(W - 300, H - 128, 240, 100, 20); g.fill()
      g.drawImage(logo, W - 290, H - 124, 220, 92)
    } catch { /* logo indisponible */ }
    g.fillStyle = '#1f2832'
    g.font = '800 40px "Baloo 2", sans-serif'
    g.fillText('À vous de jouer !', 60, H - 64)

    return await new Promise(res => c.toBlob(res, 'image/png'))
  }

  return { render }
}
