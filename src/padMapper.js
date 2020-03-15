const captureState = {
  ready: 0,
  capturing: 1,
  waitForStop: 2
}

export const keyType = {
  button: 0,
  axis: 1
}

export class GamePadMapper {
  constructor(gamePads, keys) {
    this._keys = keys;
    this._keysMap = new Map();
    this._axesMap = new Map();

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

    this._gamePads.addEventHandler('axisChanged', e => {
      const key = this._axesMap.get(e.index);
      if( !key ) return;

      this._dispatchEvent('axisChanged', {
        name: key.name,
        meta: key.meta,
        ...e
      });
    });
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

    await this._capture();
    this._index++;
    this._stepCaptureStarted = !this.captureStepCompleted;
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

  async _capture() {
    if( this._captureState === captureState.capturing ) return Promise.reject();
    this._captureState = captureState.capturing;

    if( this._gamePads.capturing ) {
      await this._pauseCapture();
    }

    return new Promise((resolve, reject) => {
      const stepProc = () => {
        this._gamePads.step();

        const key = this.currentKey;

        if( key.type === keyType.button ) {
          const pressedButtonIndex = this._gamePads.buttonChangedStates.indexOf(true);

          if( pressedButtonIndex >= 0 && this._gamePads.state.buttons[pressedButtonIndex].pressed ) {
            this._keysMap.set(pressedButtonIndex, key);
            this._dispatchEvent('applied', {...key, index: pressedButtonIndex});
            this._captureCompleted();
            resolve();
            return;
          }
        } else {
          const selectedAxisIndex = this._gamePads.state.axes
            .map( (value, index) => value - this._gamePads.state.axesNeutral[index] )
            .findIndex(diff => Math.abs(diff) > 0.5);

          if( selectedAxisIndex >= 0 && !this._axesMap.has(selectedAxisIndex) ) {
            this._axesMap.set(selectedAxisIndex, key);
            this._dispatchEvent('applied', {...key, index: selectedAxisIndex});
            this._captureCompleted();
            resolve();
            return;
          }
        }

        if(this._captureState === captureState.waitForStop) {
          this._captureCompleted();
          resolve();
        } else {
          window.requestAnimationFrame(() => stepProc());
        }
      };

      stepProc();
    });
  }

  _captureCompleted() {
    this._captureState = captureState.ready;
    this._restartCapture();
  }

  async _setFromIndex(index) {
    this._index = index;

    if( !this.captureStepStarted ) {
      await this._capture();
      this._index = -1;
    }
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
