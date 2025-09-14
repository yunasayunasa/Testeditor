// src/handlers/events/index.js
import timeStopHandler from './time_stop.js';
import timeResumeHandler from './time_resume.js';
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
import reload_scene from './reload_scene.js'; // ★ この行を追加
import apply_force from './apply_force.js';
import play_sound from './play_sound.js';
import spawn_object from './spawn_object.js';
import interact_add from './interact_add.js';
import interact_remove from './interact_remove.js';
import transition_scene from './transition_scene.js';
import waitHandler from './wait.js'; // ★ wait.js からインポート
import cameraShakeHandler from './camera_shake.js';
import cameraFadeHandler from './camera_fade.js'; // ★ 追加
import cameraFollowHandler from './camera_follow.js'; // ★ 追加
import playBgmHandler from './play_bgm.js'; // ★ 追加
import stopBgmHandler from './stop_bgm.js'; // ★ 追加
import setCollisionHandler from './set_collision.js';
import setDataHandler from './set_data.js';
import returnNovelHandler from './return_novel.js';
import stopSoundHandler from './stop_sound.js';
import runScenarioHandler from './run_scenario.js'; 



//*******************++++++++++++++++++++++ */
// ActionInterpreterが使う、イベントタグのカタログ
export const eventTagHandlers = {
   'time_stop': timeStopHandler,
    'time_resume': timeResumeHandler,
    'tween': handleTween,
    'destroy': handleDestroy,
    'set_visible': handleSetVisible,
      'velocity': handleVelocity,
     'anim_play': animPlayHandler, // anim_playも正式に登録
    'anim_stop': animStopHandler,
    'anim_frame': animFrameHandler,
      'set_flip_x': setFlipXHandler,
 'reload_scene': reload_scene, // ★ この行を追加
       'eval': evalExpressionHandler,  
        'apply_force': apply_force,
         'play_sound': play_sound, // ★ この行を追加
           'spawn_object': spawn_object,
'interact_add':interact_add,
'interact_remove': interact_remove,
 'transition_scene': transition_scene,
'wait': waitHandler, // ★ タグ名を 'wait' に
    'camera_shake': cameraShakeHandler,
'camera_fade': cameraFadeHandler, // ★ 追加
'camera_follow': cameraFollowHandler, // ★ 追加
'play_bgm': playBgmHandler, // ★ 追加
    'stop_bgm': stopBgmHandler, // ★ 追加
'set_collision': setCollisionHandler,
    'set_data': setDataHandler,
   'return_novel': returnNovelHandler,
'stop_sound': stopSoundHandler,
'run_scenario': runScenarioHandler, 

    // 将来、ここに [eval] [body_velocity] などを追加していく
};