import ThorVG from '@thorvg/webcanvas';
// The package does not export this path, so it is imported by file path.
import wasmUrl from '../node_modules/@thorvg/webcanvas/dist/thorvg.wasm?url';
import { drawRoom } from './render';
import { parseRoom } from './room';
import startRoom from './rooms/start.txt?raw';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Without locateFile, the package fetches the WASM file from unpkg.
const TVG = await ThorVG.init({ renderer: 'gl', locateFile: () => wasmUrl });
const canvas = new TVG.Canvas('#canvas', { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

drawRoom(TVG, canvas, parseRoom(startRoom), { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 });
canvas.render();
