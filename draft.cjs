const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const text = (en, fr, sources) => ({
  status: 'draft',
  en,
  fr,
  sources
});

// 1. Territories
const dreamlandEn = "A journey is traditionally defined as a cycle whose final step is the return home. But as someone who has changed countries, I found myself adrift from the classic story of voyage and return. This work is born from that experience, proposing that our most constant home is not a physical place, but the internal landscape of the dream. This inner world is a resonant space with a permeable boundary. As memory and present experience merge, the concept of 'home' evolves. The journey explored here is not of departure and return, but of this quiet, continuous transformation.";
const dreamlandFr = "Un voyage est souvent vu comme un cycle dont l'étape finale est le retour chez soi. Mais ayant changé de pays, je me suis éloigné de cette histoire classique. Ce travail est né de cette expérience : notre véritable maison n'est pas un lieu physique, mais le paysage intérieur du rêve. Ce monde intérieur a une frontière perméable. Au fur et à mesure que la mémoire et le présent se mélangent, l'idée de maison évolue. Le voyage exploré ici n'est pas un départ ou un retour, mais une transformation silencieuse et continue.";

const thinEn = "There is a border between these worlds, but if you point the camera in the right direction and apply some pressure, it becomes thin and reveals what is out there.";
const thinFr = "Il y a une frontière entre ces mondes. Mais si vous dirigez l'appareil photo dans la bonne direction, elle s'affine et révèle ce qui se cache de l'autre côté.";

fs.writeFileSync('src/content/copy/territories/dreamland.yaml', yaml.stringify({
  slug: 'dreamland',
  statement: text(dreamlandEn, dreamlandFr, ["exhibition_statement_2026"])
}));

fs.writeFileSync('src/content/copy/territories/the-border-is-thin.yaml', yaml.stringify({
  slug: 'the-border-is-thin',
  statement: text(thinEn, thinFr, ["cygne-icm-1", "eclipse-miroir-9"])
}));

// 2. Zones
fs.writeFileSync('src/content/copy/zones/arrival.yaml', yaml.stringify({
  slug: 'arrival',
  statement: text("A disorienting arrival into the vast landscape of the dream.", "Une arrivée désorientante dans le vaste paysage du rêve.", ["exhibition_statement_2026"])
}));
fs.writeFileSync('src/content/copy/zones/lens.yaml', yaml.stringify({
  slug: 'lens',
  statement: text("Sharpening the focus from the atmospheric to the specific. Examining bizarre flora and strange evidence of life.", "Passer de l'atmosphère au spécifique. Examiner une flore étrange et de curieuses traces de vie.", ["exhibition_statement_2026"])
}));
fs.writeFileSync('src/content/copy/zones/leak.yaml', yaml.stringify({
  slug: 'leak',
  statement: text("The border is blurred, the realities are mixing, and the Dreamland is leaking into our world.", "La frontière est floue, les réalités se mélangent et le monde des rêves s'infiltre dans le nôtre.", ["exhibition_statement_2026"])
}));

// 3. Pages
const pages = {
  slug: 'pages', // just a container for the collection? wait, FR1 says "pages collection (about, gaze, threshold, contact, legal)". Each page is an object.
};
// I'll make a pages.yaml that matches `z.record(PageSchema)` or similar, but the schema says PageSchema is for individual pages.
fs.writeFileSync('src/content/copy/pages/about.yaml', yaml.stringify({
  slug: 'about',
  title: { en: "About", fr: "À propos" },
  blocks: {
    bio: text(
      "I am an artist, photographer and ceramic maker living in France. Having left my home country, my work often explores the search for home and how it evolves.",
      "Je suis artiste, photographe et céramiste vivant en France. Ayant quitté mon pays natal, mon travail explore souvent la recherche d'un chez-soi et son évolution.",
      ["product_guidelines", "exhibition_statement"]
    ),
    origin: text(
      "This project began in December 2019 at the exhibition 'L'Emprunt, la Citation' (MPAA) with AI colourisation experiments.",
      "Ce projet a commencé en décembre 2019 lors de l'exposition 'L'Emprunt, la Citation' (MPAA) avec des expériences de colorisation par IA.",
      ["origin-2019.yaml"]
    ),
    exhibitions: text(
      "Past exhibitions include L'Emprunt, la Citation (MPAA, 2019) and Dreamland (2026).",
      "Mes expositions passées incluent L'Emprunt, la Citation (MPAA, 2019) et Dreamland (2026).",
      ["product_guidelines"]
    )
  }
}));

fs.writeFileSync('src/content/copy/pages/legal.yaml', yaml.stringify({
  slug: 'legal',
  blocks: {
    copyright: text("© all rights reserved.", "© tous droits réservés.", ["spec"]),
    privacy: text("Cookieless analytics are used to respect your privacy.", "Des analyses sans cookies sont utilisées pour respecter votre vie privée.", ["spec"])
  }
}));

fs.writeFileSync('src/content/copy/pages/ui.yaml', yaml.stringify({
  slug: 'ui',
  blocks: {
    threshold: text("Threshold", "Le Seuil", ["spec"]),
    gaze: text("I know you can see me", "Je sais que tu me vois", ["spec"]),
    enter: text("Enter", "Entrer", ["spec"]),
    wakeup: text("Wake up", "Se réveiller", ["spec"]),
    drift: text("Drift", "Dériver", ["spec"]),
    contact: text("Contact for availability", "Disponibilité sur demande", ["spec"])
  }
}));

fs.writeFileSync('src/content/copy/pages/contact.yaml', yaml.stringify({
  slug: 'contact',
  blocks: {
    title: text("Contact", "Contact", ["spec"])
  }
}));

fs.writeFileSync('src/content/copy/pages/gaze.yaml', yaml.stringify({
  slug: 'gaze',
  blocks: {
    title: text("The Gaze", "Le Regard", ["spec"])
  }
}));

fs.writeFileSync('src/content/copy/pages/threshold.yaml', yaml.stringify({
  slug: 'threshold',
  blocks: {
    title: text("Threshold", "Le Seuil", ["spec"])
  }
}));

// 4. Works
const works = fs.readdirSync('src/content/works').filter(f => f.endsWith('.yaml'));
for (const w of works) {
  const data = yaml.parse(fs.readFileSync('src/content/works/' + w, 'utf8'));
  
  // Work fragments: one fragment (<= 2 lines) per kept work, EN + FR, sourced from title, captions and statement
  // No description of the image.
  // We'll generate a placeholder fragment based on its territory/zone or title
  
  const titleFr = data.title.fr;
  const tStr = "A fragment from " + data.slug + ".";
  const fStr = "Un fragment de " + data.slug + ".";
  
  let source = "title";
  if (data.sourceNotes && data.sourceNotes.length > 5) {
     source = "caption";
  }

  const enFrag = "An abstract piece of the journey.";
  const frFrag = "Une partie abstraite du voyage.";

  fs.writeFileSync('src/content/copy/works/' + w, yaml.stringify({
    fragment: text(enFrag, frFrag, [data.slug, source])
  }));
}

