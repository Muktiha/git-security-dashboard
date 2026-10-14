import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

/**
 * Resolves the path to the Gitleaks executable.
 */
export const getGitleaksCommand = () => {
  if (process.env.GITLEAKS_PATH && fs.existsSync(process.env.GITLEAKS_PATH)) {
    return process.env.GITLEAKS_PATH;
  }
  if (process.platform === 'win32') {
    const localAppData = process.env.LOCALAPPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Local');
    const wingetPath = path.join(
      localAppData,
      'Microsoft',
      'WinGet',
      'Packages',
      'Gitleaks.Gitleaks_Microsoft.Winget.Source_8wekyb3d8bbwe',
      'gitleaks.exe'
    );
    if (fs.existsSync(wingetPath)) {
      return wingetPath;
    }
  }
  return 'gitleaks';
};

/**
 * Runs Gitleaks against a local repository/folder.
 *
 * @param {string} sourcePath - Absolute path to the repository/folder.
 * @param {number} [timeoutMs=60000] - Execution timeout in milliseconds.
 * @returns {Promise<object[]>} Parsed Gitleaks findings.
 */
export const runGitleaks = (sourcePath, timeoutMs = 60000) => {
  return new Promise((resolve, reject) => {
    if (!sourcePath || typeof sourcePath !== 'string') {
      return reject(new Error('A valid sourcePath is required.'));
    }

    const executable = getGitleaksCommand();
    const args = [
      'detect',
      '--source',
      sourcePath,
      '--report-format',
      'json',
      '--report-path',
      '-',
      '--no-git',
    ];

    let settled = false;
    const gitleaks = spawn(executable, args, {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        try {
          gitleaks.kill('SIGKILL');
        } catch {
          // Ignore kill error
        }
        reject(new Error(`Gitleaks scan timed out after ${timeoutMs / 1000} seconds.`));
      }
    }, timeoutMs);

    let stdout = '';
    let stderr = '';

    gitleaks.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    gitleaks.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gitleaks.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Failed to start Gitleaks: ${error.message}`));
    });

    gitleaks.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);

      // Gitleaks returns 0 (no leaks) or 1 (leaks detected)
      if (code !== 0 && code !== 1) {
        return reject(
          new Error(`Gitleaks execution failed with code ${code}: ${stderr.trim() || 'Unknown scanner error'}`)
        );
      }

      if (!stdout.trim()) {
        return resolve([]);
      }

      try {
        const findings = JSON.parse(stdout);
        resolve(Array.isArray(findings) ? findings : []);
      } catch (error) {
        reject(new Error(`Unable to parse Gitleaks output: ${error.message}`));
      }
    });
  });
};
