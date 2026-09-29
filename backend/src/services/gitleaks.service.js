import { spawn } from 'child_process';

/**
 * Runs Gitleaks against a local repository/folder.
 *
 * @param {string} sourcePath - Absolute path to the repository/folder.
 * @returns {Promise<object[]>} Parsed Gitleaks findings.
 */
export const runGitleaks = (sourcePath) => {
  return new Promise((resolve, reject) => {
    if (!sourcePath || typeof sourcePath !== 'string') {
      return reject(new Error('A valid source path is required.'));
    }

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

    const gitleaks = spawn('gitleaks', args, {
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    gitleaks.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    gitleaks.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gitleaks.on('error', (error) => {
      reject(
        new Error(`Failed to start Gitleaks: ${error.message}`)
      );
    });

    gitleaks.on('close', (code) => {
      // Gitleaks can return a non-zero exit code when leaks are found.
      // That is a scan result, not necessarily an execution failure.
      if (code !== 0 && code !== 1) {
        return reject(
          new Error(
            `Gitleaks execution failed with code ${code}: ${stderr.trim()}`
          )
        );
      }

      if (!stdout.trim()) {
        return resolve([]);
      }

      try {
        const findings = JSON.parse(stdout);
        resolve(Array.isArray(findings) ? findings : []);
      } catch (error) {
        reject(
          new Error(
            `Unable to parse Gitleaks output: ${error.message}`
          )
        );
      }
    });
  });
};