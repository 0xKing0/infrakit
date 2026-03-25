#!/usr/bin/env node
'use strict';

const { Command } = require('commander');
const chalk = require('chalk');
const program = new Command();

program
  .name('infra-kit')
  .description('AI-ready infrastructure scaffolding — Claude Code integration for bare metal servers')
  .version(require('../package.json').version);

program
  .command('init')
  .description('Scaffold .infra/ and .claude/skills/ — then use /infra-setup in Claude')
  .action(async () => {
    const { init } = require('../src/init');
    await init();
  });

program
  .command('sync')
  .description('Regenerate SERVER.md from config.json and upload to server')
  .option('--env <name>', 'Target environment')
  .action(async (opts) => {
    const { sync } = require('../src/sync');
    await sync(opts);
  });

program
  .command('doctor')
  .description('Verify environment setup — config, SSH, Docker, MCP')
  .option('--skip-ssh', 'Skip remote server checks')
  .option('--env <name>', 'Target environment')
  .action(async (opts) => {
    const { doctor } = require('../src/doctor');
    await doctor(opts);
  });

program
  .command('upgrade-skill')
  .description('Update .claude/skills/ to the latest version')
  .action(async () => {
    const { upgradeSkill } = require('../src/upgrade-skill');
    await upgradeSkill();
  });

program
  .command('generate-workflow')
  .description('Generate GitHub Actions deploy workflow')
  .option('--env <name>', 'Target environment for template')
  .action(async (opts) => {
    const { generateWorkflow } = require('../src/generate-workflow');
    await generateWorkflow(opts);
  });

program.on('command:*', () => {
  console.error(chalk.red(`\nUnknown command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('For available commands: infra-kit --help\n'));
  process.exit(1);
});

if (!process.argv.slice(2).length) {
  program.outputHelp();
} else {
  program.parse(process.argv);
}
