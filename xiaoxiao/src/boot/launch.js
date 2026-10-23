/**
 * App bootstrap: ScreenFlow + frame loop + touch binding.
 * Architecture deliberately differs from xiaoxiaolei-001 createMain/scenes layout.
 */
import '../host/canvas.js';
import { SCREEN_HEIGHT, SCREEN_WIDTH } from '../host/canvas.js';
import { createGameLoop, getHost } from '../host/runtime-host.js';
import createSaveManager from '../host/vault.js';
import ScreenFlow from '../nav/flow.js';
import SplashScreen from '../screens/splash.js';
import LobbyScreen from '../screens/lobby.js';
import ArenaScreen from '../screens/arena.js';
import GameConfig from '../conf/root.js';
import { createGameContext } from '../paint/surface.js';

function wireTouches(host, router) {
  const methods = ['onTouchStart', 'onTouchMove', 'onTouchEnd', 'onTouchCancel'];
  for (let i = 0; i < methods.length; i += 1) {
    const name = methods[i];
    if (typeof host[name] === 'function') {
      host[name](router[name].bind(router));
    }
  }
}

function paintFrame(router, context, canvas, clock, timestamp) {
  const now = Number(timestamp) || Date.now();
  const delta = clock.last ? Math.min(0.05, (now - clock.last) / 1000) : 0;
  clock.last = now;

  router.tick(delta);

  const logicalWidth = GameGlobal.screenWidth || SCREEN_WIDTH;
  const logicalHeight = GameGlobal.screenHeight || SCREEN_HEIGHT;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(
    canvas.width / logicalWidth,
    0,
    0,
    canvas.height / logicalHeight,
    0,
    0
  );
  router.paint(context);
}

/** Start the game shell. Returns { router, loop }. */
export default function startApp() {
  const host = getHost();
  const canvas = GameGlobal.canvas;
  const context = createGameContext(canvas);
  const router = new ScreenFlow();
  const clock = { last: 0 };

  GameGlobal.save = createSaveManager();
  GameGlobal.scene = router;
  GameGlobal.config = GameConfig;

  router.register('boot', new SplashScreen());
  router.register('lobby', new LobbyScreen());
  router.register('arena', new ArenaScreen());
  wireTouches(host, router);

  const loop = createGameLoop((timestamp) => {
    paintFrame(router, context, canvas, clock, timestamp);
  });

  router.go('boot');
  loop.start();

  return {
    router,
    loop,
    tick(timestamp) {
      paintFrame(router, context, canvas, clock, timestamp);
    },
  };
}
