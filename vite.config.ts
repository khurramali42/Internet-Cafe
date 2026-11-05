import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
    return {
      server: {
        port: 3000,
        host: '127.0.0.1',
        proxy: {
          '/api.php': {
            target: 'http://127.0.0.1:8012',
            rewrite: () => '/speedy_cafe/api.php',
          },
        },
      },
      plugins: [react()],
      // Same-origin API proxy for local development only; PHP runs separately.
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
