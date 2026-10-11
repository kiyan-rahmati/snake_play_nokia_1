(function (global) {
  "use strict";

  class PlaylistManager {
    constructor(options) {
      const settings = options || {};

      this.playlists = new Map();
      this.activePlaylistId = null;
      this.listeners = new Set();
      this.musicPlayer = settings.musicPlayer || null;
      this.storage = settings.storage || null;
      this.storageKey = settings.storageKey || "snake.audio.playlists";
      this.initialized = false;
      this.destroyed = false;
    }

    initialize() {
      this._assertAlive();

      if (this.initialized) {
        return this;
      }

      const saved = this._load();

      if (Array.isArray(saved)) {
        for (const item of saved) {
          if (this._isValidPlaylist(item)) {
            this.playlists.set(item.id, this._normalizePlaylist(item));
          }
        }
      }

      if (this.playlists.size > 0) {
        this.activePlaylistId = this.playlists.keys().next().value;
      }

      this.initialized = true;

      this._emit("playlist:initialized", {
        count: this.playlists.size
      });

      return this;
    }

    createPlaylist(name, tracks, options) {
      this._assertInitialized();

      const normalizedName = this._validateName(name);

      if (this._nameExists(normalizedName)) {
        throw new Error("A playlist with this name already exists.");
      }

      const settings = options || {};
      const playlist = {
        id: this._createId(),
        name: normalizedName,
        description: String(settings.description || ""),
        tracks: this._normalizeTracks(tracks || []),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      this.playlists.set(playlist.id, playlist);

      if (this.activePlaylistId === null) {
        this.activePlaylistId = playlist.id;
      }

      this._save();

      this._emit("playlist:created", {
        playlist: this._copyPlaylist(playlist)
      });

      return this._copyPlaylist(playlist);
    }

    updatePlaylist(id, changes) {
      this._assertInitialized();

      const playlist = this.playlists.get(id);

      if (!playlist) {
        return null;
      }

      const updates = changes || {};

      if (updates.name !== undefined) {
        const name = this._validateName(updates.name);

        if (
          name.toLowerCase() !== playlist.name.toLowerCase() &&
          this._nameExists(name)
        ) {
          throw new Error("A playlist with this name already exists.");
        }

        playlist.name = name;
      }

      if (updates.description !== undefined) {
        if (typeof updates.description !== "string") {
          throw new TypeError("Playlist description must be text.");
        }

        playlist.description = updates.description.trim();
      }

      if (updates.tracks !== undefined) {
        if (!Array.isArray(updates.tracks)) {
          throw new TypeError("Playlist tracks must be an array.");
        }

        playlist.tracks = this._normalizeTracks(updates.tracks);
      }

      playlist.updatedAt = new Date().toISOString();

      this._save();

      this._emit("playlist:updated", {
        playlist: this._copyPlaylist(playlist)
      });

      return this._copyPlaylist(playlist);
    }

    deletePlaylist(id) {
      this._assertInitialized();

      const playlist = this.playlists.get(id);

      if (!playlist) {
        return false;
      }

      this.playlists.delete(id);

      if (this.activePlaylistId === id) {
        this.activePlaylistId = this.playlists.size
          ? this.playlists.keys().next().value
          : null;
      }

      this._save();

      this._emit("playlist:deleted", {
        id,
        name: playlist.name,
        activePlaylistId: this.activePlaylistId
      });

      return true;
    }

    renamePlaylist(id, name) {
      return this.updatePlaylist(id, { name });
    }

    addTrack(playlistId, track, index) {
      this._assertInitialized();

      const playlist = this.playlists.get(playlistId);

      if (!playlist) {
        return false;
      }

      const normalized = this._normalizeTrack(track);

      if (!normalized) {
        throw new TypeError("Invalid track.");
      }

      const existing = playlist.tracks.find(
        (item) => item.id === normalized.id
      );

      if (existing) {
        return false;
      }

      const targetIndex = Number.isInteger(index)
        ? Math.max(0, Math.min(index, playlist.tracks.length))
        : playlist.tracks.length;

      playlist.tracks.splice(targetIndex, 0, normalized);
      playlist.updatedAt = new Date().toISOString();

      this._save();

      this._emit("playlist:track-added", {
        playlistId,
        track: { ...normalized },
        index: targetIndex
      });

      return true;
    }

    removeTrack(playlistId, trackId) {
      this._assertInitialized();

      const playlist = this.playlists.get(playlistId);

      if (!playlist) {
        return false;
      }

      const index = playlist.tracks.findIndex(
        (track) => track.id === trackId
      );

      if (index < 0) {
        return false;
      }

      const removed = playlist.tracks.splice(index, 1)[0];
      playlist.updatedAt = new Date().toISOString();

      this._save();

      this._emit("playlist:track-removed", {
        playlistId,
        track: { ...removed },
        index
      });

      return true;
    }

    moveTrack(playlistId, fromIndex, toIndex) {
      this._assertInitialized();

      const playlist = this.playlists.get(playlistId);

      if (!playlist) {
        return false;
      }

      if (
        !Number.isInteger(fromIndex) ||
        !Number.isInteger(toIndex) ||
        fromIndex < 0 ||
        fromIndex >= playlist.tracks.length ||
        toIndex < 0 ||
        toIndex >= playlist.tracks.length
      ) {
        return false;
      }

      if (fromIndex === toIndex) {
        return true;
      }

      const [track] = playlist.tracks.splice(fromIndex, 1);
      playlist.tracks.splice(toIndex, 0, track);

      playlist.updatedAt = new Date().toISOString();

      this._save();

      this._emit("playlist:track-moved", {
        playlistId,
        trackId: track.id,
        fromIndex,
        toIndex
      });

      return true;
    }

    setActivePlaylist(id) {
      this._assertInitialized();

      if (!this.playlists.has(id)) {
        return false;
      }

      this.activePlaylistId = id;
      const playlist = this.playlists.get(id);

      if (this.musicPlayer && typeof this.musicPlayer.setPlaylist === "function") {
        this.musicPlayer.setPlaylist(
          playlist.tracks.map((track) => ({ ...track }))
        );
      }

      this._emit("playlist:activated", {
        playlist: this._copyPlaylist(playlist)
      });

      return true;
    }

    getActivePlaylist() {
      if (!this.activePlaylistId) {
        return null;
      }

      return this.getPlaylist(this.activePlaylistId);
    }

    getPlaylist(id) {
      const playlist = this.playlists.get(id);

      return playlist ? this._copyPlaylist(playlist) : null;
    }

    getPlaylists() {
      return Array.from(this.playlists.values()).map(
        (playlist) => this._copyPlaylist(playlist)
      );
    }

    getPlaylistCount() {
      return this.playlists.size;
    }

    getTrackCount(playlistId) {
      const playlist = this.playlists.get(playlistId);
      return playlist ? playlist.tracks.length : 0;
    }

    hasPlaylist(id) {
      return this.playlists.has(id);
    }

    clearPlaylists() {
      this._assertInitialized();

      const count = this.playlists.size;

      this.playlists.clear();
      this.activePlaylistId = null;

      this._save();

      this._emit("playlist:cleared", { count });

      return count;
    }

    exportPlaylists() {
      return JSON.stringify({
        version: 1,
        exportedAt: new Date().toISOString(),
        playlists: this.getPlaylists()
      }, null, 2);
    }

    importPlaylists(data, options) {
      this._assertInitialized();

      let parsed;

      try {
        parsed = typeof data === "string" ? JSON.parse(data) : data;
      } catch (_) {
        throw new TypeError("Invalid playlist data.");
      }

      const imported = Array.isArray(parsed)
        ? parsed
        : parsed && parsed.playlists;

      if (!Array.isArray(imported)) {
        throw new TypeError("Imported data must contain a playlist array.");
      }

      const settings = options || {};
      const added = [];
      const skipped = [];

      for (const item of imported) {
        if (!this._isValidPlaylist(item)) {
          skipped.push(item && item.id ? item.id : null);
          continue;
        }

        const normalized = this._normalizePlaylist(item);
        const duplicateName = this._nameExists(normalized.name);

        if (duplicateName && settings.overwrite !== true) {
          skipped.push(normalized.id);
          continue;
        }

        if (duplicateName && settings.overwrite === true) {
          const existing = Array.from(this.playlists.values()).find(
            (playlist) =>
              playlist.name.toLowerCase() === normalized.name.toLowerCase()
          );

          if (existing) {
            this.playlists.delete(existing.id);

            if (this.activePlaylistId === existing.id) {
              this.activePlaylistId = null;
            }
          }
        }

        if (this.playlists.has(normalized.id)) {
          normalized.id = this._createId();
        }

        this.playlists.set(normalized.id, normalized);
        added.push(normalized.id);
      }

      if (!this.activePlaylistId && this.playlists.size) {
        this.activePlaylistId = this.playlists.keys().next().value;
      }

      this._save();

      this._emit("playlist:imported", {
        added,
        skipped
      });

      return { added, skipped };
    }

    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("Listener must be a function.");
      }

      this.listeners.add(listener);

      return () => {
        this.listeners.delete(listener);
      };
    }

    _normalizePlaylist(playlist) {
      return {
        id: String(playlist.id),
        name: this._validateName(playlist.name),
        description: String(playlist.description || ""),
        tracks: this._normalizeTracks(playlist.tracks || []),
        createdAt: this._validDate(playlist.createdAt),
        updatedAt: this._validDate(playlist.updatedAt)
      };
    }

    _normalizeTracks(tracks) {
      if (!Array.isArray(tracks)) {
        throw new TypeError("Tracks must be an array.");
      }

      const result = [];
      const ids = new Set();

      for (const track of tracks) {
        const normalized = this._normalizeTrack(track);

        if (!normalized || ids.has(normalized.id)) {
          continue;
        }

        ids.add(normalized.id);
        result.push(normalized);
      }

      return result;
    }

    _normalizeTrack(track) {
      if (!track || typeof track !== "object") {
        return null;
      }

      const src = typeof track.src === "string"
        ? track.src.trim()
        : typeof track.url === "string"
          ? track.url.trim()
          : "";

      if (!src) {
        return null;
      }

      return {
        id: String(track.id || this._createId()),
        title: String(track.title || "Unknown track"),
        artist: String(track.artist || "Unknown artist"),
        album: String(track.album || ""),
        src,
        cover: typeof track.cover === "string" ? track.cover : "",
        duration: Number.isFinite(track.duration) ? track.duration : 0
      };
    }

    _copyPlaylist(playlist) {
      return {
        ...playlist,
        tracks: playlist.tracks.map((track) => ({ ...track }))
      };
    }

    _validateName(name) {
      if (typeof name !== "string") {
        throw new TypeError("Playlist name must be text.");
      }

      const normalized = name.trim();

      if (normalized.length < 1 || normalized.length > 80) {
        throw new TypeError("Playlist name must contain 1 to 80 characters.");
      }

      return normalized;
    }

    _nameExists(name) {
      const normalized = name.toLowerCase();

      return Array.from(this.playlists.values()).some(
        (playlist) => playlist.name.toLowerCase() === normalized
      );
    }

    _isValidPlaylist(playlist) {
      return Boolean(
        playlist &&
        typeof playlist === "object" &&
        typeof playlist.id === "string" &&
        typeof playlist.name === "string" &&
        playlist.name.trim().length > 0 &&
        Array.isArray(playlist.tracks)
      );
    }

    _validDate(value) {
      const parsed = Date.parse(value);

      return Number.isFinite(parsed)
        ? new Date(parsed).toISOString()
        : new Date().toISOString();
    }

    _createId() {
      if (
        global.crypto &&
        typeof global.crypto.randomUUID === "function"
      ) {
        return global.crypto.randomUUID();
      }

      return "playlist-" +
        Date.now().toString(36) +
        "-" +
        Math.random().toString(36).slice(2, 10);
    }

    _load() {
      try {
        if (this.storage && typeof this.storage.get === "function") {
          return this.storage.get(this.storageKey);
        }

        if (global.localStorage) {
          const raw = global.localStorage.getItem(this.storageKey);
          return raw ? JSON.parse(raw) : null;
        }
      } catch (error) {
        this._log("Unable to load playlists.", error);
      }

      return null;
    }

    _save() {
      const data = this.getPlaylists();

      try {
        if (this.storage && typeof this.storage.set === "function") {
          this.storage.set(this.storageKey, data);
          return true;
        }

        if (global.localStorage) {
          global.localStorage.setItem(
            this.storageKey,
            JSON.stringify(data)
          );

          return true;
        }
      } catch (error) {
        this._log("Unable to save playlists.", error);
      }

      return false;
    }

    _assertInitialized() {
      this._assertAlive();

      if (!this.initialized) {
        throw new Error("PlaylistManager has not been initialized.");
      }
    }

    _assertAlive() {
      if (this.destroyed) {
        throw new Error("PlaylistManager has been destroyed.");
      }
    }

    _emit(type, detail) {
      const event = {
        type,
        detail,
        timestamp: Date.now()
      };

      for (const listener of this.listeners) {
        try {
          listener(event);
        } catch (error) {
          this._log("Playlist listener failed.", error);
        }
      }
    }

    _log(message, error) {
      if (global.console && typeof global.console.warn === "function") {
        global.console.warn(message, error || "");
      }
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      this._save();
      this.listeners.clear();
      this.playlists.clear();
      this.activePlaylistId = null;
      this.initialized = false;
      this.destroyed = true;
    }
  }

  global.SnakePlaylistManager = PlaylistManager;
})(window);