/** Install with context.addInitScript; this replaces the widget, not app transport/timers. */
export function mockSoundCloud() {
  const listeners = {};
  const Events = { READY: 'ready', PLAY: 'play', PAUSE: 'pause', FINISH: 'finish', PLAY_PROGRESS: 'progress', ERROR: 'error' };
  const emit = (event, data) => {
    for (const listener of listeners[event] ?? []) listener(data);
  };
  const sounds = [
    { id: 1, title: 'Test Track One', user: { username: 'Test Artist' }, artwork_url: null },
    { id: 2, title: 'Test Track Two', user: { username: 'Test Artist' }, artwork_url: null },
  ];
  let current = 0;

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
      skip(index) {
        current = index;
        return this.play();
      },
      seekTo(milliseconds) { emit(Events.PLAY_PROGRESS, { currentPosition: milliseconds }); },
      setVolume() {},
      getSounds(callback) { callback(sounds); },
      getCurrentSound(callback) { callback(sounds[current]); },
    };
  }

  Widget.Events = Events;
  window.SC = { Widget };
  window.testWidget = { emit, Events };
}
