# Game asset category matrix

| Category | Typical archetypes | Default usage | Useful visible stages | Category-specific checks |
| --- | --- | --- | --- | --- |
| `humanoid` | hero, NPC, civilian, enemy | `skeletal` | silhouette, anatomy, clothing, materials, rig, validation | scale, readable proportions, equipment clearance, joint hierarchy |
| `creature` | quadruped, bird, fish, monster | `skeletal` | silhouette, anatomy, details, materials, rig, validation | locomotion silhouette, limb count, center of mass, articulation plan |
| `building` | residential, civic, industrial, sacred, fantasy | `modular` | blockout, structure, details, materials, collision, validation | entrances, floor scale, modular seams, roof support, traversal clearance |
| `vehicle` | wheeled, tracked, rail, water, air, space | `skeletal` or `modular` | silhouette, structure, assembly, details, collision, validation | occupant scale, moving-part hierarchy, ground contact, propulsion readability |
| `prop` | furniture, tool, weapon, container, machine | `static` | silhouette, structure, details, materials, collision, validation | grip or interaction scale, stable pivot intent, collision simplicity |
| `vegetation` | tree, shrub, grass, fungus | `static` | silhouette, structure, details, materials, lod, validation | species silhouette, grounded roots, alpha-plane intent, LOD readability |
| `terrain` | cliff, cave, road, platform, shoreline | `environment` | blockout, structure, details, collision, lod, validation | tile boundaries, walkable surfaces, collision intent, repetition control |
| `environment` | room kit, street, plaza, biome set | `environment` | reference, blockout, structure, assembly, materials, validation | composition scale, reusable modules, traversal, asset ownership boundaries |

Use an archetype that is specific enough to shape the model. “Building” is a category; “industrial harbor warehouse” is an archetype.

For a multi-asset request, give each asset its own build ID and completion state. A scene kit may use `environment` only when the shared composition is itself the deliverable.
