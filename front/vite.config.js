import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import { viteSingleFile } from "vite-plugin-singlefile"
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env from front/ directory
  const env = loadEnv(mode, process.cwd(), '')
  
  const port = parseInt(env.FRONT_PORT || '5180', 10)
  const host = env.FRONT_HOST || '0.0.0.0'

  return {
    plugins: [vue(), viteSingleFile()],
    css: {
      postcss: './postcss.config.cjs'
    },
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true
    },
    server: {
      host,
      port,
      strictPort: false,
      hmr: {
        port: port
      }
    }
  }
})