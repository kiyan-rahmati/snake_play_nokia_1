(function (global) {
  "use strict";

  class SnakeHomePage {
    constructor(options) {
      const settings = options || {};

      this.root =
        settings.root ||
        document.querySelector('[data-page="home"]');

      this.language = settings.language || "en";
      this.profile = settings.profile || null;
      this.statistics = settings.statistics || {};
      this.recentGames = [];
      this.listeners = new Map();
      this.boundClick = this.handleClick.bind(this);
      this.destroyed = false;
      this.mounted = false;

      this.translations = {
        en: {
          eyebrow: "A little nostalgia, a lot of fun",
          title: "Ready to play?",
          description:
            "Jump back into the classic Snake experience. Eat, grow, beat your record, and keep going.",
          play: "Start playing",
          continue: "Continue game",
          achievements: "View achievements",
          bestScore: "Best score",
          gamesPlayed: "Games played",
          totalFood: "Food collected",
          level: "Current level",
          featuresTitle: "Your next adventure",
          classicTitle: "Classic Snake",
          classicDescription:
            "The simple rules you remember. The challenge you love.",
          worldsTitle: "Explore worlds",
          worldsDescription:
            "Discover new environments, colors, and challenges.",
          recordsTitle: "Beat your records",
          recordsDescription:
            "Every round is another chance to set a new personal best.",
          musicTitle: "Cassette corner",
          musicDescription:
            "Put on a soundtrack and give your next run a little atmosphere.",
          musicAction: "Open music player",
          recentTitle: "Recent games",
          emptyHistory: "Your next high score starts here.",
          playAgain: "Play again",
          viewAll: "View all",
          welcome: "Welcome back",
          guest: "Snake player",
          noGames: "No games played yet",
          loading: "Loading your game room..."
        },
        fa: {
          eyebrow: "کمی نوستالژی، کلی سرگرمی",
          title: "آماده بازی هستی؟",
          description:
            "برگرد به تجربه کلاسیک مار؛ غذا بخور، بزرگ شو، رکوردت را بشکن و ادامه بده.",
          play: "شروع بازی",
          continue: "ادامه بازی",
          achievements: "دیدن دستاوردها",
          bestScore: "بهترین امتیاز",
          gamesPlayed: "تعداد بازی‌ها",
          totalFood: "غذای جمع‌شده",
          level: "مرحله فعلی",
          featuresTitle: "ماجراجویی بعدی تو",
          classicTitle: "مار کلاسیک",
          classicDescription:
            "قانون‌های ساده‌ای که یادت مانده؛ چالشی که دوستش داری.",
          worldsTitle: "کشف دنیاها",
          worldsDescription:
            "محیط‌ها، رنگ‌ها و چالش‌های تازه را کشف کن.",
          recordsTitle: "رکوردهایت را بشکن",
          recordsDescription:
            "هر دور یک فرصت تازه برای ثبت بهترین امتیاز شخصی است.",
          musicTitle: "گوشه نوار کاست",
          musicDescription:
            "یک موسیقی پخش کن و به بازی بعدی‌ات حال‌وهوای خاصی بده.",
          musicAction: "باز کردن پخش‌کننده موسیقی",
          recentTitle: "بازی‌های اخیر",
          emptyHistory: "رکورد بعدی‌ات از همین‌جا شروع می‌شود.",
          playAgain: "دوباره بازی کن",
          viewAll: "مشاهده همه",
          welcome: "خوش برگشتی",
          guest: "بازیکن مار",
          noGames: "هنوز بازی‌ای انجام نداده‌ای",
          loading: "در حال آماده‌سازی اتاق بازی..."
        }
      };
    }

    assertAlive() {
      if (this.destroyed) {
        throw new Error("SnakeHomePage has been destroyed.");
      }
    }

    t(key) {
      const dictionary =
        this.translations[this.language] ||
        this.translations.en;

      return dictionary[key] || this.translations.en[key] || key;
    }

    mount() {
      this.assertAlive();

      if (!this.root) {
        return false;
      }

      this.root.classList.add("snake-home-page");
      this.root.setAttribute("data-page-content", "home");
      this.root.addEventListener("click", this.boundClick);

      this.render();

      this.mounted = true;

      this.emit("mounted", {
        root: this.root
      });

      return true;
    }

    render() {
      this.assertAlive();

      if (!this.root) {
        return false;
      }

      const fragment = document.createDocumentFragment();
      const wrapper = document.createElement("div");

      wrapper.className = "snake-home";

      const hero = this.createElement("section", "snake-home__hero");
      hero.setAttribute("aria-labelledby", "snake-home-title");

      const heroContent = this.createElement(
        "div",
        "snake-home__hero-content"
      );

      const eyebrow = this.createElement(
        "p",
        "snake-home__eyebrow",
        this.t("eyebrow")
      );

      const title = this.createElement(
        "h1",
        "snake-home__title",
        this.t("title")
      );

      title.id = "snake-home-title";

      const description = this.createElement(
        "p",
        "snake-home__description",
        this.t("description")
      );

      const actions = this.createElement(
        "div",
        "snake-home__actions"
      );

      const playButton = this.createButton(
        this.t("play"),
        "start-game",
        "snake-home__button snake-home__button--primary"
      );

      const achievementButton = this.createButton(
        this.t("achievements"),
        "open-achievements",
        "snake-home__button snake-home__button--secondary"
      );

      actions.append(playButton, achievementButton);
      heroContent.append(eyebrow, title, description, actions);

      const illustration = this.createElement(
        "div",
        "snake-home__illustration"
      );

      illustration.setAttribute("aria-hidden", "true");

      const illustrationSnake = this.createElement(
        "div",
        "snake-home__snake"
      );

      ["head", "body", "body", "body", "tail"].forEach(
        (part, index) => {
          const segment = this.createElement(
            "span",
            "snake-home__segment snake-home__segment--" + part
          );

          segment.style.setProperty("--segment-index", String(index));
          illustrationSnake.appendChild(segment);
        }
      );

      const illustrationFood = this.createElement(
        "span",
        "snake-home__food"
      );

      illustrationFood.textContent = "●";

      illustration.append(illustrationSnake, illustrationFood);
      hero.append(heroContent, illustration);

      const statistics = this.renderStatistics();
      const features = this.renderFeatures();
      const recent = this.renderRecentGames();

      wrapper.append(hero, statistics, features, recent);
      fragment.appendChild(wrapper);

      this.root.replaceChildren(fragment);
      this.root.dir = this.language === "fa" ? "rtl" : "ltr";
      this.root.lang = this.language;

      return true;
    }

    createElement(tagName, className, textContent) {
      const element = document.createElement(tagName);

      if (className) {
        element.className = className;
      }

      if (textContent !== undefined) {
        element.textContent = String(textContent);
      }

      return element;
    }

    createButton(label, action, className) {
      const button = document.createElement("button");

      button.type = "button";
      button.className = className || "snake-home__button";
      button.dataset.action = action;
      button.textContent = label;

      return button;
    }

    renderStatistics() {
      const section = this.createElement(
        "section",
        "snake-home__statistics"
      );

      section.setAttribute(
        "aria-label",
        this.language === "fa"
          ? "آمار بازی"
          : "Game statistics"
      );

      const items = [
        {
          key: "bestScore",
          value: this.getStat("bestScore", "highScore", "best")
        },
        {
          key: "gamesPlayed",
          value: this.getStat("gamesPlayed", "totalGames", "games")
        },
        {
          key: "totalFood",
          value: this.getStat("totalFood", "foodCollected", "food")
        },
        {
          key: "level",
          value: this.getStat("level", "currentLevel")
        }
      ];

      items.forEach((item) => {
        const card = this.createElement(
          "article",
          "snake-home__stat-card"
        );

        const value = this.createElement(
          "strong",
          "snake-home__stat-value",
          this.formatNumber(item.value)
        );

        const label = this.createElement(
          "span",
          "snake-home__stat-label",
          this.t(item.key)
        );

        card.append(value, label);
        section.appendChild(card);
      });

      return section;
    }

    renderFeatures() {
      const section = this.createElement(
        "section",
        "snake-home__features"
      );

      const heading = this.createElement(
        "h2",
        "snake-home__section-title",
        this.t("featuresTitle")
      );

      section.appendChild(heading);

      const featureData = [
        {
          icon: "🐍",
          title: this.t("classicTitle"),
          description: this.t("classicDescription"),
          action: "start-game"
        },
        {
          icon: "🌍",
          title: this.t("worldsTitle"),
          description: this.t("worldsDescription"),
          action: "open-worlds"
        },
        {
          icon: "🏆",
          title: this.t("recordsTitle"),
          description: this.t("recordsDescription"),
          action: "open-records"
        },
        {
          icon: "📼",
          title: this.t("musicTitle"),
          description: this.t("musicDescription"),
          action: "open-music"
        }
      ];

      const grid = this.createElement(
        "div",
        "snake-home__feature-grid"
      );

      featureData.forEach((feature) => {
        const card = this.createElement(
          "article",
          "snake-home__feature-card"
        );

        const icon = this.createElement(
          "span",
          "snake-home__feature-icon",
          feature.icon
        );

        icon.setAttribute("aria-hidden", "true");

        const title = this.createElement(
          "h3",
          "snake-home__feature-title",
          feature.title
        );

        const description = this.createElement(
          "p",
          "snake-home__feature-description",
          feature.description
        );

        const button = this.createButton(
          feature.title,
          feature.action,
          "snake-home__feature-action"
        );

        button.setAttribute("aria-label", feature.title);

        card.append(icon, title, description, button);
        grid.appendChild(card);
      });

      section.appendChild(grid);
      return section;
    }

    renderRecentGames() {
      const section = this.createElement(
        "section",
        "snake-home__recent"
      );

      const header = this.createElement(
        "div",
        "snake-home__recent-header"
      );

      const title = this.createElement(
        "h2",
        "snake-home__section-title",
        this.t("recentTitle")
      );

      const viewAll = this.createButton(
        this.t("viewAll"),
        "open-records",
        "snake-home__view-all"
      );

      header.append(title, viewAll);
      section.appendChild(header);

      if (!this.recentGames.length) {
        const empty = this.createElement(
          "p",
          "snake-home__empty",
          this.t("emptyHistory")
        );

        section.appendChild(empty);
        return section;
      }

      const list = this.createElement(
        "div",
        "snake-home__recent-list"
      );

      this.recentGames.slice(0, 5).forEach((game) => {
        const item = this.createElement(
          "article",
          "snake-home__recent-item"
        );

        const score = this.createElement(
          "strong",
          "snake-home__recent-score",
          this.formatNumber(game.score)
        );

        const date = this.createElement(
          "span",
          "snake-home__recent-date",
          this.formatDate(game.date)
        );

        const playAgain = this.createButton(
          this.t("playAgain"),
          "start-game",
          "snake-home__recent-action"
        );

        item.append(score, date, playAgain);
        list.appendChild(item);
      });

      section.appendChild(list);
      return section;
    }

    getStat() {
      for (let index = 0; index < arguments.length; index += 1) {
        const key = arguments[index];

        if (
          Object.prototype.hasOwnProperty.call(
            this.statistics,
            key
          )
        ) {
          const value = Number(this.statistics[key]);

          if (Number.isFinite(value)) {
            return Math.max(0, value);
          }
        }
      }

      return 0;
    }

    formatNumber(value) {
      const number = Number(value);

      if (!Number.isFinite(number)) {
        return "0";
      }

      try {
        return new Intl.NumberFormat(
          this.language === "fa" ? "fa-IR" : "en-US",
          {
            maximumFractionDigits: 0
          }
        ).format(number);
      } catch (_) {
        return String(Math.floor(number));
      }
    }

    formatDate(value) {
      if (!value) {
        return "";
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return "";
      }

      try {
        return new Intl.DateTimeFormat(
          this.language === "fa" ? "fa-IR" : "en-US",
          {
            year: "numeric",
            month: "short",
            day: "numeric"
          }
        ).format(date);
      } catch (_) {
        return date.toLocaleDateString();
      }
    }

    setStatistics(statistics) {
      this.assertAlive();

      if (!statistics || typeof statistics !== "object") {
        return false;
      }

      this.statistics = Object.assign({}, statistics);
      this.render();

      this.emit("statistics-updated", {
        statistics: Object.assign({}, this.statistics)
      });

      return true;
    }

    setRecentGames(games) {
      this.assertAlive();

      if (!Array.isArray(games)) {
        return false;
      }

      this.recentGames = games
        .filter((game) => game && typeof game === "object")
        .map((game) => ({
          score: Math.max(0, Number(game.score) || 0),
          date: game.date || game.timestamp || null,
          level: Math.max(1, Number(game.level) || 1)
        }));

      this.render();

      this.emit("recent-games-updated", {
        count: this.recentGames.length
      });

      return true;
    }

    setProfile(profile) {
      this.assertAlive();

      if (profile !== null && typeof profile !== "object") {
        return false;
      }

      this.profile = profile;

      this.emit("profile-updated", {
        profile: this.profile
      });

      return true;
    }

    setLanguage(language) {
      this.assertAlive();

      if (language !== "en" && language !== "fa") {
        return false;
      }

      this.language = language;
      this.render();

      this.emit("language-changed", {
        language: this.language
      });

      return true;
    }

    handleClick(event) {
      if (this.destroyed) {
        return;
      }

      const button = event.target.closest("[data-action]");

      if (!button || !this.root.contains(button)) {
        return;
      }

      const action = button.dataset.action;

      this.emit("action", {
        action: action,
        page: "home"
      });

      switch (action) {
        case "start-game":
          this.emit("start-game", {});
          break;

        case "open-achievements":
          this.emit("navigate", {
            page: "achievements"
          });
          break;

        case "open-worlds":
          this.emit("open-worlds", {});
          break;

        case "open-records":
          this.emit("open-records", {});
          break;

        case "open-music":
          this.emit("open-music", {});
          break;

        default:
          break;
      }
    }

    on(eventName, callback) {
      this.assertAlive();

      if (typeof callback !== "function") {
        throw new TypeError("Callback must be a function.");
      }

      if (!this.listeners.has(eventName)) {
        this.listeners.set(eventName, new Set());
      }

      this.listeners.get(eventName).add(callback);

      return () => this.off(eventName, callback);
    }

    off(eventName, callback) {
      const callbacks = this.listeners.get(eventName);

      if (!callbacks) {
        return false;
      }

      const removed = callbacks.delete(callback);

      if (callbacks.size === 0) {
        this.listeners.delete(eventName);
      }

      return removed;
    }

    emit(eventName, payload) {
      const callbacks = this.listeners.get(eventName);

      if (!callbacks) {
        return;
      }

      callbacks.forEach((callback) => {
        try {
          callback(payload || {});
        } catch (error) {
          if (
            global.console &&
            typeof global.console.error === "function"
          ) {
            global.console.error("[SnakeHomePage]", error);
          }
        }
      });
    }

    destroy() {
      if (this.destroyed) {
        return;
      }

      if (this.root) {
        this.root.removeEventListener("click", this.boundClick);
      }

      this.listeners.clear();
      this.root = null;
      this.mounted = false;
      this.destroyed = true;
    }
  }

  global.SnakeHomePage = SnakeHomePage;
})(window);