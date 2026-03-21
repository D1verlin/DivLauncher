import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  root: 'src/ui', // Указываем Vite, что корень интерфейса находится здесь
  build: {
    outDir: '../../dist-ui', // Складываем готовую сборку на две папки выше (в корень проекта)
    emptyOutDir: true,
  }
});