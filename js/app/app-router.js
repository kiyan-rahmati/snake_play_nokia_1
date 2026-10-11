/**
 * Snake Nokia V2
 * Application Router
 */

(function (window, document) {
  "use strict";

  const ROUTES = Object.freeze({
    home: {
      id: "home",
      title: "Home",
      selector: "#home-page"
    },
    game: {
      id: "game",
      title: "Play Snake",
      selector: "#game-page"
    },
    profile: {
      id: "profile",
      title: "Player Profile",
      selector: "#profile-page"
    },
    settings: {
      id: "settings",
      title: "Settings",
      selector: "#settings-page"
    },
    achievements: {
      id: "achievements",
      title: "Achievements",
      selector: "#achievements-page"
    }
  });

  const state = {
    currentRoute: null,
    initialized: false
  };

  /**
   * Normalize a route name.
   */
  function normalizeRoute(routeName) {
    if (typeof routeName !== "string") {
      return null;
    }

    return routeName
      .trim()
      .toLowerCase()
      .replace(/^#/, "")
      .replace(/^\/+/, "")
      .split(/[/?]/)[0];
  }

  /**
   * Find a route by name.
   */
  function getRoute(routeName) {
    const normalized = normalizeRoute(routeName);
    return normalized && ROUTES[normalized]
      ? ROUTES[normalized]
      : null;
  }

  /**
   * Return a route from the current URL hash.
   */
  function getRouteFromHash() {
    const routeName = normalizeRoute(
      window.location.hash
    );

    return getRoute(routeName) || ROUTES.home;
  }

  /**
   * Find page elements associated with known routes.
   */
  function getPageElements() {
    return Object.values(ROUTES).map(function (route) {
      return {
        route,
        element: document.querySelector(route.selector)
      };
    });
  }

  /**
   * Update visible page sections.
   */
  function renderRoute(route) {
    const pages = getPageElements();
    let targetFound = false;

    pages.forEach(function (page) {
      if (!page.element) {
        return;
      }

      const isActive = page.route.id === route.id;

      page.element.hidden = !isActive;
      page.element.classList.toggle("is-active", isActive);
      page.element.setAttribute(
        "aria-hidden",
        String(!isActive)
      );

      if (isActive) {
        targetFound = true;
      }
    });

    return targetFound;
  }

  /**
   * Update navigation link states.
   */
  function updateNavigation(route) {
    const links = document.querySelectorAll(
      "[data-route], [data-navigate]"
    );

    links.forEach(function (link) {
      const target = normalizeRoute(
        link.dataset.route || link.dataset.navigate
      );

      const isActive = target === route.id;

      if (isActive) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }

      link.classList.toggle("is-active", isActive);
    });
  }

  /**
   * Update document metadata for the current route.
   */
  function updateDocument(route) {
    const appName = "Snake Nokia";

    document.title = `${route.title} | ${appName}`;

    document.documentElement.dataset.currentPage = route.id;
  }

  /**
   * Navigate to a known route.
   */
  function navigate(routeName, options) {
    const route = getRoute(routeName);

    if (!route) {
      console.warn(
        `[SnakeRouter] Unknown route: ${routeName}`
      );
      return false;
    }

    const settings = Object.assign(
      {
        updateHash: true,
        force: false
      },
      options || {}
    );

    if (
      state.currentRoute === route.id &&
      !settings.force
    ) {
      return true;
    }

    if (settings.updateHash) {
      const targetHash = `#${route.id}`;

      if (window.location.hash !== targetHash) {
        window.history.replaceState(
          null,
          "",
          targetHash
        );
      }
    }

    const targetFound = renderRoute(route);

    state.currentRoute = route.id;

    updateNavigation(route);
    updateDocument(route);

    document.dispatchEvent(
      new CustomEvent("snake:route-changed", {
        detail: {
          route: route.id,
          title: route.title,
          pageFound: targetFound
        }
      })
    );

    return true;
  }

  /**
   * Handle navigation clicks using event delegation.
   */
  function handleNavigationClick(event) {
    const link = event.target.closest(
      "[data-route], [data-navigate]"
    );

    if (!link) {
      return;
    }

    const routeName =
      link.dataset.route || link.dataset.navigate;

    if (!getRoute(routeName)) {
      return;
    }

    event.preventDefault();
    navigate(routeName);
  }

  /**
   * Handle browser back/forward hash changes.
   */
  function handleHashChange() {
    const route = getRouteFromHash();

    navigate(route.id, {
      updateHash: false,
      force: true
    });
  }

  /**
   * Initialize the router.
   */
  function initialize() {
    if (state.initialized) {
      return;
    }

    document.addEventListener(
      "click",
      handleNavigationClick
    );

    window.addEventListener(
      "hashchange",
      handleHashChange
    );

    state.initialized = true;

    const initialRoute = getRouteFromHash();

    navigate(initialRoute.id, {
      updateHash: true,
      force: true
    });
  }

  /**
   * Return the active route name.
   */
  function getCurrentRoute() {
    return state.currentRoute;
  }

  /**
   * Expose the router API.
   */
  window.SnakeRouter = Object.freeze({
    initialize,
    navigate,
    getCurrentRoute,
    getRoutes: function () {
      return ROUTES;
    }
  });
})(window, document);