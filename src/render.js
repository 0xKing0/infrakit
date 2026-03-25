'use strict';

const Handlebars = require('handlebars');
const fs = require('fs-extra');
const path = require('path');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

Handlebars.registerHelper('now', () => new Date().toISOString());
Handlebars.registerHelper('dash', (val) => val || '-');
Handlebars.registerHelper('replace', (str, from, to) =>
  typeof str === 'string' ? str.split(from).join(to) : str
);
Handlebars.registerHelper('stripProject', (name, project) =>
  typeof name === 'string' ? name.replace(`${project}-`, '') : name
);

function render(templateName, config) {
  const src = fs.readFileSync(path.join(TEMPLATES_DIR, templateName), 'utf8');
  return Handlebars.compile(src)(config);
}

module.exports = {
  renderServerMd: (config) => render('SERVER.md.hbs', config),
  renderClaudeSettings: (config) => render('claude-settings.json.hbs', config),
};
