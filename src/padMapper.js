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
    this._keys = [];

    this._keysMap = new Map();
    this._axesMap = new Map();

    this._index = -1;
    this._gamePads = gamePads;

    this._captureState = captureState.ready;
    this._stepCaptureStarted = false;
    this._pausedCapture = false;
    this._waitNeatrulIndex = -1;

    this._eventHandlers = {
      buttonChanged: [],
      axisChanged: [],
      applied: [],
      registerCompleted: []
    };

    this._gamePads.addEventHandler('buttonChanged', e => {
      const key = this._keysMap.get(e.index);
      if( !key ) return;

      this._dispatchEvent('buttonChanged', {
        name: key.name,
        ...e
      });
    });

    this._gamePads.addEventHandler('axisChanged', e => {
      const key = this._axesMap.get(e.index);
      if( !key ) return;

      this._dispatchEvent('axisChanged', {
        name: key.name,
        ...e
      });
    });

    this.setupKeys(keys);
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

  get registerAllStarted() {
    return this._stepCaptureStarted;
  }

  get captureStepCompleted() {
    return !(this._index < this._keys.length);
  }

  get currentKey() {
    return this._keys[this._index];
  }

  registerAll() {
    this._index = 0;

    return new Promise(async (resolve, reject) => {
      while(!this.captureStepCompleted) {
        await this.stepBy();
      }
      this._dispatchEvent('registerCompleted', {});
      resolve();
    });
  }

  async stepBy() {
    if( !this._stepCaptureStarted ) {
      this._index = 0;
      this._stepCaptureStarted = true;
    }

    await this._capture();
    this._index++;
    this._stepCaptureStarted = !this.captureStepCompleted;
  }

  async register(name) {
    const index = this._keys.findIndex( key => key.name === name );
    if( index >= 0 ) {
      await this._setFromIndex(index);
    }
  }

  setupKeys(keys) {
    this._keys = keys;

    keys.forEach(key => {
      if( key.index !== 0 && !key.index ) return;

      if( key.type === keyType.button ) {
        this._setKeysMap(key.index, key);
      } else {
        this._setAxesMap(key.index, key);
      }
    });
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

  _setKeysMap(buttonIndex, key) {
    this._deleteValue(this._keysMap, key);
    this._keysMap.set(buttonIndex, key);
    key.index = buttonIndex;
  }

  _setAxesMap(axisIndex, key) {
    this._deleteValue(this._axesMap, key);
    this._axesMap.set(axisIndex, key);
    key.index = axisIndex;
  }

  _deleteValue(map, val) {
    let key = null;
    map.forEach((mapVal, mapKey) => {
      if( val.name === mapVal.name ) {
        key = mapKey;
      }
    });
    if( key !== null ) map.delete(key);
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
            this._setKeysMap(pressedButtonIndex, key);
            this._dispatchEvent('applied', key);
            this._captureCompleted();
            resolve();
            return;
          }
        } else {
          const selectedAxisIndex = this._gamePads.state.axes
            .map( (value, index) => value - this._gamePads.state.axesNeutral[index] )
            .findIndex(diff => Math.abs(diff) > 0.5);

          if( this._waitNeatrulIndex >= 0 ) {
            const isNeatural = Math.abs(this._gamePads.state.axesNeutral[this._waitNeatrulIndex] - this._gamePads.state.axes[this._waitNeatrulIndex]) < 0.1
            if( isNeatural ) {
              this._waitNeatrulIndex = -1;
              this._captureCompleted();
              resolve();
              return;
            }
          } else if( selectedAxisIndex >= 0 ) {
            this._setAxesMap(selectedAxisIndex, key);
            this._dispatchEvent('applied', key);
            this._waitNeatrulIndex = selectedAxisIndex;
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

    if( !this._stepCaptureStarted ) {
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
