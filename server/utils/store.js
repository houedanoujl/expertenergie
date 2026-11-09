// Stockage du quiz : Supabase (web, par défaut) ou local (borne hors ligne, NUXT_STORAGE=local).
// Les deux exposent le même contrat : listQuizzes, getQuiz, start, answer, finish, result, leaderboard.
import * as supabase from '../backends/supabase.js'
import * as local from '../backends/local.js'

export const isLocalStore = () => useRuntimeConfig().storage === 'local'
export const useQuizStore = () => (isLocalStore() ? local : supabase)

// Jeton d'administration : comparé en temps constant, refusé s'il n'est pas configuré.
export function isAdmin (event) {
  const want = String(useRuntimeConfig().adminToken || '')
  const got = String(getHeader(event, 'x-admin-token') || '')
  if (want.length < 16 || got.length !== want.length) return false
  let diff = 0
  for (let i = 0; i < want.length; i++) diff |= want.charCodeAt(i) ^ got.charCodeAt(i)
  return diff === 0
}
