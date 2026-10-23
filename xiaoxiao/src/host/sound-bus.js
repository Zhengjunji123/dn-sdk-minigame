/** 音效素材与 xiaoxiaolei-001 对齐 */
const LOCAL_SOURCES = Object.freeze({
  place: 'audio/tap.wav',
  clear: 'audio/match.wav',
  click: 'audio/tap.wav',
  gameover: 'audio/lose.wav',
  bgm: 'audio/bgm.mp3',
});

/** 大厅/对局共用一首 BGM，切页不重建、不停。 */
const SHARED = {
  contexts: Object.create(null),
  bgm: null,
  playing: false,
  resumeBound: false,
};

function saveValue(key, fallback) {
  const save = typeof GameGlobal !== 'undefined' && GameGlobal.save;
  if (!save) return fallback;
  if (typeof save.get === 'function') {
    const value = save.get(key);
    return value == null ? fallback : value;
  }
  if (save.data && save.data[key] != null) return save.data[key];
  return save[key] == null ? fallback : save[key];
}

function hostApi() {
  return (
    (typeof wx !== 'undefined' && wx) ||
    (typeof tt !== 'undefined' && tt) ||
    null
  );
}

function vibrate(type) {
  try {
    const host = hostApi();
    if (host && typeof host.vibrateShort === 'function') {
      host.vibrateShort({ type: type || 'light' });
    }
  } catch (_error) {
    // Vibration is intentionally best-effort.
  }
}

function isLocal(source) {
  return !!source && !/^(?:https?:)?\/\//i.test(source);
}

function inBrowser() {
  return typeof document !== 'undefined' && typeof Audio === 'function';
}

function wrapHtmlAudio(el) {
  return {
    play() {
      const p = el.play();
      if (p && typeof p.catch === 'function') p.catch(() => {});
    },
    pause() {
      el.pause();
    },
    stop() {
      el.pause();
      el.currentTime = 0;
    },
    seek(t) {
      el.currentTime = Number(t) || 0;
    },
    destroy() {
      el.pause();
      el.removeAttribute('src');
      el.load();
    },
    onEnded(cb) {
      el.addEventListener('ended', cb);
    },
    onError(cb) {
      el.addEventListener('error', cb);
    },
    set loop(v) {
      el.loop = !!v;
    },
    get loop() {
      return el.loop;
    },
    set src(v) {
      el.src = v;
    },
    get src() {
      return el.src;
    },
  };
}

function createNativeAudio(src, loop) {
  if (inBrowser()) {
    const el = new Audio(src);
    el.preload = 'auto';
    el.loop = !!loop;
    el.autoplay = false;
    return wrapHtmlAudio(el);
  }
  const host = hostApi();
  if (!host || typeof host.createInnerAudioContext !== 'function') return null;
  const audio = host.createInnerAudioContext();
  audio.autoplay = false;
  audio.src = src;
  audio.loop = !!loop;
  return audio;
}

function bindBgmLoop(audio) {
  if (!audio || audio._loopBound) return;
  audio._loopBound = true;
  audio.loop = true;
  if (typeof audio.onEnded !== 'function') return;
  audio.onEnded(() => {
    if (!saveValue('musicOn', true)) {
      SHARED.playing = false;
      return;
    }
    try {
      audio.loop = true;
      if (typeof audio.seek === 'function') audio.seek(0);
      audio.play();
      SHARED.playing = true;
    } catch (_error) {
      SHARED.playing = false;
    }
  });
}

function bindAppResume() {
  if (SHARED.resumeBound) return;
  const host = hostApi();
  if (!host || typeof host.onShow !== 'function') return;
  SHARED.resumeBound = true;
  host.onShow(() => {
    if (!saveValue('musicOn', true) || !SHARED.bgm) return;
    try {
      SHARED.bgm.loop = true;
      SHARED.bgm.play();
      SHARED.playing = true;
    } catch (_error) {
      // Silent fallback.
    }
  });
}

export default function createAudio() {
  function contextFor(name, loop) {
    const source = LOCAL_SOURCES[name];
    if (!isLocal(source)) return null;
    if (!SHARED.contexts[name]) {
      const audio = createNativeAudio(source, loop);
      if (!audio) return null;
      SHARED.contexts[name] = audio;
    }
    const audio = SHARED.contexts[name];
    if (loop) audio.loop = true;
    return audio;
  }

  function play(name, vibration) {
    if (!saveValue('soundOn', true)) return;
    const audio = contextFor(name, false);
    if (audio) {
      try {
        if (typeof audio.stop === 'function') audio.stop();
        else audio.pause();
        if (typeof audio.seek === 'function') audio.seek(0);
        audio.play();
        return;
      } catch (_error) {
        // Fall through to tactile feedback.
      }
    }
    vibrate(vibration);
  }

  return {
    playPlace() {
      play('place', 'light');
    },
    playClear() {
      play('clear', 'medium');
    },
    playClick() {
      play('click', 'light');
    },
    /** 吸附到新格时的轻震动，不出声。 */
    tick() {
      if (!saveValue('soundOn', true)) return;
      vibrate('light');
    },
    playGameOver() {
      play('gameover', 'heavy');
    },
    startMusic() {
      if (!saveValue('musicOn', true)) return;
      const bgm = contextFor('bgm', true);
      if (!bgm) return;
      SHARED.bgm = bgm;
      bindBgmLoop(bgm);
      bindAppResume();
      try {
        bgm.loop = true;
        if (!SHARED.playing) bgm.play();
        SHARED.playing = true;
      } catch (_error) {
        // Silent fallback.
      }
    },
    stopMusic() {
      SHARED.playing = false;
      if (SHARED.bgm) {
        try {
          SHARED.bgm.pause();
        } catch (_error) {
          // Silent fallback.
        }
      }
    },
    dispose() {
      // BGM 全局共用，切页不销毁。
    },
  };
}
