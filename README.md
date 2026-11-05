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
| Swordman icon | Cathelineau | [game-icons.net](https://game-icons.net/1x1/cathelineau/swordman.html) | [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/) | Removed the black background |
| ThorVG splash | ThorVG project | [LottieFiles](https://app.lottiefiles.com/share/9fb04dcc-0426-4f7b-852d-643e6aaf252c) | [Terms](LICENSES/LicenseRef-ThorVG-Splash.txt) | Unpacked from `.lottie`, animation unchanged |

### References

These games were used as references for algorithms and numeric values. Their code was not copied.

- [Brogue CE](https://github.com/tmewett/BrogueCE) (AGPL-3.0): room attachment, loops, and room shape generation
- [Shattered Pixel Dungeon](https://github.com/00-Evan/shattered-pixel-dungeon) (GPL-3.0): walking speed, camera follow, screen shake, pathfinding, floating damage numbers, view distance, doors blocking the view, and enemy behavior structure
- [Dungeon Crawl Stone Soup](https://github.com/crawl/crawl): room template format and random tiles

The field of view and the shape of the light use the method from [Sight & Light](https://ncase.me/sight-and-light/) by Nicky Case.

## License

The code is licensed under [MIT](LICENSE). The assets in `assets/` have the licenses listed in [Credits](#credits).
