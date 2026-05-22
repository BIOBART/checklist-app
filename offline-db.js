/**
 * offline-db.js — IndexedDB wrapper voor offline checklist ondersteuning
 *
 * Stores:
 *  templates_cache   — gecachede template-data (zodat fill.html offline laadt)
 *  submissions_cache — gecachede submission-data (antwoorden, metadata)
 *  sync_queue        — bewerkingen die gesynchroniseerd moeten worden met Supabase
 *  photos_queue      — foto's genomen terwijl offline, wachten op upload
 */

(function (global) {
  'use strict';

  var DB_NAME = 'checklist-offline';
  var DB_VER  = 1;
  var _db     = null;

  // ── Open DB ──────────────────────────────────────────────────────────────
  function _open() {
    if (_db) return Promise.resolve(_db);
    return new Promise(function (resolve, reject) {
      var req = indexedDB.open(DB_NAME, DB_VER);

      req.onupgradeneeded = function (e) {
        var db = e.target.result;

        if (!db.objectStoreNames.contains('templates_cache')) {
          db.createObjectStore('templates_cache', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('submissions_cache')) {
          db.createObjectStore('submissions_cache', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('sync_queue')) {
          var sq = db.createObjectStore('sync_queue', { keyPath: 'qid', autoIncrement: true });
          sq.createIndex('by_submission', 'submission_id', { unique: false });
        }
        if (!db.objectStoreNames.contains('photos_queue')) {
          var pq = db.createObjectStore('photos_queue', { keyPath: 'qid', autoIncrement: true });
          pq.createIndex('by_submission', 'submission_id', { unique: false });
        }
      };

      req.onsuccess = function () { _db = req.result; resolve(_db); };
      req.onerror   = function () { reject(req.error); };
    });
  }

  // ── Generieke helpers ────────────────────────────────────────────────────
  function _put(store, value) {
    return _open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx  = db.transaction(store, 'readwrite');
        var req = tx.objectStore(store).put(value);
        req.onsuccess = function () { resolve(req.result); };
        req.onerror   = function () { reject(req.error); };
      });
    });
  }

  function _get(store, key) {
    return _open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx  = db.transaction(store, 'readonly');
        var req = tx.objectStore(store).get(key);
        req.onsuccess = function () { resolve(req.result || null); };
        req.onerror   = function () { reject(req.error); };
      });
    });
  }

  function _getAll(store) {
    return _open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx  = db.transaction(store, 'readonly');
        var req = tx.objectStore(store).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror   = function () { reject(req.error); };
      });
    });
  }

  function _getAllByIndex(store, index, value) {
    return _open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx  = db.transaction(store, 'readonly');
        var req = tx.objectStore(store).index(index).getAll(value);
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror   = function () { reject(req.error); };
      });
    });
  }

  function _delete(store, key) {
    return _open().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx  = db.transaction(store, 'readwrite');
        var req = tx.objectStore(store).delete(key);
        req.onsuccess = function () { resolve(); };
        req.onerror   = function () { reject(req.error); };
      });
    });
  }

  // ── Publieke API ─────────────────────────────────────────────────────────
  var OfflineDB = {

    // ─── Templates ──────────────────────────────────────────────────────────
    cacheTemplate: function (data) {
      return _put('templates_cache', { id: data.id, data: data, cached_at: Date.now() });
    },

    getCachedTemplate: function (id) {
      return _get('templates_cache', id).then(function (row) {
        return row ? row.data : null;
      });
    },

    // ─── Submissions ─────────────────────────────────────────────────────────
    /** Sla submission-data op voor offline hervatten.
     *  Gebruik cleanAnswers (zonder foto data-URLs) om de IndexedDB niet te overbelasten. */
    cacheSubmission: function (data) {
      return _put('submissions_cache', { id: data.id, data: data, cached_at: Date.now() });
    },

    getCachedSubmission: function (id) {
      return _get('submissions_cache', id).then(function (row) {
        return row ? row.data : null;
      });
    },

    // ─── Sync queue ──────────────────────────────────────────────────────────
    /**
     * Voeg een save-operatie toe aan de wachtrij.
     * Als er al een 'save' in de wachtrij staat voor deze submission, wordt die vervangen
     * (om dubbele opslags door auto-save te voorkomen).
     */
    queueSave: async function (submissionId, isNew, payload) {
      var existing = await _getAllByIndex('sync_queue', 'by_submission', submissionId);
      var existingSave = existing.find(function (op) { return op.type === 'save'; });
      if (existingSave) {
        return _put('sync_queue', Object.assign({}, existingSave, {
          payload: payload,
          is_new: isNew,
          queued_at: Date.now()
        }));
      }
      return _put('sync_queue', {
        type: 'save',
        submission_id: submissionId,
        is_new: !!isNew,
        payload: payload,
        queued_at: Date.now()
      });
    },

    /**
     * Voeg een complete-operatie toe. Maximaal één per submission.
     */
    queueComplete: async function (submissionId) {
      var existing = await _getAllByIndex('sync_queue', 'by_submission', submissionId);
      if (existing.find(function (op) { return op.type === 'complete'; })) return;
      return _put('sync_queue', {
        type: 'complete',
        submission_id: submissionId,
        queued_at: Date.now()
      });
    },

    /** Geeft alle queue-items gesorteerd op volgorde van toevoeging. */
    getQueue: function () {
      return _getAll('sync_queue').then(function (items) {
        return items.sort(function (a, b) { return a.queued_at - b.queued_at; });
      });
    },

    removeFromQueue: function (qid) {
      return _delete('sync_queue', qid);
    },

    /** True als er wachtrij-items zijn (inclusief foto's). */
    hasQueuedOps: async function () {
      var q = await _getAll('sync_queue');
      var p = await _getAll('photos_queue');
      return q.length > 0 || p.length > 0;
    },

    // ─── Photos queue ────────────────────────────────────────────────────────
    /**
     * Sla een offline-genomen foto op voor later uploaden.
     * @param {string} dataUrl   — base64 data URL van de foto
     * @param {string} storagePath — vooraf berekend pad in Supabase Storage
     */
    queuePhoto: function (submissionId, itemId, dataUrl, filename, storagePath) {
      return _put('photos_queue', {
        submission_id: submissionId,
        item_id: itemId,
        data_url: dataUrl,
        filename: filename,
        storage_path: storagePath,
        queued_at: Date.now()
      });
    },

    getQueuedPhotos: function () {
      return _getAll('photos_queue').then(function (items) {
        return items.sort(function (a, b) { return a.queued_at - b.queued_at; });
      });
    },

    removeQueuedPhoto: function (qid) {
      return _delete('photos_queue', qid);
    },

    /** Verwijder een offline foto uit de queue op basis van storage_path. */
    removeQueuedPhotoByPath: async function (storagePath) {
      var all = await _getAll('photos_queue');
      var match = all.find(function (p) { return p.storage_path === storagePath; });
      if (match) return _delete('photos_queue', match.qid);
    },
  };

  global.OfflineDB = OfflineDB;

})(typeof window !== 'undefined' ? window : self);
