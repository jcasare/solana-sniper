module.exports = {
  apps: [
    {
      name: 'solana-monitor-backend',
      script: 'dist/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      error_file: 'logs/backend-error.log',
      out_file: 'logs/backend-out.log',
      log_file: 'logs/backend-combined.log',
      time: true
    },
    {
      name: 'solana-monitor-dashboard',
      script: 'start-dashboard.js',
      cwd: './dashboard',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production'
      },
      error_file: '../logs/dashboard-error.log',
      out_file: '../logs/dashboard-out.log',
      log_file: '../logs/dashboard-combined.log',
      time: true
    }
  ]
};