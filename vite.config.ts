/// <reference types="vitest" />
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [dts()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'PokerHand',
      formats: ['es', 'cjs'],
      fileName: 'poker-hand-evaluator',
    },
  },
  test: {
    // compat/ runs against packed tarballs: `npm run compat`.
    include: ['src/**/*.test.ts'],
  },
});
