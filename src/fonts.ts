import type { ThorVGNamespace } from '@thorvg/webcanvas';
import boldUrl from '../assets/fonts/Galmuri11-Bold.ttf?url';

export const FONT_BOLD = 'Galmuri11Bold';

// The font that ThorVG draws its text with. ThorVG reads only TTF and OTF, so it is the TTF of the
// bold Galmuri font, where the page uses the woff2 of the same font. Bold reads better over the map
// than the one-pixel strokes of the regular font.
export async function loadFonts(TVG: ThorVGNamespace): Promise<void> {
  const data = new Uint8Array(await (await fetch(boldUrl)).arrayBuffer());
  TVG.Font.load(FONT_BOLD, data, { type: 'ttf' });
}
