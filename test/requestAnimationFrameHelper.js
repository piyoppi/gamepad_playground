let count = 0;
let repeat = 1;
let called = null;

Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: jest.fn().mockImplementation(fn => {
    if( count < repeat ) {
      if( called ) called(count);
      count++;
      fn();
    }
  })
});

export const RequestAnimationFrameHelper = {
  reset(expectedRepeat = 1, callback = null) {
    count = 0;
    repeat = expectedRepeat;
    called = callback;
  },
}
