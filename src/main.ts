import ThorVG from '@thorvg/webcanvas';
// The package does not export this path, so it is imported by file path.
import wasmUrl from '../node_modules/@thorvg/webcanvas/dist/thorvg.wasm?url';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// 2:1 isometric tile from https://clintbellanger.net/articles/isometric_math/
const TILE_WIDTH = 128;
const TILE_HEIGHT = 64;

// Without locateFile, the package fetches the WASM file from unpkg.
const TVG = await ThorVG.init({ renderer: 'gl', locateFile: () => wasmUrl });
const canvas = new TVG.Canvas('#canvas', { width: CANVAS_WIDTH, height: CANVAS_HEIGHT });

const centerX = CANVAS_WIDTH / 2;
const centerY = CANVAS_HEIGHT / 2;

const tile = new TVG.Shape();
tile
  .moveTo(centerX, centerY - TILE_HEIGHT / 2)
  .lineTo(centerX + TILE_WIDTH / 2, centerY)
  .lineTo(centerX, centerY + TILE_HEIGHT / 2)
  .lineTo(centerX - TILE_WIDTH / 2, centerY)
  .close()
  .fill(96, 100, 110);

canvas.add(tile);
canvas.render();
