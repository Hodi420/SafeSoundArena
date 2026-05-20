const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(repoRoot, 'frontend');
const frontendBuildDir = path.join(frontendDir, '.next');
const rootBuildDir = path.join(repoRoot, '.next');
const quotedFrontendDir = frontendDir.replace(/"/g, '\\"');

execSync(`npm --prefix "${quotedFrontendDir}" run build`, {
  cwd: repoRoot,
  stdio: 'inherit',
});

if (!fs.existsSync(frontendBuildDir)) {
  throw new Error(`Expected Next build output at ${frontendBuildDir}`);
}

fs.rmSync(rootBuildDir, { recursive: true, force: true });
fs.cpSync(frontendBuildDir, rootBuildDir, { recursive: true });
