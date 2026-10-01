// THE FORGE: beta page.
// Marks the visitor's platform so their install card is highlighted and, on
// Android, moved first. Purely cosmetic: both cards stay visible and usable,
// so a wrong guess costs nothing.
(function () {
  var ua = navigator.userAgent || '';
  var iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  var root = document.documentElement;
  if (/iPhone|iPad|iPod/.test(ua) || iPadOS) root.classList.add('is-ios');
  else if (/Android/.test(ua)) root.classList.add('is-android');
})();
