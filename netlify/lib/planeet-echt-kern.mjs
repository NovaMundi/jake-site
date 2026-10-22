// "Maak echt": van een getekend wezen een echt ogend wezen maken, zonder achtergrond, zodat het
// los op de planeet kan rondlopen. Zelfde beeldmotor en uitgangspunt als KIZZO Learn: de vorm, de
// verhoudingen en alle eigenaardigheden van de tekening blijven precies zoals het kind ze maakte.
//
// Gedeelde kern: lokaal via server.mjs, later als Netlify-functie op de sites van de jongens.

const HUID = {
  veren: 'covered in soft, detailed feathers',
  pluizig: 'covered in very fluffy, soft down fur, like a fluffy chick or a pom-pom',
  harig: 'covered in thick, realistic animal fur',
  schubben: 'covered in shiny, detailed reptile or fish scales',
  glad: 'with smooth, slightly glossy skin, like a frog, dolphin or salamander',
  pantser: 'with a hard armored shell and plates, like a turtle, beetle or armadillo',
  stekels: 'covered in spikes and quills, like a hedgehog or porcupine',
};

const BEWEGING = {
  lopen: 'It walks on the ground.',
  huppen: 'It hops around.',
  zwemmen: 'It lives and swims in water.',
  vliegen: 'It can fly.',
  zweven: 'It floats and hovers in the air.',
};

const MAAT = {
  mier: 'It is tiny, the size of an insect.',
  hond: 'It is about the size of a dog.',
  olifant: 'It is large, about the size of an elephant.',
  reus: 'It is a gigantic creature, as big as a dinosaur.',
};

export function opdracht({ huid, beweging, maat }) {
  const delen = [
    "Take this child's drawing of an imaginary creature and turn it into a photorealistic creature, like a high-end nature documentary photo or realistic CGI render.",
    'Keep the original shape, proportions, line lengths, colors and ALL imperfections exactly as they are in the drawing, including uneven or slanted eyes, lopsided parts and strange markings. Do not correct, smooth out, straighten or redesign anything. Keep the same pose and the same facing direction as in the drawing.',
    'The eyes must stay exactly as drawn: the same number of eyes, the same size relative to the body, the same position and the same look. If the drawing has big round eyes, they must stay big and round (as realistic big eyes), never shrink them to small dots.',
    huid && HUID[huid] ? `The creature is ${HUID[huid]}.` : 'Choose realistic skin or fur that fits the drawing.',
    BEWEGING[beweging] || '',
    MAAT[maat] || '',
    'Show the whole creature, full body, nothing cut off, centered, with natural soft lighting.',
    'IMPORTANT: no background, no ground, no scenery, no shadow on the floor, no text. Only the creature itself on a fully transparent background.',
  ];
  return delen.filter(Boolean).join(' ');
}

function naarBuffer(dataUrl) {
  const m = /^data:image\/\w+;base64,(.+)$/.exec(dataUrl || '');
  return Buffer.from(m ? m[1] : dataUrl, 'base64');
}

// Roept OpenAI aan. Geeft een data-URL (png met doorzichtige achtergrond) terug.
export async function maakEcht({ image, huid, beweging, maat }, { sleutel, model = 'gpt-image-1', kwaliteit = 'medium' } = {}) {
  if (!sleutel) {
    const e = new Error('Geen OpenAI-sleutel ingesteld');
    e.status = 501;
    throw e;
  }
  if (!image) {
    const e = new Error('Geen tekening meegestuurd');
    e.status = 400;
    throw e;
  }
  const verstuur = async (metAchtergrond) => {
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', opdracht({ huid, beweging, maat }) + (metAchtergrond ? '' : ' Use a plain pure white background.'));
    form.append('size', '1024x1024');
    form.append('quality', kwaliteit);
    form.append('n', '1');
    if (metAchtergrond) form.append('background', 'transparent');
    form.append('image', new Blob([naarBuffer(image)], { type: 'image/png' }), 'tekening.png');
    return fetch('https://api.openai.com/v1/images/edits', { method: 'POST', headers: { Authorization: 'Bearer ' + sleutel }, body: form });
  };
  let r = await verstuur(true);
  // Mocht het model geen doorzichtige achtergrond ondersteunen: witte achtergrond, die haalt de
  // planeet zelf weg.
  if (!r.ok && r.status === 400) {
    const t = await r.text().catch(() => '');
    if (/background/i.test(t)) r = await verstuur(false);
    else {
      const e = new Error('OpenAI-fout 400: ' + t.slice(0, 300));
      e.status = 502;
      throw e;
    }
  }
  if (!r.ok) {
    const t = await r.text().catch(() => '');
    const e = new Error('OpenAI-fout ' + r.status + ': ' + t.slice(0, 300));
    e.status = 502;
    throw e;
  }
  const data = await r.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) {
    const e = new Error('OpenAI gaf geen beeld terug');
    e.status = 502;
    throw e;
  }
  return 'data:image/png;base64,' + b64;
}
