'use strict';

const { Client } = require('ssh2');
const fs = require('fs-extra');
const path = require('path');

function buildConnectOptions(serverConfig) {
  const opts = {
    host: serverConfig.ip,
    port: serverConfig.port || 22,
    username: serverConfig.user,
    readyTimeout: 20000,
  };

  if (serverConfig.keyPath) {
    const keyPath = serverConfig.keyPath.replace('~', process.env.HOME);
    opts.privateKey = fs.readFileSync(keyPath);
  } else if (serverConfig.password) {
    opts.password = serverConfig.password;
  } else {
    throw new Error('Server config requires either keyPath or password');
  }

  return opts;
}

function sshExec(serverConfig, command) {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    let stdout = '';
    let stderr = '';

    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) return reject(err);
        stream.on('close', (code) => {
          conn.end();
          if (code !== 0) reject(new Error(`Exit ${code}: ${stderr}`));
          else resolve(stdout.trim());
        });
        stream.on('data', (d) => { stdout += d; });
        stream.stderr.on('data', (d) => { stderr += d; });
      });
    });

    conn.on('error', reject);
    conn.connect(buildConnectOptions(serverConfig));
  });
}

function sshUpload(serverConfig, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const conn = new Client();

    conn.on('ready', () => {
      conn.exec(`mkdir -p ${path.dirname(remotePath)}`, (err, stream) => {
        if (err) return reject(err);
        stream.on('close', () => {
          conn.sftp((err, sftp) => {
            if (err) return reject(err);
            sftp.fastPut(localPath, remotePath, (err) => {
              conn.end();
              if (err) reject(err);
              else resolve();
            });
          });
        });
        stream.resume();
      });
    });

    conn.on('error', reject);
    conn.connect(buildConnectOptions(serverConfig));
  });
}

module.exports = { sshExec, sshUpload };
