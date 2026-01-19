import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Expose API_KEY to the client-side code safely
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    },
    // No proxy needed for separate deployment strategy (Direct CORS request)
    server: {
      port: 5173
    }
  };
});