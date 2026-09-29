import { spawn } from 'child_process';

/**
 * Runs Trivy filesystem vulnerability scanning.
 *
 * @param {string} sourcePath - Absolute path to the repository/folder.
 * @returns {Promise<object>} Parsed Trivy result.
 */
export const runTrivy = (sourcePath) => {
  return new Promise((resolve, reject) => {
    if (!sourcePath || typeof sourcePath !== 'string') {
      return reject(new Error('A valid source path is required.'));
    }

    const args = [
      'fs',
      '--format',
      'json',
      '--scanners',
      'vuln',
      sourcePath,
    ];

    const trivy = spawn('trivy', args, {
      shell: false,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';

    trivy.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    trivy.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    trivy.on('error', (error) => {
      reject(
        new Error(`Failed to start Trivy: ${error.message}`)
      );
    });

    trivy.on('close', (code) => {
      if (code !== 0) {
        return reject(
          new Error(
            `Trivy execution failed with code ${code}: ${stderr.trim()}`
          )
        );
      }

      if (!stdout.trim()) {
        return resolve({});
      }

      try {
        const result = JSON.parse(stdout);
        resolve(result);
      } catch (error) {
        reject(
          new Error(
            `Unable to parse Trivy output: ${error.message}`
          )
        );
      }
    });
  });
};