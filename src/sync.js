'use strict';

const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');

const { renderServerMd } = require('./render');
const { sshUpload, sshExec } = require('./ssh');
const { resolveEnv } = require('./env-resolver');
const { upsertIndex } = require('./index-md');

async function sync({ env } = {}) {
  console.log(chalk.bold.cyan('\n🔄 infra-kit sync\n'));

  const resolved = resolveEnv(env);
  const config = resolved.config;
  config.lastSyncedAt = new Date().toISOString();

  const spinner = ora('Regenerating SERVER.md...').start();

  try {
    // Render with the resolved environment data
    const renderData = {
      ...config,
      server: resolved.server,
      services: resolved.services,
      scaling: resolved.scaling,
      backup: resolved.backup,
    };

    fs.writeFileSync('.infra/SERVER.md', renderServerMd(renderData));
    spinner.succeed(chalk.green('.infra/SERVER.md updated'));

    fs.writeJsonSync('.infra/config.json', config, { spaces: 2 });

    const remotePath = `/root/.context/${resolved.project}`;
    spinner.start(`Uploading to server → ${resolved.server.ip} [${resolved.envName}]`);
    await sshUpload(resolved.server, '.infra/SERVER.md', `${remotePath}/SERVER.md`);
    await sshExec(resolved.server,
      `echo "- ${config.lastSyncedAt}: SERVER.md synced" >> ${remotePath}/CHANGELOG.md`
    );
    spinner.succeed(chalk.green('Server updated'));

    // Update server-wide INDEX.md
    await upsertIndex(resolved.server, { project: resolved.project, services: resolved.services });

    console.log(chalk.bold.green('\n✅ Sync complete'));
    console.log(chalk.gray(`  ${config.lastSyncedAt}\n`));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}

module.exports = { sync };
