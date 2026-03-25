'use strict';

const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const { resolveEnv, listEnvs } = require('./env-resolver');

async function generateWorkflow({ env } = {}) {
  console.log(chalk.bold.cyan('\n⚙️  infra-kit generate-workflow\n'));

  const resolved = resolveEnv(env);
  const envs = listEnvs();
  const isMultiEnv = envs.length > 1 && envs[0] !== 'default';

  const workflow = buildWorkflow(resolved, isMultiEnv ? envs : null);

  const dir = '.github/workflows';
  const filePath = path.join(dir, 'deploy.yml');

  fs.ensureDirSync(dir);
  fs.writeFileSync(filePath, workflow);

  console.log(chalk.green(`  ✔ ${filePath} created\n`));

  console.log(chalk.bold('Required GitHub Secrets:'));
  console.log(`  ${chalk.cyan('SSH_PRIVATE_KEY')}    — private key for server access`);
  console.log(`  ${chalk.cyan('SSH_HOST')}           — server IP address`);
  console.log(`  ${chalk.cyan('SSH_USER')}           — SSH username (default: root)`);
  if (resolved.slack) {
    console.log(`  ${chalk.cyan('SLACK_WEBHOOK')}      — Slack webhook URL`);
  }

  if (isMultiEnv) {
    console.log(`\n${chalk.bold('Environments configured:')} ${envs.join(', ')}`);
    console.log(chalk.gray('  Production deploys on push to main'));
    console.log(chalk.gray('  Staging deploys on push to develop/staging'));
  }

  console.log(chalk.gray(`\nAdd secrets at: Settings → Secrets and variables → Actions\n`));
}

function buildWorkflow(resolved, envNames) {
  const project = resolved.project;
  const hasMultiEnv = envNames && envNames.length > 1;

  if (hasMultiEnv) {
    return buildMultiEnvWorkflow(project, envNames);
  }

  return `name: Deploy ${project}

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  PROJECT: ${project}

jobs:
  deploy:
    name: Deploy to production
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: \${{ secrets.SSH_PRIVATE_KEY }}

      - name: Add host key
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H \${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy
        env:
          SSH_HOST: \${{ secrets.SSH_HOST }}
          SSH_USER: \${{ secrets.SSH_USER || 'root' }}
        run: |
          ssh \$SSH_USER@\$SSH_HOST << 'DEPLOY'
            set -e
            echo "Deploying $PROJECT..."

            cd /opt/${project}

            # Pull latest images
            docker compose pull

            # Deploy with zero-downtime
            docker compose up -d --remove-orphans

            # Verify
            docker compose ps

            # Log deployment
            echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Deployed via GitHub Actions (commit: $GITHUB_SHA)" >> /root/.context/${project}/CHANGELOG.md

            echo "Deploy complete!"
          DEPLOY

      - name: Health check
        env:
          SSH_HOST: \${{ secrets.SSH_HOST }}
          SSH_USER: \${{ secrets.SSH_USER || 'root' }}
        run: |
          sleep 10
          ssh \$SSH_USER@\$SSH_HOST << 'CHECK'
            set -e
            echo "Running health checks..."

            # Check all containers are running
            UNHEALTHY=$(docker ps --filter "status=exited" --format "{{.Names}}" | head -5)
            if [ -n "$UNHEALTHY" ]; then
              echo "WARNING: Unhealthy containers: $UNHEALTHY"
              exit 1
            fi

            echo "All containers healthy!"
          CHECK

      - name: Notify Slack (success)
        if: success()
        env:
          SLACK_WEBHOOK: \${{ secrets.SLACK_WEBHOOK }}
        run: |
          if [ -n "$SLACK_WEBHOOK" ]; then
            curl -sf -X POST "$SLACK_WEBHOOK" \\
              -H "Content-Type: application/json" \\
              -d "{\\"text\\":\\"✅ *${project}* deployed successfully\\\\nCommit: \${{ github.sha }}\\\\nBy: \${{ github.actor }}\\"}"
          fi

      - name: Notify Slack (failure)
        if: failure()
        env:
          SLACK_WEBHOOK: \${{ secrets.SLACK_WEBHOOK }}
        run: |
          if [ -n "$SLACK_WEBHOOK" ]; then
            curl -sf -X POST "$SLACK_WEBHOOK" \\
              -H "Content-Type: application/json" \\
              -d "{\\"text\\":\\"❌ *${project}* deploy FAILED\\\\nCommit: \${{ github.sha }}\\\\nBy: \${{ github.actor }}\\\\nCheck: \${{ github.server_url }}/\${{ github.repository }}/actions/runs/\${{ github.run_id }}\\"}"
          fi
`;
}

function buildMultiEnvWorkflow(project, envNames) {
  const hasProd = envNames.includes('production');
  const hasStaging = envNames.includes('staging');

  return `name: Deploy ${project}

on:
  push:
    branches:
      - main${hasStaging ? '\n      - develop\n      - staging' : ''}
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
${envNames.map(e => `          - ${e}`).join('\n')}

env:
  PROJECT: ${project}

jobs:
  resolve-env:
    name: Resolve environment
    runs-on: ubuntu-latest
    outputs:
      environment: \${{ steps.resolve.outputs.env }}
    steps:
      - id: resolve
        run: |
          if [ -n "\${{ inputs.environment }}" ]; then
            echo "env=\${{ inputs.environment }}" >> $GITHUB_OUTPUT
          elif [ "\${{ github.ref_name }}" = "main" ]; then
            echo "env=production" >> $GITHUB_OUTPUT
          else
            echo "env=staging" >> $GITHUB_OUTPUT
          fi

  deploy:
    name: Deploy to \${{ needs.resolve-env.outputs.environment }}
    runs-on: ubuntu-latest
    needs: resolve-env
    environment: \${{ needs.resolve-env.outputs.environment }}

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup SSH
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: \${{ secrets.SSH_PRIVATE_KEY }}

      - name: Add host key
        run: |
          mkdir -p ~/.ssh
          ssh-keyscan -H \${{ secrets.SSH_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy
        env:
          SSH_HOST: \${{ secrets.SSH_HOST }}
          SSH_USER: \${{ secrets.SSH_USER || 'root' }}
          DEPLOY_ENV: \${{ needs.resolve-env.outputs.environment }}
        run: |
          ssh \$SSH_USER@\$SSH_HOST << 'DEPLOY'
            set -e
            echo "Deploying ${project} ($DEPLOY_ENV)..."

            cd /opt/${project}

            # Pull latest images
            docker compose pull

            # Deploy with zero-downtime
            docker compose up -d --remove-orphans

            # Verify
            docker compose ps

            # Log deployment
            echo "- $(date -u +%Y-%m-%dT%H:%M:%SZ): Deployed $DEPLOY_ENV via GitHub Actions (commit: $GITHUB_SHA)" >> /root/.context/${project}/CHANGELOG.md

            echo "Deploy complete!"
          DEPLOY

      - name: Health check
        env:
          SSH_HOST: \${{ secrets.SSH_HOST }}
          SSH_USER: \${{ secrets.SSH_USER || 'root' }}
        run: |
          sleep 10
          ssh \$SSH_USER@\$SSH_HOST << 'CHECK'
            set -e
            echo "Running health checks..."

            UNHEALTHY=$(docker ps --filter "status=exited" --format "{{.Names}}" | head -5)
            if [ -n "$UNHEALTHY" ]; then
              echo "WARNING: Unhealthy containers: $UNHEALTHY"
              exit 1
            fi

            echo "All containers healthy!"
          CHECK

      - name: Notify Slack
        if: always()
        env:
          SLACK_WEBHOOK: \${{ secrets.SLACK_WEBHOOK }}
          DEPLOY_ENV: \${{ needs.resolve-env.outputs.environment }}
          STATUS: \${{ job.status }}
        run: |
          if [ -n "$SLACK_WEBHOOK" ]; then
            ICON=$([ "$STATUS" = "success" ] && echo "✅" || echo "❌")
            curl -sf -X POST "$SLACK_WEBHOOK" \\
              -H "Content-Type: application/json" \\
              -d "{\\"text\\":\\"$ICON *${project}* ($DEPLOY_ENV) — $STATUS\\\\nCommit: \${{ github.sha }}\\\\nBy: \${{ github.actor }}\\"}"
          fi
`;
}

module.exports = { generateWorkflow };
