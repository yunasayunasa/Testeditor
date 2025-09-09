// src/handlers/events/index.js

import { handleTween } from './tween.js';
import { handleDestroy } from './destroy.js';
import { handleSetVisible } from './set_visible.js';
import { handleVelocity } from './velocity.js';
import animStopHandler from './anim_stop.js';
import animFrameHandler from './anim_frame.js';
// (もし、handleAnimのインポート名がanimPlayHandlerなどになっていたら、それに合わせる)
import animPlayHandler from './anim_play.js'; 
import evalExpressionHandler from './eval.js';
import setFlipXHandler from './set_flip_x.js';
// ActionInterpreterが使う、イベントタグのカタログ
export const eventTagHandlers = {
    'tween': handleTween,
    'destroy': handleDestroy,
    'set_visible': handleSetVisible,
      'velocity': handleVelocity,
     'anim_play': animPlayHandler, // anim_playも正式に登録
    'anim_stop': animStopHandler,
    'anim_frame': animFrameHandler,
      'set_flip_x': setFlipXHandler,

       'eval': evalExpressionHandler,  
    // 将来、ここに [eval] [body_velocity] などを追加していく
};