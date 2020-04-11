import { GamePads, captureState } from './../src/main.js'
import { RequestAnimationFrameHelper } from './requestAnimationFrameHelper.js'
import './gamePadsHelper.js'

function createGamePads() {
  const gamePads = new GamePads();
  gamePads._gamepadConnectedHandler({});
  return gamePads;
}

describe('#hasPads', () => {
  it('return true if connected some gamepads', () => {
    const gamePads = createGamePads();
    expect(gamePads.hasPads).toEqual(true);
  });

  it('return false if gamepad isnot connected', () => {
    const gamePads = new GamePads();
    expect(gamePads.hasPads).toEqual(false);
  });
});

describe('#pads', () => {
  it('return active game pads', () => {
    const gamePads = new GamePads();
    expect(gamePads.pads.length).toEqual(3);
  });
});

describe('#setIndex', () => {
  it('raise error when capturing', () => {
    const gamePads = new GamePads();
    gamePads.capture();
    expect(() => gamePads.setIndex(0)).toThrow('A gamepad was capturing');
  });

  it('set current index', () => {
    const gamePads = new GamePads();
    gamePads.setIndex(0);
    expect(gamePads.currentIndex).toEqual(0);
  });

  it('called initialize', async () => {
    const gamePads = new GamePads();
    gamePads.initialize = jest.fn();
    await gamePads.setIndex(0);
    expect(gamePads.initialize).toBeCalled();
  });
});

describe('#capture', () => {
  it('capturing state is changed', () => {
    const gamePads = createGamePads();
    gamePads.capture();
    expect(gamePads.captureState).toEqual(captureState.capturing);
  });

  it('not called _capture() when capturing', () => {
    const gamePads = createGamePads();
    gamePads._capture = jest.fn();
    gamePads.capture();
    gamePads.capture();
    expect(gamePads._capture).toBeCalledTimes(1);
  });

  it('called step() repeatedly', () => {
    const gamePads = createGamePads();
    RequestAnimationFrameHelper.reset(3);
    gamePads.step = jest.fn();
    gamePads.capture();
    expect(gamePads.step).toBeCalledTimes(3);
  });
});

describe('#_capture', () => {
  it('not called step() when captureState is waitForStop', () => {
    const gamePads = createGamePads();
    RequestAnimationFrameHelper.reset();
    gamePads.step = jest.fn();

    // called _capture()
    gamePads.capture();
    gamePads.stop();

    // not called _capture()
    gamePads._capture();
    expect(gamePads.step).toBeCalledTimes(1);
  });
});

describe('#capturing', () => {
  it('return false when not capturing', () => {
    const gamePads = createGamePads();
    expect(gamePads.capturing).toEqual(false);
  });

  it('return true when capturing', () => {
    const gamePads = createGamePads();
    gamePads.capture();
    expect(gamePads.capturing).toEqual(true);
  });

  it('return true when waitForStop', () => {
    const gamePads = createGamePads();
    gamePads.capture();
    gamePads.stop();
    expect(gamePads.capturing).toEqual(true);
  });
});
