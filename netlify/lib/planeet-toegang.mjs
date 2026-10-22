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
 */

export const OVERGANG_EIND = Date.parse('2026-11-15T00:00:00Z')
const UITNODIGING_DAGEN = 7
const UITNODIGING_KEER = 5
const MAX_SLEUTELS = 30

export const SLEUTEL_HEADER = 'x-planeet-sleutel'

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
  return null
}

// Heeft dit verzoek toegang tot de planeten van deze familie?
export async function heeftToegang(store, code, req) {
  const sleutel = req.headers.get(SLEUTEL_HEADER) || ''
  const reg = (await leesReg(store, code))?.data ?? null
  if (sleutel && reg) {
    const h = await hash(sleutel)
    if (reg.sleutels.some((s) => s.h === h)) return true
  }
  // Overgang: families van vóór de sleutels.
  const tot = reg ? reg.overgangTot || 0 : OVERGANG_EIND
  return Date.now() < tot
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
    reg = reg ? { ...reg, sleutels: [...reg.sleutels], uitnodigingen: (reg.uitnodigingen || []).filter((u) => u.tot > nu && u.over > 0) } : null
    if (uh) {
      const u = reg && reg.uitnodigingen.find((x) => x.h === uh)
      if (u) {
        u.over--
        mag = true
      }
    } else if (!reg) {
      // Eerste apparaat van een nieuwe familie, of een apparaat van vóór de sleutels.
      if (nieuwOfOud === 'nieuw') mag = true
      else if (nu < OVERGANG_EIND) mag = true
      reg = { sleutels: [], uitnodigingen: [], overgangTot: nieuwOfOud === 'oud' ? OVERGANG_EIND : 0 }
    } else if (nu < (reg.overgangTot || 0)) mag = true
    if (!mag) return null
    reg.sleutels.push({ h, sinds: new Date(nu).toISOString() })
    if (reg.sleutels.length > MAX_SLEUTELS) reg.sleutels = reg.sleutels.slice(-MAX_SLEUTELS)
    return { reg, antwoord: sleutel }
  })
}

// Een nieuwe koppel-uitnodiging (alleen voor een apparaat dat zelf al toegang heeft).
export async function maakUitnodiging(store, code) {
  const token = willekeurig(12)
  const h = await hash(token)
  return pasAan(store, code, async (reg) => {
    const nu = Date.now()
    reg = reg ? { ...reg, uitnodigingen: (reg.uitnodigingen || []).filter((u) => u.tot > nu && u.over > 0) } : { sleutels: [], uitnodigingen: [], overgangTot: OVERGANG_EIND }
    reg.uitnodigingen.push({ h, tot: nu + UITNODIGING_DAGEN * 24 * 3600 * 1000, over: UITNODIGING_KEER })
    if (reg.uitnodigingen.length > 10) reg.uitnodigingen = reg.uitnodigingen.slice(-10)
    return { reg, antwoord: { uitnodiging: token, dagen: UITNODIGING_DAGEN, keer: UITNODIGING_KEER } }
  })
}
