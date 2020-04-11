let count = 0;
let repeat = 1;

Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: jest.fn().mockImplementation(fn => {
    if( count < repeat ) {
      count++;
      fn();
    }
  })
});

export const RequestAnimationFrameHelper = {
  reset(expectedRepeat = 1) {
    count = 0;
    repeat = expectedRepeat;
  }
}
