import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    define: {
      // Expose API_KEY to the client-side code safely (Existing)
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      // Explicitly expose VITE_API_URL as a global constant. 
      // This avoids "Cannot read properties of undefined (reading 'VITE_API_URL')" errors
      // caused by import.meta.env being undefined at runtime in some environments.
      '__API_URL__': JSON.stringify(process.env.VITE_API_URL || env.VITE_API_URL || ''),
    },
    // No proxy needed for separate deployment strategy (Direct CORS request)
    server: {
      port: 5173
    }
  };
});