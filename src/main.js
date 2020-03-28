const captureState = {
  ready: 0,
  capturing: 1,
  waitForStop: 2
}

export class GamePads {
  constructor() {
    this._currentIndex = 0;
    this._currentGamePad = null;
    this._connectedGamePadsCount = 0;
    this._captureState = captureState.ready;

    this._eventHandlers = {
      buttonChanged: [],
      axisChanged: [],
      connected: [],
      disconnected: [],
    };
    this._eventHandlersCounter = 0;

    this.state = {
      buttons: [],
      axes: [],
      axesNeutral: []
    };
    this._buttonChangedStates = [];
    this._axisChangedStates = [];

    this._setupEventListener();
  }

  get hasPads() {
    return this._connectedGamePadsCount > 0;
  }

  get buttonChangedStates() {
    return this._buttonChangedStates;
  }

  get axisChangedStates() {
    return this._axisChangedStates;
  }

  get pads() {
    return navigator.getGamepads();
  }

  get capturing() {
    return this._captureState !== captureState.ready;
  }

  setFirstPad() {
    let activePadIndex = -1;
    const gamePads = this.pads;

    for( let i=0; i<gamePads.length; i++ ) {
      if( !!this.pads[i] ) {
        activePadIndex = i;
        break;
      }
    }

    if( activePadIndex < 0 ) {
      throw new Error('Active pads is not found');
    }

    this.setIndex(activePadIndex);
  }

  setIndex(index) {
    this._currentIndex = index;
    this._setGamePad();

    return new Promise((resolve, reject) => {
      setTimeout( () => {
        this.initialize();
        resolve();
      }, 10 );
    });
  }

  addEventHandler(name, handler) {
    this._eventHandlers[name].push({
      handler,
      id: this._eventHandlersCounter++
    });
  }

  step() {
    this._setGamePad();
    this._captureButtons();
    this._captureAxes();
  }

  capture() {
    if( this.capturing ) return;
    this._captureState = captureState.capturing;
    this._capture();
  }

  stop() {
    if( this._captureState === captureState.capturing ) {
      this._captureState = captureState.waitForStop;
    }

    return new Promise((resolve, reject) => {
      const waitForStop = () => {
        if( this._captureState === captureState.ready ) {
          resolve();
        } else {
          window.requestAnimationFrame(waitForStop);
        }
      };

      waitForStop();
    });
  }

  _capture() {
    if( this._captureState === captureState.waitForStop ) {
      this._captureState = captureState.ready;
      return;
    }

    window.requestAnimationFrame(() => {
      if( this.hasPads ) {
        this.step();
      }
      this._capture();
    });
  }

  _dispatchEvent(name, e) {
    this._eventHandlers[name].forEach( obj => obj.handler(e) );
  }

  initialize() {
    this.state = {
      buttons: this._currentGamePad.buttons.slice(),
      axes: this._currentGamePad.axes.slice(),
      axesNeutral: this._currentGamePad.axes.slice()
    };
    this._buttonChangedStates = this._currentGamePad.buttons.map(() => false);
    this._axisChangedStates = this._currentGamePad.axes.map(() => false);
  }

  _setupEventListener() {
    window.addEventListener("gamepadconnected", e => {
      this._connectedGamePadsCount++;
      this._dispatchEvent('connected', e);
    });

    window.addEventListener("gamepaddisconnected", e => {
      this._connectedGamePadsCount--;
      this._dispatchEvent('disconnected', e);
    });
  }

  _setGamePad() {
    this._currentGamePad = navigator.getGamepads()[this._currentIndex];
  }

  _captureButtons() {
    this.state.buttons.forEach((state, index) => {
      const currentState = this._currentGamePad.buttons[index];
      const isChanged = (state.pressed !== currentState.pressed) || (state.value !== currentState.value) || (state.touched !== currentState.touched);
      this._buttonChangedStates[index] = isChanged;
      if ( isChanged ) this._dispatchEvent('buttonChanged', {value: currentState, index});

      this.state.buttons[index] = {pressed: currentState.pressed, value: currentState.value, touched: currentState.touched};
    });
  }

  _captureAxes() {
    this.state.axes.forEach((state, index) => {
      const currentState = this._currentGamePad.axes[index];
      const isChanged = currentState !== state;
      this._axisChangedStates[index] = isChanged;
      if ( isChanged ) this._dispatchEvent('axisChanged', {value: currentState, index});

      this.state.axes[index] = currentState;
    });
  }
}
