import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@core': resolve('src/core')
      }
    },
    build: {
      outDir: 'out/main',
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts')
        }
      }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    build: {
      outDir: 'out/preload',
      rollupOptions: {
        input: {
          index: resolve('src/preload/index.ts'),
          'webview-preload': resolve('src/preload/webview-preload.ts')
        },
        output: {
          entryFileNames: '[name].js'
        }
      }
    }
  },
  renderer: {
    root: 'src/renderer',
    resolve: {
      alias: {
        '@': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
        '@core': resolve('src/core')
      }
    },
    plugins: [vue()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          index: resolve('src/renderer/index.html')
        }
      }
    },
    server: {
      port: 5173
    }
  }
})
