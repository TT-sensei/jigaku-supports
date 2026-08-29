export const EDU_EVENTS = Object.freeze({
  CORRECT: 'edu:correct', WRONG: 'edu:wrong', SCREEN_CHANGE: 'edu:screenchange', COMBO: 'edu:combo',
  COMPLETE: 'edu:complete', TIMER_START: 'edu:timerstart', TIMER_WARNING: 'edu:timerwarning', TIMEUP: 'edu:timeup',
  NEW_RECORD: 'edu:newrecord', RANK: 'edu:rank', STORAGE_SAVE: 'edu:storagesave', STORAGE_REMOVE: 'edu:storageremove',
  STORAGE_CLEAR: 'edu:storageclear', STORAGE_ERROR: 'edu:storageerror', PROGRESS: 'edu:progress',
  LEVEL_CHANGE: 'edu:levelchange', UNLOCK: 'edu:unlock', LOCK: 'edu:lock', ACHIEVEMENT: 'edu:achievement', BADGE: 'edu:badge'
});

export function resolveEventTarget(target) {
  if (target && typeof target.dispatchEvent === 'function') return target;
  if (typeof document !== 'undefined') return document;
  return new EventTarget();
}

export function emit(target, name, detail = {}) {
  const eventTarget = resolveEventTarget(target);
  eventTarget.dispatchEvent(new CustomEvent(name, { detail }));
}
