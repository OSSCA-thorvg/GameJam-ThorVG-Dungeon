# ThorVG Dungeon

A turn-based roguelike for the web, rendered with [ThorVG](https://github.com/thorvg/thorvg).

## Development

```sh
npm install
npm run dev
```

## Team

- [@alpakaDurumi](https://github.com/alpakaDurumi): solo developer

## Credits

| Asset | Author | Source | License | Changes |
| --- | --- | --- | --- | --- |
| ThorVG splash | ThorVG project | [OSSCA ThorVG GameJam](https://ossca-thorvg.github.io/site/project/#event) | [Terms](LICENSES/LicenseRef-ThorVG-Splash.txt) | None, the file is used as provided |
| Galmuri fonts (Galmuri9, Galmuri11, Galmuri11 Bold) | Lee Minseo (quiple) | [GitHub](https://github.com/quiple/galmuri) | [OFL 1.1](LICENSES/OFL-1.1.txt) | None, the woff2 and ttf files are used as provided |

### References

These games were used as references for algorithms and numeric values. Their code was not copied.

- [Brogue CE](https://github.com/tmewett/BrogueCE) (AGPL-3.0): room attachment, loops, and room shape generation
- [Shattered Pixel Dungeon](https://github.com/00-Evan/shattered-pixel-dungeon) (GPL-3.0): walking speed, camera follow, screen shake, pathfinding, floating damage numbers, view distance, doors blocking the view, and enemy behavior structure
- [Dungeon Crawl Stone Soup](https://github.com/crawl/crawl): room template format and random tiles

The field of view and the shape of the light use the method from [Sight & Light](https://ncase.me/sight-and-light/) by Nicky Case.

## Sound

The sound effects and music are made by code. They are not recordings or samples, and no outside audio is used in them.

- [`assets/sound`](assets/sound) holds the sounds as Ogg Vorbis files. A synthesizer script rendered them as WAV files with seeded random numbers, and ffmpeg with libvorbis encoded the WAV files to Ogg. The script is not part of this repository.
- The scores were written for this game, not transcribed from an existing piece.
- The synthesizer script was written with Claude Code (Anthropic). The developer chose each sound by listening and gave the directions to change it.

Whether copyright applies to work made with an AI tool is unsettled, so this repository claims nothing beyond this: to the extent any rights exist in these sounds, they are licensed under [MIT](LICENSE) like the code.

## Art

The pixel art of the map tiles, items, objects and characters is made by code. It is not drawn from or traced over existing images, and no outside art is used in it.

- [`src/tileArt.ts`](src/tileArt.ts) draws the floor, walls, water, doors and stairs of each stage pixel by pixel when a floor is built, from rules for flagstones, bricks and ripples. It draws the traps and coffins the same way.
- [`src/itemArt.ts`](src/itemArt.ts) holds the items, the chest, the campfire and the signs as rows of pixels, and [`src/characterArt.ts`](src/characterArt.ts) holds the hero and the enemies the same way. A script outside this repository drew them from lines and shapes and wrote out the rows.
- The code was written with Claude Code (Anthropic). The developer chose the look from sheets of drafts and gave the directions to change it.

Whether copyright applies to work made with an AI tool is unsettled, so this repository claims nothing beyond this: to the extent any rights exist in this art, it is licensed under [MIT](LICENSE) like the code.

## License

The code is licensed under [MIT](LICENSE). The assets in `assets/` have the licenses listed in [Credits](#credits). The sounds in `assets/sound` are covered in [Sound](#sound).
