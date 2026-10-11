<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#10140d">
  <meta name="robots" content="noindex, nofollow">

  <title>You're Offline — Snake Play Nokia</title>

  <style>
    :root {
      color-scheme: dark;
      --bg: #10140d;
      --surface: #1b2116;
      --green: #a8d65e;
      --text: #f2f4e9;
      --muted: #a6ad9b;
      --border: #38432d;
    }

    *,
    *::before,
    *::after {
      box-sizing: border-box;
    }

    body {
      min-height: 100vh;
      margin: 0;
      padding: 24px;
      display: grid;
      place-items: center;
      background:
        radial-gradient(
          circle at 50% 20%,
          rgba(168, 214, 94, 0.09),
          transparent 42%
        ),
        var(--bg);
      color: var(--text);
      font-family: system-ui, -apple-system, BlinkMacSystemFont,
        "Segoe UI", sans-serif;
      text-align: center;
    }

    .offline-card {
      width: min(100%, 440px);
      padding: 36px 28px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
    }

    .pixel-icon {
      display: grid;
      place-items: center;
      width: 88px;
      height: 88px;
      margin: 0 auto 24px;
      border: 2px solid var(--green);
      border-radius: 16px;
      color: var(--green);
      font-size: 42px;
      line-height: 1;
      box-shadow: 0 0 28px rgba(168, 214, 94, 0.1);
    }

    h1 {
      margin: 0 0 12px;
      font-size: clamp(1.7rem, 6vw, 2.2rem);
      letter-spacing: -0.04em;
    }

    p {
      margin: 0 auto 24px;
      color: var(--muted);
      font-size: 1rem;
      line-height: 1.7;
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 26px;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 999px;
      color: var(--muted);
      font-size: 0.85rem;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background: #e8b65c;
      border-radius: 50%;
    }

    .actions {
      display: grid;
      gap: 12px;
    }

    .button {
      display: inline-flex;
      justify-content: center;
      align-items: center;
      min-height: 48px;
      padding: 12px 18px;
      border: 1px solid var(--green);
      border-radius: 10px;
      background: var(--green);
      color: #18210e;
      font: inherit;
      font-weight: 700;
      text-decoration: none;
      cursor: pointer;
      transition: transform 160ms ease, opacity 160ms ease;
    }

    .button:hover {
      transform: translateY(-2px);
    }

    .button:active {
      transform: translateY(0);
    }

    .button-secondary {
      background: transparent;
      color: var(--text);
      border-color: var(--border);
    }

    .button:focus-visible {
      outline: 3px solid var(--text);
      outline-offset: 4px;
    }

    .footer {
      margin-top: 28px;
      color: var(--muted);
      font-size: 0.8rem;
    }

    .footer span {
      color: var(--green);
    }

    @media (prefers-reduced-motion: reduce) {
      *,
      *::before,
      *::after {
        scroll-behavior: auto !important;
        transition: none !important;
      }
    }
  </style>
</head>

<body>
  <main class="offline-card">
    <div class="pixel-icon" aria-hidden="true">▦</div>

    <h1>Oops! You're offline.</h1>

    <p>
      Looks like your connection took a little break.
      Check your internet connection and try again.
    </p>

    <div class="status" role="status" aria-live="polite">
      <span class="status-dot" aria-hidden="true"></span>
      <span id="connection-status">No internet connection detected</span>
    </div>

    <div class="actions">
      <button class="button" id="retry-button" type="button">
        Try Again
      </button>

      <a class="button button-secondary" href="./index.html">
        Back to Snake Play Nokia
      </a>
    </div>

    <div class="footer">
      Powered by <span>Snake Play Nokia</span>
    </div>
  </main>

  <script>
    "use strict";

    const retryButton = document.getElementById("retry-button");
    const connectionStatus = document.getElementById("connection-status");

    function updateConnectionStatus() {
      if (navigator.onLine) {
        connectionStatus.textContent = "Connection available — ready to retry";
      } else {
        connectionStatus.textContent = "No internet connection detected";
      }
    }

    retryButton.addEventListener("click", () => {
      updateConnectionStatus();

      if (navigator.onLine) {
        window.location.href = "./index.html";
        return;
      }

      retryButton.textContent = "Still Offline — Try Again";
    });

    window.addEventListener("online", updateConnectionStatus);
    window.addEventListener("offline", updateConnectionStatus);

    updateConnectionStatus();
  </script>
</body>
</html>