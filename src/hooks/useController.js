import { useEffect, useRef, useCallback } from 'react';

const REPEAT_DELAY = 420;
const REPEAT_INTERVAL = 160;
const DEBOUNCE_MS = 200;
const STICK_ENGAGE = 0.65;
const STICK_RELEASE = 0.25;

const NAV_MAP = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

function fireNavKey(direction) {
  const key = NAV_MAP[direction];
  if (!key) return;
  const el = document.activeElement || document.body;
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function fireKey(key) {
  const el = document.activeElement || document.body;
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function activateActive() {
  const el = document.activeElement;
  if (!el || el === document.body) return false;
  if (el.tagName === 'BUTTON') {
    el.click();
    return true;
  }
  return false;
}

export function useController({
  onSearchFocus, onConfirm, onBack, onLetterPrev, onLetterNext, onContextMenu,
} = {}) {
  const held = useRef({});
  const axisState = useRef({});
  const lastFire = useRef({});
  const rafRef = useRef(null);
  const windowFocused = useRef(typeof document === 'undefined' || document.hasFocus());

  useEffect(() => {
    const onFocus = () => { windowFocused.current = true; };
    const onBlur = () => {
      windowFocused.current = false;
      held.current = {};
      axisState.current = {};
      lastFire.current = {};
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const isTextFieldFocused = () => {
    if (!windowFocused.current) return true;
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (el.isContentEditable) return true;
    return false;
  };

  const canFire = (key) => {
    const now = Date.now();
    if (now - (lastFire.current[key] || 0) < DEBOUNCE_MS) return false;
    lastFire.current[key] = now;
    return true;
  };

  const press = useCallback((button, fn) => {
    if (!canFire(button)) return;
    fn();
    held.current[button] = { fire: fn, nextFire: Date.now() + REPEAT_DELAY, lastFire: Date.now() };
  }, []);

  const handleButton = useCallback(({ button, state }) => {
    if (state !== 'down') return;
    const inText = isTextFieldFocused();

    switch (button) {
      case 'dpadUp':
      case 'dpadDown':
      case 'dpadLeft':
      case 'dpadRight':
        if (inText) { fireNavKey(button.slice(4).toLowerCase()); return; }
        return press(button, () => fireNavKey(button.slice(4).toLowerCase()));

      case 'a': {
        if (inText) { fireKey('Enter'); return; }
        if (onConfirm) { onConfirm(); return; }
        if (activateActive()) return;
        fireKey('Enter');
        window.electronAPI?.controllerRumble({ low: 0.2, high: 0.4, duration: 80 });
        return;
      }
      case 'b': {
        if (inText) { fireKey('Escape'); return; }
        if (onBack) { onBack(); return; }
        if (activateActive()) return;
        fireKey('Escape');
        window.electronAPI?.controllerRumble({ low: 0.1, high: 0.1, duration: 50 });
        return;
      }
      case 'y': {
        if (inText) { fireKey('Tab'); return; }
        if (onSearchFocus) onSearchFocus();
        return;
      }
      case 'start': {
        if (inText) return;
        if (onContextMenu) onContextMenu();
        return;
      }
      case 'leftTrigger': {
        if (inText) return;
        if (!canFire('leftTrigger')) return;
        onLetterPrev && onLetterPrev();
        return;
      }
      case 'rightTrigger': {
        if (inText) return;
        if (!canFire('rightTrigger')) return;
        onLetterNext && onLetterNext();
        return;
      }
      default: return;
    }
  }, [onSearchFocus, onConfirm, onBack, onLetterPrev, onLetterNext, onContextMenu, press]);

  const handleButtonUp = useCallback(({ button }) => {
    delete held.current[button];
    if (button === 'leftTrigger' || button === 'rightTrigger') {
      delete lastFire.current[button];
    }
  }, []);

  const handleAxis = useCallback(({ axis, value }) => {
    let direction = null;
    if (axis === 'leftX') {
      if (value >  STICK_ENGAGE) direction = 'right';
      else if (value < -STICK_ENGAGE) direction = 'left';
    } else if (axis === 'leftY') {
      if (value >  STICK_ENGAGE) direction = 'down';
      else if (value < -STICK_ENGAGE) direction = 'up';
    }
    const prev = axisState.current[axis];
    if (direction === null) {
      if (prev && Math.abs(prev.lastValue) > STICK_RELEASE) {
        axisState.current[axis] = { direction: null, lastValue: 0 };
      } else if (prev) {
        axisState.current[axis] = { ...prev, lastValue: prev.lastValue };
      } else {
        axisState.current[axis] = { direction: null, lastValue: 0 };
      }
      return;
    }
    const lastValue = prev?.lastValue ?? 0;
    if (prev?.direction !== direction && Math.abs(lastValue) < STICK_RELEASE) {
      fireNavKey(direction);
      axisState.current[axis] = { direction, lastValue: value, nextFire: Date.now() + REPEAT_INTERVAL };
    } else {
      axisState.current[axis] = { direction, lastValue: value, nextFire: prev?.nextFire };
    }
  }, []);

  useEffect(() => {
    let running = true;
    function tick() {
      if (!running) return;
      const now = Date.now();
      for (const [btn, s] of Object.entries(held.current)) {
        if (s && now >= s.nextFire) {
          if (now - s.lastFire >= REPEAT_INTERVAL) {
            s.fire();
            s.lastFire = now;
          }
          s.nextFire = now + REPEAT_INTERVAL;
        }
      }
      for (const [axis, s] of Object.entries(axisState.current)) {
        if (s && s.direction && now >= s.nextFire) {
          if (canFire(axis)) {
            fireNavKey(s.direction);
          }
          s.nextFire = now + REPEAT_INTERVAL;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current); };
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    window.electronAPI.onControllerButton(handleButton);
    window.electronAPI.onControllerButton(handleButtonUp);
    window.electronAPI.onControllerAxis(handleAxis);
    return () => {
      window.electronAPI.offControllerButton(handleButton);
      window.electronAPI.offControllerButton(handleButtonUp);
      window.electronAPI.offControllerAxis(handleAxis);
    };
  }, [handleButton, handleButtonUp, handleAxis]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target?.isContentEditable) return;
      if (e.key === '[') { e.preventDefault(); onLetterPrev && onLetterPrev(); }
      else if (e.key === ']') { e.preventDefault(); onLetterNext && onLetterNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onLetterPrev, onLetterNext]);
}

export function rumble(low = 0.3, high = 0.5, duration = 100) {
  window.electronAPI?.controllerRumble({ low, high, duration });
}
