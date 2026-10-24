/* Wie mag bij de planeten van een familie?
 *
 * Vroeger was de familiecode genoeg, en die stond in de koppel-links. Wie zo'n link ooit had
 * gekregen (doorgestuurd in een app, op een gedeelde computer), kon alles lezen en
 * overschrijven, ook de ingesproken wensen met de stemmen van de kinderen. Nu:
 *   - elk apparaat heeft een eigen geheime sleutel (header x-planeet-sleutel);
 *   - een koppel-link bevat een uitnodiging die 7 dagen werkt, op hooguit 5 apparaten;
 *   - apparaten van vóór de sleutels krijgen er vanzelf één, tot OVERGANG_EIND. Daarna werkt
 *     de familiecode alleen nooit meer.
 * Op de server bewaren we alleen een hash van sleutels en uitnodigingen.
 *
 * In de opslag: <code>/_apparaten = { sleutels: [{ h, sinds }], uitnodigingen: [{ h, tot, over }], overgangTot }
 *
 * Antwoorden van geefSleutel/maakUitnodiging: de waarde, null (geweigerd) of BOTSING (het register
 * werd steeds tegelijk door een ander apparaat aangepast: later opnieuw proberen, niet weigeren).
 */

export const OVERGANG_EIND = Date.parse('2026-11-15T00:00:00Z')
const UITNODIGING_DAGEN = 7
const UITNODIGING_KEER = 5
const MAX_SLEUTELS = 30
const OVERGANG_PER_DAG = 12 // sleutels zonder uitnodiging (overgang), per familie per dag
export const BOTSING = Symbol('botsing')

export const SLEUTEL_HEADER = 'x-planeet-sleutel'
export const KIND_HEADER = 'x-kind'
export const OUDER_HEADER = 'x-ouder-sessie'
import { kindVan, ouderVan } from './planeet-gezin.mjs'

async function hash(t) {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(t)))
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, '0')).join('')
}
function willekeurig(n = 24) {
  const bytes = crypto.getRandomValues(new Uint8Array(n))
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

const regSleutel = (code) => `${code}/_apparaten`
const leesReg = (store, code) => store.getWithMetadata(regSleutel(code), { type: 'json', consistency: 'strong' })

// Register aanpassen zonder dat twee apparaten tegelijk elkaars wijziging wegschrijven.
async function pasAan(store, code, fn) {
  for (let poging = 0; poging < 4; poging++) {
    const huidig = await leesReg(store, code)
    const reg = huidig?.data ?? null
    const uit = await fn(reg)
    if (!uit) return null
    const voorwaarde = huidig?.etag ? { onlyIfMatch: huidig.etag } : reg ? {} : { onlyIfNew: true }
    const gelukt = await store.set(regSleutel(code), JSON.stringify(uit.reg), voorwaarde)
    if (!gelukt || gelukt.modified !== false) return uit.antwoord
  }
  return BOTSING
}

// Elke speler heeft zijn eigen planeten (owen, owen-2, owen-3). Een apparaat hoort bij één speler:
// via de site waarop het speelt (owenvanpelt.com = Owen) en, sinds de QR-codes, via zijn sleutel.
// Zo kunnen de broers niet meer bij elkaars planeten. Papa's laptop (andere site) mag alles.
export const spelerVan = (wie) => String(wie || '').split('-')[0]
export function siteSpeler(req) {
  const bron = req.headers.get('origin') || req.headers.get('referer') || ''
  if (/owenvanpelt\.com/i.test(bron)) return 'owen'
  if (/jakevanpelt\.com/i.test(bron)) return 'jake'
  return null
}
// Mag dit apparaat (toegang uit heeftToegang) bij planeet 'wie'? De wensen zijn van iedereen.
// Een kind (QR-link) volgt de instellingen uit het ouderportaal: eigen planeten tot zijn aantal,
// de familieplaneet als die aan staat, en die van broers en zussen alleen kijken of ook bouwen.
export function magBij(toegang, wie, req) {
  if (!toegang) return false
  if (wie === 'wensen') return true
  if (toegang.ouder) return true
  if (toegang.kind) {
    const k = toegang.kind
    const nr = Number(String(wie).split('-')[1] || 1)
    if (wie === 'samen') return !!toegang.gezin.familieplaneet
    if (spelerVan(wie) === k.id) return nr <= k.planeten
    const ander = toegang.gezin.kinderen.find((x) => x.id === spelerVan(wie))
    if (!ander || nr > ander.planeten) return false
    if (k.elkaar === 'bouwen') return true
    return k.elkaar === 'kijken' && req.method === 'GET'
  }
  const eigen = [toegang.speler, siteSpeler(req)].filter(Boolean)
  return eigen.every((s) => s === spelerVan(wie))
}

// Heeft dit verzoek toegang tot de planeten van deze familie? Geeft false of { speler } terug.
export async function heeftToegang(store, code, req) {
  // Kind met de geheime link uit de QR-code (ouderportaal).
  const slug = req.headers.get(KIND_HEADER)
  if (slug) {
    const k = await kindVan(store, slug)
    return k && k.familie === code ? { speler: k.kind.id, kind: k.kind, gezin: k.gezin } : false
  }
  // Ouder, ingelogd in het portaal.
  if (req.headers.get(OUDER_HEADER)) {
    const o = await ouderVan(store, req)
    return o && o.familie === code ? { speler: null, ouder: true } : false
  }
  const sleutel = req.headers.get(SLEUTEL_HEADER) || ''
  const reg = (await leesReg(store, code))?.data ?? null
  if (sleutel && reg) {
    const h = await hash(sleutel)
    const s = reg.sleutels.find((x) => x.h === h)
    if (s) return { speler: s.speler || null }
  }
  // Overgang: families van vóór de sleutels.
  const tot = reg ? reg.overgangTot || 0 : OVERGANG_EIND
  return Date.now() < tot ? { speler: null } : false
}

// Bestond deze familie al voordat er sleutels waren?
async function bestaatAl(store, code) {
  if (await store.get(`${code}/_familie`, { consistency: 'strong' })) return true
  for (const wie of ['owen', 'jake', 'papa', 'wensen']) if (await store.get(`${code}/${wie}`, { consistency: 'strong' })) return true
  return false
}

// Een sleutel voor dit apparaat: met een geldige uitnodiging, als nieuwe familie, of tijdens de overgang.
export async function geefSleutel(store, code, uitnodiging) {
  const sleutel = willekeurig()
  const h = await hash(sleutel)
  const uh = uitnodiging ? await hash(uitnodiging) : null
  const nieuwOfOud = uh ? null : (await bestaatAl(store, code)) ? 'oud' : 'nieuw'
  return pasAan(store, code, async (reg) => {
    const nu = Date.now()
    let mag = false
    let speler = null
    reg = reg ? { ...reg, sleutels: [...reg.sleutels], uitnodigingen: (reg.uitnodigingen || []).filter((u) => u.tot > nu && u.over > 0) } : null
    if (uh) {
      const u = reg && reg.uitnodigingen.find((x) => x.h === uh)
      if (u) {
        u.over--
        mag = true
        speler = u.speler || null
      }
    } else {
      // Zonder uitnodiging: eerste apparaat van een nieuwe familie, of een apparaat van vóór de
      // sleutels (overgang). Dat laatste hooguit een paar keer per dag, zodat niemand met een oude
      // link het register kan volproppen.
      const dag = new Date(nu).toISOString().slice(0, 10)
      if (!reg) {
        if (nieuwOfOud === 'nieuw' || nu < OVERGANG_EIND) mag = true
        reg = { sleutels: [], uitnodigingen: [], overgangTot: nieuwOfOud === 'oud' ? OVERGANG_EIND : 0 }
      } else if (nu < (reg.overgangTot || 0) && !(reg.overgangDag === dag && reg.overgangKeer >= OVERGANG_PER_DAG)) mag = true
      if (mag) {
        reg.overgangKeer = reg.overgangDag === dag ? (reg.overgangKeer || 0) + 1 : 1
        reg.overgangDag = dag
      }
    }
    // Vol? Dan weigeren in plaats van oude (echte) sleutels weg te gooien. Opruimen kan met
    // "andere apparaten loskoppelen" op een gekoppeld apparaat.
    if (!mag || reg.sleutels.length >= MAX_SLEUTELS) return null
    reg.sleutels.push({ h, sinds: new Date(nu).toISOString(), ...(speler ? { speler } : {}) })
    return { reg, antwoord: sleutel }
  })
}

// Alle andere apparaten loskoppelen: alleen de sleutel van dit apparaat blijft over, alle
// uitnodigingen vervallen en de overgang stopt meteen. Voor als er ooit een link rondgaat.
export async function alleenDit(store, code, req) {
  const sleutel = req.headers.get(SLEUTEL_HEADER) || ''
  if (!sleutel) return null
  const h = await hash(sleutel)
  return pasAan(store, code, async (reg) => {
    if (!reg || !reg.sleutels.some((s) => s.h === h)) return null
    return { reg: { sleutels: reg.sleutels.filter((s) => s.h === h), uitnodigingen: [], overgangTot: 0 }, antwoord: true }
  })
}

// Een nieuwe koppel-uitnodiging (alleen voor een apparaat dat zelf al toegang heeft).
export async function maakUitnodiging(store, code, speler = null) {
  const token = willekeurig(12)
  const h = await hash(token)
  return pasAan(store, code, async (reg) => {
    const nu = Date.now()
    reg = reg ? { ...reg, uitnodigingen: (reg.uitnodigingen || []).filter((u) => u.tot > nu && u.over > 0) } : { sleutels: [], uitnodigingen: [], overgangTot: OVERGANG_EIND }
    reg.uitnodigingen.push({ h, tot: nu + UITNODIGING_DAGEN * 24 * 3600 * 1000, over: UITNODIGING_KEER, ...(speler ? { speler } : {}) })
    if (reg.uitnodigingen.length > 10) reg.uitnodigingen = reg.uitnodigingen.slice(-10)
    return { reg, antwoord: { uitnodiging: token, dagen: UITNODIGING_DAGEN, keer: UITNODIGING_KEER } }
  })
}
