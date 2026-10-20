/* Runs before the module bundle, so even an interrupted startup has a recovery UI. */
(function () {
  var mounted = false;
  var recoveryKey = "syrianqr-startup-recovery";
  var checkTimer;
  function message() {
    var english = document.documentElement.lang === "en";
    var status = document.getElementById("boot-status");
    var retry = document.getElementById("boot-retry");
    if (status)
      status.textContent = english
        ? "The app could not finish loading. Check your connection and try again."
        : "تعذّر تحميل التطبيق. تأكد من الاتصال وحاول مجدداً.";
    if (retry) {
      retry.hidden = false;
      retry.textContent = english ? "Try again" : "إعادة المحاولة";
    }
  }
  function reloadOnce() {
    if (!navigator.onLine) return false;
    try {
      var previous = Number(sessionStorage.getItem(recoveryKey) || 0);
      if (previous && Date.now() - previous < 60000) return false;
      // If storage is unavailable, show a manual retry instead of risking a reload loop.
      sessionStorage.setItem(recoveryKey, String(Date.now()));
    } catch (_) {
      return false;
    }
    location.reload(); // Keep the route, QR token, query and fragment intact.
    return true;
  }
  function isAssetError(error) {
    var value = String((error && (error.message || error)) || "");
    return /dynamically imported module|Importing a module script failed|Loading chunk [\s\S]* failed|ChunkLoadError|Unable to preload CSS|Failed to load module script/i.test(
      value,
    );
  }
  function recover(error) {
    if (!isAssetError(error)) return false;
    message();
    return reloadOnce();
  }
  window.__appRecovery = { recover: recover };
  window.addEventListener("app:mounted", function () {
    mounted = true;
  });
  window.addEventListener("vite:preloadError", function (event) {
    message();
    if (reloadOnce()) event.preventDefault();
  });
  window.addEventListener(
    "error",
    function (event) {
      var target = event.target;
      if (target && target.tagName === "SCRIPT" && target.type === "module") {
        message();
        reloadOnce();
      }
    },
    true,
  );
  document.addEventListener("click", function (event) {
    if (
      event.target &&
      event.target.closest &&
      event.target.closest("#boot-retry")
    )
      location.reload();
  });
  setTimeout(function () {
    if (!mounted) message();
  }, 15000);
  function checkRestoredPage() {
    clearTimeout(checkTimer);
    if (document.visibilityState === "hidden") return;
    checkTimer = setTimeout(function () {
      var root = document.getElementById("root");
      if (root && root.childElementCount === 0) {
        // Only an actually empty root triggers recovery; normal resumes keep forms and audio.
        root.innerHTML =
          '<section class="boot-screen" role="status"><p id="boot-status"></p><button type="button" id="boot-retry" hidden></button></section>';
        message();
        reloadOnce();
      } else if (
        !mounted &&
        document.getElementById("boot-retry") &&
        !navigator.onLine
      ) {
        message();
      }
    }, 250);
  }
  window.addEventListener("pageshow", checkRestoredPage);
  document.addEventListener("visibilitychange", checkRestoredPage);
})();
