import { BrowserWindow } from 'electron';

const JOYSTICK_BUTTON_MAP = {
  0: 'a', 1: 'b', 2: 'x', 3: 'y',
  4: 'back', 5: 'guide', 6: 'start',
  7: 'leftStick', 8: 'rightStick',
  9: 'leftShoulder', 10: 'rightShoulder',
  11: 'dpadUp', 12: 'dpadDown', 13: 'dpadLeft', 14: 'dpadRight',
};

const AXIS_MAP = {
  0: 'leftX', 1: 'leftY', 2: 'rightX', 3: 'rightY',
  4: 'leftTrigger', 5: 'rightTrigger',
};

const TRIGGER_THRESHOLD = 0.5;

function getMainWindow() {
  return BrowserWindow.getAllWindows()[0] ?? null;
}

// Send to all live windows. This way the controller still drives the main
// RomM-SD window even when a child window (e.g. the browser-play stream) is
// focused. The main window was previously gated on `win.isFocused()`, which
// caused the controller to silently stop working the moment a child window
// stole focus — extremely confusing on a TV/Steam Deck where there is no
// visible "active" highlight.
function broadcast(channel, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win && !win.isDestroyed()) {
      try { win.webContents.send(channel, payload); } catch {}
    }
  }
}

export function initControllers(sdl, { logInfo, logError }) {
  if (!sdl) return;

  const openJoysticks = new Map();
  const openControllers = new Map();
  const triggerState = new Map();

  function openJoystickFor(device) {
    if (openJoysticks.has(device.id)) return;
    try {
      const j = sdl.joystick.openDevice(device);
      openJoysticks.set(device.id, j);
      triggerState.set(device.id, { left: false, right: false });

      j.on('buttonDown', ({ button }) => {
        const name = JOYSTICK_BUTTON_MAP[button];
        if (name) broadcast('controller-button', { button: name, state: 'down' });
      });
      j.on('buttonUp', ({ button }) => {
        const name = JOYSTICK_BUTTON_MAP[button];
        if (name) broadcast('controller-button', { button: name, state: 'up' });
      });
      j.on('axisMotion', ({ axis, value }) => {
        const name = AXIS_MAP[axis];
        if (!name) return;
        if (name === 'leftTrigger' || name === 'rightTrigger') {
          const normalized = (value + 1) / 2;
          const side = name === 'leftTrigger' ? 'left' : 'right';
          const state = triggerState.get(device.id);
          const pressed = normalized > TRIGGER_THRESHOLD;
          if (state[side] !== pressed) {
            state[side] = pressed;
            broadcast('controller-button', { button: name, state: pressed ? 'down' : 'up' });
          }
        } else {
          broadcast('controller-axis', { axis: name, value });
        }
      });

      logInfo(`Joystick open: ${device.name}`);
    } catch (e) {
      logError(`Failed to open joystick ${device.name}: ${e.message}`);
    }
  }

  function tryOpenController(device) {
    if (openControllers.has(device.id)) return;
    try {
      const c = sdl.controller.openDevice(device);
      openControllers.set(device.id, c);
      logInfo(`GameController open (rumble): ${device.name}`);
    } catch (e) {
      logError(`Failed to open controller ${device.name}: ${e.message}`);
    }
  }

  function closeById(id) {
    const j = openJoysticks.get(id);
    if (j) { try { j.close(); } catch (_) {} openJoysticks.delete(id); }
    triggerState.delete(id);
    const c = openControllers.get(id);
    if (c) { try { c.close(); } catch (_) {} openControllers.delete(id); }
  }

  for (const d of sdl.joystick.devices) openJoystickFor(d);
  for (const d of sdl.controller.devices) tryOpenController(d);

  sdl.joystick.on('deviceAdd', ({ device }) => openJoystickFor(device));
  sdl.joystick.on('deviceRemove', ({ device }) => closeById(device.id));
  sdl.controller.on('deviceAdd', ({ device }) => tryOpenController(device));
  sdl.controller.on('deviceRemove', ({ device }) => {
    const c = openControllers.get(device.id);
    if (c) { try { c.close(); } catch (_) {} openControllers.delete(device.id); }
  });

  return {
    rumble({ low = 0, high = 0, duration = 100 } = {}) {
      for (const c of openControllers.values()) {
        try { if (c._hasRumble) c.rumble(low, high, duration); } catch (_) {}
      }
    },
  };
}
