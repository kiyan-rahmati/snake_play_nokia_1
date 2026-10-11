(function (global) {
  "use strict";

  const APP = Object.freeze({
    NAME: "Snake Nokia",
    VERSION: "2.0.0",
    STORAGE_PREFIX: "snake-nokia",
    DEFAULT_LANGUAGE: "en",
    SUPPORTED_LANGUAGES: Object.freeze(["en", "fa"])
  });

  const GAME = Object.freeze({
    STATES: Object.freeze({
      IDLE: "idle",
      READY: "ready",
      COUNTDOWN: "countdown",
      PLAYING: "playing",
      PAUSED: "paused",
      LEVEL_COMPLETE: "level-complete",
      GAME_OVER: "game-over"
    }),

    DEFAULT_LEVEL: 1,
    DEFAULT_WORLD: 1,
    DEFAULT_SPEED: 7,
    MIN_SPEED: 3,
    MAX_SPEED: 18,
    SPEED_INCREMENT: 0.5,
    DEFAULT_LIVES: 3,
    MAX_LIVES: 5,
    STARTING_LENGTH: 3,
    DEFAULT_GRID_COLUMNS: 20,
    DEFAULT_GRID_ROWS: 20,
    TICK_INTERVAL: 1000 / 60,
    COUNTDOWN_SECONDS: 3,
    MAX_FRAME_DELTA: 250
  });

  const DIRECTIONS = Object.freeze({
    UP: Object.freeze({ x: 0, y: -1, name: "up" }),
    RIGHT: Object.freeze({ x: 1, y: 0, name: "right" }),
    DOWN: Object.freeze({ x: 0, y: 1, name: "down" }),
    LEFT: Object.freeze({ x: -1, y: 0, name: "left" })
  });

  const DIRECTION_ORDER = Object.freeze([
    DIRECTIONS.UP,
    DIRECTIONS.RIGHT,
    DIRECTIONS.DOWN,
    DIRECTIONS.LEFT
  ]);

  const INPUT = Object.freeze({
    KEY_CODES: Object.freeze({
      UP: Object.freeze(["ArrowUp", "KeyW"]),
      RIGHT: Object.freeze(["ArrowRight", "KeyD"]),
      DOWN: Object.freeze(["ArrowDown", "KeyS"]),
      LEFT: Object.freeze(["ArrowLeft", "KeyA"]),
      PAUSE: Object.freeze(["Escape", "KeyP"]),
      CONFIRM: Object.freeze(["Enter", "Space"]),
      RESTART: Object.freeze(["KeyR"]),
      MUTE: Object.freeze(["KeyM"])
    }),

    SWIPE_THRESHOLD: 24,
    REPEAT_DELAY: 110
  });

  const FOOD = Object.freeze({
    TYPES: Object.freeze({
      NORMAL: "normal",
      BONUS: "bonus",
      GOLDEN: "golden",
      SPECIAL: "special"
    }),

    DEFAULT_POINTS: 10,
    BONUS_POINTS: 25,
    GOLDEN_POINTS: 50,
    SPECIAL_POINTS: 100,
    DEFAULT_LIFETIME: 0,
    BONUS_LIFETIME: 8000,
    GOLDEN_LIFETIME: 12000,
    SPECIAL_LIFETIME: 10000
  });

  const COLLISION = Object.freeze({
    WALL: "wall",
    SELF: "self",
    OBSTACLE: "obstacle",
    FOOD: "food",
    NONE: "none"
  });

  const WORLDS = Object.freeze({
    DEFAULT_WORLD: 1,
    TOTAL_WORLDS: 5,
    UNLOCK_SCORE_THRESHOLD: 100,
    TRANSITION_DURATION: 700,
    ANNOUNCEMENT_DURATION: 2200
  });

  const LEVELS = Object.freeze({
    DEFAULT_LEVEL: 1,
    MAX_LEVEL: 100,
    UNLOCK_SCORE_THRESHOLD: 100,
    TRANSITION_DURATION: 500,
    INTRO_DURATION: 1800
  });

  const STORAGE = Object.freeze({
    KEYS: Object.freeze({
      SETTINGS: "settings",
      SAVE: "save",
      PROFILE: "profile",
      RECORDS: "records",
      ACHIEVEMENTS: "achievements",
      HISTORY: "history",
      PERSONAL_BESTS: "personal-bests",
      AUDIO_PREFERENCES: "audio-preferences",
      THEME: "theme",
      LANGUAGE: "language"
    }),

    SCHEMA_VERSION: 1,
    AUTOSAVE_INTERVAL: 30000,
    MAX_HISTORY_ENTRIES: 100,
    MAX_BACKUP_COUNT: 5
  });

  const AUDIO = Object.freeze({
    DEFAULT_MASTER_VOLUME: 0.7,
    DEFAULT_MUSIC_VOLUME: 0.55,
    DEFAULT_EFFECTS_VOLUME: 0.8,
    FADE_DURATION: 300,
    CROSSFADE_DURATION: 800,
    DEFAULT_TRACK_INDEX: 0
  });

  const RENDERING = Object.freeze({
    TARGET_FPS: 60,
    MAX_PIXEL_RATIO: 2,
    DEFAULT_BACKGROUND: "#101820",
    DEFAULT_GRID_COLOR: "rgba(255, 255, 255, 0.06)",
    DEFAULT_SNAKE_COLOR: "#65e572",
    DEFAULT_SNAKE_HEAD_COLOR: "#b6ff70",
    DEFAULT_FOOD_COLOR: "#ff5757",
    DEFAULT_TEXT_COLOR: "#ffffff"
  });

  const THEMES = Object.freeze({
    DAY: "day",
    NIGHT: "night",
    DEFAULT: "day",
    AVAILABLE: Object.freeze(["day", "night"])
  });

  const EVENTS = Object.freeze({
    GAME: Object.freeze({
      START: "game:start",
      READY: "game:ready",
      TICK: "game:tick",
      PAUSE: "game:pause",
      RESUME: "game:resume",
      OVER: "game:over",
      RESTART: "game:restart",
      RESET: "game:reset",
      STATE_CHANGED: "game:state-changed"
    }),

    SNAKE: Object.freeze({
      MOVE: "snake:move",
      GROW: "snake:grow",
      SHRINK: "snake:shrink",
      COLLISION: "snake:collision",
      DIRECTION_CHANGED: "snake:direction-changed"
    }),

    FOOD: Object.freeze({
      SPAWNED: "food:spawned",
      EATEN: "food:eaten",
      EXPIRED: "food:expired"
    }),

    LEVEL: Object.freeze({
      START: "level:start",
      COMPLETE: "level:complete",
      UNLOCKED: "level:unlocked",
      CHANGED: "level:changed"
    }),

    WORLD: Object.freeze({
      START: "world:start",
      CHANGED: "world:changed",
      UNLOCKED: "world:unlocked",
      TRANSITION: "world:transition"
    }),

    PROFILE: Object.freeze({
      UPDATED: "profile:updated",
      SAVED: "profile:saved"
    }),

    SETTINGS: Object.freeze({
      CHANGED: "settings:changed",
      THEME_CHANGED: "settings:theme-changed",
      LANGUAGE_CHANGED: "settings:language-changed"
    }),

    STORAGE: Object.freeze({
      SAVED: "storage:saved",
      LOADED: "storage:loaded",
      ERROR: "storage:error",
      RESET: "storage:reset"
    }),

    AUDIO: Object.freeze({
      PLAY: "audio:play",
      PAUSE: "audio:pause",
      STOP: "audio:stop",
      VOLUME_CHANGED: "audio:volume-changed",
      TRACK_CHANGED: "audio:track-changed"
    })
  });

  const UI = Object.freeze({
    SELECTORS: Object.freeze({
      APP: "[data-snake-app]",
      GAME_CANVAS: "[data-snake-canvas]",
      GAME_SCORE: "[data-snake-score]",
      GAME_BEST: "[data-snake-best]",
      GAME_STATUS: "[data-snake-status]",
      PAUSE_OVERLAY: "[data-pause-overlay]",
      GAME_OVER_OVERLAY: "[data-game-over-overlay]",
      COUNTDOWN_OVERLAY: "[data-countdown-overlay]",
      LEVEL_INTRO: "[data-level-intro]",
      WORLD_INTRO: "[data-world-intro]",
      THEME_TOGGLE: "[data-theme-toggle]",
      LANGUAGE_TOGGLE: "[data-language-toggle]",
      AUDIO_TOGGLE: "[data-audio-toggle]"
    }),

    CLASSES: Object.freeze({
      HIDDEN: "is-hidden",
      ACTIVE: "is-active",
      VISIBLE: "is-visible",
      DISABLED: "is-disabled",
      LOADING: "is-loading",
      PLAYING: "is-playing",
      PAUSED: "is-paused"
    })
  });

  const ERRORS = Object.freeze({
    INVALID_CONFIG: "INVALID_CONFIG",
    INVALID_STATE: "INVALID_STATE",
    INVALID_DIRECTION: "INVALID_DIRECTION",
    INVALID_LEVEL: "INVALID_LEVEL",
    INVALID_WORLD: "INVALID_WORLD",
    STORAGE_UNAVAILABLE: "STORAGE_UNAVAILABLE",
    ASSET_LOAD_FAILED: "ASSET_LOAD_FAILED",
    AUDIO_UNAVAILABLE: "AUDIO_UNAVAILABLE",
    INITIALIZATION_FAILED: "INITIALIZATION_FAILED"
  });

  const Constants = Object.freeze({
    APP,
    GAME,
    DIRECTIONS,
    DIRECTION_ORDER,
    INPUT,
    FOOD,
    COLLISION,
    WORLDS,
    LEVELS,
    STORAGE,
    AUDIO,
    RENDERING,
    THEMES,
    EVENTS,
    UI,
    ERRORS
  });

  global.SnakeConstants = Constants;
})(window);