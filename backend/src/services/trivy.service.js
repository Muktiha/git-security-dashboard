import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Resolves the path to the Trivy executable.
 */
export const getTrivyCommand = () => {
  if (process.env.TRIVY_PATH && fs.existsSync(process.env.TRIVY_PATH)) {
    return process.env.TRIVY_PATH;
  }
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
    const wingetPath = path.join(
      localAppData,
      'Microsoft',
      'WinGet',
      'Packages',
      'AquaSecurity.Trivy_Microsoft.Winget.Source_8wekyb3d8bbwe',
      'trivy.exe'
    );
    if (fs.existsSync(wingetPath)) {
      return wingetPath;
    }
  }
  return 'trivy';
};

/**
 * Runs Trivy filesystem vulnerability scanning.
 *
 * @param {string} sourcePath - Absolute path to the repository/folder.
 * @param {number} [timeoutMs=90000] - Execution timeout in milliseconds.
 * @returns {Promise<object>} Parsed Trivy result.
 */
export const runTrivy = (sourcePath, timeoutMs = 90000) => {
  return new Promise((resolve, reject) => {
    if (!sourcePath || typeof sourcePath !== 'string') {
      return reject(new Error('A valid source path is required.'));
    }

    const executable = getTrivyCommand();
    const args = [
      'fs',
      '--format',
      'json',
      '--scanners',
      'vuln',
      sourcePath,
    ];

    let settled = false;
    const trivy = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          trivy.kill('SIGKILL');
        } catch {
          // Ignore kill error
        }
        reject(new Error(`Trivy scan timed out after ${timeoutMs / 1000} seconds.`));
      }
    }, timeoutMs);

    let stdout = '';
    let stderr = '';

    trivy.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    trivy.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    trivy.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Failed to start Trivy: ${error.message}`));
    });

    trivy.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      if (code !== 0) {
        return reject(
          new Error(`Trivy execution failed with code ${code}: ${stderr.trim() || 'Unknown scanner error'}`)
        );
      }

      if (!stdout.trim()) {
        return resolve({});
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(new Error(`Unable to parse Trivy output: ${error.message}`));
      }
    });
  });
};