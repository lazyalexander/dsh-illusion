# 2D art production pipeline

English | [简体中文](2D_ART_PIPELINE.zh-CN.md)

Illusion owns the reviewable production line, not the visual author's identity. The author owns style intent; Illusion turns that intent into a versioned Style Contract that providers and validators can share.

## Style authority

- `author`: the author supplied and approved the contract.
- `shared`: the author and Illusion refined concrete visual traits together, then the author approved them.
- `illusion-proposal`: Illusion filled gaps with a proposal. A proposal cannot become `accepted` until the author confirms it.

The contract records palette, line, shape language, shading, texture, lighting, invariants, exclusions, and references with `owned`, `licensed`, `public-domain`, or `unknown` rights status. Prefer observable traits over a bare creator name. Unknown reference rights remain visible and do not become an implicit license.

## Production stages

1. Brief: deliverable, canvas, transparency, target engine, intended use.
2. Style: create or select an accepted Style Contract.
3. Composition: silhouettes, focal hierarchy, camera, negative space.
4. Draft: provider creates the first reviewable visual artifact.
5. Family-specific work:
   - Pixel: pixel cleanup, cluster control, palette and edge validation.
   - Anime/custom raster: line art, color, rendering and consistency review.
6. Slicing when required: sprite frames, tiles, pivots and atlas regions.
7. Validation: deterministic checks plus explicit human visual approval.
8. Export: only from the accepted checkpoint.

Every published stage must remain in history and support text feedback, reference-file feedback, branching, and export. A future image-provider adapter owns actual raster generation; this release implements the provider-neutral Style Contract, planning rules, governance, and validation fixtures. It does not claim that DeepSeek alone can render finished raster art.

## Evidence boundary

Illusion can prove dimensions, palette declarations, transparency intent, frame layout, reference provenance fields, and pipeline history. It cannot automatically prove artistic quality, originality, reference licensing, character appeal, or target-engine appearance. Those require author acceptance or external receipts.
