/* Gezinnen voor de Planeetmakers, net als KIZZO Learn: een ouder beheert in het ouderportaal de
 * kinderen (naam, aantal planeten, toveren, DNA, toegang tot elkaar) en koppelt elk apparaat met
 * een QR-code. Die QR-code is een geheime link per kind; het apparaat onthoudt hem en opent daarna
 * altijd meteen het eigen account. Een nieuwe QR-code maken maakt de oude ongeldig.
 *
 * In de opslag (store 'planeten'):
 *   _ouders/<hash e-mail>        = { email, pinZout, pinHash, familie, gemaakt }
 *   _ouder-sessie/<hash token>   = { ouder, familie, tot }
 *   _ouder-pogingen/<hash e-mail> = { n, sinds }           (te veel foute pincodes: even wachten)
 *   _startcode/<hash code>       = { familie }               (bestaand gezin overnemen)
 *   _kind/<hash slug>            = { familie, kind }         (QR-link -> kind)
 *   _etalage/<host>              = { familie, kind }         (website van een kind -> kijkpagina)
 *   <familie>/_gezin             = { kinderen: [...], familieplaneet }
 *   kind = { id, naam, planeten, toveren, dna, elkaar: 'nee'|'kijken'|'bouwen', website, publiek: [planeetIds], slug }
 */
import crypto from 'node:crypto'

export const hash = (t) => crypto.createHash('sha256').update(String(t)).digest('hex')
const willekeurig = (n) => crypto.randomBytes(n).toString('hex')
export const STANDAARD_KIND = { planeten: 3, toveren: 5, dna: true, elkaar: 'nee', website: '', publiek: [] }
const ELKAAR = ['nee', 'kijken', 'bouwen']
const WOORDEN = ['zorbix', 'blibo', 'lumi', 'kwasar', 'nebula', 'komeet', 'pluto', 'stardust', 'orbit', 'galaxo']

const sterk = { consistency: 'strong' }
const leesJson = (store, k) => store.get(k, { type: 'json', ...sterk })

// ---------- Ouders ----------
const pinHash = (pin, zout) => crypto.scryptSync(String(pin), zout, 32).toString('hex')
const geldigeMail = (e) => typeof e === 'string' && /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(e.trim())
const geldigePin = (p) => typeof p === 'string' && /^\d{4,8}$/.test(p)

export async function maakSessie(store, ouderSleutel, familie) {
  const token = willekeurig(24)
  await store.set(`_ouder-sessie/${hash(token)}`, JSON.stringify({ ouder: ouderSleutel, familie, tot: Date.now() + 60 * 24 * 3600 * 1000 }))
  return token
}
export async function ouderVan(store, req) {
  const token = req.headers.get('x-ouder-sessie') || ''
  if (!token) return null
  const s = await leesJson(store, `_ouder-sessie/${hash(token)}`)
  if (!s || s.tot < Date.now()) return null
  return s
}
export async function uitloggen(store, req) {
  const token = req.headers.get('x-ouder-sessie') || ''
  if (token) await store.delete(`_ouder-sessie/${hash(token)}`)
}

export async function registreer(store, { email, pin, startcode }, ip) {
  if (!geldigeMail(email)) return { fout: 'Vul een geldig e-mailadres in.' }
  if (!geldigePin(pin)) return { fout: 'Kies een pincode van 4 tot 8 cijfers.' }
  const ouderSleutel = hash(email.trim().toLowerCase())
  if (await store.get(`_ouders/${ouderSleutel}`, sterk)) return { fout: 'Er is al een account met dit e-mailadres. Log in.' }
  let familie
  if (startcode) {
    const sc = await leesJson(store, `_startcode/${hash(String(startcode).trim().toLowerCase())}`)
    if (!sc) return { fout: 'Deze startcode klopt niet.' }
    familie = sc.familie
    await store.delete(`_startcode/${hash(String(startcode).trim().toLowerCase())}`)
  } else {
    // Nieuw gezin: hooguit een paar per internetadres per dag (toveren kost geld).
    const dag = new Date().toISOString().slice(0, 10)
    const ipSleutel = `_registreren/${dag}/${String(ip || 'onbekend').replace(/[^0-9a-f.:]/gi, '')}`
    const keer = Number((await store.get(ipSleutel, sterk)) || 0)
    if (keer >= 3) return { fout: 'Vandaag zijn er al genoeg gezinnen gemaakt vanaf dit internetadres. Probeer het morgen.' }
    await store.set(ipSleutel, String(keer + 1))
    familie = WOORDEN[crypto.randomInt(WOORDEN.length)] + '-' + willekeurig(5)
    await store.set(`${familie}/_familie`, JSON.stringify({ sinds: new Date().toISOString() }))
    await store.set(`${familie}/_gezin`, JSON.stringify({ kinderen: [], familieplaneet: false }))
  }
  const zout = willekeurig(16)
  await store.set(`_ouders/${ouderSleutel}`, JSON.stringify({ email: email.trim().toLowerCase(), pinZout: zout, pinHash: pinHash(pin, zout), familie, gemaakt: new Date().toISOString() }))
  return { sessie: await maakSessie(store, ouderSleutel, familie) }
}

export async function login(store, { email, pin }) {
  if (!geldigeMail(email) || !geldigePin(pin)) return { fout: 'E-mailadres of pincode klopt niet.' }
  const ouderSleutel = hash(email.trim().toLowerCase())
  const pogingSleutel = `_ouder-pogingen/${ouderSleutel}`
  const p = (await leesJson(store, pogingSleutel)) || { n: 0, sinds: Date.now() }
  if (Date.now() - p.sinds > 3600 * 1000) Object.assign(p, { n: 0, sinds: Date.now() })
  if (p.n >= 8) return { fout: 'Te vaak een verkeerde pincode. Probeer het over een uur opnieuw.', status: 429 }
  const o = await leesJson(store, `_ouders/${ouderSleutel}`)
  const goed = o && crypto.timingSafeEqual(Buffer.from(pinHash(pin, o.pinZout), 'hex'), Buffer.from(o.pinHash, 'hex'))
  if (!goed) {
    p.n++
    await store.set(pogingSleutel, JSON.stringify(p))
    return { fout: 'E-mailadres of pincode klopt niet.' }
  }
  await store.delete(pogingSleutel)
  return { sessie: await maakSessie(store, ouderSleutel, o.familie) }
}

// ---------- Gezin ----------
export async function leesGezin(store, familie) {
  return (await store.getWithMetadata(`${familie}/_gezin`, { type: 'json', ...sterk })) || null
}
// Atomisch aanpassen (twee ouders tegelijk in het portaal raken elkaars wijziging niet kwijt).
export async function pasGezinAan(store, familie, fn) {
  for (let poging = 0; poging < 4; poging++) {
    const huidig = await leesGezin(store, familie)
    const gezin = structuredClone(huidig?.data || { kinderen: [], familieplaneet: false })
    const uit = await fn(gezin)
    if (uit === null) return null
    const voorwaarde = huidig?.etag ? { onlyIfMatch: huidig.etag } : huidig ? {} : { onlyIfNew: true }
    const gelukt = await store.set(`${familie}/_gezin`, JSON.stringify(gezin), voorwaarde)
    if (!gelukt || gelukt.modified !== false) return gezin
  }
  throw Object.assign(new Error('Probeer het nog eens.'), { status: 503 })
}

// Een kind-id is kort, kleine letters en cijfers, zonder streepje (planeten heten <id>, <id>-2, ...).
function nieuwKindId(bestaand) {
  for (;;) {
    const id = 'k' + crypto.randomBytes(4).toString('hex').slice(0, 6)
    if (!bestaand.some((k) => k.id === id) && !['samen', 'wensen'].includes(id)) return id
  }
}
const schoneNaam = (n) => String(n || '').replace(/[^\p{L}\p{N} '-]/gu, '').trim().slice(0, 20)
const schoneSite = (s) => String(s || '').toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/[^a-z0-9.-]/g, '').slice(0, 60)

export async function voegKindToe(store, familie, naam) {
  const n = schoneNaam(naam)
  if (!n) return { fout: 'Vul een naam in.' }
  const gezin = await pasGezinAan(store, familie, (g) => {
    if (g.kinderen.length >= 8) return null
    g.kinderen.push({ id: nieuwKindId(g.kinderen), naam: n, ...structuredClone(STANDAARD_KIND) })
  })
  return gezin ? { gezin } : { fout: 'Er kunnen hooguit 8 kinderen in een gezin.' }
}

export async function zetKind(store, familie, id, instellingen) {
  let oudeSite = null, nieuweSite = null
  const gezin = await pasGezinAan(store, familie, (g) => {
    const k = g.kinderen.find((x) => x.id === id)
    if (!k) return null
    const i = instellingen || {}
    if (i.naam !== undefined && schoneNaam(i.naam)) k.naam = schoneNaam(i.naam)
    if (i.planeten !== undefined) k.planeten = Math.max(1, Math.min(5, Math.round(Number(i.planeten)) || 1))
    if (i.toveren !== undefined) k.toveren = Math.max(0, Math.min(10, Math.round(Number(i.toveren)) || 0))
    if (i.dna !== undefined) k.dna = !!i.dna
    if (i.elkaar !== undefined && ELKAAR.includes(i.elkaar)) k.elkaar = i.elkaar
    if (i.website !== undefined) {
      oudeSite = k.website || null
      k.website = schoneSite(i.website)
      nieuweSite = k.website || null
    }
  })
  if (!gezin) return { fout: 'Kind niet gevonden.' }
  if (oudeSite !== nieuweSite) {
    if (oudeSite) {
      const oud = await leesJson(store, `_etalage/${oudeSite}`)
      if (oud && oud.familie === familie && oud.kind === id) await store.delete(`_etalage/${oudeSite}`)
    }
    if (nieuweSite) await store.set(`_etalage/${nieuweSite}`, JSON.stringify({ familie, kind: id }))
  }
  return { gezin }
}

// Nieuwe QR-code: nieuwe geheime link; de oude werkt vanaf nu niet meer.
export async function nieuweQr(store, familie, id) {
  const slug = crypto.randomBytes(12).toString('base64url')
  let oud = null
  const gezin = await pasGezinAan(store, familie, (g) => {
    const k = g.kinderen.find((x) => x.id === id)
    if (!k) return null
    oud = k.slug || null
    k.slug = slug
  })
  if (!gezin) return { fout: 'Kind niet gevonden.' }
  await store.set(`_kind/${hash(slug)}`, JSON.stringify({ familie, kind: id }))
  if (oud) await store.delete(`_kind/${hash(oud)}`)
  return { gezin }
}

export async function verwijderKind(store, familie, id) {
  let weg = null
  const gezin = await pasGezinAan(store, familie, (g) => {
    weg = g.kinderen.find((x) => x.id === id)
    if (!weg) return null
    g.kinderen = g.kinderen.filter((x) => x.id !== id)
  })
  if (!gezin) return { fout: 'Kind niet gevonden.' }
  // De planeten zelf blijven bewaard (terug te halen); alleen de toegang verdwijnt.
  if (weg.slug) await store.delete(`_kind/${hash(weg.slug)}`)
  if (weg.website) await store.delete(`_etalage/${weg.website}`)
  return { gezin }
}

// ---------- Kind (apparaat met QR-link) ----------
export async function kindVan(store, slug) {
  if (!slug || String(slug).length < 10) return null
  const r = await leesJson(store, `_kind/${hash(slug)}`)
  if (!r) return null
  const gezin = (await leesGezin(store, r.familie))?.data
  const kind = gezin?.kinderen.find((k) => k.id === r.kind)
  // Is er intussen een nieuwe QR-code gemaakt? Dan telt alleen die nog.
  if (!kind || kind.slug !== slug) return null
  return { familie: r.familie, kind, gezin }
}

// Wat het apparaat van een kind over zichzelf en zijn gezin mag weten (geen links van anderen).
export function kindInfo({ familie, kind, gezin }) {
  const { slug, ...zonderSlug } = kind
  return {
    familie,
    kind: zonderSlug,
    gezin: gezin.kinderen.map((k) => ({ id: k.id, naam: k.naam, planeten: k.planeten })),
    familieplaneet: !!gezin.familieplaneet,
  }
}

// Voor het ouderportaal: alles, inclusief de links (om de QR-code te tonen).
export const gezinVoorOuder = (familie, gezin) => ({ familie, ...gezin })

export const planeetNummer = (wie) => Number(String(wie).split('-')[1] || 1)
export const eigenaarVan = (wie) => String(wie || '').split('-')[0]
