import path from 'path';
import { defineConfig} from 'vite';

export default defineConfig(() => {
    // const env = loadEnv(mode, '.', '');
    return {
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
