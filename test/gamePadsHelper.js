Object.defineProperty(window.navigator, 'getGamepads', {
  writable: true,
  value: jest.fn().mockImplementation(() => {
    return [
      {buttons: [], axes:[]},
      undefined,
      {buttons: [], axes:[]},
      null,
      {buttons: [], axes:[]},
    ]
  })
});
