import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * UMD helpers in dependencies use `Function("return this")()` for the global object.
 * addons-linter flags that as DANGEROUS_EVAL; `globalThis` / `window` is equivalent here.
 */
function patchBundleGlobalThisPolyfill() {
  return {
    name: 'patch-bundle-global-this-polyfill',
    apply: 'build',
    generateBundle(_options, bundle) {
      const safe =
        '(typeof globalThis<"u"?globalThis:typeof window<"u"?window:self)'
      for (const chunk of Object.values(bundle)) {
        if (chunk.type !== 'chunk' || !chunk.code) continue
        let { code } = chunk
        const next = code
          .replace(/Function\("return this"\)\(\)/g, safe)
          .replace(/Function\('return this'\)\(\)/g, safe)
        if (next !== code) chunk.code = next
      }
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // For localhost dev, default /api proxy to the public deployment so widgets
  // can use same-origin calls and avoid browser cross-origin/privacy blockers.
  // Override by setting VITE_DEV_API_PROXY in your env.
  const apiProxyTarget = (env.VITE_DEV_API_PROXY || 'https://terminal-tab.vercel.app').trim()

  const devProxy = {
    '/api': {
      target: apiProxyTarget,
      changeOrigin: true,
      secure: true
    },
    '/trakt-api': {
      target: 'https://api.trakt.tv',
      changeOrigin: true,
      secure: true,
      rewrite: (p) => p.replace(/^\/trakt-api/, '')
    },
    '/tmdb-api': {
      target: 'https://api.themoviedb.org/3',
      changeOrigin: true,
      secure: true,
      rewrite: (p) => p.replace(/^\/tmdb-api/, '')
    }
  }

  return {
    plugins: [react(), patchBundleGlobalThisPolyfill()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './')
      }
    },
    base: './',
    build: {
      outDir: 'dist',
      emptyOutDir: true
    },
    server: {
      proxy: devProxy
    }
  }
})
