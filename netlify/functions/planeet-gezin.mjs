/* Ouderportaal en kindaccounts voor de Planeetmakers (zie netlify/lib/planeet-gezin.mjs).
 *
 * Ouder (header x-ouder-sessie, behalve registreren en inloggen):
 *   POST ?actie=registreer      body { email, pin, startcode? }  -> { sessie }
 *   POST ?actie=login           body { email, pin }              -> { sessie }
 *   POST ?actie=uitloggen
 *   GET  ?actie=gezin                                            -> { familie, kinderen, familieplaneet }
 *   POST ?actie=kind            body { naam }                    -> gezin
 *   POST ?actie=kind-zet        body { id, ...instellingen }     -> gezin
 *   POST ?actie=kind-qr         body { id }                      -> gezin (nieuwe link; oude werkt niet meer)
 *   POST ?actie=kind-weg        body { id }                      -> gezin
 *   POST ?actie=gezin-zet       body { familieplaneet }          -> gezin
 * Kind (header x-kind = de geheime link uit de QR-code):
 *   GET  ?actie=ik                                               -> { familie, kind, gezin, familieplaneet }
 *   POST ?actie=publiek         body { planeet, aan }            -> laat een eigen planeet wel/niet zien op de website
 * Iedereen (kijkpagina):
 *   GET  ?actie=etalage&site=owenvanpelt.com                     -> { naam, planeten: [{ id, data }] }
 */
import { getStore } from '@netlify/blobs'
import * as G from '../lib/planeet-gezin.mjs'

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, OPTIONS',
  'access-control-allow-headers': 'content-type, x-ouder-sessie, x-kind',
}
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...CORS } })

export default async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  const url = new URL(req.url)
  const actie = url.searchParams.get('actie')
  const store = getStore('planeten')
  const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
  try {
    // ---- Zonder inloggen ----
    if (actie === 'registreer' && req.method === 'POST') {
      const r = await G.registreer(store, body, req.headers.get('x-nf-client-connection-ip'))
      return json(r, r.fout ? 400 : 200)
    }
    if (actie === 'login' && req.method === 'POST') {
      const r = await G.login(store, body)
      return json(r, r.fout ? r.status || 401 : 200)
    }
    if (actie === 'etalage' && req.method === 'GET') {
      const site = String(url.searchParams.get('site') || '').toLowerCase().replace(/^www\./, '').replace(/[^a-z0-9.-]/g, '')
      const e = await store.get(`_etalage/${site}`, { type: 'json', consistency: 'strong' })
      if (!e) return json({ naam: null, planeten: [] })
      const gezin = (await G.leesGezin(store, e.familie))?.data
      const kind = gezin?.kinderen.find((k) => k.id === e.kind)
      if (!kind) return json({ naam: null, planeten: [] })
      const planeten = []
      for (const id of (kind.publiek || []).slice(0, 5)) {
        if (G.eigenaarVan(id) !== kind.id || G.planeetNummer(id) > kind.planeten) continue
        const doc = await store.get(`${e.familie}/${id}`, { type: 'json', consistency: 'strong' })
        if (doc?.data?.recept) planeten.push({ id, data: { recept: doc.data.recept, wereld: doc.data.wereld || null, foto: doc.data.foto || null } })
      }
      return json({ naam: kind.naam, planeten })
    }

    // ---- Kind ----
    if (actie === 'ik' || actie === 'publiek') {
      const k = await G.kindVan(store, req.headers.get('x-kind'))
      if (!k) return json({ fout: 'Deze QR-code werkt niet (meer). Vraag papa of mama om een nieuwe.' }, 401)
      if (actie === 'ik') return json(G.kindInfo(k))
      const planeet = String(body.planeet || '')
      if (G.eigenaarVan(planeet) !== k.kind.id || G.planeetNummer(planeet) > k.kind.planeten) return json({ fout: 'niet jouw planeet' }, 403)
      await G.pasGezinAan(store, k.familie, (g) => {
        const kind = g.kinderen.find((x) => x.id === k.kind.id)
        const lijst = new Set(kind.publiek || [])
        if (body.aan) lijst.add(planeet)
        else lijst.delete(planeet)
        kind.publiek = [...lijst]
      })
      return json({ ok: true })
    }

    // ---- Ouder ----
    const ouder = await G.ouderVan(store, req)
    if (!ouder) return json({ fout: 'Log opnieuw in.' }, 401)
    const f = ouder.familie
    const terug = async (r) => (r.fout ? json(r, 400) : json(G.gezinVoorOuder(f, r.gezin)))
    if (actie === 'uitloggen') {
      await G.uitloggen(store, req)
      return json({ ok: true })
    }
    if (actie === 'gezin' && req.method === 'GET') return json(G.gezinVoorOuder(f, (await G.leesGezin(store, f))?.data || { kinderen: [], familieplaneet: false }))
    if (req.method !== 'POST') return json({ fout: 'methode niet toegestaan' }, 405)
    if (actie === 'kind') return terug(await G.voegKindToe(store, f, body.naam))
    if (actie === 'kind-zet') return terug(await G.zetKind(store, f, body.id, body))
    if (actie === 'kind-qr') return terug(await G.nieuweQr(store, f, body.id))
    if (actie === 'kind-weg') return terug(await G.verwijderKind(store, f, body.id))
    if (actie === 'gezin-zet') {
      const gezin = await G.pasGezinAan(store, f, (g) => {
        if (body.familieplaneet !== undefined) g.familieplaneet = !!body.familieplaneet
      })
      return json(G.gezinVoorOuder(f, gezin))
    }
    return json({ fout: 'onbekende actie' }, 400)
  } catch (e) {
    console.error('planeet-gezin', actie, e.message)
    return json({ fout: e.message || 'Er ging iets mis.' }, e.status || 500)
  }
}
