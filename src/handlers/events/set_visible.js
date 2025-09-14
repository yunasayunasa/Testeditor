// src/handlers/events/set_visible.js

// [set_visible value=false]
export function handleSetVisible(interpreter, params, target) {
    const isVisible = (params.value !== 'false');
    target.setVisible(isVisible);
}