export const depressedButtonState = { pressed: false, touched: false, value: 0 };
export const pressedButtonState = { pressed: true, touched: true, value: 1 };

let buttons = [
  depressedButtonState,
  depressedButtonState,
  depressedButtonState,
  depressedButtonState
];

let axes = [0, 0];

Object.defineProperty(window.navigator, 'getGamepads', {
  writable: true,
  value: jest.fn().mockImplementation(() => {
    return [
      {buttons, axes},
      undefined,
      {buttons: [], axes:[]},
      null,
      {buttons: [], axes:[]},
    ]
  })
});

export const GamePadsTestHelper = {
  reset() {
    buttons = [
      depressedButtonState,
      depressedButtonState,
      depressedButtonState,
      depressedButtonState
    ];
    axes = [0, 0]
  },
  press(index) {
    buttons[index] = pressedButtonState;
  },
  tilt(index, value) {
    axes[index] = value;
  }
};
