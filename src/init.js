'use strict';

const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');

const { renderClaudeSettings } = require('./render');

const CONFIG_FILE     = '.infra/config.json';
const CHANGELOG       = '.infra/CHANGELOG.md';
const CLAUDE_SETTINGS = '.claude/settings.json';
const SKILLS_DIR      = '.claude/skills';
const TEMPLATES_DIR   = path.join(__dirname, '..', 'templates');

async function init() {
  console.log(chalk.bold.cyan('\n🚀 infra-kit init\n'));

  if (fs.existsSync(CONFIG_FILE)) {
    console.log(chalk.yellow('  .infra/config.json already exists. Skipping.\n'));
    return;
  }

  const spinner = ora('Scaffolding project...').start();

  try {
    fs.ensureDirSync('.infra');
    fs.ensureDirSync('.claude');

    const projectName = path.basename(process.cwd());

    // Skeleton config — Claude will fill this in via /infra-setup
    const config = {
      project: projectName,
      infraKitVersion: require('../package.json').version,
      createdAt: new Date().toISOString(),
      server: null,
      services: [],
      scaling: {
        cpuUp: 70,
        cpuDown: 20,
        minReplicas: 1,
        maxReplicas: 6,
      },
      backup: {
        schedule: '0 3 * * *',
        retentionDays: 7,
        s3Bucket: `${projectName}-backups`,
      },
    };

    fs.writeJsonSync(CONFIG_FILE, config, { spaces: 2 });
    spinner.succeed(chalk.green(CONFIG_FILE));

    // CHANGELOG
    fs.writeFileSync(CHANGELOG,
      `# ${projectName} Infra Changelog\n\n- ${config.createdAt}: infra-kit init v${config.infraKitVersion}\n`
    );
    spinner.succeed(chalk.green(CHANGELOG));

    // Copy skills
    const skillsSrc = path.join(TEMPLATES_DIR, 'skills');
    fs.copySync(skillsSrc, SKILLS_DIR);
    spinner.succeed(chalk.green(`${SKILLS_DIR}/ (15 skills installed)`));

    // .claude/settings.json
    const settingsConfig = {
      ...config,
      server: { ip: 'CONFIGURE_ME', port: 22, user: 'root', keyPath: '~/.ssh/id_ed25519' },
    };
    fs.writeFileSync(CLAUDE_SETTINGS, renderClaudeSettings(settingsConfig));
    spinner.succeed(chalk.green(CLAUDE_SETTINGS));

    // .gitignore
    addToGitignore(['.infra/config.json', '.infra/CHANGELOG.md']);
    spinner.succeed(chalk.green('.gitignore updated'));

    console.log(chalk.bold.green('\n✅ Scaffolding complete\n'));
    console.log(chalk.bold('  Available commands:'));
    console.log(chalk.cyan('    /infra-setup       ') + chalk.gray('— configure server and services'));
    console.log(chalk.cyan('    /infra-status      ') + chalk.gray('— health check'));
    console.log(chalk.cyan('    /infra-logs        ') + chalk.gray('— service logs'));
    console.log(chalk.cyan('    /infra-scale       ') + chalk.gray('— scale a service'));
    console.log(chalk.cyan('    /infra-deploy      ') + chalk.gray('— deploy via Coolify'));
    console.log(chalk.cyan('    /infra-rollback    ') + chalk.gray('— rollback a service'));
    console.log(chalk.cyan('    /infra-doctor      ') + chalk.gray('— diagnose issues'));
    console.log('');
    console.log(chalk.bold('  Next step:'));
    console.log(chalk.cyan('    Open Claude Code and type: /infra-setup'));
    console.log('');

  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}

function addToGitignore(entries) {
  const file = '.gitignore';
  let content = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  let changed = false;

  if (!content.includes('# infra-kit')) {
    content += '\n# infra-kit\n';
    changed = true;
  }
  for (const e of entries) {
    if (!content.includes(e)) { content += `${e}\n`; changed = true; }
  }
  if (changed) fs.writeFileSync(file, content);
}

module.exports = { init };
