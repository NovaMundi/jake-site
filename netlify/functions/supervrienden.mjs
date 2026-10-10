/* Cloud-opslag voor Supervrienden, zodat een dorp meegaat tussen huizen.
 *
 * Owen en Jake wonen deels bij hun moeder en deels bij hun vader. Een spel dat op het ene
 * apparaat vastzit maakt van elk dorp twee aparte dorpen, en dat is precies wat je niet
 * wil. Hiermee is er één dorp dat doorloopt, waar ze ook zijn.
 *
 *   GET  ?code=xxx          -> { versie, gewijzigd, spel } of null
 *   POST ?code=xxx          -> body = { versie, spel }, bewaart als versie klopt
 *   POST ?code=xxx&forceer=1 -> bewaart hoe dan ook (na een keuze bij twee versies)
 *
 * De versie is een teller die bij elke opslag omhoog gaat. Stuurt een apparaat een versie
 * die niet de laatste is, dan heeft iemand anders ondertussen gespeeld en weigert de
 * server. Het spel laat dan allebei de dorpen zien en laat kiezen. Stil overschrijven zou
 * betekenen dat er een week werk verdwijnt zonder dat iemand het merkt.
 *
 * De functie staat op jakevanpelt.com en wordt ook aangeroepen vanaf owenvanpelt.com.
 * Dat moet: één opslag voor allebei de adressen, anders is een dorp op het ene adres niet
 * te zien op het andere en is de hele functie zinloos. Vandaar CORS open.
 */
import { getStore } from '@netlify/blobs'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS } })

/* Codes bestaan uit kleine letters, cijfers en streepjes. Ze worden gegenereerd door het
 * spel en zijn lang genoeg om niet te raden; hier alleen opschonen zodat een typefout geen
 * rare sleutel in de opslag maakt. */
const schoon = (c) => (c || '').toString().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48)

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const url = new URL(req.url)
  const code = schoon(url.searchParams.get('code'))
  if (code.length < 8) return json({ fout: 'ongeldige code' }, 400)

  const store = getStore('supervrienden-dorpen')

  if (req.method === 'GET') {
    /* Strong consistency: komt een kind thuis van de andere ouder, dan moet het meteen de
     * laatste versie zien en niet die van gisteren. */
    const data = await store.get(code, { type: 'json', consistency: 'strong' })
    return json(data ?? null)
  }

  if (req.method !== 'POST') return json({ fout: 'methode niet toegestaan' }, 405)

  const rauw = await req.text()
  if (rauw.length > 400000) return json({ fout: 'te groot' }, 413)

  let binnen
  try { binnen = JSON.parse(rauw) } catch { return json({ fout: 'geen geldige JSON' }, 400) }
  if (!binnen || typeof binnen !== 'object' || !binnen.spel) {
    return json({ fout: 'geen spel meegestuurd' }, 400)
  }

  const forceer = url.searchParams.get('forceer') === '1'
  const huidig = await store.get(code, { type: 'json', consistency: 'strong' })
  const huidigeVersie = huidig ? (huidig.versie || 0) : 0

  if (!forceer && huidig && (binnen.versie || 0) !== huidigeVersie) {
    // iemand anders heeft ondertussen gespeeld; het spel beslist wat er moet gebeuren
    return json({ fout: 'ingehaald', versie: huidigeVersie, hunne: huidig }, 409)
  }

  const nieuw = {
    versie: huidigeVersie + 1,
    gewijzigd: new Date().toISOString(),
    spel: binnen.spel,
  }
  await store.set(code, JSON.stringify(nieuw))
  return json({ ok: true, versie: nieuw.versie, gewijzigd: nieuw.gewijzigd })
}
