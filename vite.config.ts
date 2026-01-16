import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import mdx from '@mdx-js/rollup';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkGfm from 'remark-gfm';
import { compression } from 'vite-plugin-compression2';
import path from 'path';
import fs from 'fs';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    mdx({
      include: /\.mdx$/,
      remarkPlugins: [
        remarkGfm,
        remarkFrontmatter,
        [remarkMdxFrontmatter, { name: 'frontmatter' }],
      ],
      providerImportSource: '@mdx-js/react',
    }) as Plugin,
    react(),
    // Compression: Gzip and Brotli (default)
    compression({
      include: /\.(js|mjs|json|css|html|svg)$/,
      threshold: 1024, // Only compress files > 1KB
    }),
    // Custom plugin to set UTF-8 charset for markdown and JSONL files
    {
      name: 'data-files-charset',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.md')) {
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
          } else if (req.url?.endsWith('.jsonl')) {
            res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
          }
          next();
        });
      },
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.md')) {
            res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
          } else if (req.url?.endsWith('.jsonl')) {
            res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
          }
          next();
        });
      },
    },
  ],
  assetsInclude: ['**/*.jsonl', '**/*.md'],
  optimizeDeps: {
    include: ['react-helmet-async'],
  },
  server: {
    port: 5173,
    open: false,
    // HTTPS with custom certificate for www.artek.tc
    https: fs.existsSync(path.resolve(__dirname, './certs/cert.pem'))
      ? {
          cert: fs.readFileSync(path.resolve(__dirname, './certs/cert.pem')),
          key: fs.readFileSync(path.resolve(__dirname, './certs/key.pem')),
        }
      : undefined,
  },
  preview: {
    port: 4173,
    // HTTPS with custom certificate for www.artek.tc
    https: fs.existsSync(path.resolve(__dirname, './certs/cert.pem'))
      ? {
          cert: fs.readFileSync(path.resolve(__dirname, './certs/cert.pem')),
          key: fs.readFileSync(path.resolve(__dirname, './certs/key.pem')),
        }
      : undefined,
  },
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, './src/shared'),
      '@content': path.resolve(__dirname, './src/content'),
      '@pages': path.resolve(__dirname, './src/pages'),
      // IBM Plex font aliases for self-hosting
      '~@ibm/plex-sans': path.resolve(__dirname, './node_modules/@ibm/plex-sans'),
      '~@ibm/plex-mono': path.resolve(__dirname, './node_modules/@ibm/plex-mono'),
      '~@ibm/plex-serif': path.resolve(__dirname, './node_modules/@ibm/plex-serif'),
      '~@ibm/plex': path.resolve(__dirname, './node_modules/@ibm/plex'),
    },
    extensions: ['.tsx', '.ts', '.jsx', '.js', '.mdx'],
  },
  css: {
    preprocessorOptions: {
      scss: {
        // Note: 'api: modern-compiler' is now default in Vite 7.0+ (option removed)
        quietDeps: true, // Suppress deprecation warnings from dependencies (e.g., Carbon Design System)
        additionalData: `
          @use 'sass:map';
          @use 'sass:math';
        `,
      },
    },
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      },
    },
  },
});
