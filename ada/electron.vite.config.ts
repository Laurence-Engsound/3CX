import { resolve } from 'node:path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    // @voxen/* are pure-ESM workspace packages; if externalised, Electron's
    // CJS loader can't require() them at runtime. Bundle them in instead so
    // vite handles the ESM-to-CJS transform at build time.
    plugins: [externalizeDepsPlugin({ exclude: ['@voxen/core', '@voxen/pbx-3cx'] })],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
        '@core': resolve('src/core')
      }
    },
    build: {
      outDir: 'out/main',
      rollupOptions: {
        // ws's optional native deps for perf. Mark external so rollup
        // doesn't try to bundle them; ws gracefully falls back to JS impl
        // if the runtime require() fails.
        external: ['bufferutil', 'utf-8-validate'],
        input: {
          index: resolve('src/main/index.ts')
        }
      }
    }
  },
  preload: {
    // Same reasoning — exclude @voxen/* from externalisation (preload doesn't
    // import them yet, but the rule is consistent across processes).
    plugins: [externalizeDepsPlugin({ exclude: ['@voxen/core', '@voxen/pbx-3cx'] })],
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
    plugins: [
      vue({
        template: {
          // <webview> is a built-in Electron tag, not a Vue component.
          // Telling Vue this prevents the noisy
          //   "[Vue warn]: Failed to resolve component: webview"
          // warning every time PhoneView mounts.
          compilerOptions: {
            isCustomElement: (tag) => tag === 'webview'
          }
        }
      })
    ],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          // Main ADA window (Phase 1-5 layout)
          index: resolve('src/renderer/index.html'),
          // Phase 6 W1D7 — Softphone Bar window (separate entry, no router)
          bar: resolve('src/renderer/bar.html')
        }
      }
    },
    server: {
      port: 5173
    }
  }
})
