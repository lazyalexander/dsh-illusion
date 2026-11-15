# Game asset quality gates

Record each gate as `pass`, `needs-revision`, or `not-observable`.

## Shared gates

- Brief: category, archetype, usage, style, target engine, and unit are explicit.
- Scale: proportions and intended real-world or gameplay size are stated and visually coherent.
- Silhouette: the asset remains recognizable without relying on color or fine detail.
- Structure: parent-child relationships and moving or modular boundaries are semantic and stable.
- Grounding: contact points, entrances, supports, wheels, feet, roots, or foundations meet the intended ground plane.
- Materials: material differences support form and function; they are preview properties, not authored texture sets.
- Revision: feedback changes stable IDs instead of silently rebuilding accepted work.
- History: each semantic node remains a separate checkpoint with review, branch, and export controls.
- Export: when requested, GLB and build JSON are generated from the accepted checkpoint.

## Game-production gates

The protocol can now record and validate declared pivot, bounds, sockets, collider ownership, modular grid, material-slot membership, and LOD membership. This proves structural consistency at a checkpoint, not target-engine behavior.

The following still require external evidence. Mark them `not-observable` when no engine or DCC receipt exists:

- target-engine pivot and origin acceptance;
- gameplay collision behavior;
- modular snapping and seam acceptance;
- UVs, texel density, and texture maps;
- triangle budget, topology flow, normals, and lightmap UVs;
- LOD switching and engine-side import;
- skin weights, deformation, animation, physics, and runtime behavior.

Never convert a visually plausible preview into a production-ready claim.
