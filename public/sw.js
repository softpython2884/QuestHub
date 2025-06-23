self.addEventListener('install', (event) => {
  console.log('FlowUp Service Worker installing.');
});

self.addEventListener('activate', (event) => {
  console.log('FlowUp Service Worker activating.');
});

self.addEventListener('fetch', (event) => {
  // A simple network-first strategy for demonstration.
  // For a real PWA, you would implement more robust caching.
  event.respondWith(fetch(event.request));
});
