// Accès Supabase côté serveur (la clé ne part jamais au navigateur).
// Lecture : REST sur les colonnes publiques. Écriture : fonctions quiz_* qui valident côté base.
function config () {
  const { supabaseUrl, supabaseKey } = useRuntimeConfig()
  if (!supabaseUrl || !supabaseKey) {
    console.error('[quiz] NUXT_SUPABASE_URL ou NUXT_SUPABASE_KEY manquant')
    throw createError({ statusCode: 503, statusMessage: 'Quiz indisponible : base non configurée.' })
  }
  return {
    base: supabaseUrl.replace(/\/$/, ''),
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
  }
}

// 400 : refus d'une fonction quiz_* (message de validation, à afficher) ; sinon panne
function fail (e, what) {
  if (e?.statusCode === 400 && e?.data?.message) throw createError({ statusCode: 400, statusMessage: e.data.message })
  console.error(`[quiz] ${what} impossible :`, e?.data?.message || e?.message)
  throw createError({ statusCode: 502, statusMessage: 'Service momentanément indisponible.' })
}

export async function sbSelect (table, query, { count = false } = {}) {
  const sb = config()
  try {
    const res = await $fetch.raw(`${sb.base}/rest/v1/${table}`, {
      headers: count ? { ...sb.headers, Prefer: 'count=exact' } : sb.headers,
      query,
    })
    const total = count ? +(res.headers.get('content-range') || '').split('/')[1] || res._data.length : undefined
    return { rows: res._data, total }
  } catch (e) {
    fail(e, `lecture ${table}`)
  }
}

export async function sbRpc (fn, body) {
  const sb = config()
  try {
    return await $fetch(`${sb.base}/rest/v1/rpc/${fn}`, { method: 'POST', headers: sb.headers, body })
  } catch (e) {
    fail(e, fn)
  }
}

export const isUuid = v => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
export const isQuizId = v => typeof v === 'string' && /^[a-z0-9-]{1,20}$/.test(v)
export const isQuestionId = v => typeof v === 'string' && /^[a-z0-9-]{1,30}$/.test(v)

export function cleanName (raw) {
  return String(raw ?? '')
    .normalize('NFC')
    .replace(/[\u0000-\u001f\u007f<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 20)
}
