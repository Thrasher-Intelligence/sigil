import fs from 'fs';
import path from 'path';

/**
 * This plugin resolves missing React DevTools source maps
 * that typically generate console errors during development.
 */
export default function devtoolsSourcemapsPlugin() {
  // Create empty source map content
  const createSourceMap = (fileName) => {
    return JSON.stringify({
      version: 3,
      file: fileName,
      sourceRoot: '',
      sources: [fileName],
      names: [],
      mappings: ''
    });
  };

  // Store generated source maps in memory
  const sourceMaps = {
    'installHook.js.map': createSourceMap('installHook.js'),
    'react_devtools_backend_compact.js.map': createSourceMap('react_devtools_backend_compact.js')
  };

  return {
    name: 'vite-plugin-devtools-sourcemaps',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Extract the requested filename from the URL
        const url = req.url;
        const filename = path.basename(url);

        // If the requested file is one of our source maps
        if (sourceMaps[filename]) {
          // Set appropriate headers
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          
          // Send the pre-generated source map
          res.end(sourceMaps[filename]);
          return;
        }
        
        // For other requests, continue with the Vite middlewares
        next();
      });
    },
    
    // Handle source map requests during build
    generateBundle(_, bundle) {
      // Add our source maps to the bundle
      Object.keys(sourceMaps).forEach(filename => {
        this.emitFile({
          type: 'asset',
          fileName: filename,
          source: sourceMaps[filename]
        });
      });
    }
  };
}