'use strict';

const { sshExec } = require('./ssh');

/**
 * Upserts the server-wide /root/.context/INDEX.md file.
 * If the project row exists, updates it. Otherwise appends it.
 */
async function upsertIndex(serverConfig, config) {
  const project = config.project;
  const services = (config.services || []).map(s => s.name.replace(`${project}-`, '')).join(', ');
  const now = new Date().toISOString().split('T')[0];
  const contextPath = `/root/.context/${project}/`;

  // Read existing INDEX.md or create skeleton
  const existing = await sshExec(serverConfig, 'cat /root/.context/INDEX.md 2>/dev/null || echo ""').catch(() => '');

  if (!existing.trim()) {
    // Create fresh INDEX.md
    const content = [
      '# Server Index',
      `_Last updated: ${new Date().toISOString()}_`,
      '',
      '| Project | Context Path | Services | Last Sync |',
      '|---|---|---|---|',
      `| ${project} | ${contextPath} | ${services} | ${now} |`,
    ].join('\n');

    await sshExec(serverConfig, `cat > /root/.context/INDEX.md << 'INDEXEOF'\n${content}\nINDEXEOF`);
    return;
  }

  // Check if project row already exists
  const hasProject = existing.includes(`| ${project} |`);

  if (hasProject) {
    // Update existing row — use sed to replace the line
    const newRow = `| ${project} | ${contextPath} | ${services} | ${now} |`;
    const escapedRow = newRow.replace(/\//g, '\\/').replace(/\|/g, '\\|');
    await sshExec(serverConfig,
      `sed -i "s/| ${project} |.*/${escapedRow}/" /root/.context/INDEX.md`
    );
  } else {
    // Append new row
    const newRow = `| ${project} | ${contextPath} | ${services} | ${now} |`;
    await sshExec(serverConfig,
      `echo '${newRow}' >> /root/.context/INDEX.md`
    );
  }

  // Update timestamp
  await sshExec(serverConfig,
    `sed -i "s/_Last updated:.*/_Last updated: ${new Date().toISOString()}_/" /root/.context/INDEX.md`
  );
}

module.exports = { upsertIndex };
