const captureState = {
  ready: 0,
  capturing: 1,
  waitForStop: 2
}

const stepCaptureState = {
  ready: 0,
  capturing: 1,
  completed: 2,
  waitForStop: 3,
  aborted: 4
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

    this._cursor = -1;
    this._gamePads = gamePads;

    this._captureState = captureState.ready;
    this._stepCaptureState = stepCaptureState.ready;
    this._pausedCapture = false;
    this._waitNeatrulIndex = -1;

    this._eventHandlers = {
      buttonChanged: [],
      axisChanged: [],
      applied: [],
      registerCompleted: [],
      cursorChanged: []
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

  get cursor() {
    return this._cursor;
  }

  get keys() {
    return this._keys;
  }

  get currentCursor() {
    return this._cursor;
  }

  get captureStepCompleted() {
    return this._stepCaptureState === stepCaptureState.completed;
  }

  get currentKey() {
    return this._keys[this._cursor];
  }

  resetStepBy() {
    this._changeCursor(0);
    this._stepCaptureState = stepCaptureState.ready;
  }

  registerAll() {
    if( this._stepCaptureState !== stepCaptureState.ready ) throw new Error('The state of capturing is not ready');

    return new Promise(async (resolve, reject) => {
      while( this._stepCaptureState === stepCaptureState.ready || this._stepCaptureState === stepCaptureState.capturing ) {
        await this.stepBy();
      }

      this._dispatchEvent('registerCompleted', {});
      resolve();
    });
  }

  async stepBy() {
    if( this._stepCaptureState === stepCaptureState.ready ) {
      this._changeCursor(0);
      this._stepCaptureState = stepCaptureState.capturing;
    }

    await this._capture();
    if( this._stepCaptureState === stepCaptureState.capturing ) this._changeCursor(this._cursor + 1);
    if( this._stepCaptureState === stepCaptureState.waitForStop ) this._stepCaptureState === stepCaptureState.aborted;

    if( this._cursor >= this._keys.length ) {
      this._stepCaptureState = stepCaptureState.completed;
    }
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
    this._changeCursor(-1);
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

        if(this._captureState === captureState.waitForStop) {
          this._captureCompleted();
          if( this._stepCaptureState === stepCaptureState.capturing ) this._stepCaptureState = stepCaptureState.waitForStop;
          resolve();
          return;
        }

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
            .findIndex(diff => Math.abs(diff) > 0.8);

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

        window.requestAnimationFrame(() => stepProc());
      };

      stepProc();
    });
  }

  _captureCompleted() {
    this._captureState = captureState.ready;
    this._restartCapture();
  }

  async _setFromIndex(index) {
    this._changeCursor(index);

    if( this._stepCaptureState !== stepCaptureState.capturing ) {
      await this._capture();
      this._changeCursor(-1);
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

  _changeCursor(cursor) {
    this._cursor = cursor;

    if( cursor < this._keys.length ) {
      this._dispatchEvent('cursorChanged', {cursor});
    } else {
      this._dispatchEvent('cursorChanged', {cursor: -1});
    }
  }
}
