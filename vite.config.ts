import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'suppress-mediapipe-sourcemap',
      transform(code, id) {
        if (id.includes('@mediapipe/tasks-vision')) {
          return code.replace(/\/\/# sourceMappingURL=.*/, '');
        }
      }
    }
  ],
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision']
  }
})
