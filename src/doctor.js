'use strict';

const chalk = require('chalk');
const fs = require('fs-extra');
const path = require('path');
const { sshExec } = require('./ssh');

const CHECKS = [
  { name: 'config',         label: '.infra/config.json exists and valid' },
  { name: 'serverMd',       label: '.infra/SERVER.md exists' },
  { name: 'skills',         label: '.claude/skills/ installed' },
  { name: 'claudeSettings', label: '.claude/settings.json exists' },
  { name: 'sshKey',         label: 'SSH key is accessible' },
  { name: 'sshConnection',  label: 'SSH connection to server' },
  { name: 'docker',         label: 'Docker is running on server' },
  { name: 'contextDir',     label: 'Per-project context directory on server' },
  { name: 'servicesRunning', label: 'All services are running' },
  { name: 'portConflicts',  label: 'No port conflicts between projects' },
];

async function doctor({ skipSsh = false, env } = {}) {
  console.log(chalk.bold.cyan('\n🩺 infra-kit doctor\n'));

  const results = [];
  let config = null;
  let project = null;

  // ── Local checks ──────────────────────────────────────────────────────

  // 1. config.json
  if (fs.existsSync('.infra/config.json')) {
    try {
      config = fs.readJsonSync('.infra/config.json');
      const required = ['project', 'server', 'services'];
      const missing = required.filter(k => !config[k] && !(config.environments));
      if (missing.length > 0) {
        results.push(warn('config', `Missing fields: ${missing.join(', ')}`));
      } else {
        results.push(pass('config'));
      }
      project = config.project;
    } catch {
      results.push(fail('config', 'File exists but is not valid JSON. Run: infra-kit init'));
    }
  } else {
    results.push(fail('config', 'Not found. Run: infra-kit init'));
  }

  // 2. SERVER.md
  if (fs.existsSync('.infra/SERVER.md')) {
    results.push(pass('serverMd'));
  } else {
    results.push(fail('serverMd', 'Not found. Run: infra-kit sync'));
  }

  // 3. Skills installed
  if (fs.existsSync('.claude/skills/infra-ops/SKILL.md')) {
    const localOps = fs.readFileSync('.claude/skills/infra-ops/SKILL.md', 'utf8');
    const latestOps = fs.readFileSync(path.join(__dirname, '..', 'templates', 'skills', 'infra-ops', 'SKILL.md'), 'utf8');
    if (localOps === latestOps) {
      results.push(pass('skills'));
    } else {
      results.push(warn('skills', 'Outdated. Run: infra-kit upgrade-skill'));
    }
  } else {
    results.push(fail('skills', 'Not found. Run: infra-kit init'));
  }

  // 4. .claude/settings.json
  if (fs.existsSync('.claude/settings.json')) {
    try {
      const settings = fs.readJsonSync('.claude/settings.json');
      if (settings.mcpServers && settings.permissions) {
        results.push(pass('claudeSettings'));
      } else {
        results.push(warn('claudeSettings', 'Missing mcpServers or permissions. Run: infra-kit init'));
      }
    } catch {
      results.push(fail('claudeSettings', 'Not valid JSON. Run: infra-kit init'));
    }
  } else {
    results.push(fail('claudeSettings', 'Not found. Run: infra-kit init'));
  }

  // Resolve server for SSH checks
  let server = null;
  if (config) {
    if (config.environments) {
      const envName = env || (config.environments.production ? 'production' : Object.keys(config.environments)[0]);
      server = config.environments[envName] ? config.environments[envName].server : null;
    } else {
      server = config.server;
    }
  }

  // 5. SSH key
  if (server && server.keyPath) {
    const keyPath = server.keyPath.replace('~', process.env.HOME);
    if (fs.existsSync(keyPath)) {
      results.push(pass('sshKey'));
    } else {
      results.push(fail('sshKey', `Key not found at ${keyPath}`));
    }
  } else if (server) {
    results.push(warn('sshKey', 'No keyPath in config. Password auth requires --password flag'));
  } else {
    results.push(skip('sshKey', 'No config loaded'));
  }

  // ── Remote checks ─────────────────────────────────────────────────────

  if (skipSsh || !server) {
    const reason = !server ? 'No config loaded' : '--skip-ssh';
    results.push(skip('sshConnection', reason));
    results.push(skip('docker', reason));
    results.push(skip('contextDir', reason));
    results.push(skip('servicesRunning', reason));
    results.push(skip('portConflicts', reason));
    printResults(results);
    return;
  }

  // 6. SSH connection
  try {
    await sshExec(server, 'echo ok');
    results.push(pass('sshConnection'));
  } catch (err) {
    results.push(fail('sshConnection', err.message));
    results.push(skip('docker', 'SSH failed'));
    results.push(skip('contextDir', 'SSH failed'));
    results.push(skip('servicesRunning', 'SSH failed'));
    results.push(skip('portConflicts', 'SSH failed'));
    printResults(results);
    return;
  }

  // 7. Docker
  try {
    const dockerVersion = await sshExec(server, 'docker version --format "{{.Server.Version}}"');
    results.push(pass('docker', `v${dockerVersion}`));
  } catch {
    results.push(fail('docker', 'Docker is not running or not installed'));
  }

  // 8. Per-project context directory
  if (project) {
    try {
      const check = await sshExec(server,
        `test -d /root/.context/${project} && echo "dir=ok" || echo "dir=missing"; ` +
        `test -f /root/.context/${project}/SERVER.md && echo "server_md=ok" || echo "server_md=missing"; ` +
        `test -f /root/.context/${project}/CHANGELOG.md && echo "changelog=ok" || echo "changelog=missing"`
      );
      const dirOk = check.includes('dir=ok');
      const serverMdOk = check.includes('server_md=ok');
      const changelogOk = check.includes('changelog=ok');

      if (dirOk && serverMdOk && changelogOk) {
        results.push(pass('contextDir', `/root/.context/${project}/`));
      } else {
        const missing = [];
        if (!dirOk) missing.push('directory');
        if (!serverMdOk) missing.push('SERVER.md');
        if (!changelogOk) missing.push('CHANGELOG.md');
        results.push(fail('contextDir', `Missing: ${missing.join(', ')}. Run: infra-kit sync`));
      }
    } catch (err) {
      results.push(fail('contextDir', err.message));
    }
  } else {
    results.push(skip('contextDir', 'No project name in config'));
  }

  // 9. All services running
  const services = config.environments
    ? (config.environments[env || 'production'] || config.environments[Object.keys(config.environments)[0]]).services
    : config.services;

  if (services && services.length > 0) {
    try {
      const running = await sshExec(server,
        'docker service ls --format "{{.Name}}" 2>/dev/null || docker ps --format "{{.Names}}"'
      );
      const runningNames = running.split('\n').map(s => s.trim()).filter(Boolean);
      const notRunning = services.filter(s => !runningNames.some(r => r.includes(s.name)));

      if (notRunning.length === 0) {
        results.push(pass('servicesRunning', `${services.length}/${services.length}`));
      } else {
        results.push(fail('servicesRunning',
          `Not running: ${notRunning.map(s => s.name).join(', ')}`
        ));
      }
    } catch (err) {
      results.push(fail('servicesRunning', err.message));
    }
  } else {
    results.push(skip('servicesRunning', 'No services in config'));
  }

  // 10. Port conflicts between projects
  try {
    const indexRaw = await sshExec(server, 'cat /root/.context/INDEX.md 2>/dev/null || echo ""').catch(() => '');
    if (indexRaw.trim()) {
      // Parse all project SERVER.md files for ports
      const projectDirs = await sshExec(server, 'ls -d /root/.context/*/ 2>/dev/null || echo ""').catch(() => '');
      const dirs = projectDirs.split('\n').filter(d => d.trim() && !d.includes('*'));

      const portMap = {}; // port -> [project]
      for (const dir of dirs) {
        const projName = dir.trim().replace(/\/$/, '').split('/').pop();
        try {
          const serverMd = await sshExec(server, `cat ${dir.trim()}SERVER.md 2>/dev/null || echo ""`);
          // Extract ports from the Services table (format: | name | path | port |)
          const portMatches = serverMd.match(/\|\s*\d+\s*\|/g);
          if (portMatches) {
            for (const m of portMatches) {
              const port = m.replace(/[|\s]/g, '');
              if (port && port !== '-') {
                if (!portMap[port]) portMap[port] = [];
                portMap[port].push(projName);
              }
            }
          }
        } catch { /* skip unreadable */ }
      }

      const conflicts = Object.entries(portMap).filter(([, projects]) => projects.length > 1);
      if (conflicts.length === 0) {
        results.push(pass('portConflicts'));
      } else {
        const desc = conflicts.map(([port, projs]) => `port ${port}: ${projs.join(', ')}`).join('; ');
        results.push(warn('portConflicts', desc));
      }
    } else {
      results.push(skip('portConflicts', 'No INDEX.md on server yet'));
    }
  } catch {
    results.push(skip('portConflicts', 'Could not read server context'));
  }

  printResults(results);
}

function pass(name, detail) {
  return { name, status: 'pass', detail };
}

function fail(name, detail) {
  return { name, status: 'fail', detail };
}

function warn(name, detail) {
  return { name, status: 'warn', detail };
}

function skip(name, detail) {
  return { name, status: 'skip', detail };
}

function printResults(results) {
  const icons = {
    pass: chalk.green('✔'),
    fail: chalk.red('✘'),
    warn: chalk.yellow('!'),
    skip: chalk.gray('○'),
  };

  console.log('');
  for (const r of results) {
    const check = CHECKS.find(c => c.name === r.name);
    const icon = icons[r.status];
    const label = check ? check.label : r.name;
    const detail = r.detail ? chalk.gray(` — ${r.detail}`) : '';
    console.log(`  ${icon} ${label}${detail}`);
  }

  const passes = results.filter(r => r.status === 'pass').length;
  const fails = results.filter(r => r.status === 'fail').length;
  const warns = results.filter(r => r.status === 'warn').length;

  console.log('');
  if (fails === 0 && warns === 0) {
    console.log(chalk.bold.green('  All checks passed! Environment is ready.\n'));
  } else if (fails === 0) {
    console.log(chalk.bold.yellow(`  ${passes} passed, ${warns} warning(s). Review warnings above.\n`));
  } else {
    console.log(chalk.bold.red(`  ${passes} passed, ${fails} failed, ${warns} warning(s). Fix issues above.\n`));
  }
}

module.exports = { doctor };
