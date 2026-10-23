/**
 * Stage router (class). Replaces createSceneManager factory from the 001 layout.
 * Stages may implement mount/unmount (preferred) or onEnter/onExit.
 */
export default class ScreenFlow {
  constructor() {
    this._stages = Object.create(null);
    this._current = null;
    this._currentName = '';
  }

  get scenes() {
    return this._stages;
  }

  get current() {
    return this._current;
  }

  get currentName() {
    return this._currentName;
  }

  register(name, stage) {
    if (!name || !stage) return;
    this._stages[name] = stage;
    stage.manager = this;
    stage.router = this;
  }

  go(name, payload) {
    const next = this._stages[name];
    if (!next) {
      console.error('[stage] missing', name);
      return false;
    }
    if (this._current) {
      if (typeof this._current.unmount === 'function') this._current.unmount();
      else if (typeof this._current.onExit === 'function') this._current.onExit();
    }
    this._current = next;
    this._currentName = name;
    if (typeof next.mount === 'function') next.mount(payload);
    else if (typeof next.onEnter === 'function') next.onEnter(payload);
    return true;
  }

  /** Compatibility alias used by older stage call sites during migration. */
  switch(name, payload) {
    return this.go(name, payload);
  }

  tick(delta) {
    this._dispatch('update', delta);
  }

  paint(context) {
    if (!this._current || typeof this._current.render !== 'function') return;
    this._current.render(
      context,
      GameGlobal.screenWidth,
      GameGlobal.screenHeight
    );
  }

  update(delta) {
    this.tick(delta);
  }

  render(context) {
    this.paint(context);
  }

  onTouchStart(event) {
    this._dispatch('onTouchStart', event);
  }

  onTouchMove(event) {
    this._dispatch('onTouchMove', event);
  }

  onTouchEnd(event) {
    this._dispatch('onTouchEnd', event);
  }

  onTouchCancel(event) {
    if (this._current && typeof this._current.onTouchCancel === 'function') {
      this._current.onTouchCancel(event);
    } else {
      this._dispatch('onTouchEnd', event);
    }
  }

  _dispatch(method, argument) {
    if (this._current && typeof this._current[method] === 'function') {
      this._current[method](argument);
    }
  }
}
