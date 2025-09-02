// src/handlers/events/set_visible.js

// [set_visible value=false]
export function handleSetVisible(interpreter, target, params) {
    const isVisible = (params.value !== 'false');
    target.setVisible(isVisible);
}