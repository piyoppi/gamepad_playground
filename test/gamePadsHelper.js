export const depressedButtonState = { pressed: false, touched: false, value: 0 };
export const pressedButtonState = { pressed: true, touched: true, value: 1 };

const defaultButtons = [
  depressedButtonState,
  depressedButtonState,
  depressedButtonState,
  depressedButtonState
];

const defaultAxes = [0, 0];

const defaultGamePads = [
  {buttons: [], axes:[]},
  undefined,
  {buttons: [], axes:[]},
  null,
  {buttons: [], axes:[]},
];

let gamePads;
let activeGamePadIndex = 0;

Object.defineProperty(window.navigator, 'getGamepads', {
  writable: true,
  value: jest.fn().mockImplementation(() => {
    return gamePads;
  })
});

export const GamePadsTestHelper = {
  reset(initialGamePads = null, activatedGamePadIndex = 0) {
    activeGamePadIndex = activatedGamePadIndex;

    gamePads = initialGamePads ? initialGamePads : defaultGamePads.slice();
    gamePads[activeGamePadIndex].buttons = defaultButtons.slice();
    gamePads[activeGamePadIndex].axes = defaultAxes.slice();
  },
  press(index) {
    gamePads[activeGamePadIndex].buttons[index] = pressedButtonState;
  },
  tilt(index, value) {
    gamePads[activeGamePadIndex].axes[index] = value;
  }
};

GamePadsTestHelper.reset();
