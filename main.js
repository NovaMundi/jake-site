import dinos from './dinos.js';

const DIEET_INFO = {
  carnivoor: { icoon: '🥩', label: 'Vleeseters' },
  herbivoor: { icoon: '🌿', label: 'Planteneters' },
  omnivoor:  { icoon: '🌿🥩', label: 'Alleseters' },
};

// Bereken de dino van vandaag op basis van de dag van het jaar
const nu = new Date();
const jaarStart = new Date(nu.getFullYear(), 0, 0);
const dagVanHetJaar = Math.floor((nu - jaarStart) / (1000 * 60 * 60 * 24));
let huidigIndex = dagVanHetJaar % dinos.length;

// Haal een levensechte reconstructie op uit de Wikimedia Commons categorie
// "X life restorations" — altijd tekeningen/schilderijen, nooit skeletten
async function haalReconstructieOp(wikipedia) {
  const categorie = `${wikipedia} life restorations`;
  try {
    const url =
      `https://commons.wikimedia.org/w/api.php` +
      `?action=query` +
      `&generator=categorymembers` +
      `&gcmtitle=${encodeURIComponent('Category:' + categorie)}` +
      `&gcmtype=file` +
      `&gcmlimit=1` +
      `&prop=imageinfo` +
      `&iiprop=url` +
      `&iiurlwidth=500` +
      `&format=json` +
      `&origin=*`;
    const resp = await fetch(url);
    const data = await resp.json();
    const pages = data.query?.pages;
    if (!pages) return null;
    const eerste = Object.values(pages)[0];
    return eerste?.imageinfo?.[0]?.thumburl ?? null;
  } catch {
    return null;
  }
}

async function toonDino(index) {
  const dino = dinos[index];
  const dieetInfo = DIEET_INFO[dino.dieet];

  // Tekst direct invullen
  document.getElementById('dino-naam').textContent = dino.naam;
  document.getElementById('dino-feit').textContent = dino.feit;
  document.getElementById('dino-emoji').textContent = dino.emoji;

  // Dieet badge
  const badge = document.getElementById('dieet-badge');
  badge.className = `dieet-badge ${dino.dieet}`;
  document.getElementById('dieet-icoon').textContent = dieetInfo.icoon;
  document.getElementById('dieet-label').textContent = dieetInfo.label;

  // Toon emoji als tijdelijke placeholder, vervang door reconstructie zodra die binnen is
  const imgEl = document.getElementById('dino-afbeelding');
  const emojiEl = document.getElementById('dino-emoji');
  imgEl.classList.add('verborgen');
  emojiEl.classList.remove('verborgen');

  const afbeeldingUrl = await haalReconstructieOp(dino.wikipedia);
  if (afbeeldingUrl) {
    imgEl.src = afbeeldingUrl;
    imgEl.alt = dino.naam;
    imgEl.onload = () => {
      emojiEl.classList.add('verborgen');
      imgEl.classList.remove('verborgen');
    };
  }
}

// Spreekknop — Web Speech API (gratis, ingebouwd in browser)
document.getElementById('spreek-knop').addEventListener('click', () => {
  const naam = document.getElementById('dino-naam').textContent;
  const knop = document.getElementById('spreek-knop');

  if (speechSynthesis.speaking) {
    speechSynthesis.cancel();
    knop.classList.remove('aan-het-spreken');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(naam);
  utterance.lang = 'nl-NL';
  utterance.rate = 0.8;
  utterance.onstart = () => knop.classList.add('aan-het-spreken');
  utterance.onend   = () => knop.classList.remove('aan-het-spreken');
  speechSynthesis.speak(utterance);
});

// Willekeurige nieuwe dino (niet dezelfde als huidige)
document.getElementById('nog-een-knop').addEventListener('click', () => {
  let nieuweIndex;
  do {
    nieuweIndex = Math.floor(Math.random() * dinos.length);
  } while (nieuweIndex === huidigIndex);
  huidigIndex = nieuweIndex;

  ['dino-naam', 'dino-feit'].forEach(id => {
    document.getElementById(id).style.opacity = '0';
  });
  setTimeout(() => {
    toonDino(huidigIndex);
    ['dino-naam', 'dino-feit'].forEach(id => {
      const el = document.getElementById(id);
      el.style.transition = 'opacity 0.3s';
      el.style.opacity = '1';
    });
  }, 200);
});

toonDino(huidigIndex);
