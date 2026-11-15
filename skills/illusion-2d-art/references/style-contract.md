# Style Contract fields

- Identity: stable ID, name, integer version, family.
- Authority: `author`, `shared`, or `illusion-proposal`.
- Status: `proposed` or `accepted`. An Illusion proposal cannot accept itself.
- Visual language: palette, line, shape, shading, texture, and lighting.
- Invariants: traits every asset must preserve.
- Avoid: concrete visual failures or unwanted traits.
- References: stable ID, label, note, and rights status.
- Pixel extension: canvas, color limit, pixel-perfect policy, dithering.
- Anime extension: line weight, cel-shading bands, proportion language.
- Custom styles require author invariants or references.

Create a new version when an accepted invariant changes. Ordinary asset-specific composition does not require a new style version.
