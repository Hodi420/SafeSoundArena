import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';

export default {
  input: 'src/index.js',
  output: [
    // CommonJS (for Node) and ES module (for bundlers) build
    {
      file: 'dist/index.js',
      format: 'cjs',
      sourcemap: true,
      exports: 'default',
    },
    {
      file: 'dist/index.esm.js',
      format: 'es',
      sourcemap: true,
    },
    // UMD build (for browsers)
    {
      file: 'dist/safesoundarena-client.js',
      name: 'SafeSoundArenaClient',
      format: 'umd',
      sourcemap: true,
    },
    // Minified UMD build
    {
      file: 'dist/safesoundarena-client.min.js',
      name: 'SafeSoundArenaClient',
      format: 'umd',
      sourcemap: true,
      plugins: [terser()],
    },
  ],
  plugins: [
    nodeResolve(),
    commonjs({
      include: 'node_modules/**',
    }),
  ],
  // Mark WebSocket as external in Node.js builds
  external: ['ws'],
};

// This configuration will create multiple output formats:
// - CommonJS for Node.js
// - ES Modules for bundlers
// - UMD for browsers (both development and production minified versions)
