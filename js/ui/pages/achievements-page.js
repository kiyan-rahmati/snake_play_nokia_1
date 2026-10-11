(function (global) {
  "use strict";

  const SnakeAchievementsPage = {
    root: null,
    elements: {},
    initialized: false,
    unsubscribe: [],

    state: {
      achievements: [],
      filter: "all",
      unlockedCount: 0,
      totalCount: 0
    },

    init(root) {
      if (this.initialized) {
        if (root) this.root = root;
        return this;
      }

      this.root = root || document.querySelector("[data-page='achievements']");

      if (!this.root) {
        this.root = document.createElement("section");
        this.root.dataset.page = "achievements";
        this.root.className = "achievements-page";
      }

      this.render();
      this.cacheElements();
      this.bindEvents();
      this.loadAchievements();

      this.initialized = true;
      return this;
    },

    render() {
      this.root.innerHTML = `
        <section class="achievements-layout">
          <header class="achievements-header">
            <button type="button" class="achievements-back-button" data-action="back">
              <span aria-hidden="true">←</span>
              <span>Back</span>
            </button>

            <div class="achievements-heading">
              <p class="achievements-eyebrow">COLLECT THEM ALL</p>
              <h1>Achievements</h1>
              <p>Every game is another chance to make history.</p>
            </div>
          </header>

          <section class="achievements-overview">
            <div class="achievements-trophy" aria-hidden="true">🏆</div>

            <div class="achievements-overview-copy">
              <h2>Your Collection</h2>
              <p data-achievements-summary>Keep playing to unlock rewards.</p>
            </div>

            <div class="achievements-count">
              <strong data-achievements-count>0/0</strong>
              <span>Unlocked</span>
            </div>
          </section>

          <section class="achievements-progress-section">
            <div class="achievements-progress-labels">
              <span>Overall progress</span>
              <strong data-achievements-percentage>0%</strong>
            </div>

            <div
              class="achievements-progress-track"
              role="progressbar"
              aria-label="Achievement completion"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-valuenow="0"
              data-achievements-progress
            >
              <div class="achievements-progress-fill" data-achievements-progress-fill></div>
            </div>
          </section>

          <nav class="achievements-filters" aria-label="Filter achievements">
            <button type="button" data-filter="all" aria-pressed="true">
              All
            </button>
            <button type="button" data-filter="unlocked" aria-pressed="false">
              Unlocked
            </button>
            <button type="button" data-filter="locked" aria-pressed="false">
              Locked
            </button>
          </nav>

          <section
            class="achievements-grid"
            data-achievements-grid
            aria-live="polite"
          ></section>

          <p class="achievements-empty-state" data-achievements-empty hidden>
            No achievements match this filter.
          </p>

          <p class="achievements-notice" data-achievements-notice aria-live="polite"></p>
        </section>
      `;
    },

    cacheElements() {
      this.elements = {
        summary: this.root.querySelector("[data-achievements-summary]"),
        count: this.root.querySelector("[data-achievements-count]"),
        percentage: this.root.querySelector("[data-achievements-percentage]"),
        progress: this.root.querySelector("[data-achievements-progress]"),
        progressFill: this.root.querySelector("[data-achievements-progress-fill]"),
        grid: this.root.querySelector("[data-achievements-grid]"),
        empty: this.root.querySelector("[data-achievements-empty]"),
        notice: this.root.querySelector("[data-achievements-notice]")
      };
    },

    bindEvents() {
      this.handleClick = this.handleClick.bind(this);
      this.handleAchievementEvent = this.handleAchievementEvent.bind(this);

      this.root.addEventListener("click", this.handleClick);

      const bus = global.SnakeEventBus;

      if (bus && typeof bus.on === "function") {
        [
          "achievement:unlocked",
          "achievements:updated",
          "game:over",
          "game:score",
          "game:started",
          "game:level-changed",
          "game:world-changed"
        ].forEach((eventName) => {
          const callback = (payload) => {
            this.handleAchievementEvent(eventName, payload);
          };

          const result = bus.on(eventName, callback);

          if (typeof result === "function") {
            this.unsubscribe.push(result);
          } else if (typeof bus.off === "function") {
            this.unsubscribe.push(() => bus.off(eventName, callback));
          }
        });
      }
    },

    handleClick(event) {
      const filterButton = event.target.closest("[data-filter]");

      if (filterButton && this.root.contains(filterButton)) {
        this.setFilter(filterButton.dataset.filter);
        return;
      }

      const actionButton = event.target.closest("[data-action]");

      if (!actionButton || !this.root.contains(actionButton)) return;

      if (actionButton.dataset.action === "back") {
        this.navigateBack();
      }
    },

    handleAchievementEvent(eventName, payload) {
      if (eventName === "achievement:unlocked") {
        const data = payload && typeof payload === "object" ? payload : {};
        const id = data.id || data.achievementId;

        if (id) {
          this.showNotice("Achievement unlocked!");
        }
      }

      this.loadAchievements();
    },

    getDefaultAchievements() {
      return [
        {
          id: "first_game",
          title: "First Steps",
          description: "Finish your first game.",
          icon: "🎮",
          category: "progress",
          condition: { type: "gamesPlayed", target: 1 },
          reward: "Welcome to the game"
        },
        {
          id: "score_100",
          title: "Getting Started",
          description: "Reach a score of 100 in one game.",
          icon: "⭐",
          category: "score",
          condition: { type: "highScore", target: 100 },
          reward: "Score hunter"
        },
        {
          id: "score_500",
          title: "Point Collector",
          description: "Reach a score of 500 in one game.",
          icon: "💎",
          category: "score",
          condition: { type: "highScore", target: 500 },
          reward: "Dedicated player"
        },
        {
          id: "score_1000",
          title: "Score Master",
          description: "Reach a score of 1,000 in one game.",
          icon: "🏆",
          category: "score",
          condition: { type: "highScore", target: 1000 },
          reward: "Master status"
        },
        {
          id: "games_10",
          title: "Regular Player",
          description: "Finish 10 games.",
          icon: "🕹️",
          category: "progress",
          condition: { type: "gamesPlayed", target: 10 },
          reward: "Getting serious"
        },
        {
          id: "games_50",
          title: "Dedicated Gamer",
          description: "Finish 50 games.",
          icon: "🎯",
          category: "progress",
          condition: { type: "gamesPlayed", target: 50 },
          reward: "True dedication"
        },
        {
          id: "games_100",
          title: "Snake Veteran",
          description: "Finish 100 games.",
          icon: "🐍",
          category: "progress",
          condition: { type: "gamesPlayed", target: 100 },
          reward: "Veteran status"
        },
        {
          id: "level_5",
          title: "Level Explorer",
          description: "Reach level 5.",
          icon: "🗺️",
          category: "levels",
          condition: { type: "bestLevel", target: 5 },
          reward: "Explorer status"
        },
        {
          id: "level_10",
          title: "Level Champion",
          description: "Reach level 10.",
          icon: "🚩",
          category: "levels",
          condition: { type: "bestLevel", target: 10 },
          reward: "Champion status"
        },
        {
          id: "world_3",
          title: "World Traveler",
          description: "Visit world 3.",
          icon: "🌍",
          category: "levels",
          condition: { type: "bestWorld", target: 3 },
          reward: "World explorer"
        },
        {
          id: "world_5",
          title: "World Master",
          description: "Visit world 5.",
          icon: "🌌",
          category: "levels",
          condition: { type: "bestWorld", target: 5 },
          reward: "Master explorer"
        },
        {
          id: "long_game",
          title: "Endurance",
          description: "Survive for at least five minutes in one game.",
          icon: "⏱️",
          category: "special",
          condition: { type: "longestGame", target: 300 },
          reward: "Patient player"
        }
      ];
    },

    loadAchievements() {
      const manager = global.SnakeAchievementManager;
      let source = null;

      if (manager) {
        try {
          if (typeof manager.getAll === "function") {
            source = manager.getAll();
          } else if (typeof manager.getAchievements === "function") {
            source = manager.getAchievements();
          }
        } catch (_) {
          source = null;
        }
      }

      if (!Array.isArray(source) || source.length === 0) {
        source = this.getDefaultAchievements();
      }

      const progress = this.getProgressSnapshot();

      this.state.achievements = source.map((achievement) => {
        const item = Object.assign({}, achievement);
        const unlocked = this.isUnlocked(item);

        item.unlocked = unlocked;
        item.progress = this.getAchievementProgress(item, progress);
        item.progressPercent = item.progress.target > 0
          ? Math.min(
              100,
              Math.round((item.progress.current / item.progress.target) * 100)
            )
          : unlocked
            ? 100
            : 0;

        return item;
      });

      this.state.totalCount = this.state.achievements.length;
      this.state.unlockedCount = this.state.achievements.filter(
        (item) => item.unlocked
      ).length;

      this.renderAchievements();
      this.updateOverview();
    },

    getProgressSnapshot() {
      const snapshot = {
        gamesPlayed: 0,
        highScore: 0,
        bestLevel: 1,
        bestWorld: 1,
        longestGame: 0,
        totalScore: 0
      };

      const profile = global.SnakeProfilePage;

      if (profile && profile.state) {
        snapshot.gamesPlayed = Number(profile.state.gamesPlayed) || 0;
        snapshot.highScore = Number(profile.state.highScore) || 0;
        snapshot.bestLevel = Number(profile.state.bestLevel) || 1;
        snapshot.totalScore = Number(profile.state.totalScore) || 0;
      }

      const records = global.SnakeRecordManager || global.SnakeHighScoreManager;

      if (records) {
        const methods = {
          highScore: ["getHighScore", "getBest", "getRecord"],
          gamesPlayed: ["getGamesPlayed", "getTotalGames"],
          totalScore: ["getTotalScore"],
          bestLevel: ["getBestLevel"]
        };

        Object.keys(methods).forEach((key) => {
          for (const method of methods[key]) {
            if (typeof records[method] !== "function") continue;

            try {
              const value = records[method]();

              if (Number.isFinite(value) && value >= 0) {
                snapshot[key] = Math.max(snapshot[key], value);
              }
            } catch (_) {
              // Ignore unavailable record methods.
            }

            break;
          }
        });
      }

      try {
        const raw = global.localStorage.getItem("snake-profile");

        if (raw) {
          const stored = JSON.parse(raw);

          if (stored && typeof stored === "object") {
            ["gamesPlayed", "highScore", "totalScore", "bestLevel"].forEach(
              (key) => {
                if (Number.isFinite(stored[key]) && stored[key] >= 0) {
                  snapshot[key] = Math.max(snapshot[key], stored[key]);
                }
              }
            );
          }
        }
      } catch (_) {
        // Ignore unavailable profile storage.
      }

      const engine = global.SnakeGameEngine;

      if (engine) {
        let gameState = null;

        if (typeof engine.getState === "function") {
          gameState = engine.getState();
        } else if (typeof engine.getSnapshot === "function") {
          gameState = engine.getSnapshot();
        }

        if (gameState && typeof gameState === "object") {
          snapshot.bestLevel = Math.max(
            snapshot.bestLevel,
            Number(gameState.level) || 1
          );

          snapshot.bestWorld = Math.max(
            snapshot.bestWorld,
            Number(gameState.world) || 1
          );

          snapshot.highScore = Math.max(
            snapshot.highScore,
            Number(gameState.score) || 0
          );

          snapshot.longestGame = Math.max(
            snapshot.longestGame,
            Number(gameState.duration) || 0
          );
        }
      }

      return snapshot;
    },

    isUnlocked(achievement) {
      if (achievement.unlocked === true || achievement.isUnlocked === true) {
        return true;
      }

      const manager = global.SnakeAchievementManager;

      if (manager && typeof manager.isUnlocked === "function") {
        try {
          if (manager.isUnlocked(achievement.id)) {
            return true;
          }
        } catch (_) {
          // Fall back to saved progress.
        }
      }

      const unlocked = this.readUnlockedIds();

      if (unlocked.has(String(achievement.id))) {
        return true;
      }

      return this.checkCondition(achievement);
    },

    checkCondition(achievement) {
      const condition = achievement.condition;

      if (!condition || !condition.type) return false;

      const progress = this.getProgressSnapshot();
      const current = Number(progress[condition.type]);

      return Number.isFinite(current) &&
        Number.isFinite(condition.target) &&
        current >= condition.target;
    },

    getAchievementProgress(achievement, snapshot) {
      const condition = achievement.condition || {};
      const target = Number(condition.target) || 0;
      const current = Number(snapshot[condition.type]) || 0;

      return {
        current: Math.max(0, current),
        target: Math.max(0, target)
      };
    },

    readUnlockedIds() {
      const ids = new Set();

      try {
        const raw = global.localStorage.getItem("snake-unlocked-achievements");
        const stored = raw ? JSON.parse(raw) : [];

        if (Array.isArray(stored)) {
          stored.forEach((id) => ids.add(String(id)));
        }
      } catch (_) {
        // Ignore malformed or unavailable storage.
      }

      return ids;
    },

    renderAchievements() {
      if (!this.elements.grid) return;

      const filtered = this.state.achievements.filter((achievement) => {
        if (this.state.filter === "unlocked") return achievement.unlocked;
        if (this.state.filter === "locked") return !achievement.unlocked;
        return true;
      });

      const fragment = document.createDocumentFragment();

      filtered.forEach((achievement) => {
        fragment.appendChild(this.createAchievementCard(achievement));
      });

      this.elements.grid.replaceChildren(fragment);
      this.elements.empty.hidden = filtered.length > 0;
    },

    createAchievementCard(achievement) {
      const card = document.createElement("article");

      card.className = "achievement-card";
      card.classList.toggle("is-unlocked", Boolean(achievement.unlocked));
      card.classList.toggle("is-locked", !achievement.unlocked);
      card.dataset.achievementId = String(achievement.id || "");

      const icon = document.createElement("div");
      icon.className = "achievement-card-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.textContent = achievement.icon || "🏅";

      const content = document.createElement("div");
      content.className = "achievement-card-content";

      const title = document.createElement("h3");
      title.className = "achievement-card-title";
      title.textContent = achievement.title || "Achievement";

      const description = document.createElement("p");
      description.className = "achievement-card-description";
      description.textContent = achievement.description || "";

      const status = document.createElement("span");
      status.className = "achievement-card-status";
      status.textContent = achievement.unlocked ? "Unlocked" : "Locked";

      content.append(title, description, status);

      const progress = document.createElement("div");
      progress.className = "achievement-card-progress";

      const progressTrack = document.createElement("div");
      progressTrack.className = "achievement-card-progress-track";
      progressTrack.setAttribute("role", "progressbar");
      progressTrack.setAttribute("aria-valuemin", "0");
      progressTrack.setAttribute("aria-valuemax", "100");
      progressTrack.setAttribute(
        "aria-valuenow",
        String(achievement.progressPercent || 0)
      );
      progressTrack.setAttribute(
        "aria-label",
        (achievement.title || "Achievement") + " progress"
      );

      const progressFill = document.createElement("div");
      progressFill.className = "achievement-card-progress-fill";
      progressFill.style.width = (achievement.progressPercent || 0) + "%";

      progressTrack.appendChild(progressFill);

      const progressText = document.createElement("span");
      progressText.className = "achievement-card-progress-text";

      if (achievement.unlocked) {
        progressText.textContent = "Completed";
      } else if (achievement.progress && achievement.progress.target > 0) {
        progressText.textContent =
          this.formatNumber(achievement.progress.current) +
          " / " +
          this.formatNumber(achievement.progress.target);
      } else {
        progressText.textContent = "Keep playing";
      }

      progress.append(progressTrack, progressText);
      card.append(icon, content, progress);

      return card;
    },

    updateOverview() {
      const total = this.state.totalCount;
      const unlocked = this.state.unlockedCount;
      const percentage = total > 0
        ? Math.round((unlocked / total) * 100)
        : 0;

      this.elements.count.textContent = unlocked + "/" + total;
      this.elements.percentage.textContent = percentage + "%";
      this.elements.summary.textContent = unlocked === total && total > 0
        ? "Amazing! You have unlocked every achievement."
        : "You have unlocked " + unlocked + " of " + total + " achievements.";

      this.elements.progress.setAttribute("aria-valuenow", String(percentage));
      this.elements.progressFill.style.width = percentage + "%";
    },

    setFilter(filter) {
      if (!["all", "unlocked", "locked"].includes(filter)) {
        filter = "all";
      }

      this.state.filter = filter;

      this.root.querySelectorAll("[data-filter]").forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          button.dataset.filter === filter ? "true" : "false"
        );
      });

      this.renderAchievements();
    },

    showNotice(message) {
      if (this.elements.notice) {
        this.elements.notice.textContent = message;
      }
    },

    formatNumber(value) {
      return new Intl.NumberFormat().format(Math.max(0, Number(value) || 0));
    },

    navigateBack() {
      const router = global.SnakeRouter;

      if (router && typeof router.navigate === "function") {
        router.navigate("home");
        return;
      }

      if (router && typeof router.go === "function") {
        router.go("home");
        return;
      }

      const bus = global.SnakeEventBus;

      if (bus && typeof bus.emit === "function") {
        bus.emit("navigation:request", { page: "home" });
      }
    },

    destroy() {
      if (this.root) {
        this.root.removeEventListener("click", this.handleClick);
      }

      this.unsubscribe.forEach((unsubscribe) => {
        try {
          unsubscribe();
        } catch (_) {
          // Ignore cleanup errors.
        }
      });

      this.unsubscribe = [];
      this.elements = {};
      this.initialized = false;
      this.root = null;
    }
  };

  global.SnakeAchievementsPage = SnakeAchievementsPage;
})(window);