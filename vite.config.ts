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
});
