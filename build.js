// Simple build script to bundle LangChain for the extension
import * as esbuild from 'esbuild';
import { readFileSync } from 'fs';

try {
  await esbuild.build({
    entryPoints: ['panel-langchain.js'],
    bundle: true,
    outfile: 'panel-langchain-bundle.js',
    format: 'iife',
    platform: 'browser',
    target: 'es2020',
    external: ['chrome'],
    define: {
      'process.env.NODE_ENV': '"production"'
    }
  });
  console.log('✓ Built panel-langchain-bundle.js');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
