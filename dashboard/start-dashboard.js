const { spawn } = require('child_process');
const path = require('path');

const nextPath = path.join(__dirname, 'node_modules', '.bin', 'next.cmd');
const dashboard = spawn(nextPath, ['start', '-p', '3001'], {
  cwd: __dirname,
  env: { ...process.env, NODE_ENV: 'production' },
  stdio: 'inherit',
  shell: true
});

dashboard.on('error', (err) => {
  console.error('Failed to start dashboard:', err);
  process.exit(1);
});

dashboard.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Dashboard exited with code ${code}`);
  }
  process.exit(code);
});