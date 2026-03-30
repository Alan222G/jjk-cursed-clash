import { defineConfig } from 'vite';

// Exclusively configured for Vercel
export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    // Copy all public assets including audio
    copyPublicDir: true,
  },
  // Ensure .m4a files get the correct MIME type
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  assetsInclude: ['**/*.m4a', '**/*.mp4', '**/*.mp3'],
});
