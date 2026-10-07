/* boot.js — runs before first paint. Decides whether this visit gets the
   Three.js tunnel intro (once per session, capable devices only) so the
   branded overlay is there from the very first frame. Fails safe: any
   problem just means no tunnel. */
(function () {
  try {
    var d = document.documentElement;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var seen = window.sessionStorage.getItem('tunnel') === '1';
    var c = navigator.connection;
    var lite = (c && c.saveData) || (navigator.hardwareConcurrency && navigator.hardwareConcurrency < 4);
    if (!reduce && !seen && !lite && window.WebGLRenderingContext) d.classList.add('tunnel-on');
  } catch (e) { /* no tunnel */ }
})();
