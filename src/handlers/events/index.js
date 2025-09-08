// src/handlers/events/index.js

import { handleTween } from './tween.js';
import { handleDestroy } from './destroy.js';
import { handleSetVisible } from './set_visible.js';
import { handleVelocity } from './velocity.js';
import { handleAnim } from './anim.js';
import evalExpressionHandler from './eval.js';

// ActionInterpreterが使う、イベントタグのカタログ
export const eventTagHandlers = {
    'tween': handleTween,
    'destroy': handleDestroy,
    'set_visible': handleSetVisible,
      'velocity': handleVelocity,
    'anim': handleAnim,
       'eval': evalExpressionHandler,  
    // 将来、ここに [eval] [body_velocity] などを追加していく
};