import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Matches your XAMPP checkout folder name under htdocs/ - e.g.
      // C:\xampp\htdocs\AIMplatform -> http://localhost/AIMplatform/Backend.
      // Change this if your local folder is named differently.
      '/api': {
        target: 'http://localhost/AIMplatform/Backend',
        changeOrigin: true,
      },
    },
  },
});
