/** Install with context.addInitScript; this replaces the widget, not app transport/timers. */
export function mockSoundCloud() {
  const listeners = {};
  const Events = { READY: 'ready', PLAY: 'play', PAUSE: 'pause', FINISH: 'finish', PLAY_PROGRESS: 'progress', ERROR: 'error' };
  const emit = (event, data) => {
    for (const listener of listeners[event] ?? []) listener(data);
  };

  function Widget() {
    return {
      bind(event, listener) {
        (listeners[event] ??= []).push(listener);
        if (event === Events.READY) queueMicrotask(listener);
      },
      unbind(event) { listeners[event] = []; },
      play() {
        window.audioPlayCalls = (window.audioPlayCalls ?? 0) + 1;
        return Promise.resolve().then(() => emit(Events.PLAY));
      },
      pause() { emit(Events.PAUSE); },
      seekTo(milliseconds) { emit(Events.PLAY_PROGRESS, { currentPosition: milliseconds }); },
      setVolume() {},
      load(_url, options) { queueMicrotask(() => options?.callback?.()); },
    };
  }

  Widget.Events = Events;
  window.SC = { Widget };
  window.testWidget = { emit, Events };
}
