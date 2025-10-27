// in src/handlers/events/open_menu.js (元の姿)
import EngineAPI from '../../core/EngineAPI.js';

export default async function open_menu(interpreter, params) {
    EngineAPI.fireGameFlowEvent('OPEN_PAUSE_MENU');
}

// define は空か、あるいは存在しなくてもOK
open_menu.define = {};