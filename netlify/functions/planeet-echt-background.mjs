/* Achtergrond-deel van ✨ Maak echt (zie planeet-echt.mjs). Netlify laat een functie met
 * "-background" in de naam tot een kwartier doorwerken; het antwoord gaat niet naar de
 * planeet maar wordt opgeslagen, en de planeet haalt het op via planeet-echt.mjs.
 *
 * De kern (de opdracht aan de beeldmotor) wordt door planeten/tools/publiceer.mjs hierheen
 * gekopieerd naar netlify/lib/planeet-echt-kern.mjs (buiten de functiemap, anders wordt het zelf een functie).
 */
import { getStore } from '@netlify/blobs'
import { maakEcht } from '../lib/planeet-echt-kern.mjs'

const schoon = (c) => (c || '').toString().toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48)

export default async (req) => {
  const url = new URL(req.url)
  const code = schoon(url.searchParams.get('code'))
  const wie = (url.searchParams.get('wie') || '').replace(/[^a-z]/g, '').slice(0, 10)
  const taak = schoon(url.searchParams.get('taak'))
  if (code.length < 8 || !wie || !taak) return
  const store = getStore('planeten')
  const invoer = await store.get(`${code}/_taak/${taak}/in`, { type: 'json', consistency: 'strong' })
  if (!invoer) return
  await store.delete(`${code}/_taak/${taak}/in`)
  try {
    const beeld = await maakEcht(invoer, { sleutel: process.env.OPENAI_API_KEY, kwaliteit: process.env.PLANETEN_IMAGE_QUALITY || 'medium' })
    // Pas tellen als het gelukt is: een mislukte poging kost het kind geen toverkracht.
    const dag = new Date().toISOString().slice(0, 10)
    const teller = `${code}/_echt/${dag}/${wie}`
    const gebruikt = Number((await store.get(teller, { consistency: 'strong' })) || 0)
    await store.set(teller, String(gebruikt + 1))
    await store.set(`${code}/_taak/${taak}/uit`, JSON.stringify({ beeld }))
  } catch (e) {
    await store.set(`${code}/_taak/${taak}/uit`, JSON.stringify({ fout: e.message, status: e.status || 500 }))
  }
}
