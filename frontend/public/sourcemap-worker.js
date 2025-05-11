// Service Worker for intercepting and providing source maps
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
});

// Create a basic source map for any requested file
function createEmptySourceMap(fileName) {
  return JSON.stringify({
    version: 3,
    file: fileName,
    sourceRoot: '',
    sources: [fileName],
    names: [],
    mappings: ''
  });
}

// List of known sourcemap files that need interception
const SOURCEMAP_FILES = [
  'installHook.js.map',
  'react_devtools_backend_compact.js.map',
  // Add any other problematic source maps here
];

// Intercept fetch requests
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const fileName = url.pathname.split('/').pop();
  
  // Check if this is a source map request we want to handle
  if (SOURCEMAP_FILES.includes(fileName)) {
    event.respondWith(
      new Response(
        createEmptySourceMap(fileName.replace('.map', '')),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      )
    );
  }
});