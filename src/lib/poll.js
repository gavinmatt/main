// Runs `fn` now and every `ms` while the page is visible. A hidden tab stops
// polling entirely and catches up the moment it's shown again.
export function pollWhileVisible(fn, ms) {
  let timer = null;
  const start = () => {
    if (timer != null) return;
    fn();
    timer = setInterval(fn, ms);
  };
  const stop = () => {
    clearInterval(timer);
    timer = null;
  };
  const onVisibilityChange = () => (document.hidden ? stop() : start());
  document.addEventListener("visibilitychange", onVisibilityChange);
  if (!document.hidden) start();
  return () => {
    stop();
    document.removeEventListener("visibilitychange", onVisibilityChange);
  };
}
