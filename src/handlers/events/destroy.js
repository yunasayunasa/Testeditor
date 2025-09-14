// src/handlers/events/destroy.js

// [destroy]
export function handleDestroy(interpreter, params, target) {
    target.destroy();
    // このアクションは一瞬で終わるので、Promiseを返す必要はない
}