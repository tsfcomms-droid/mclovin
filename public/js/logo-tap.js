(function () {
  var logo = document.getElementById('site-logo');
  if (!logo) return;

  var TAPS_REQUIRED = 5;
  var RESET_MS = 2000;
  var count = 0;
  var resetTimer = null;

  logo.style.cursor = 'pointer';
  logo.addEventListener('click', function () {
    count += 1;
    clearTimeout(resetTimer);
    resetTimer = setTimeout(function () {
      count = 0;
    }, RESET_MS);

    if (count >= TAPS_REQUIRED) {
      count = 0;
      window.location.href = '/admin/login';
    }
  });
})();
