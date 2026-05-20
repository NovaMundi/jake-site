const dinos = [
  // THEROPODEN — VLEESETES
  { naam: "Tyrannosaurus rex",    dieet: "carnivoor", wikipedia: "Tyrannosaurus",       emoji: "🦖", feit: "De T-rex had armpjes die zo kort waren dat hij zichzelf niet eens kon aanraken!" },
  { naam: "Spinosaurus",          dieet: "carnivoor", wikipedia: "Spinosaurus",          emoji: "🦖", feit: "De Spinosaurus was nóg groter dan de T-rex en kon ook zwemmen — hij jaagde op vissen!" },
  { naam: "Velociraptor",         dieet: "carnivoor", wikipedia: "Velociraptor",         emoji: "🦖", feit: "De Velociraptor was eigenlijk niet groter dan een kalkoen — veel kleiner dan in films!" },
  { naam: "Allosaurus",           dieet: "carnivoor", wikipedia: "Allosaurus",           emoji: "🦖", feit: "De Allosaurus was de T-rex van de Jura-tijd, lang voor de T-rex bestond!" },
  { naam: "Giganotosaurus",       dieet: "carnivoor", wikipedia: "Giganotosaurus",       emoji: "🦖", feit: "De Giganotosaurus was groter dan de T-rex en leefde in Zuid-Amerika!" },
  { naam: "Carcharodontosaurus",  dieet: "carnivoor", wikipedia: "Carcharodontosaurus",  emoji: "🦖", feit: "De Carcharodontosaurus had tanden als haaitanden en was bijna zo groot als de T-rex!" },
  { naam: "Baryonyx",             dieet: "carnivoor", wikipedia: "Baryonyx",             emoji: "🦖", feit: "De Baryonyx had een lange krokodilbek en at voornamelijk vissen!" },
  { naam: "Deinonychus",          dieet: "carnivoor", wikipedia: "Deinonychus",          emoji: "🦖", feit: "De Deinonychus joeg in groepen samen, net als wolven!" },
  { naam: "Carnotaurus",          dieet: "carnivoor", wikipedia: "Carnotaurus",          emoji: "🦖", feit: "De Carnotaurus had kleine horentjes op zijn hoofd, net als een stier!" },
  { naam: "Dilophosaurus",        dieet: "carnivoor", wikipedia: "Dilophosaurus",        emoji: "🦖", feit: "De Dilophosaurus had twee hoge kammen op zijn hoofd als een dubbele kuif!" },
  { naam: "Ceratosaurus",         dieet: "carnivoor", wikipedia: "Ceratosaurus",         emoji: "🦖", feit: "De Ceratosaurus had een hoorn op zijn neus, net als een neushoorn!" },
  { naam: "Compsognathus",        dieet: "carnivoor", wikipedia: "Compsognathus",        emoji: "🦖", feit: "De Compsognathus was een van de kleinste dino's: zo groot als een kat!" },
  { naam: "Microraptor",          dieet: "carnivoor", wikipedia: "Microraptor",          emoji: "🦖", feit: "De Microraptor had vier vleugels — twee op zijn armen en twee op zijn benen!" },
  { naam: "Albertosaurus",        dieet: "carnivoor", wikipedia: "Albertosaurus",        emoji: "🦖", feit: "De Albertosaurus was een kleinere neef van de T-rex en leefde in Canada!" },
  { naam: "Gorgosaurus",          dieet: "carnivoor", wikipedia: "Gorgosaurus",          emoji: "🦖", feit: "De Gorgosaurus had scherpe tanden als messen en rende sneller dan de T-rex!" },
  { naam: "Daspletosaurus",       dieet: "carnivoor", wikipedia: "Daspletosaurus",       emoji: "🦖", feit: "De Daspletosaurus betekent 'afschrikwekkende hagedis' — en dat was hij ook!" },
  { naam: "Megalosaurus",         dieet: "carnivoor", wikipedia: "Megalosaurus",         emoji: "🦖", feit: "De Megalosaurus was de allereerste dinosaurus die ooit een officiële naam kreeg, in 1824!" },
  { naam: "Coelophysis",          dieet: "carnivoor", wikipedia: "Coelophysis",          emoji: "🦖", feit: "De Coelophysis was een van de vroegste dino's en leefde al 228 miljoen jaar geleden!" },
  { naam: "Herrerasaurus",        dieet: "carnivoor", wikipedia: "Herrerasaurus",        emoji: "🦖", feit: "De Herrerasaurus was een van de allereerste vleesetende dino's ooit!" },
  { naam: "Rugops",               dieet: "carnivoor", wikipedia: "Rugops",               emoji: "🦖", feit: "De Rugops had een rimpelig gezicht vol gaatjes — wetenschappers denken dat hij aas at!" },
  { naam: "Scipionyx",            dieet: "carnivoor", wikipedia: "Scipionyx",            emoji: "🦖", feit: "Van de Scipionyx zijn zelfs de darmen nog te zien in het fossiel — bijna 100 miljoen jaar oud!" },
  { naam: "Irritator",            dieet: "carnivoor", wikipedia: "Irritator",            emoji: "🦖", feit: "De Irritator kreeg zijn naam omdat wetenschappers zo geïrriteerd waren door hoe het fossiel gevonden was!" },
  { naam: "Suchomimus",           dieet: "carnivoor", wikipedia: "Suchomimus",           emoji: "🦖", feit: "De Suchomimus zag eruit als een krokodil op twee poten en at vissen uit rivieren!" },
  { naam: "Nanuqsaurus",          dieet: "carnivoor", wikipedia: "Nanuqsaurus",          emoji: "🦖", feit: "De Nanuqsaurus was een kleine T-rex die leefde in de Arctische kou van Alaska!" },
  { naam: "Yutyrannus",           dieet: "carnivoor", wikipedia: "Yutyrannus",           emoji: "🦖", feit: "De Yutyrannus was bedekt met lange veren — de grootste gevederde dino ooit gevonden!" },

  // SAUROPODEN — LANGE NEKKEN
  { naam: "Brachiosaurus",        dieet: "herbivoor", wikipedia: "Brachiosaurus",        emoji: "🦕", feit: "De Brachiosaurus was zo groot als een flatgebouw van vier verdiepingen!" },
  { naam: "Diplodocus",           dieet: "herbivoor", wikipedia: "Diplodocus",           emoji: "🦕", feit: "De Diplodocus had een staart van 14 meter — hij kon ermee knallen als een zweep!" },
  { naam: "Argentinosaurus",      dieet: "herbivoor", wikipedia: "Argentinosaurus",      emoji: "🦕", feit: "De Argentinosaurus was het zwaarste dier ooit op land: misschien wel 80.000 kilo!" },
  { naam: "Brontosaurus",         dieet: "herbivoor", wikipedia: "Brontosaurus",         emoji: "🦕", feit: "De Brontosaurus at elke dag meer dan 400 kilo aan planten — net als een heel buffet!" },
  { naam: "Apatosaurus",          dieet: "herbivoor", wikipedia: "Apatosaurus",          emoji: "🦕", feit: "De Apatosaurus kon met zijn staart een harde knal maken — harder dan een blikseminslag!" },
  { naam: "Mamenchisaurus",       dieet: "herbivoor", wikipedia: "Mamenchisaurus",       emoji: "🦕", feit: "De Mamenchisaurus had de langste nek van alle dino's: meer dan 15 meter!" },
  { naam: "Sauroposeidon",        dieet: "herbivoor", wikipedia: "Sauroposeidon",        emoji: "🦕", feit: "De Sauroposeidon was misschien wel 18 meter hoog — hij kon over een flatgebouw heen kijken!" },
  { naam: "Amargasaurus",         dieet: "herbivoor", wikipedia: "Amargasaurus",         emoji: "🦕", feit: "De Amargasaurus had twee rijen stekels op zijn nek — misschien om er groot en eng mee uit te zien!" },
  { naam: "Camarasaurus",         dieet: "herbivoor", wikipedia: "Camarasaurus",         emoji: "🦕", feit: "De Camarasaurus heeft holtes in zijn botten zodat hij niet te zwaar werd voor zijn poten!" },
  { naam: "Nigersaurus",          dieet: "herbivoor", wikipedia: "Nigersaurus",          emoji: "🦕", feit: "De Nigersaurus had meer dan 500 tandjes en at gras als een levende grasmaaier!" },
  { naam: "Patagotitan",          dieet: "herbivoor", wikipedia: "Patagotitan",          emoji: "🦕", feit: "De Patagotitan is misschien wel de allergrootste dino ooit — zo lang als drie schoolbussen achter elkaar!" },
  { naam: "Dreadnoughtus",        dieet: "herbivoor", wikipedia: "Dreadnoughtus",        emoji: "🦕", feit: "De Dreadnoughtus woog zoveel als een dozijn olifanten bij elkaar!" },
  { naam: "Magyarosaurus",        dieet: "herbivoor", wikipedia: "Magyarosaurus",        emoji: "🦕", feit: "De Magyarosaurus was een lange-nek dino zo klein als een paard — door het eiland waar hij leefde!" },

  // CERATOPSIDEN — HOORNDINO'S
  { naam: "Triceratops",          dieet: "herbivoor", wikipedia: "Triceratops",          emoji: "🦕", feit: "De Triceratops had drie hoorns en een brede nekkraag om zichzelf te beschermen!" },
  { naam: "Styracosaurus",        dieet: "herbivoor", wikipedia: "Styracosaurus",        emoji: "🦕", feit: "De Styracosaurus had zes lange stekels op zijn nekkraag — hij zag eruit als een zon!" },
  { naam: "Pachyrhinosaurus",     dieet: "herbivoor", wikipedia: "Pachyrhinosaurus",     emoji: "🦕", feit: "De Pachyrhinosaurus had geen hoorn maar een dikke bottige bult op zijn neus!" },
  { naam: "Zuniceratops",         dieet: "herbivoor", wikipedia: "Zuniceratops",         emoji: "🦕", feit: "De Zuniceratops was de voorouder van de Triceratops en had al twee hoorns!" },
  { naam: "Protoceratops",        dieet: "herbivoor", wikipedia: "Protoceratops",        emoji: "🦕", feit: "De Protoceratops werd gevonden terwijl hij vocht met een Velociraptor — ze werden samen begraven!" },
  { naam: "Psittacosaurus",       dieet: "herbivoor", wikipedia: "Psittacosaurus",       emoji: "🦕", feit: "De Psittacosaurus had een snavel als een papegaai en lange stekels op zijn staart!" },
  { naam: "Pentaceratops",        dieet: "herbivoor", wikipedia: "Pentaceratops",        emoji: "🦕", feit: "De Pentaceratops had vijf hoorns en de grootste schedel van alle landdieren ooit!" },
  { naam: "Kosmoceratops",        dieet: "herbivoor", wikipedia: "Kosmoceratops",        emoji: "🦕", feit: "De Kosmoceratops had maar liefst 15 hoorns op zijn hoofd — de meeste van alle dino's!" },
  { naam: "Sinoceratops",         dieet: "herbivoor", wikipedia: "Sinoceratops",         emoji: "🦕", feit: "De Sinoceratops was de grootste hoorn-dino die ooit in China gevonden is!" },
  { naam: "Centrosaurus",         dieet: "herbivoor", wikipedia: "Centrosaurus",         emoji: "🦕", feit: "Er zijn overblijfselen van duizenden Centrosaurussen samen gevonden — ze leefden in grote kuddes!" },

  // HADROSAURIDEN — EENDENSNAVELDINO'S
  { naam: "Parasaurolophus",      dieet: "herbivoor", wikipedia: "Parasaurolophus",      emoji: "🦕", feit: "De Parasaurolophus had een holle bult op zijn hoofd waarmee hij geluid maakte als een trompet!" },
  { naam: "Corythosaurus",        dieet: "herbivoor", wikipedia: "Corythosaurus",        emoji: "🦕", feit: "De Corythosaurus had een helm op zijn hoofd waarmee hij kon communiceren!" },
  { naam: "Edmontosaurus",        dieet: "herbivoor", wikipedia: "Edmontosaurus",        emoji: "🦕", feit: "De Edmontosaurus had wel 1.000 kleine tandjes om mee te malen — als een levend gebit!" },
  { naam: "Maiasaura",            dieet: "herbivoor", wikipedia: "Maiasaura",            emoji: "🦕", feit: "De Maiasaura zorgde goed voor haar jongen in het nest — haar naam betekent goede moederdino!" },
  { naam: "Lambeosaurus",         dieet: "herbivoor", wikipedia: "Lambeosaurus",         emoji: "🦕", feit: "De Lambeosaurus had een bijlvormige kam op zijn kop — uniek onder alle dino's!" },
  { naam: "Saurolophus",          dieet: "herbivoor", wikipedia: "Saurolophus",          emoji: "🦕", feit: "De Saurolophus leefde zowel in Noord-Amerika als in Azië — aan beide kanten van de oceaan!" },
  { naam: "Tsintaosaurus",        dieet: "herbivoor", wikipedia: "Tsintaosaurus",        emoji: "🦕", feit: "De Tsintaosaurus had een lange punt op zijn voorhoofd, net als een eenhoorn!" },
  { naam: "Hypacrosaurus",        dieet: "herbivoor", wikipedia: "Hypacrosaurus",        emoji: "🦕", feit: "De Hypacrosaurus groep zo snel dat hij in drie jaar al volwassen was!" },

  // ANKYLOSAURIDEN — GEPANTSERDE DINO'S
  { naam: "Ankylosaurus",         dieet: "herbivoor", wikipedia: "Ankylosaurus",         emoji: "🦕", feit: "De Ankylosaurus had een knots aan het einde van zijn staart om vijanden te verslaan!" },
  { naam: "Euoplocephalus",       dieet: "herbivoor", wikipedia: "Euoplocephalus",       emoji: "🦕", feit: "De Euoplocephalus had zelfs oogleden van bot — hij was helemaal bepantserd!" },
  { naam: "Edmontonia",           dieet: "herbivoor", wikipedia: "Edmontonia",           emoji: "🦕", feit: "De Edmontonia had lange scherpe stekels op zijn schouders om roofdieren te doorprikken!" },
  { naam: "Scelidosaurus",        dieet: "herbivoor", wikipedia: "Scelidosaurus",        emoji: "🦕", feit: "De Scelidosaurus was een van de eerste bepantserde dino's, bedekt met botplaten!" },
  { naam: "Polacanthus",          dieet: "herbivoor", wikipedia: "Polacanthus",          emoji: "🦕", feit: "De Polacanthus had zo veel stekels dat zelfs een T-rex hem niet kon bijten!" },
  { naam: "Minmi",                dieet: "herbivoor", wikipedia: "Minmi",                emoji: "🦕", feit: "De Minmi was de kleinste gepantserde dino ooit gevonden, gevonden in Australië!" },

  // STEGOSAURIDEN — PLAATRUGDINO'S
  { naam: "Stegosaurus",          dieet: "herbivoor", wikipedia: "Stegosaurus",          emoji: "🦕", feit: "De Stegosaurus had een brein ter grootte van een walnoot, maar woog wel 5.000 kilo!" },
  { naam: "Kentrosaurus",         dieet: "herbivoor", wikipedia: "Kentrosaurus",         emoji: "🦕", feit: "De Kentrosaurus was de stekeligste van allemaal: stekels op zijn rug, zij én staart!" },
  { naam: "Huayangosaurus",       dieet: "herbivoor", wikipedia: "Huayangosaurus",       emoji: "🦕", feit: "De Huayangosaurus was een van de vroegste plaatrugdino's — hij leefde al 165 miljoen jaar geleden!" },
  { naam: "Tuojiangosaurus",      dieet: "herbivoor", wikipedia: "Tuojiangosaurus",      emoji: "🦕", feit: "De Tuojiangosaurus had maar liefst 17 paar puntige platen op zijn rug!" },
  { naam: "Miragaia",             dieet: "herbivoor", wikipedia: "Miragaia",             emoji: "🦕", feit: "De Miragaia had de langste nek van alle plaatrugdino's — bijna als een kleine Brachiosaurus!" },

  // PACHYCEPHALOSAURIDEN — DIKSCHEDELDINO'S
  { naam: "Pachycephalosaurus",   dieet: "herbivoor", wikipedia: "Pachycephalosaurus",   emoji: "🦖", feit: "De Pachycephalosaurus had een schedel van 25 centimeter dik — hij bonsde ermee tegen rivalen!" },
  { naam: "Stegoceras",           dieet: "herbivoor", wikipedia: "Stegoceras",           emoji: "🦖", feit: "De Stegoceras was een kleine dikschedeldino zo groot als een hond, maar met een harde kop!" },
  { naam: "Dracorex",             dieet: "herbivoor", wikipedia: "Dracorex",             emoji: "🦖", feit: "De Dracorex zag eruit als een echte draak met zijn stekels en hoorntjes op zijn kop!" },

  // ORNITHOPODEN — VOGELPOOTDINO'S
  { naam: "Iguanodon",            dieet: "herbivoor", wikipedia: "Iguanodon",            emoji: "🦕", feit: "De Iguanodon had een stekelige duim waarmee hij zichzelf verdedigde!" },
  { naam: "Tenontosaurus",        dieet: "herbivoor", wikipedia: "Tenontosaurus",        emoji: "🦕", feit: "De Tenontosaurus werd vaak aangevallen door groepen Deinonychus — zijn ergste vijand!" },
  { naam: "Camptosaurus",         dieet: "herbivoor", wikipedia: "Camptosaurus",         emoji: "🦕", feit: "De Camptosaurus kon zowel op twee als op vier poten lopen, net wat hem uitkwam!" },
  { naam: "Dryosaurus",           dieet: "herbivoor", wikipedia: "Dryosaurus",           emoji: "🦕", feit: "De Dryosaurus was een snelle loper — zijn lange achterpoten maakten hem bijna onmogelijk te vangen!" },
  { naam: "Thescelosaurus",       dieet: "herbivoor", wikipedia: "Thescelosaurus",       emoji: "🦕", feit: "Van een Thescelosaurus werd een versteend hart gevonden — het eerste dino-hart ooit!" },

  // THERIZINOSAURIA — KLAUWDINO'S
  { naam: "Therizinosaurus",      dieet: "herbivoor", wikipedia: "Therizinosaurus",      emoji: "🦕", feit: "De Therizinosaurus had klauwen van bijna een meter lang — de langste klauwen ooit!" },
  { naam: "Beipiaosaurus",        dieet: "herbivoor", wikipedia: "Beipiaosaurus",        emoji: "🦕", feit: "De Beipiaosaurus was bedekt met veren maar at alleen planten — een vleesetende vorm die planteter werd!" },
  { naam: "Segnosaurus",          dieet: "herbivoor", wikipedia: "Segnosaurus",          emoji: "🦕", feit: "De Segnosaurus zag er zo raar uit dat wetenschappers lang niet wisten welke soort dino het was!" },

  // ALLESETES
  { naam: "Oviraptor",            dieet: "omnivoor",  wikipedia: "Oviraptor",            emoji: "🦖", feit: "De Oviraptor at geen eieren zoals lang gedacht — hij zat op zijn eigen nest!" },
  { naam: "Gallimimus",           dieet: "omnivoor",  wikipedia: "Gallimimus",           emoji: "🦖", feit: "De Gallimimus was de snelste grote dino — hij kon rennen als een struisvogel!" },
  { naam: "Troodon",              dieet: "omnivoor",  wikipedia: "Troodon",              emoji: "🦖", feit: "De Troodon had het grootste brein ten opzichte van zijn lichaamsgrootte van alle dino's!" },
  { naam: "Eoraptor",             dieet: "omnivoor",  wikipedia: "Eoraptor",             emoji: "🦖", feit: "De Eoraptor was een van de allereerste dino's ooit — hij leefde 231 miljoen jaar geleden!" },
  { naam: "Plateosaurus",         dieet: "omnivoor",  wikipedia: "Plateosaurus",         emoji: "🦕", feit: "De Plateosaurus kon zowel op vier als op twee poten lopen, net wat hem het beste uitkwam!" },
  { naam: "Brachylophosaurus",    dieet: "herbivoor", wikipedia: "Brachylophosaurus",    emoji: "🦕", feit: "Van de Brachylophosaurus zijn zelfs stukjes huid en spieren gevonden in de rots!" },

  // VLIEGENDE REPTIELEN (tijdgenoten)
  { naam: "Pteranodon",           dieet: "carnivoor", wikipedia: "Pteranodon",           emoji: "🦖", feit: "De Pteranodon had een spanwijdte van 7 meter en ving vissen net als een reusachtige pelikaan!" },
  { naam: "Quetzalcoatlus",       dieet: "carnivoor", wikipedia: "Quetzalcoatlus",       emoji: "🦖", feit: "De Quetzalcoatlus was zo groot als een klein vliegtuig en kon ook lopen op vier poten!" },
  { naam: "Pterodactylus",        dieet: "carnivoor", wikipedia: "Pterodactylus",        emoji: "🦖", feit: "De Pterodactylus was zo klein als een merel — lang niet zo groot als veel mensen denken!" },

  // ZEEREPTIEREN (tijdgenoten)
  { naam: "Mosasaurus",           dieet: "carnivoor", wikipedia: "Mosasaurus",           emoji: "🦖", feit: "De Mosasaurus was een zeereptiel die groter was dan een bus en alles opat wat hij kon vinden!" },
  { naam: "Plesiosaurus",         dieet: "carnivoor", wikipedia: "Plesiosaurus",         emoji: "🦕", feit: "De Plesiosaurus leefde in zee en had een nek zo lang als een giraffe!" },
  { naam: "Kronosaurus",          dieet: "carnivoor", wikipedia: "Kronosaurus",          emoji: "🦖", feit: "De Kronosaurus had een kop van 2 meter lang — bijna net zo groot als een volwassen mens!" },
];

export default dinos;
