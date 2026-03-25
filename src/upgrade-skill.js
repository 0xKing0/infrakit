'use strict';

const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');

const SKILLS_DIR   = '.claude/skills';
const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

async function upgradeSkill() {
  console.log(chalk.bold.cyan('\n⬆️  infra-kit upgrade-skill\n'));
  const spinner = ora('Updating skills...').start();
  try {
    const skillsSrc = path.join(TEMPLATES_DIR, 'skills');
    fs.copySync(skillsSrc, SKILLS_DIR, { overwrite: true });
    spinner.succeed(chalk.green(`Skills updated to infra-kit v${require('../package.json').version}\n`));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}

module.exports = { upgradeSkill };
