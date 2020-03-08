let gamePad = null;
let buttonsState = [];
let axesState = [];

function captureButtons() {
  if( buttonsState.length > 0 ) {
    buttonsState.forEach((state, index) => {
      const currentState = gamePad.buttons[index];
      const isChanged = (state.pressed !== currentState.pressed) || (state.value !== currentState.value) || (state.touched !== currentState.touched);
      if ( isChanged ) console.log(currentState);
    });
  }
  buttonsState = gamePad.buttons.slice();
}

function captureAxes() {
  if( axesState.length > 0 ) {
    axesState.forEach((state, index) => {
      const currentState = gamePad.axes[index];
      const isChanged = currentState !== state;
      if ( isChanged ) console.log(`${index}, ${currentState}`);
    });
  }
  axesState = gamePad.axes.slice();
}

function pooling() {
  setTimeout(() => {
    gamePad = navigator.getGamepads()[0];
    captureButtons();
    captureAxes();
    pooling();
  }, 16);
}

window.addEventListener("gamepadconnected", function(e) {
  console.log(`Gamepad connected ${e.gamepad.index} ${e.gamepad.id}`);

  pooling();
});
