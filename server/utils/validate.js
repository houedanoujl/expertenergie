// Validation des entrées de l'API, commune aux deux stockages (Supabase et local).
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
