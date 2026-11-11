const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const file = 'src/content/copy/territories/the-border-is-thin.yaml';
const doc = yaml.parse(fs.readFileSync(file, 'utf8'));
doc.statement.en = "There is a border between these worlds. If you point the camera in the right direction and apply some pressure, it becomes thin and reveals what is out there.";
fs.writeFileSync(file, yaml.stringify(doc));
