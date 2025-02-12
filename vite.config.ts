import { defineConfig } from 'vite';
import { nodePolyfills } from 'vite-plugin-node-polyfills';
import path from 'path';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const devPlugins = [];
  if (mode === 'development') {
    const { i18nextHMRPlugin } = await import('i18next-hmr/vite');
    devPlugins.push(i18nextHMRPlugin({ localesDir: './public/locales' }));
  }
  return { 
    build: { 
      outDir: path.resolve(__dirname, 'dist'),
      chunkSizeWarningLimit: 1000, // Prevent warnings
      rollupOptions: {
        output: {
          manualChunks: {
            'lucide-icons': ['lucide-react'] // Create a separate cacheable chunk
          }
        }
      }, 
      target: 'esnext' // Optimize for modern browsers
    },
    plugins: [react(), nodePolyfills(), ...devPlugins],
    optimizeDeps: {
      include: ['lucide-react'] // Prebundle to speed up loading
    },
    server: { 
      port: 8080, 
      allowedHosts: ['cloutcatcher.up.railway.app']
    }
  };
});