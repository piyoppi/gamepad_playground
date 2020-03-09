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
      axes: []
    };
    this._buttonChangedStates = [];
    this._axisChangedStates = [];

    this._setupEventListener();
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

  setIndex(index) {
    this._currentIndex = index;
    this._setGamePad();
    this._initialize();
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
    if( this._captureState === captureState.capturing ) return;
    this._capture();
  }

  stop() {
    if( this._captureState === captureState.capturing ) {
      this._captureState = captureState.waitForStop;
    }
  }

  _capture() {
    if( this._captureState === captureState.waitForStop ) {
      this._captureState = captureState.ready;
      return;
    }

    this._captureState = captureState.capturing;

    window.requestAnimationFrame(() => {
      if( this._connectedGamePadsCount > 0 ) {
        this.step();
      }
      this._capture();
    });
  }

  _dispatchEvent(name, e) {
    this._eventHandlers[name].forEach( obj => obj.handler(e) );
  }

  _initialize() {
    this.state = {
      buttons: this._currentGamePad.buttons.slice(),
      axes: this._currentGamePad.axes.slice()
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
