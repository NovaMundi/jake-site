/* ✨ Maak echt, online: van een getekend wezen een echt ogend wezen maken.
 *
 * Het maken duurt ruim 20 seconden, langer dan een gewone Netlify-functie mag duren. Daarom
 * twee stappen: deze functie neemt de opdracht aan en geeft een taaknummer terug, de
 * achtergrondfunctie (planeet-echt-background) maakt het plaatje, en de planeet vraagt hier
 * elke paar seconden of het al klaar is.
 *
 * Kost geld per plaatje, dus: alleen met een familiecode die echt bestaat (er is minstens één
 * planeet opgeslagen), en per planeet maximaal een paar keer per dag.
 *
 *   GET  ?code=xxx&wie=owen            -> { kan, over, perDag }
 *   POST ?code=xxx&wie=owen            -> body = { image, huid, beweging, maat } -> { taak }
 *   GET  ?code=xxx&wie=owen&taak=yyy   -> { klaar, beeld?, fout?, over? }
 *
 * Sleutel: omgevingsvariabele OPENAI_API_KEY in Netlify (dezelfde als KIZZO).
 */
import { getStore } from '@netlify/blobs'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS } })
const schoon = (c) => (c || '').toString().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48)
const PER_DAG = Number(process.env.PLANETEN_ECHT_PER_DAG) || 5

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  const url = new URL(req.url)
  const code = schoon(url.searchParams.get('code'))
  const wie = (url.searchParams.get('wie') || '').replace(/[^a-z]/g, '').slice(0, 10)
  if (code.length < 8 || !wie) return json({ fout: 'ongeldige code' }, 400)

  const store = getStore('planeten')
  if (!(await store.get(`${code}/_familie`))) return json({ kan: false, fout: 'onbekende familie' }, 403)
  const dag = new Date().toISOString().slice(0, 10)
  const gebruikt = Number((await store.get(`${code}/_echt/${dag}/${wie}`, { consistency: 'strong' })) || 0)
  const over = Math.max(0, PER_DAG - gebruikt)

  if (req.method === 'GET') {
    const taak = schoon(url.searchParams.get('taak'))
    if (!taak) return json({ kan: !!process.env.OPENAI_API_KEY, over, perDag: PER_DAG })
    const uit = await store.get(`${code}/_taak/${taak}/uit`, { type: 'json', consistency: 'strong' })
    if (!uit) return json({ klaar: false })
    // Opgehaald is opgehaald: niet bewaren wat niet bewaard hoeft te worden.
    await store.delete(`${code}/_taak/${taak}/uit`)
    return json({ klaar: true, ...uit, over })
  }
  if (req.method !== 'POST') return json({ fout: 'methode niet toegestaan' }, 405)
  if (!process.env.OPENAI_API_KEY) return json({ fout: 'geen sleutel' }, 501)
  if (over <= 0) return json({ fout: 'limiet', over: 0, perDag: PER_DAG }, 429)

  const rauw = await req.text()
  if (rauw.length > 3_000_000) return json({ fout: 'te groot' }, 413)
  const taak = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
  await store.set(`${code}/_taak/${taak}/in`, rauw)
  // De achtergrondfunctie aanzetten; die antwoordt meteen en werkt daarna verder.
  await fetch(`${url.origin}/.netlify/functions/planeet-echt-background?code=${code}&wie=${wie}&taak=${taak}`, { method: 'POST' })
  return json({ taak })
}
