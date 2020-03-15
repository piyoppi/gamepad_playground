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
    this._stepCaptureStarted = false;
    this._pausedCapture = false;

    this._eventHandlers = {
      buttonChanged: [],
      axisChanged: [],
      applied: []
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

  get index() {
    return this._index;
  }

  get keys() {
    return this._keys;
  }

  get currentIndex() {
    return this._index;
  }

  get captureStepStarted() {
    return this._stepCaptureStarted;
  }

  get captureStepCompleted() {
    return !(this._index < this._keys.length);
  }

  get currentKey() {
    return this._keys[this._index];
  }

  async stepBy() {
    if( !this.captureStepStarted ) {
      this._index = 0;
      this._stepCaptureStarted = true;
    }

    await this._setKey();
    this._index++;
    this._stepCaptureStarted = !this.captureStepCompleted;
  }

  async _setFromIndex(index) {
    this._index = index;

    if( this._gamePads.capturing ) {
      await this._pauseCapture();
    }

    if( !this.captureStepStarted ) {
      await this._setKey();
      this._index = -1;
      this._restartCapture();
    }
  }

  async setFromKeyName(name) {
    const index = this._keys.findIndex( key => key.name === name );
    if( index >= 0 ) {
      await this._setFromIndex(index);
    }
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

  _setKey() {
    if( this._captureState === captureState.capturing ) return Promise.reject();
    this._captureState = captureState.capturing;

    return new Promise((resolve, reject) => {
      const stepProc = () => {
        this._gamePads.step();
        const key = this.currentKey;
        const pressedButtonIndex = this._gamePads.buttonChangedStates.indexOf(true);

        if( pressedButtonIndex >= 0 && this._gamePads.state.buttons[pressedButtonIndex].pressed ) {
          key.buttonIndex = pressedButtonIndex;
          this._keysMap.set(pressedButtonIndex, key);
          this._dispatchEvent('applied', {
            ...key,
            index: pressedButtonIndex
          });
          this._captureState = captureState.ready;
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

  async _pauseCapture() {
    await this._gamePads.stop();
    this._pausedCapture = true;
  }

  _restartCapture() {
    if( !this._pausedCapture ) return;
    this._gamePads.capture();
    this._pausedCapture = false;
  }

  _dispatchEvent(name, e) {
    this._eventHandlers[name].forEach( obj => obj.handler(e) );
  }
}
