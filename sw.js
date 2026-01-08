// Service Worker for ResumeForge
// Version 1.0.0
const CACHE_NAME = 'resumeforge-v1';
const RUNTIME_CACHE = 'resumeforge-runtime-v1';

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => {
            return cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE;
          })
          .map((cacheName) => {
            console.log('[Service Worker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Skip Firebase and external API calls
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('stripe') ||
      event.request.url.includes('googleapis') ||
      event.request.url.includes('gstatic')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Return cached version if available
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then((response) => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response for caching
            const responseToCache = response.clone();

            // Cache the response
            caches.open(RUNTIME_CACHE)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(() => {
            // If network fails and we have a cached version, return it
            // Otherwise return a fallback page
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
          });
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-resumes') {
    event.waitUntil(syncResumes());
  }
});

async function syncResumes() {
  try {
    console.log('[Service Worker] Syncing resumes...');
    
    // Get pending resumes from IndexedDB
    const db = await openIndexedDB();
    const pendingResumes = await getPendingResumes(db);
    
    if (pendingResumes.length === 0) {
      console.log('[Service Worker] No pending resumes to sync');
      return;
    }
    
    console.log(`[Service Worker] Found ${pendingResumes.length} pending resumes to sync`);
    
    // Sync each pending resume
    for (const resume of pendingResumes) {
      try {
        await syncResumeToFirestore(resume);
        // Remove from pending queue after successful sync
        await removePendingResume(db, resume.id);
        console.log(`[Service Worker] Successfully synced resume: ${resume.id}`);
      } catch (error) {
        console.error(`[Service Worker] Failed to sync resume ${resume.id}:`, error);
        // Keep in queue for retry
      }
    }
    
    console.log('[Service Worker] Resume sync completed');
  } catch (error) {
    console.error('[Service Worker] Error during resume sync:', error);
  }
}

// IndexedDB helper functions
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('resumeforge-sync', 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pendingResumes')) {
        db.createObjectStore('pendingResumes', { keyPath: 'id', autoIncrement: true });
      }
    };
  });
}

function getPendingResumes(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingResumes'], 'readonly');
    const store = transaction.objectStore('pendingResumes');
    const request = store.getAll();
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

function removePendingResume(db, id) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pendingResumes'], 'readwrite');
    const store = transaction.objectStore('pendingResumes');
    const request = store.delete(id);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function syncResumeToFirestore(resume) {
  // This would need to be called from the main app context
  // The service worker can't directly access Firestore
  // Instead, we'll post a message to the client to handle the sync
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({
      type: 'SYNC_RESUME',
      data: resume
    });
  });
}

