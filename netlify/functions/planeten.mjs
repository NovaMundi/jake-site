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
 * Toegang: elk apparaat stuurt zijn eigen sleutel mee (zie netlify/lib/planeet-toegang.mjs).
 *   POST ?code=xxx&actie=sleutel        -> body = { uitnodiging? } -> { sleutel }
 *   POST ?code=xxx&actie=uitnodig       -> (met sleutel) -> { uitnodiging, dagen, keer }
 *   POST ?code=xxx&actie=alleen-dit     -> (met sleutel) alle andere apparaten loskoppelen
 *
 * wie = owen | owen-2 | owen-3 | jake | ... | papa-3 | wensen. Een apparaat mag alleen bij de
 * planeten van zijn eigen speler (zie magBij in planeet-toegang.mjs). De functie staat op jakevanpelt.com en wordt ook
 * aangeroepen vanaf owenvanpelt.com (en vanaf papa's laptop), vandaar CORS open.
 */
import { getStore } from '@netlify/blobs'
import { heeftToegang, magBij, geefSleutel, maakUitnodiging, alleenDit, BOTSING, SLEUTEL_HEADER } from '../lib/planeet-toegang.mjs'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, ' + SLEUTEL_HEADER,
}
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS } })

const schoon = (c) => (c || '').toString().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48)
// Elke speler heeft drie planeten: owen (de eerste, zoals vroeger), owen-2 en owen-3.
const isWie = (w) => w === 'wensen' || /^(owen|jake|papa)(-[23])?$/.test(w || '')
const MAX = 4_000_000 // een planeet met getekende en echte wezens is een paar honderd kB

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  const url = new URL(req.url)
  const code = schoon(url.searchParams.get('code'))
  const wie = url.searchParams.get('wie')
  if (code.length < 8) return json({ fout: 'ongeldige code' }, 400)
  const store = getStore('planeten')

  // Koppelen: een sleutel voor dit apparaat, of een uitnodiging voor een ander apparaat.
  const actie = url.searchParams.get('actie')
  if (actie && req.method === 'POST') {
    if (actie === 'sleutel') {
      let uitnodiging = null
      try {
        uitnodiging = (JSON.parse((await req.text()) || '{}').uitnodiging || '').toString().replace(/[^a-f0-9]/g, '').slice(0, 64) || null
      } catch {}
      const sleutel = await geefSleutel(store, code, uitnodiging)
      if (sleutel === BOTSING) return json({ fout: 'probeer opnieuw' }, 503)
      return sleutel ? json({ sleutel }) : json({ fout: 'geen toegang' }, 401)
    }
    if (actie === 'uitnodig') {
      const toegang = await heeftToegang(store, code, req)
      if (!toegang) return json({ fout: 'geen toegang' }, 401)
      // Een apparaat van een kind kan alleen uitnodigingen voor zichzelf maken.
      const voor = ['owen', 'jake', 'papa'].includes(url.searchParams.get('speler')) ? url.searchParams.get('speler') : null
      if (toegang.speler && voor !== toegang.speler) return json({ fout: 'geen toegang' }, 403)
      const u = await maakUitnodiging(store, code, voor)
      return u && u !== BOTSING ? json(u) : json({ fout: 'probeer opnieuw' }, 503)
    }
    if (actie === 'alleen-dit') {
      const ok = await alleenDit(store, code, req)
      if (ok === BOTSING) return json({ fout: 'probeer opnieuw' }, 503)
      return ok ? json({ ok: true }) : json({ fout: 'geen toegang' }, 401)
    }
    return json({ fout: 'onbekende actie' }, 400)
  }

  if (!isWie(wie)) return json({ fout: 'onbekende planeet' }, 400)
  const toegang = await heeftToegang(store, code, req)
  if (!toegang) return json({ fout: 'geen toegang' }, 401)
  // Niet bij de planeten van een ander kind.
  if (!magBij(toegang, wie, req)) return json({ fout: 'niet jouw planeet' }, 403)
  const sleutel = `${code}/${wie}`

  const bak = `${code}/_prullenbak/${wie}/`
  if (req.method === 'GET' && url.searchParams.get('prullenbak')) {
    const welke = url.searchParams.get('prullenbak')
    if (welke === 'lijst') {
      const { blobs } = await store.list({ prefix: bak })
      return json(blobs.map((b) => b.key.slice(bak.length)).filter((t) => /^\d+$/.test(t)))
    }
    if (!/^\d+$/.test(welke)) return json({ fout: 'onbekend' }, 400)
    return json((await store.get(bak + welke, { type: 'json' })) ?? null)
  }
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
  const metEtag = await store.getWithMetadata(sleutel, { type: 'json', consistency: 'strong' })
  const huidig = metEtag?.data ?? null
  const huidigeVersie = huidig ? huidig.versie || 0 : 0
  if (!forceer && huidig && (binnen.versie || 0) !== huidigeVersie) {
    return json({ fout: 'ingehaald', versie: huidigeVersie, hunne: huidig }, 409)
  }
  const nieuw = { versie: huidigeVersie + 1, gewijzigd: new Date().toISOString(), data: binnen.data }
  // Prullenbak: wordt een planeet weggegooid, vervangen door een nieuwe, of bij twee versies
  // overschreven, dan bewaren we de oude nog 30 dagen. Zo kan papa hem altijd terughalen.
  const oud = huidig?.data?.recept
  if (wie !== 'wensen' && oud && (forceer || !binnen.data.recept || binnen.data.recept.zaad !== oud.zaad)) {
    await store.set(bak + Date.now(), JSON.stringify(huidig))
    const { blobs } = await store.list({ prefix: bak })
    const grens = Date.now() - 30 * 24 * 3600 * 1000
    for (const b of blobs) if (Number(b.key.slice(bak.length)) < grens) await store.delete(b.key)
  }
  // Alleen opslaan als er intussen niemand anders heeft opgeslagen (twee tablets tegelijk).
  // Anders weigeren, net als bij een oude versie: dan kiest het kind.
  // (Geeft de opslag geen etag terug, zoals bij lokaal testen, dan gewoon opslaan zoals vroeger.)
  const voorwaarde = metEtag?.etag ? { onlyIfMatch: metEtag.etag } : huidig ? {} : { onlyIfNew: true }
  const gelukt = await store.set(sleutel, JSON.stringify(nieuw), voorwaarde)
  if (gelukt && gelukt.modified === false) {
    const nu = await store.get(sleutel, { type: 'json', consistency: 'strong' })
    return json({ fout: 'ingehaald', versie: nu?.versie || 0, hunne: nu }, 409)
  }
  // Een familie (die mag toveren, en dat kost geld) ontstaat alleen via de knop "Wolk aanzetten",
  // en per internetadres hooguit een paar keer per dag. Anders kon iedereen met een verzonnen
  // code op onze kosten toveren.
  if (url.searchParams.get('aanzetten') === '1' && !(await store.get(`${code}/_familie`, { consistency: 'strong' }))) {
    const ip = (req.headers.get('x-nf-client-connection-ip') || 'onbekend').replace(/[^0-9a-f.:]/gi, '')
    const dag = new Date().toISOString().slice(0, 10)
    const ipSleutel = `_aanzetten/${dag}/${ip}`
    const keer = Number((await store.get(ipSleutel, { consistency: 'strong' })) || 0)
    if (keer < 3) {
      await store.set(ipSleutel, String(keer + 1))
      await store.set(`${code}/_familie`, JSON.stringify({ sinds: nieuw.gewijzigd }))
    }
  }
  return json({ ok: true, versie: nieuw.versie, gewijzigd: nieuw.gewijzigd })
}
