const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const file = 'src/content/copy/territories/dreamland.yaml';
const doc = yaml.parse(fs.readFileSync(file, 'utf8'));
doc.statement.en = "A journey is traditionally defined as a cycle whose final step is the return home. But as someone who has changed countries, I found myself adrift from the classic story of voyage and return. This work is born from that experience. It proposes that our most constant home is not a physical place, but the internal landscape of the dream. This inner world is a resonant space with a permeable boundary. As memory and present experience merge, the concept of 'home' evolves. The journey explored here is not of departure and return, but of this quiet, continuous transformation.";
fs.writeFileSync(file, yaml.stringify(doc));
