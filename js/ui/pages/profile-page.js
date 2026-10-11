(function (global) {
  "use strict";

  const SnakeProfilePage = {
    root: null,
    elements: {},
    initialized: false,
    unsubscribe: [],

    state: {
      username: "Player",
      avatar: "🐍",
      gamesPlayed: 0,
      totalScore: 0,
      highScore: 0,
      bestLevel: 1,
      totalPlayTime: 0,
      achievements: 0,
      lastPlayed: null
    },

    init(root) {
      if (this.initialized) {
        if (root) this.root = root;
        return this;
      }

      this.root = root || document.querySelector("[data-page='profile']");

      if (!this.root) {
        this.root = document.createElement("section");
        this.root.dataset.page = "profile";
        this.root.className = "profile-page";
      }

      this.render();
      this.cacheElements();
      this.bindEvents();
      this.loadProfile();

      this.initialized = true;
      return this;
    },

    render() {
      this.root.innerHTML = `
        <section class="profile-layout">
          <header class="profile-header">
            <button type="button" class="profile-back-button" data-action="back">
              <span aria-hidden="true">←</span>
              <span>Back</span>
            </button>

            <div>
              <p class="profile-eyebrow">PLAYER AREA</p>
              <h1>Player Profile</h1>
            </div>

            <button type="button" class="profile-edit-button" data-action="edit">
              Edit Profile
            </button>
          </header>

          <section class="profile-identity">
            <div class="profile-avatar" data-profile-avatar aria-hidden="true">🐍</div>

            <div class="profile-identity-details">
              <h2 data-profile-username>Player</h2>
              <p data-profile-subtitle>Snake enthusiast</p>
              <span class="profile-badge" data-profile-rank>Rookie</span>
            </div>
          </section>

          <section class="profile-stat-grid" aria-label="Player statistics">
            <article class="profile-stat-card">
              <span class="profile-stat-icon" aria-hidden="true">🏆</span>
              <span class="profile-stat-label">High Score</span>
              <strong data-profile-high-score>0</strong>
            </article>

            <article class="profile-stat-card">
              <span class="profile-stat-icon" aria-hidden="true">🎮</span>
              <span class="profile-stat-label">Games Played</span>
              <strong data-profile-games>0</strong>
            </article>

            <article class="profile-stat-card">
              <span class="profile-stat-icon" aria-hidden="true">⭐</span>
              <span class="profile-stat-label">Total Score</span>
              <strong data-profile-total-score>0</strong>
            </article>

            <article class="profile-stat-card">
              <span class="profile-stat-icon" aria-hidden="true">🗺️</span>
              <span class="profile-stat-label">Best Level</span>
              <strong data-profile-best-level>1</strong>
            </article>
          </section>

          <section class="profile-progress-section">
            <div class="profile-section-heading">
              <div>
                <p class="profile-eyebrow">YOUR JOURNEY</p>
                <h2>Player Progress</h2>
              </div>
              <span data-profile-achievement-count>0 achievements</span>
            </div>

            <div class="profile-progress-card">
              <div class="profile-progress-row">
                <span>Play time</span>
                <strong data-profile-play-time>0 minutes</strong>
              </div>

              <div class="profile-progress-row">
                <span>Player rank</span>
                <strong data-profile-rank-description>Rookie</strong>
              </div>

              <div class="profile-progress-row">
                <span>Last played</span>
                <strong data-profile-last-played>Never</strong>
              </div>
            </div>
          </section>

          <section class="profile-history-section">
            <div class="profile-section-heading">
              <div>
                <p class="profile-eyebrow">RECENT ACTIVITY</p>
                <h2>Recent Games</h2>
              </div>
            </div>

            <div class="profile-history-list" data-profile-history>
              <p class="profile-empty-state">No games recorded yet.</p>
            </div>
          </section>

          <section class="profile-actions">
            <button type="button" data-action="achievements">
              View Achievements
            </button>

            <button type="button" data-action="reset">
              Reset Statistics
            </button>
          </section>

          <dialog class="profile-edit-dialog" data-profile-dialog>
            <form data-profile-form>
              <header class="profile-dialog-header">
                <h2>Edit Profile</h2>
                <button type="button" data-action="close-dialog" aria-label="Close">×</button>
              </header>

              <label for="profile-name-input">Player name</label>
              <input
                id="profile-name-input"
                name="username"
                type="text"
                maxlength="24"
                minlength="1"
                autocomplete="nickname"
                required
              />

              <label for="profile-avatar-input">Choose avatar</label>
              <select id="profile-avatar-input" name="avatar">
                <option value="🐍">🐍 Snake</option>
                <option value="🎮">🎮 Gamer</option>
                <option value="👾">👾 Pixel</option>
                <option value="🚀">🚀 Rocket</option>
                <option value="🦊">🦊 Fox</option>
                <option value="🐸">🐸 Frog</option>
                <option value="🤖">🤖 Robot</option>
                <option value="⭐">⭐ Star</option>
              </select>

              <p class="profile-form-error" data-profile-form-error aria-live="polite"></p>

              <footer class="profile-dialog-actions">
                <button type="button" data-action="close-dialog">Cancel</button>
                <button type="submit">Save Profile</button>
              </footer>
            </form>
          </dialog>

          <dialog class="profile-confirm-dialog" data-profile-confirm-dialog>
            <form data-profile-confirm-form>
              <h2>Reset statistics?</h2>
              <p>This will clear your recorded game statistics and recent history.</p>

              <footer class="profile-dialog-actions">
                <button type="button" data-action="cancel-reset">Cancel</button>
                <button type="submit">Reset</button>
              </footer>
            </form>
          </dialog>

          <p class="profile-notice" data-profile-notice aria-live="polite"></p>
        </section>
      `;
    },

    cacheElements() {
      this.elements = {
        avatar: this.root.querySelector("[data-profile-avatar]"),
        username: this.root.querySelector("[data-profile-username]"),
        subtitle: this.root.querySelector("[data-profile-subtitle]"),
        rank: this.root.querySelector("[data-profile-rank]"),
        highScore: this.root.querySelector("[data-profile-high-score]"),
        gamesPlayed: this.root.querySelector("[data-profile-games]"),
        totalScore: this.root.querySelector("[data-profile-total-score]"),
        bestLevel: this.root.querySelector("[data-profile-best-level]"),
        achievementCount: this.root.querySelector("[data-profile-achievement-count]"),
        playTime: this.root.querySelector("[data-profile-play-time]"),
        rankDescription: this.root.querySelector("[data-profile-rank-description]"),
        lastPlayed: this.root.querySelector("[data-profile-last-played]"),
        history: this.root.querySelector("[data-profile-history]"),
        dialog: this.root.querySelector("[data-profile-dialog]"),
        form: this.root.querySelector("[data-profile-form]"),
        nameInput: this.root.querySelector("[name='username']"),
        avatarInput: this.root.querySelector("[name='avatar']"),
        formError: this.root.querySelector("[data-profile-form-error]"),
        confirmDialog: this.root.querySelector("[data-profile-confirm-dialog]"),
        confirmForm: this.root.querySelector("[data-profile-confirm-form]"),
        notice: this.root.querySelector("[data-profile-notice]")
      };
    },

    bindEvents() {
      this.handleClick = this.handleClick.bind(this);
      this.handleFormSubmit = this.handleFormSubmit.bind(this);
      this.handleResetSubmit = this.handleResetSubmit.bind(this);
      this.handleProfileEvent = this.handleProfileEvent.bind(this);

      this.root.addEventListener("click", this.handleClick);
      this.elements.form.addEventListener("submit", this.handleFormSubmit);
      this.elements.confirmForm.addEventListener("submit", this.handleResetSubmit);

      const bus = global.SnakeEventBus;

      if (bus && typeof bus.on === "function") {
        [
          "game:over",
          "game:score",
          "profile:updated",
          "achievement:unlocked",
          "records:updated"
        ].forEach((eventName) => {
          const callback = (payload) => {
            this.handleProfileEvent(eventName, payload);
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
      const button = event.target.closest("[data-action]");

      if (!button || !this.root.contains(button)) return;

      switch (button.dataset.action) {
        case "back":
          this.navigate("home");
          break;

        case "edit":
          this.openEditDialog();
          break;

        case "close-dialog":
          this.closeDialog(this.elements.dialog);
          break;

        case "achievements":
          this.navigate("achievements");
          break;

        case "reset":
          this.openDialog(this.elements.confirmDialog);
          break;

        case "cancel-reset":
          this.closeDialog(this.elements.confirmDialog);
          break;

        default:
          break;
      }
    },

    handleFormSubmit(event) {
      event.preventDefault();

      const username = this.elements.nameInput.value.trim();
      const avatar = this.elements.avatarInput.value;

      if (!username) {
        this.showFormError("Please enter a player name.");
        return;
      }

      if (username.length > 24) {
        this.showFormError("Player name must be 24 characters or fewer.");
        return;
      }

      this.state.username = username;
      this.state.avatar = avatar;
      this.persistProfile();
      this.updateView();
      this.closeDialog(this.elements.dialog);
      this.showNotice("Profile saved.");
      this.emit("profile:updated", {
        username: this.state.username,
        avatar: this.state.avatar
      });
    },

    handleResetSubmit(event) {
      event.preventDefault();

      this.state.gamesPlayed = 0;
      this.state.totalScore = 0;
      this.state.highScore = 0;
      this.state.bestLevel = 1;
      this.state.totalPlayTime = 0;
      this.state.lastPlayed = null;

      this.clearHistory();
      this.persistProfile();
      this.updateView();
      this.closeDialog(this.elements.confirmDialog);
      this.showNotice("Statistics reset.");
      this.emit("profile:statistics-reset", {});
    },

    handleProfileEvent(eventName, payload) {
      const data = payload && typeof payload === "object" ? payload : {};

      if (eventName === "game:over") {
        this.recordGame(data);
      } else if (eventName === "game:score") {
        if (Number.isFinite(data.score)) {
          this.state.highScore = Math.max(this.state.highScore, data.score);
        }
      }

      this.loadExternalStats();
      this.persistProfile();
      this.updateView();
    },

    loadProfile() {
      this.loadStoredProfile();
      this.loadExternalStats();
      this.updateView();
    },

    loadStoredProfile() {
      const adapter = global.SnakeStorageAdapter;

      if (adapter && typeof adapter.get === "function") {
        try {
          const stored = adapter.get("profile");

          if (stored && typeof stored === "object") {
            this.applyProfileData(stored);
            return;
          }
        } catch (_) {
          // Continue with local storage fallback.
        }
      }

      try {
        const raw = global.localStorage.getItem("snake-profile");

        if (raw) {
          const stored = JSON.parse(raw);

          if (stored && typeof stored === "object") {
            this.applyProfileData(stored);
          }
        }
      } catch (_) {
        // Storage may be unavailable.
      }
    },

    applyProfileData(data) {
      if (typeof data.username === "string" && data.username.trim()) {
        this.state.username = data.username.trim().slice(0, 24);
      }

      if (typeof data.avatar === "string" && data.avatar.length <= 16) {
        this.state.avatar = data.avatar;
      }

      [
        "gamesPlayed",
        "totalScore",
        "highScore",
        "bestLevel",
        "totalPlayTime"
      ].forEach((key) => {
        if (Number.isFinite(data[key]) && data[key] >= 0) {
          this.state[key] = data[key];
        }
      });

      if (typeof data.lastPlayed === "string" || data.lastPlayed === null) {
        this.state.lastPlayed = data.lastPlayed;
      }
    },

    loadExternalStats() {
      const records = global.SnakeRecordManager || global.SnakeHighScoreManager;

      if (records) {
        const getters = {
          highScore: ["getHighScore", "getBest", "getRecord"],
          gamesPlayed: ["getGamesPlayed", "getTotalGames"],
          totalScore: ["getTotalScore"],
          bestLevel: ["getBestLevel"]
        };

        Object.keys(getters).forEach((key) => {
          for (const method of getters[key]) {
            if (typeof records[method] !== "function") continue;

            try {
              const value = records[method]();

              if (Number.isFinite(value) && value >= 0) {
                this.state[key] = Math.max(this.state[key], value);
              }
            } catch (_) {
              // Ignore unavailable statistic providers.
            }

            break;
          }
        });
      }

      const achievements = global.SnakeAchievementManager;

      if (achievements) {
        let count = null;

        if (typeof achievements.getUnlockedCount === "function") {
          count = achievements.getUnlockedCount();
        } else if (typeof achievements.getUnlocked === "function") {
          const unlocked = achievements.getUnlocked();
          count = Array.isArray(unlocked) ? unlocked.length : null;
        }

        if (Number.isFinite(count) && count >= 0) {
          this.state.achievements = count;
        }
      }
    },

    recordGame(data) {
      const score = Number.isFinite(data.score) ? Math.max(0, data.score) : 0;
      const level = Number.isFinite(data.level) ? Math.max(1, data.level) : 1;
      const duration = Number.isFinite(data.duration)
        ? Math.max(0, data.duration)
        : 0;

      this.state.gamesPlayed += 1;
      this.state.totalScore += score;
      this.state.highScore = Math.max(this.state.highScore, score);
      this.state.bestLevel = Math.max(this.state.bestLevel, level);
      this.state.totalPlayTime += duration;
      this.state.lastPlayed = new Date().toISOString();

      this.addHistoryEntry({
        score,
        level,
        duration,
        playedAt: this.state.lastPlayed
      });

      this.persistProfile();
    },

    persistProfile() {
      const data = {
        username: this.state.username,
        avatar: this.state.avatar,
        gamesPlayed: this.state.gamesPlayed,
        totalScore: this.state.totalScore,
        highScore: this.state.highScore,
        bestLevel: this.state.bestLevel,
        totalPlayTime: this.state.totalPlayTime,
        achievements: this.state.achievements,
        lastPlayed: this.state.lastPlayed
      };

      const adapter = global.SnakeStorageAdapter;

      if (adapter && typeof adapter.set === "function") {
        try {
          adapter.set("profile", data);
        } catch (_) {
          // Fall back to local storage.
        }
      }

      try {
        global.localStorage.setItem("snake-profile", JSON.stringify(data));
      } catch (_) {
        // Storage may be unavailable or full.
      }
    },

    updateView() {
      if (!this.elements.username) return;

      this.elements.avatar.textContent = this.state.avatar;
      this.elements.username.textContent = this.state.username;
      this.elements.subtitle.textContent = "Snake enthusiast";
      this.elements.highScore.textContent = this.formatNumber(this.state.highScore);
      this.elements.gamesPlayed.textContent = this.formatNumber(this.state.gamesPlayed);
      this.elements.totalScore.textContent = this.formatNumber(this.state.totalScore);
      this.elements.bestLevel.textContent = String(this.state.bestLevel);
      this.elements.achievementCount.textContent =
        this.state.achievements + " achievements";

      const rank = this.getRank(this.state.totalScore);

      this.elements.rank.textContent = rank.name;
      this.elements.rankDescription.textContent = rank.name;
      this.elements.playTime.textContent = this.formatPlayTime(
        this.state.totalPlayTime
      );
      this.elements.lastPlayed.textContent = this.formatDate(this.state.lastPlayed);

      this.renderHistory();
    },

    getRank(totalScore) {
      if (totalScore >= 100000) {
        return { name: "Snake Legend" };
      }

      if (totalScore >= 50000) {
        return { name: "Master" };
      }

      if (totalScore >= 20000) {
        return { name: "Expert" };
      }

      if (totalScore >= 5000) {
        return { name: "Veteran" };
      }

      if (totalScore >= 1000) {
        return { name: "Rookie Pro" };
      }

      return { name: "Rookie" };
    },

    openEditDialog() {
      this.elements.nameInput.value = this.state.username;
      this.elements.avatarInput.value = this.state.avatar;
      this.showFormError("");
      this.openDialog(this.elements.dialog);
    },

    openDialog(dialog) {
      if (!dialog) return;

      if (typeof dialog.showModal === "function") {
        if (!dialog.open) dialog.showModal();
      } else {
        dialog.setAttribute("open", "");
      }
    },

    closeDialog(dialog) {
      if (!dialog) return;

      if (typeof dialog.close === "function" && dialog.open) {
        dialog.close();
      } else {
        dialog.removeAttribute("open");
      }
    },

    showFormError(message) {
      if (this.elements.formError) {
        this.elements.formError.textContent = message;
      }
    },

    showNotice(message) {
      if (this.elements.notice) {
        this.elements.notice.textContent = message;
      }
    },

    addHistoryEntry(entry) {
      let history = this.readHistory();

      history.unshift(entry);
      history = history.slice(0, 10);

      try {
        global.localStorage.setItem("snake-profile-history", JSON.stringify(history));
      } catch (_) {
        // Storage may be unavailable.
      }
    },

    readHistory() {
      try {
        const raw = global.localStorage.getItem("snake-profile-history");
        const history = raw ? JSON.parse(raw) : [];

        return Array.isArray(history) ? history : [];
      } catch (_) {
        return [];
      }
    },

    renderHistory() {
      if (!this.elements.history) return;

      const history = this.readHistory();

      if (!history.length) {
        this.elements.history.innerHTML = `
          <p class="profile-empty-state">No games recorded yet.</p>
        `;
        return;
      }

      const fragment = document.createDocumentFragment();

      history.forEach((entry) => {
        const item = document.createElement("article");
        item.className = "profile-history-item";

        const details = document.createElement("div");
        details.className = "profile-history-details";

        const title = document.createElement("strong");
        title.textContent = "Score " + this.formatNumber(entry.score || 0);

        const subtitle = document.createElement("span");
        subtitle.textContent = "Level " + Math.max(1, Number(entry.level) || 1);

        details.append(title, subtitle);

        const metadata = document.createElement("div");
        metadata.className = "profile-history-metadata";

        const duration = document.createElement("span");
        duration.textContent = this.formatPlayTime(entry.duration || 0);

        const date = document.createElement("time");
        date.textContent = this.formatDate(entry.playedAt);

        if (entry.playedAt) {
          const timestamp = Date.parse(entry.playedAt);

          if (Number.isFinite(timestamp)) {
            date.dateTime = new Date(timestamp).toISOString();
          }
        }

        metadata.append(duration, date);
        item.append(details, metadata);
        fragment.appendChild(item);
      });

      this.elements.history.replaceChildren(fragment);
    },

    clearHistory() {
      try {
        global.localStorage.removeItem("snake-profile-history");
      } catch (_) {
        // Storage may be unavailable.
      }

      if (this.elements.history) {
        this.elements.history.innerHTML = `
          <p class="profile-empty-state">No games recorded yet.</p>
        `;
      }
    },

    formatNumber(value) {
      return new Intl.NumberFormat().format(Math.max(0, Number(value) || 0));
    },

    formatPlayTime(value) {
      const seconds = Math.max(0, Math.floor(Number(value) || 0));

      if (seconds < 60) {
        return seconds + (seconds === 1 ? " second" : " seconds");
      }

      const minutes = Math.floor(seconds / 60);

      if (minutes < 60) {
        return minutes + (minutes === 1 ? " minute" : " minutes");
      }

      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;

      return remainingMinutes
        ? hours + "h " + remainingMinutes + "m"
        : hours + (hours === 1 ? " hour" : " hours");
    },

    formatDate(value) {
      if (!value) return "Never";

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) return "Unknown";

      return new Intl.DateTimeFormat(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      }).format(date);
    },

    navigate(page) {
      const router = global.SnakeRouter;

      if (router && typeof router.navigate === "function") {
        router.navigate(page);
        return;
      }

      if (router && typeof router.go === "function") {
        router.go(page);
        return;
      }

      const bus = global.SnakeEventBus;

      if (bus && typeof bus.emit === "function") {
        bus.emit("navigation:request", { page });
      }
    },

    emit(eventName, payload) {
      const bus = global.SnakeEventBus;

      if (bus && typeof bus.emit === "function") {
        bus.emit(eventName, payload);
      }
    },

    destroy() {
      if (this.root) {
        this.root.removeEventListener("click", this.handleClick);
      }

      if (this.elements.form) {
        this.elements.form.removeEventListener("submit", this.handleFormSubmit);
      }

      if (this.elements.confirmForm) {
        this.elements.confirmForm.removeEventListener(
          "submit",
          this.handleResetSubmit
        );
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

  global.SnakeProfilePage = SnakeProfilePage;
})(window);