import { useEffect, useRef, useCallback } from 'react';

const REPEAT_DELAY = 360;
const REPEAT_INTERVAL = 130;
const DEBOUNCE_MS = 55;
const STICK_ENGAGE = 0.55;
const STICK_RELEASE = 0.30;

const NAV_MAP: Record<string, string> = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' };

function fireNavKey(direction: string) {
  const key = NAV_MAP[direction];
  if (!key) return;
  const el = document.activeElement || document.body;
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function fireKey(key: string) {
  const el = document.activeElement || document.body;
  el.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

function activateActive(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el || el === document.body) return false;
  if (el.tagName === 'BUTTON') {
    el.click();
    return true;
  }
  return false;
}

interface HeldState {
  fire: () => void;
  nextFire: number;
  lastFire: number;
}

interface AxisState {
  direction: string | null;
  lastValue: number;
  lastFiredDirection?: string | null;
  wasReleased?: boolean;
  nextFire?: number;
}

export interface UseControllerOptions {
  onSearchFocus?: () => void;
  onConfirm?: () => void;
  onBack?: () => void;
  onLetterPrev?: () => void;
  onLetterNext?: () => void;
  onContextMenu?: () => void;
}

export function useController({
  onSearchFocus, onConfirm, onBack, onLetterPrev, onLetterNext, onContextMenu,
}: UseControllerOptions = {}, disabled: boolean = false) {
  const held = useRef<Record<string, HeldState>>({});
  const axisState = useRef<Record<string, AxisState>>({});
  const lastFire = useRef<Record<string, number>>({});
  const rafRef = useRef<number | null>(null);
  const windowFocused = useRef<boolean>(typeof document === 'undefined' || document.hasFocus());

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

  const isTextFieldFocused = (): boolean => {
    if (!windowFocused.current) return true;
    const el = document.activeElement as HTMLElement | null;
    if (!el) return false;
    const tag = el.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if ((el as any).isContentEditable) return true;
    return false;
  };

  const canFire = (key: string): boolean => {
    const now = Date.now();
    if (now - (lastFire.current[key] || 0) < DEBOUNCE_MS) return false;
    lastFire.current[key] = now;
    return true;
  };

  const press = useCallback((button: string, fn: () => void) => {
    if (!canFire(button)) return;
    fn();
    held.current[button] = { fire: fn, nextFire: Date.now() + REPEAT_DELAY, lastFire: Date.now() };
  }, []);

  const handleButton = useCallback(({ button, state }: { button: string; state: string }) => {
    if (state === 'up') {
      delete held.current[button];
      if (button === 'leftTrigger' || button === 'rightTrigger') {
        delete lastFire.current[button];
      }
      return;
    }
    if (state !== 'down') return;
    if (disabled) return;
    const inText = isTextFieldFocused();
    const inModal = !!(document.activeElement as HTMLElement | null)?.closest('.modal-overlay');

    switch (button) {
      case 'dpadUp':
      case 'dpadDown':
      case 'dpadLeft':
      case 'dpadRight':
        if (inText) { fireNavKey(button.slice(4).toLowerCase()); return; }
        return press(button, () => fireNavKey(button.slice(4).toLowerCase()));

      case 'a': {
        if (inText) { fireKey('Enter'); return; }
        if (activateActive()) return;
        if (onConfirm) { onConfirm(); return; }
        fireKey('Enter');
        window.electronAPI?.controllerRumble({ low: 0.2, high: 0.4, duration: 80 });
        return;
      }
      case 'b': {
        if (inText) { fireKey('Escape'); return; }
        if (activateActive()) return;
        if (onBack) { onBack(); return; }
        fireKey('Escape');
        window.electronAPI?.controllerRumble({ low: 0.1, high: 0.1, duration: 50 });
        return;
      }
      case 'y': {
        if (inText || inModal) { fireKey('Tab'); return; }
        if (onSearchFocus) onSearchFocus();
        return;
      }
      case 'start': {
        if (inText || inModal) return;
        if (onContextMenu) onContextMenu();
        return;
      }
      case 'leftTrigger': {
        if (inText || inModal) return;
        if (!canFire('leftTrigger')) return;
        onLetterPrev && onLetterPrev();
        return;
      }
      case 'rightTrigger': {
        if (inText || inModal) return;
        if (!canFire('rightTrigger')) return;
        onLetterNext && onLetterNext();
        return;
      }
      default: return;
    }
  }, [onSearchFocus, onConfirm, onBack, onLetterPrev, onLetterNext, onContextMenu, press, disabled]);

  const handleAxis = useCallback(({ axis, value }: { axis: string; value: number }) => {
    if (disabled) return;
    let direction: string | null = null;
    if (axis === 'leftX') {
      if (value >  STICK_ENGAGE) direction = 'right';
      else if (value < -STICK_ENGAGE) direction = 'left';
    } else if (axis === 'leftY') {
      if (value >  STICK_ENGAGE) direction = 'down';
      else if (value < -STICK_ENGAGE) direction = 'up';
    }
    const prev = axisState.current[axis];
    if (direction === null) {
      if (prev && prev.direction !== null) {
        axisState.current[axis] = { direction: null, lastValue: value, wasReleased: true };
      } else if (prev) {
        axisState.current[axis] = { ...prev, lastValue: value };
      } else {
        axisState.current[axis] = { direction: null, lastValue: value };
      }
      return;
    }
    const lastFired = prev?.lastFiredDirection;
    const wasReleased = prev?.wasReleased === true;
    const isNewDirection = lastFired !== direction;
    if (isNewDirection || wasReleased) {
      if (!canFire(`axis-${axis}`)) {
        axisState.current[axis] = { direction, lastValue: value, lastFiredDirection: lastFired, wasReleased };
        return;
      }
      fireNavKey(direction);
      axisState.current[axis] = { direction, lastValue: value, lastFiredDirection: direction, wasReleased: false, nextFire: Date.now() + REPEAT_INTERVAL };
    } else {
      axisState.current[axis] = { direction, lastValue: value, lastFiredDirection: direction, wasReleased: false, nextFire: prev?.nextFire };
    }
  }, [disabled]);

  useEffect(() => {
    let running = true;
    function tick() {
      if (!running) return;
      if (disabled) { rafRef.current = requestAnimationFrame(tick); return; }
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
        if (s && s.direction && s.nextFire && now >= s.nextFire) {
          if (canFire(axis)) {
            fireNavKey(s.direction);
          }
          s.nextFire = now + REPEAT_INTERVAL;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { running = false; cancelAnimationFrame(rafRef.current!); };
  }, []);

  useEffect(() => {
    if (!window.electronAPI) return;
    const offButton = window.electronAPI.onControllerButton(handleButton);
    const offAxis = window.electronAPI.onControllerAxis(handleAxis);
    return () => {
      offButton && offButton();
      offAxis && offAxis();
    };
  }, [handleButton, handleAxis]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = ((e.target as HTMLElement | null)?.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement | null)?.isContentEditable) return;
      if (e.key === '[') { e.preventDefault(); onLetterPrev && onLetterPrev(); }
      else if (e.key === ']') { e.preventDefault(); onLetterNext && onLetterNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onLetterPrev, onLetterNext]);
}

export function rumble(low: number = 0.3, high: number = 0.5, duration: number = 100) {
  window.electronAPI?.controllerRumble({ low, high, duration });
}
