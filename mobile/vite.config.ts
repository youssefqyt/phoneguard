import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    root: __dirname,
    plugins: [react()],
    resolve: {
      alias: [
        {
          find: /^react-native$/,
          replacement: 'react-native-web',
        },
        {
          find: /^react-native-safe-area-context$/,
          replacement: path.resolve(
            __dirname,
            'node_modules/react-native-safe-area-context/lib/module/index.js',
          ),
        },
        {
          find: /^react-native-screens$/,
          replacement: path.resolve(
            __dirname,
            'src/web/react-native-screens.tsx',
          ),
        },
      ],
      extensions: [
        '.web.tsx',
        '.web.ts',
        '.tsx',
        '.ts',
        '.web.jsx',
        '.web.js',
        '.jsx',
        '.js',
        '.json',
      ],
    },
    define: {
      __PHONEGUARD_API_URL__: JSON.stringify(
        env.VITE_API_URL ?? env.API_URL ?? '',
      ),
    },
    optimizeDeps: {
      exclude: ['react-native', 'react-native-safe-area-context'],
    },
    server: {
      host: '127.0.0.1',
    },
    preview: {
      host: '127.0.0.1',
    },
    build: {
      outDir: path.resolve(__dirname, 'dist'),
      emptyOutDir: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('/node_modules/@react-navigation/')) {
              return 'navigation';
            }
            if (
              id.includes('/node_modules/react-native-web/') ||
              id.includes('/node_modules/react-dom/') ||
              id.includes('/node_modules/react/')
            ) {
              return 'react-ui';
            }
          },
        },
      },
    },
  };
});
