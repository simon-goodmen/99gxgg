module.exports = {
  apps: [
    {
      name: '99gxgg-admin',
      script: './index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: process.env.PORT || 5001
      }
    }
  ]
};
