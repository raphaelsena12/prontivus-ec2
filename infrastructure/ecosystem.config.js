/**
 * Configuração PM2 para Prontivus
 * Gerencia o processo Node.js da aplicação Next.js
 */
module.exports = {
  apps: [
    {
      name: 'prontivus',
      script: 'node_modules/.bin/tsx',
      args: 'server.ts',
      cwd: '/opt/prontivus',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      // Carregar variáveis de ambiente do arquivo .env
      env_file: '/opt/prontivus/.env',
      error_file: '/opt/prontivus/logs/pm2-error.log',
      out_file: '/opt/prontivus/logs/pm2-out.log',
      log_file: '/opt/prontivus/logs/pm2-combined.log',
      time: true,
      merge_logs: true,
      autorestart: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      // Configurações de log
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Ignorar arquivos para watch (se habilitado)
      ignore_watch: [
        'node_modules',
        '.next',
        'logs',
        '.git',
        '*.log',
      ],
    },
  ],
};
