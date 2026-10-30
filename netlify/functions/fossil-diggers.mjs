/* Cloud-opslag voor Fossil Diggers, zodat een museum meegaat tussen huizen.
 *
 * Werkt net als de opslag van Supervrienden: per geheime code één spel, met een versieteller.
 *   GET  ?code=xxx           -> { versie, gewijzigd, spel } of null
 *   POST ?code=xxx           -> body = { versie, spel }, bewaart als versie klopt
 *   POST ?code=xxx&forceer=1 -> bewaart hoe dan ook (na een keuze tussen twee versies)
 *
 * Stuurt een apparaat een versie die niet de laatste is, dan heeft iemand anders ondertussen
 * gespeeld. De server weigert dan en het spel laat kiezen; stil overschrijven doen we nooit.
 * Het spel staat op owenvanpelt.com en jakevanpelt.com; allebei gebruiken ze deze ene opslag,
 * vandaar CORS open.
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

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const url = new URL(req.url)
  const code = schoon(url.searchParams.get('code'))
  if (code.length < 8) return json({ fout: 'ongeldige code' }, 400)

  const store = getStore('fossil-diggers-musea')

  if (req.method === 'GET') {
    const data = await store.get(code, { type: 'json', consistency: 'strong' })
    return json(data ?? null)
  }

  if (req.method !== 'POST') return json({ fout: 'methode niet toegestaan' }, 405)

  const rauw = await req.text()
  if (rauw.length > 300000) return json({ fout: 'te groot' }, 413)

  let binnen
  try { binnen = JSON.parse(rauw) } catch { return json({ fout: 'geen geldige JSON' }, 400) }
  if (!binnen || typeof binnen !== 'object' || !binnen.spel || typeof binnen.spel !== 'object') {
    return json({ fout: 'geen spel meegestuurd' }, 400)
  }

  const forceer = url.searchParams.get('forceer') === '1'
  const huidig = await store.get(code, { type: 'json', consistency: 'strong' })
  const huidigeVersie = huidig ? (huidig.versie || 0) : 0

  if (!forceer && huidig && (binnen.versie || 0) !== huidigeVersie) {
    return json({ fout: 'ingehaald', versie: huidigeVersie, hunne: huidig }, 409)
  }

  const nieuw = { versie: huidigeVersie + 1, gewijzigd: new Date().toISOString(), spel: binnen.spel }
  await store.set(code, JSON.stringify(nieuw))
  return json({ ok: true, versie: nieuw.versie, gewijzigd: nieuw.gewijzigd })
}
