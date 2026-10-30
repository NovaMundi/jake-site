/* Cloud-opslag voor Fossil Diggers: accounts met naam en wachtwoordje, en per account één spel.
 *
 * Accounts
 *   POST ?actie=nieuw  body { naam, wachtwoord } -> { code }        (naam bestaat al: 409)
 *   POST ?actie=login  body { naam, wachtwoord } -> { code, naam }  (klopt niet: 401)
 * Het wachtwoordje wordt nooit zelf bewaard, alleen een gezouten scrypt-hash ervan.
 * De code is een willekeurige sleutel waaronder het spel staat; die krijgt het spel na inloggen.
 *
 * Spel (zoals bij Supervrienden: versieteller, nooit stil overschrijven)
 *   GET  ?code=xxx           -> { versie, gewijzigd, spel } of null
 *   POST ?code=xxx           -> body = { versie, spel }, bewaart als versie klopt
 *   POST ?code=xxx&forceer=1 -> bewaart hoe dan ook (na een keuze tussen twee versies)
 *
 * Het spel staat op owenvanpelt.com en jakevanpelt.com; allebei gebruiken ze deze opslag,
 * vandaar CORS open.
 */
import { getStore } from '@netlify/blobs'
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'node:crypto'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
}

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', ...CORS } })

const schoon = (c) => (c || '').toString().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48)
const naamSleutel = (naam) => 'account-' + createHash('sha256').update(naam).digest('hex')
const hash = (wachtwoord, zout) => scryptSync(wachtwoord, zout, 32).toString('hex')

async function account(req, actie, store) {
  let b
  try { b = JSON.parse(await req.text()) } catch { return json({ fout: 'geen geldige JSON' }, 400) }
  const toon = (b.naam || '').toString().trim().slice(0, 20)
  const naam = toon.toLowerCase()
  const wachtwoord = (b.wachtwoord || '').toString().trim().slice(0, 40)
  if (naam.length < 2) return json({ fout: 'naam te kort' }, 400)
  if (wachtwoord.length < 4) return json({ fout: 'wachtwoord te kort' }, 400)
  const sleutel = naamSleutel(naam)
  const bestaand = await store.get(sleutel, { type: 'json', consistency: 'strong' })

  if (actie === 'nieuw') {
    if (bestaand) return json({ fout: 'bestaat' }, 409)
    const zout = randomBytes(16).toString('hex')
    const code = 'fd-' + randomBytes(16).toString('hex')
    await store.set(sleutel, JSON.stringify({ naam: toon, zout, hash: hash(wachtwoord, zout), code, sinds: new Date().toISOString() }))
    return json({ ok: true, code, naam: toon })
  }
  // inloggen
  if (!bestaand) return json({ fout: 'klopt niet' }, 401)
  const goed = timingSafeEqual(Buffer.from(hash(wachtwoord, bestaand.zout), 'hex'), Buffer.from(bestaand.hash, 'hex'))
  if (!goed) return json({ fout: 'klopt niet' }, 401)
  return json({ ok: true, code: bestaand.code, naam: bestaand.naam })
}

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })

  const url = new URL(req.url)
  const store = getStore('fossil-diggers-musea')
  const actie = url.searchParams.get('actie')
  if (actie === 'nieuw' || actie === 'login') {
    if (req.method !== 'POST') return json({ fout: 'methode niet toegestaan' }, 405)
    return account(req, actie, store)
  }

  const code = schoon(url.searchParams.get('code'))
  if (code.length < 8 || code.startsWith('account-')) return json({ fout: 'ongeldige code' }, 400)

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
