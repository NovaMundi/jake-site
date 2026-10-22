/* Cloud-opslag voor de Planeetmakers, zodat een planeet meegaat tussen huizen en apparaten.
 *
 * Zelfde opzet als Supervrienden: één familiecode, en per planeet (owen, jake, papa) een
 * versie met een teller. Stuurt een apparaat een versie die niet de laatste is, dan heeft
 * iemand anders ondertussen gespeeld en weigert de server; de planeetmaker laat dan kiezen.
 * Stil overschrijven zou betekenen dat er een week evolutie verdwijnt zonder dat iemand het merkt.
 *
 *   GET  ?code=xxx&wie=owen             -> { versie, gewijzigd, data } of null
 *   POST ?code=xxx&wie=owen             -> body = { versie, data }, bewaart als versie klopt
 *   POST ?code=xxx&wie=owen&forceer=1   -> bewaart hoe dan ook (na een keuze bij twee versies)
 *
 * wie = owen | jake | papa | wensen. De functie staat op jakevanpelt.com en wordt ook
 * aangeroepen vanaf owenvanpelt.com (en vanaf papa's laptop), vandaar CORS open.
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
const WIE = ['owen', 'jake', 'papa', 'wensen']
const MAX = 4_000_000 // een planeet met getekende en echte wezens is een paar honderd kB

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  const url = new URL(req.url)
  const code = schoon(url.searchParams.get('code'))
  const wie = url.searchParams.get('wie')
  if (code.length < 8) return json({ fout: 'ongeldige code' }, 400)
  if (!WIE.includes(wie)) return json({ fout: 'onbekende planeet' }, 400)

  const store = getStore('planeten')
  const sleutel = `${code}/${wie}`

  if (req.method === 'GET') {
    // Strong consistency: komt een kind thuis van de andere ouder, dan meteen de laatste versie.
    const doc = await store.get(sleutel, { type: 'json', consistency: 'strong' })
    return json(doc ?? null)
  }
  if (req.method !== 'POST') return json({ fout: 'methode niet toegestaan' }, 405)

  const rauw = await req.text()
  if (rauw.length > MAX) return json({ fout: 'te groot' }, 413)
  let binnen
  try {
    binnen = JSON.parse(rauw)
  } catch {
    return json({ fout: 'geen geldige JSON' }, 400)
  }
  if (!binnen || typeof binnen !== 'object' || !binnen.data) return json({ fout: 'geen planeet meegestuurd' }, 400)

  const forceer = url.searchParams.get('forceer') === '1'
  const huidig = await store.get(sleutel, { type: 'json', consistency: 'strong' })
  const huidigeVersie = huidig ? huidig.versie || 0 : 0
  if (!forceer && huidig && (binnen.versie || 0) !== huidigeVersie) {
    return json({ fout: 'ingehaald', versie: huidigeVersie, hunne: huidig }, 409)
  }
  const nieuw = { versie: huidigeVersie + 1, gewijzigd: new Date().toISOString(), data: binnen.data }
  await store.set(sleutel, JSON.stringify(nieuw))
  // Familiecode registreren, zodat de toverknop weet dat dit een echte familie is.
  if (!(await store.get(`${code}/_familie`))) await store.set(`${code}/_familie`, JSON.stringify({ sinds: nieuw.gewijzigd }))
  return json({ ok: true, versie: nieuw.versie, gewijzigd: nieuw.gewijzigd })
}
