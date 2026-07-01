import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { resolve } from 'path'

export default defineConfig(({ mode }) => {
  const isContent = mode === 'content'
  
  return {
    plugins: isContent ? [] : [svelte()],
    base: './',
    build: isContent ? {
      emptyOutDir: false,
      outDir: 'dist',
      lib: {
        entry: resolve(__dirname, 'src/content/index.ts'),
        formats: ['iife'],
        name: 'FlowPilotContent',
        fileName: () => 'assets/content.js',
      },
    } : {
      rollupOptions: {
        input: {
          sidepanel: resolve(__dirname, 'index.html'),
          background: resolve(__dirname, 'src/background/index.ts'),
          offscreen: resolve(__dirname, 'offscreen.html'),
          sandbox: resolve(__dirname, 'sandbox.html'),
        },
        output: {
          entryFileNames: 'assets/[name].js',
          chunkFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        },
      },
    },
    resolve: {
      alias: {
        $shared: resolve(__dirname, 'src/shared'),
        $infra: resolve(__dirname, 'src/infra'),
        $framework: resolve(__dirname, 'src/shared/framework'),
        $nodes: resolve(__dirname, 'src/nodes'),
        $background: resolve(__dirname, 'src/background'),
        $content: resolve(__dirname, 'src/content'),
        $sidepanel: resolve(__dirname, 'src/sidepanel'),
      },
    },
  }
})
