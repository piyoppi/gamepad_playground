import { GamePads, GamePadMapper, keyType } from '@piyoppi/picopico-pad';

const gamePads = new GamePads();
const keys = [
  { name: 'button-1', type: keyType.button, index: 0 },
  { name: 'button-2', type: keyType.button, index: 1 },
  { name: 'button-3', type: keyType.button, index: 2 },
  { name: 'button-4', type: keyType.button, index: 3 },
  { name: 'axis-x', type: keyType.axis, index: 0 },
  { name: 'axis-y', type: keyType.axis, index: 1 }
];

const gamePadListElem = document.getElementById('gamepads');
const buildGamePadSelector = () => {
  gamePadListElem.innerHTML = '';

  gamePads.pads.forEach( item => {
    const padItemElem = document.createElement('option');
    padItemElem.setAttribute('value', item.index);
    padItemElem.innerText = item.gamepad.id;
    gamePadListElem.appendChild(padItemElem);
  });
};

gamePadListElem.onchange = async (e) => {
  await gamePads.stop();
  await gamePads.setIndex(parseInt(e.target.value));
  gamePads.capture();
};

const padMapper = new GamePadMapper(gamePads, keys);

// UI
const captureButton = document.getElementById('capture');
const stopButton = document.getElementById('stop');
stopButton.style.display = 'none';

stopButton.addEventListener('click', () => {
  padMapper.stop();
});

// set event hander to buttons
keys.map(key => key.name).forEach(keyName => {
  const targetButton = document.getElementById(`setup-${keyName}`);
  targetButton.addEventListener('click', async () => {
    await padMapper.register(keyName);
  });
});

// Show the result of key mappings
padMapper.addEventHandler('applied', e => {
  document.getElementById(`key-${e.name}`).innerText = e.index;
});

gamePads.addEventHandler('connected', async (e) => {
  document.getElementById('connecting-label').innerText = `✅接続されました ${e.gamepad.id}`;
  buildGamePadSelector();
  await gamePads.setFirstPad();

  gamePads.capture();

  captureButton.addEventListener('click', () => {
    console.log('capturing');
    padMapper.resetStepBy();
    padMapper.registerAll();
    stopButton.style.display = '';
    captureButton.style.display = 'none';
  });

  padMapper.addEventHandler('buttonChanged', e => {
    console.log(`Button ${e.index} ${e.name} : ${e.value.pressed}`);
    if( e.value.pressed ) {
      document.getElementById(`state-${e.name}`).innerText = '💡';
    } else {
      document.getElementById(`state-${e.name}`).innerText = '  ';
    }
  });
  padMapper.addEventHandler('axisChanged', e => {
    console.log(`Axis ${e.index} ${e.name} : ${e.value}`);
    document.getElementById(`state-${e.name}`).innerText = Math.round(e.value * 1000.0) / 1000.0;
  });
});

padMapper.addEventHandler('cursorChanged', e => {
  keys.forEach((_key, index) => {
    document.getElementById(`cursor${index}`).innerText = '';
  });
  if( e.cursor >= 0 ) document.getElementById(`cursor${e.cursor}`).innerText = '👉';
});

padMapper.addEventHandler('registerCompleted', e => {
  console.log('captured');
  stopButton.style.display = 'none';
  captureButton.style.display = '';
});
