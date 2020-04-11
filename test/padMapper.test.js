import { GamePads, captureState } from './../src/main.js'
import { GamePadMapper, keyType } from './../src/padMapper.js'
import { RequestAnimationFrameHelper } from './requestAnimationFrameHelper.js'
import { buttons as gamePadButtons, GamePadsTestHelper } from './gamePadsHelper.js'

const keys = [
  { name: 'button-1', type: keyType.button, index: 0 },
  { name: 'button-2', type: keyType.button, index: 1 },
  { name: 'button-3', type: keyType.button, index: 2 },
  { name: 'button-4', type: keyType.button, index: 3 },
  { name: 'axis-x', type: keyType.axis, index: 0 },
  { name: 'axis-y', type: keyType.axis, index: 1 }
];

async function createGamePadMapper() {
  const gamePads = new GamePads();
  const gamePadMapper = new GamePadMapper(gamePads, keys);
      
  gamePads._gamepadConnectedHandler({});
  await gamePads.setFirstPad();

  return gamePadMapper;
}

describe('#register', () => {
  let gamePadMapper;
  let appliedEventHandler;

  beforeEach(async () => {
    appliedEventHandler = jest.fn();
    gamePadMapper = await createGamePadMapper();
    gamePadMapper.addEventHandler('applied', appliedEventHandler);
    RequestAnimationFrameHelper.reset(0);
  });

  it('_capture() is called when mapper isnot capturing', async () => {
    gamePadMapper._capture = jest.fn();
    await gamePadMapper.register('button-2');
    expect(gamePadMapper._capture).toBeCalledTimes(1);
    expect(gamePadMapper.cursor).toEqual(-1);
  });

  it('_capture() is called when the mapper is step-capturing', async () => {
    gamePadMapper._capture = jest.fn();
    await gamePadMapper.stepBy();
    await gamePadMapper.register('button-2');
    expect(gamePadMapper._capture).toBeCalledTimes(1);
    expect(gamePadMapper.cursor).toEqual(1);
  });

  it('_capture() is not called when a keys is not found', async () => {
    gamePadMapper._capture = jest.fn();
    await gamePadMapper.register('button-hoge');
    expect(gamePadMapper._capture).not.toBeCalled();
  });

  it('capture a selected key', async () => {
    GamePadsTestHelper.press(0);
    await gamePadMapper.register('button-2');

    expect(appliedEventHandler).toBeCalledWith(keys[1]);
  });

  it('capture a selected axis', async () => {
    RequestAnimationFrameHelper.reset(1, () => {
      // restore x axis
      GamePadsTestHelper.tilt(0, 0);
    });

    // tilt x axis
    GamePadsTestHelper.tilt(0, 1);
    await gamePadMapper.register('axis-x');

    expect(appliedEventHandler).toBeCalledWith(keys[4]);
  });

  it('throw exception when capturing has been started', async () => {
    gamePadMapper.register('button-2');
    await expect(gamePadMapper.register('button-2')).rejects.toThrow('capturing is already started');
  });

  it('aborted to capture when stop() called', async () => {
    RequestAnimationFrameHelper.reset(1, () => {
      GamePadsTestHelper.press(1);
      gamePadMapper.stop()
    });
    await gamePadMapper.register('button-2');

    expect(appliedEventHandler).not.toBeCalled();
  });

  afterEach(() => {
    GamePadsTestHelper.reset();
  });
});

describe('#setupKeys', () => {
  it('set keys', async () => {
    const gamePadMapper = await createGamePadMapper();
    const button = { name: 'button-a', type: keyType.button, index: 0 };
    const axis = { name: 'axis-x', type: keyType.axis, index: 0 };

    gamePadMapper.setupKeys([button, axis]);
    expect(gamePadMapper.keys).toContain(button);
    expect(gamePadMapper.keys).toContain(axis);
  });
});

describe('#resetStepBy', () => {
  let gamePadMapper;
  beforeEach(async () => {
    gamePadMapper = await createGamePadMapper();
    gamePadMapper.resetStepBy();
  });

  it('reset cursor', () => {
    expect(gamePadMapper.cursor).toEqual(0);
  });
});

describe('#stepBy', () => {
  let gamePadMapper;
  let appliedEventHandler;
  let cursorChangedHandler;

  beforeEach(async () => {
    appliedEventHandler = jest.fn();
    cursorChangedHandler = jest.fn();

    gamePadMapper = await createGamePadMapper();
    gamePadMapper.resetStepBy();
    gamePadMapper.addEventHandler('applied', appliedEventHandler);
    gamePadMapper.addEventHandler('cursorChanged', cursorChangedHandler);
    GamePadsTestHelper.reset();
    RequestAnimationFrameHelper.reset(0);
  });

  it('_capture() is called', async () => {
    gamePadMapper._capture = jest.fn();
    await gamePadMapper.stepBy();
    expect(gamePadMapper._capture).toBeCalled();
  });

  it('cursor is incremented', async () => {
    gamePadMapper._capture = jest.fn();
    await gamePadMapper.stepBy();
    expect(gamePadMapper.cursor).toEqual(1);
  });

  it('The status of capturing is "capturing"', async () => {
    gamePadMapper._capture = jest.fn();
    await gamePadMapper.stepBy();
    expect(gamePadMapper.captureStepCompleted).toEqual(false);
  });

  it('The status of capturing is completed when all keys are captured', async () => {
    gamePadMapper._capture = jest.fn();
    for( let i=0; i<keys.length; i++ ) await gamePadMapper.stepBy();
    expect(gamePadMapper.captureStepCompleted).toEqual(true);
  });

  it('capture all keys', async () => {
    RequestAnimationFrameHelper.reset(8, count => {
      switch(count) {
        case 0:
          GamePadsTestHelper.press(0); break;
        case 1:
          GamePadsTestHelper.press(1); break;
        case 2:
          GamePadsTestHelper.press(2); break;
        case 3:
          GamePadsTestHelper.press(3); break;
        case 4:
          GamePadsTestHelper.tilt(0, 1); break;
        case 5:
          GamePadsTestHelper.tilt(0, 0); break;
        case 6:
          GamePadsTestHelper.tilt(1, 1); break;
        case 7:
          GamePadsTestHelper.tilt(1, 0); break;
      };
    });

    for( let i=0; i<keys.length; i++ ) {
      await gamePadMapper.stepBy();
    }

    expect(appliedEventHandler).nthCalledWith(1, keys[0]);
    expect(appliedEventHandler).nthCalledWith(2, keys[1]);
    expect(appliedEventHandler).nthCalledWith(3, keys[2]);
    expect(appliedEventHandler).nthCalledWith(4, keys[3]);
    expect(appliedEventHandler).nthCalledWith(5, keys[4]);
    expect(appliedEventHandler).nthCalledWith(6, keys[5]);
    expect(cursorChangedHandler).nthCalledWith(1, {cursor: 0});
    expect(cursorChangedHandler).nthCalledWith(2, {cursor: 1});
    expect(cursorChangedHandler).nthCalledWith(3, {cursor: 2});
    expect(cursorChangedHandler).nthCalledWith(4, {cursor: 3});
    expect(cursorChangedHandler).nthCalledWith(5, {cursor: 4});
    expect(cursorChangedHandler).nthCalledWith(6, {cursor: 5});
    expect(cursorChangedHandler).nthCalledWith(7, {cursor: -1});
  });

  it('throw exception when capturing has been started', async () => {
    gamePadMapper.stepBy();
    await expect(gamePadMapper.stepBy()).rejects.toThrow('capturing is already started');
  });

  it('aborted to capture when stop() called', async () => {
    RequestAnimationFrameHelper.reset(1, () => {
      GamePadsTestHelper.press(0);
      gamePadMapper.stop()
    });
    await gamePadMapper.stepBy();

    expect(appliedEventHandler).not.toBeCalled();
  });

  afterEach(() => {
    GamePadsTestHelper.reset();
  });
});

describe('#registerAll', () => {
  let gamePadMapper;
  let appliedEventHandler;
  let cursorChangedHandler;
  let registerCompleted;

  beforeEach(async () => {
    appliedEventHandler = jest.fn();
    cursorChangedHandler = jest.fn();
    registerCompleted = jest.fn();

    gamePadMapper = await createGamePadMapper();
    gamePadMapper.resetStepBy();
    gamePadMapper.addEventHandler('applied', appliedEventHandler);
    gamePadMapper.addEventHandler('cursorChanged', cursorChangedHandler);
    gamePadMapper.addEventHandler('registerCompleted', registerCompleted);
    GamePadsTestHelper.reset();
    RequestAnimationFrameHelper.reset(0);
  });

  it('capture all keys', async () => {
    RequestAnimationFrameHelper.reset(8, count => {
      switch(count) {
        case 0:
          GamePadsTestHelper.press(0); break;
        case 1:
          GamePadsTestHelper.press(1); break;
        case 2:
          GamePadsTestHelper.press(2); break;
        case 3:
          GamePadsTestHelper.press(3); break;
        case 4:
          GamePadsTestHelper.tilt(0, 1); break;
        case 5:
          GamePadsTestHelper.tilt(0, 0); break;
        case 6:
          GamePadsTestHelper.tilt(1, 1); break;
        case 7:
          GamePadsTestHelper.tilt(1, 0); break;
      };
    });

    await gamePadMapper.registerAll();

    expect(appliedEventHandler).nthCalledWith(1, keys[0]);
    expect(appliedEventHandler).nthCalledWith(2, keys[1]);
    expect(appliedEventHandler).nthCalledWith(3, keys[2]);
    expect(appliedEventHandler).nthCalledWith(4, keys[3]);
    expect(appliedEventHandler).nthCalledWith(5, keys[4]);
    expect(appliedEventHandler).nthCalledWith(6, keys[5]);
    expect(cursorChangedHandler).nthCalledWith(1, {cursor: 0});
    expect(cursorChangedHandler).nthCalledWith(2, {cursor: 1});
    expect(cursorChangedHandler).nthCalledWith(3, {cursor: 2});
    expect(cursorChangedHandler).nthCalledWith(4, {cursor: 3});
    expect(cursorChangedHandler).nthCalledWith(5, {cursor: 4});
    expect(cursorChangedHandler).nthCalledWith(6, {cursor: 5});
    expect(cursorChangedHandler).nthCalledWith(7, {cursor: -1});

    expect(registerCompleted).toBeCalled();
  });

  it('throw error if capturing is already started', async () => {
    gamePadMapper.registerAll();
    await expect(() => gamePadMapper.registerAll()).toThrow('The state of capturing is not ready');
  });
});
