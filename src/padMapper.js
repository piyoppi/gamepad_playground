const captureState = {
  ready: 0,
  capturing: 1,
  waitForStop: 2
}

export class GamePadMapper {
  constructor(gamePad) {
    this.keys = [];
    this._index = -1;
    this._gamePads = gamePads;

    this._gamePads.capture();

    this._captureState = captureState.ready;
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

  stepBy() {
    if( !this.captureStepStarted || this.captureStepCompleted ) {
      this._index = 0;
    }

    return this._setKey(this.currentKey).then(() => this._index++);
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

  _setKey(key) {
    if( this._captureState === captureState.capturing ) return Promise.reject();

    return new Promise((resolve, reject) => {
      const stepProc = () => {
        this._gamePads.step();
        const pressedButtonIndex = this._gamePads.indexOf(true);

        if( pressedButtonIndex >= 0 ) {
          key.buttonIndex = pressedButtonIndex;
          resolve();
        } else if(this._captureState === captureState.waitForStop) {
          this._captureState = captureState.ready;
          resolve();
        } else {
          window.requestAnimationFrame(() => stepProc());
        }
      };
    });
  }
}
