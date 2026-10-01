import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// A strict Content-Security-Policy for the packaged app only
// (the dev server needs inline scripts for React Fast Refresh).
const csp = {
  name: 'inject-csp',
  apply: 'build',
  transformIndexHtml(html) {
    return html.replace(
      '<head>',
      `<head>\n    <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'" />`,
    );
  },
};

export default defineConfig({
  plugins: [react(), csp],
  base: './',
  server: { port: 5173, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, target: 'chrome130' },
});
