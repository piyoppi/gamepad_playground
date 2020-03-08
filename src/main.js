export class GamePads {
  constructor() {
    this._currentIndex = 0;
    this._currentGamePad = null;
    this._connectedGamePadsCount = 0;

    this._onButtonChanged = null;
    this._onAxisChanged = null;
    this._onConnected = null;
    this._onDisconnected = null;

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

  setAxisChangedCallback(func) {
    this._onAxisChanged = func;
  }

  setButtonChangedCallback(func) {
    this._onButtonChanged = func;
  }

  setConnectedCallback(func) {
    this._onConnected = func;
  }

  setDisconnectedCallback(func) {
    this._onDisconnected = func;
  }

  step() {
    this._setGamePad();
    this._captureButtons();
    this._captureAxes();
  }

  pooling() {
    window.requestAnimationFrame(() => {
      if( this._connectedGamePadsCount > 0 ) {
        this.step();
      }
      this.pooling();
    });
  }

  _initialize() {
    this.state = {
      buttons: [],
      axes: []
    };
    this._buttonChangedStates = this._currentGamePad.buttons.map(() => false);
    this._axisChangedStates = this._currentGamePad.axes.map(() => false);
  }

  _setupEventListener() {
    window.addEventListener("gamepadconnected", e => {
      this._connectedGamePadsCount++;
      if( this._onConnected ) this._onConnected(e);
    });

    window.addEventListener("gamepaddisconnected", e => {
      this._connectedGamePadsCount--;
      if( this._onDisconnected ) this._onDisconnected(e);
    });
  }

  _setGamePad() {
    this._currentGamePad = navigator.getGamepads()[this._currentIndex];
  }

  _captureButtons() {
    if( this.state.buttons.length > 0 ) {
      this.state.buttons.forEach((state, index) => {
        const currentState = this._currentGamePad.buttons[index];
        const isChanged = (state.pressed !== currentState.pressed) || (state.value !== currentState.value) || (state.touched !== currentState.touched);
        this._buttonChangedStates[index] = isChanged;
        if ( isChanged && this._onButtonChanged ) this._onButtonChanged({value: currentState, index});
      });
    }

    this.state.buttons = this._currentGamePad.buttons.slice();
  }

  _captureAxes() {
    if( this.state.axes.length > 0 ) {
      this.state.axes.forEach((state, index) => {
        const currentState = this._currentGamePad.axes[index];
        const isChanged = currentState !== state;
        this._axisChangedStates[index] = isChanged;
        if ( isChanged && this._onAxisChanged ) this._onAxisChanged({value: currentState, index});
      });
    }

    this.state.axes = this._currentGamePad.axes.slice();
  }

}
