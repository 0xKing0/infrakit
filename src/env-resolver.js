'use strict';

const chalk = require('chalk');
const fs = require('fs-extra');

/**
 * Loads config and resolves the target server based on --env flag.
 *
 * Config formats supported:
 *   - Single server: { server: {...}, services: [...] }
 *   - Multi-env:     { environments: { production: { server, services }, staging: { server, services } } }
 *
 * Returns { server, services, project, envName, config (full) }
 */
function resolveEnv(env) {
  if (!fs.existsSync('.infra/config.json')) {
    console.error(chalk.red('Error: .infra/config.json not found. Run: infra-kit init'));
    process.exit(1);
  }

  const config = fs.readJsonSync('.infra/config.json');

  // Multi-environment config
  if (config.environments) {
    const envNames = Object.keys(config.environments);

    if (!env) {
      // Default to first environment, or 'production' if it exists
      env = envNames.includes('production') ? 'production' : envNames[0];
    }

    const envConfig = config.environments[env];
    if (!envConfig) {
      console.error(chalk.red(`Error: Environment "${env}" not found.`));
      console.log(chalk.gray(`Available: ${envNames.join(', ')}`));
      process.exit(1);
    }

    return {
      server: envConfig.server,
      services: envConfig.services || config.services,
      project: config.project,
      envName: env,
      config,
      scaling: envConfig.scaling || config.scaling,
      backup: envConfig.backup || config.backup,
      };
  }

  // Single server config (backward compatible)
  return {
    server: config.server,
    services: config.services,
    project: config.project,
    envName: env || 'default',
    config,
    scaling: config.scaling,
    backup: config.backup,
  };
}

/**
 * Lists all available environment names.
 */
function listEnvs() {
  if (!fs.existsSync('.infra/config.json')) return [];
  const config = fs.readJsonSync('.infra/config.json');
  if (config.environments) return Object.keys(config.environments);
  return ['default'];
}

module.exports = { resolveEnv, listEnvs };
