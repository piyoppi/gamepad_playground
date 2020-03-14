const captureState = {
  ready: 0,
  capturing: 1,
  waitForStop: 2
}

export class GamePadMapper {
  constructor(gamePads, keys) {
    this._keys = keys.map( item => ({...item, buttonIndex: -1}));
    this._keysMap = new Map();

    this._index = -1;
    this._gamePads = gamePads;

    this._captureState = captureState.ready;

    this._eventHandlers = {
      buttonChanged: [],
      axisChanged: []
    };

    this._gamePads.addEventHandler('buttonChanged', e => {
      const key = this._keysMap.get(e.index);
      if( !key ) return;

      this._dispatchEvent('buttonChanged', {
        name: key.name,
        meta: key.meta,
        ...e
      });
    });
  }

  reset() {
    this._index = 0;
  }

  get keys() {
    return this._keys;
  }

  get currentIndex() {
    return this._index;
  }

  get captureStepStarted() {
    return this._index >= 0;
  }

  get captureStepCompleted() {
    return !(this._index < this._keys.length);
  }

  get currentKey() {
    return !this.captureStepCompleted && this.captureStepStarted ? this._keys[this._index] : null;
  }

  keyFromName(name) {
    return this._keys.find( key => key.name === name );
  }

  async stepBy() {
    if( !this.captureStepStarted || this.captureStepCompleted ) {
      this._index = 0;
    }

    await this._setKey(this.currentKey);
    this._index++;
  }

  setFromIndex(index) {
    return this._setKey(this._keys[index]);
  }

  setFromKeyName(name) {
    const key = this.keyFromName(name);
    return this._setKey(key);
  }

  stop() {
    this._captureState = captureState.waitForStop;
  }

  addEventHandler(name, handler) {
    this._eventHandlers[name].push({
      handler,
      id: this._eventHandlersCounter++
    });
  }

  _setKey(key) {
    if( this._captureState === captureState.capturing ) return Promise.reject();

    return new Promise((resolve, reject) => {
      const stepProc = () => {
        this._gamePads.step();
        const pressedButtonIndex = this._gamePads.buttonChangedStates.indexOf(true);

        if( pressedButtonIndex >= 0 && this._gamePads.state.buttons[pressedButtonIndex].pressed ) {
          key.buttonIndex = pressedButtonIndex;
          this._keysMap.set(pressedButtonIndex, key);
          resolve();
        } else if(this._captureState === captureState.waitForStop) {
          this._captureState = captureState.ready;
          resolve();
        } else {
          window.requestAnimationFrame(() => stepProc());
        }
      };

      stepProc();
    });
  }

  _dispatchEvent(name, e) {
    this._eventHandlers[name].forEach( obj => obj.handler(e) );
  }
}
