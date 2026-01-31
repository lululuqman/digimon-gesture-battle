import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'suppress-mediapipe-sourcemap',
      enforce: 'pre',
      transform(code, id) {
        // Use consistent path checking that works on Windows and Posix
        if (id.includes('mediapipe') && id.includes('tasks-vision')) {
          return {
            code: code.replace(/^\/\/[#@] sourceMappingURL=.*$/gm, ''),
            map: null
          };
        }
      }
    }
  ],
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision']
  }
})
