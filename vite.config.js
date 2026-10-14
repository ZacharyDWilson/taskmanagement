import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

const stub = fileURLToPath(new URL('./src/lib/fakeSupabase.stub.js', import.meta.url))

// base './' lets the built site work under https://<user>.github.io/<repo>/
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  // The fake backend (test data for the phone preview) only exists in the "wip" preview build.
  resolve: mode === 'wip' ? {} : { alias: [{ find: /^.*\/fakeSupabase\.js$/, replacement: stub }] },
}))
