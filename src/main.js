export class GamePads {
  constructor() {
    this._currentIndex = 0;
    this._currentGamePad = null;
    this.state = {
      buttons: [],
      axes: []
    };
    this._connectedGamePadsCount = 0;

    this._onButtonChanged = null;
    this._onAxisChanged = null;

    this._initialize();
  }

  _initialize() {
    window.addEventListener("gamepadconnected", e => {
      this._connectedGamePadsCount++;
    });

    window.addEventListener("gamepaddisconnected", e => {
      this._connectedGamePadsCount--;
    });
  }

  _setGamePad() {
    this._currentGamePad = navigator.getGamepads()[this._currentIndex];
  }

  get pads() {
    return navigator.getGamepads();
  }

  setIndex(index) {
    this._currentIndex = index;
  }

  setAxisChangedCallback(func) {
    this._onAxisChanged = func;
  }

  setButtonChangedCallback(func) {
    this._onButtonChanged = func;
  }

  captureButtons() {
    if( !this._onButtonChanged ) return;

    if( this.state.buttons.length > 0 ) {
      this.state.buttons.forEach((state, index) => {
        const currentState = this._currentGamePad.buttons[index];
        const isChanged = (state.pressed !== currentState.pressed) || (state.value !== currentState.value) || (state.touched !== currentState.touched);
        if ( isChanged ) this._onButtonChanged({value: currentState, index});
      });
    }

    this.state.buttons = this._currentGamePad.buttons.slice();
  }

  captureAxes() {
    if( !this._onAxisChanged ) return;

    if( this.state.axes.length > 0 ) {
      this.state.axes.forEach((state, index) => {
        const currentState = this._currentGamePad.axes[index];
        const isChanged = currentState !== state;
        if ( isChanged ) this._onAxisChanged({value: currentState, index});
      });
    }

    this.state.axes = this._currentGamePad.axes.slice();
  }

  step() {
    this._setGamePad();
    this.captureButtons();
    this.captureAxes();
  }

  pooling() {
    window.requestAnimationFrame(() => {
      if( this._connectedGamePadsCount > 0 ) {
        this.step();
      }
      this.pooling();
    });
  }
}
