// src/handlers/events/destroy.js

// [destroy]
export function handleDestroy(interpreter, target, params) {
    target.destroy();
    // このアクションは一瞬で終わるので、Promiseを返す必要はない
}