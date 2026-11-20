import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: 'src/index.ts',
  outDir: 'dist',
  format: 'esm',
  platform: 'node',
  // GitHub runs dist/index.js as is, without installing dependencies,
  // so everything has to be bundled into a single file.
  deps: { alwaysBundle: /./, onlyBundle: false },
  fixedExtension: false,
  hash: false,
  dts: false,
})
