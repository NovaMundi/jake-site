// Cloud-opslag voor de Elementen-game: voortgang per persoonlijke code.
// GET  /.netlify/functions/save?code=xxxx   -> de opgeslagen voortgang (of null)
// POST /.netlify/functions/save?code=xxxx   -> body = voortgang-JSON, wordt bewaard
// Gebruikt Netlify Blobs (ingebouwde key-value opslag, geen aparte database nodig).
import { getStore } from '@netlify/blobs'

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } })

// Code opschonen: alleen kleine letters/cijfers, 2-24 tekens (kindvriendelijk, geen rare tekens).
const cleanCode = (c) => (c || '').toString().toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)

export default async (req) => {
  const url = new URL(req.url)
  const code = cleanCode(url.searchParams.get('code'))
  if (code.length < 2) return json({ error: 'ongeldige code' }, 400)

  const store = getStore('elementen-saves')

  if (req.method === 'GET') {
    // strong consistency: na opslaan op het ene apparaat leest een ander apparaat gegarandeerd de laatste versie.
    const data = await store.get(code, { type: 'json', consistency: 'strong' })
    return json(data ?? null)
  }

  if (req.method === 'POST') {
    const body = await req.text()
    if (body.length > 200000) return json({ error: 'te groot' }, 413)
    try {
      JSON.parse(body) // valideer dat het geldige JSON is
    } catch {
      return json({ error: 'geen geldige JSON' }, 400)
    }
    await store.set(code, body)
    return json({ ok: true })
  }

  return json({ error: 'methode niet toegestaan' }, 405)
}
