//#region src/protocol.ts
const PROTOCOL_VERSION = 2;
const LIMITS = {
	operations: 64,
	objects: 256,
	joints: 256,
	steps: 96,
	text: 160,
	lathePoints: 64,
	pathPoints: 64,
	meshVerticesPerObject: 2048,
	meshTrianglesPerObject: 4096,
	meshVerticesPerCommand: 8192
};
const BUILD_PHASES = [
	"reference",
	"silhouette",
	"blockout",
	"structure",
	"anatomy",
	"face",
	"hair",
	"clothing",
	"accessories",
	"materials",
	"details",
	"collision",
	"lod",
	"rig",
	"expressions",
	"validation",
	"assembly",
	"complete"
];
function record(value, label) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
	return value;
}
function text$2(value, label, fallback) {
	if (value === void 0 && fallback !== void 0) return fallback;
	if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${label} must be a non-empty string`);
	const normalized = value.trim();
	if (normalized.length > LIMITS.text) throw new RangeError(`${label} is too long`);
	return normalized;
}
function optionalText(value, label) {
	return value === void 0 ? void 0 : text$2(value, label);
}
function finite(value, label, fallback) {
	if (value === void 0) return fallback;
	if (typeof value !== "number" || !Number.isFinite(value)) throw new TypeError(`${label} must be a finite number`);
	return value;
}
function positive(value, label, fallback) {
	const parsed = finite(value, label, fallback);
	if (parsed <= 0 || parsed > 1e5) throw new RangeError(`${label} must be in (0, 100000]`);
	return parsed;
}
function nonNegative(value, label) {
	const parsed = finite(value, label, 0);
	if (parsed < 0 || parsed > 1e5) throw new RangeError(`${label} must be in [0, 100000]`);
	return parsed;
}
function unitInterval(value, label, fallback) {
	const parsed = finite(value, label, fallback);
	if (parsed < 0 || parsed > 1) throw new RangeError(`${label} must be in [0, 1]`);
	return parsed;
}
function booleanValue(value, label, fallback) {
	if (value === void 0) return fallback;
	if (typeof value !== "boolean") throw new TypeError(`${label} must be a boolean`);
	return value;
}
function vec2(value, label) {
	if (!Array.isArray(value) || value.length !== 2) throw new TypeError(`${label} must contain 2 numbers`);
	return [finite(value[0], `${label}[0]`, 0), finite(value[1], `${label}[1]`, 0)];
}
function vec3(value, label, fallback) {
	if (value === void 0) return fallback;
	if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${label} must contain 3 numbers`);
	return [
		finite(value[0], `${label}[0]`, 0),
		finite(value[1], `${label}[1]`, 0),
		finite(value[2], `${label}[2]`, 0)
	];
}
function positiveVec3(value, label) {
	if (!Array.isArray(value) || value.length !== 3) throw new TypeError(`${label} must contain 3 numbers`);
	return [
		positive(value[0], `${label}[0]`, 1),
		positive(value[1], `${label}[1]`, 1),
		positive(value[2], `${label}[2]`, 1)
	];
}
function boundedArray(value, label, minimum, maximum) {
	if (!Array.isArray(value)) throw new TypeError(`${label} must be an array`);
	if (value.length < minimum || value.length > maximum) throw new RangeError(`${label} must contain between ${minimum} and ${maximum} items`);
	return value;
}
function color$1(value, label, fallback) {
	const parsed = text$2(value, label, fallback);
	if (!/^#[0-9a-f]{6}$/i.test(parsed)) throw new TypeError(`${label} must be a six-digit hex color`);
	return parsed.toLowerCase();
}
function geometry(value) {
	const input = record(value, "object.geometry");
	const kind = input.kind;
	if (typeof kind !== "string") throw new TypeError("object.geometry.kind is not supported");
	switch (kind) {
		case "box": return {
			kind,
			width: positive(input.width, "geometry.width", 1),
			height: positive(input.height, "geometry.height", 1),
			depth: positive(input.depth, "geometry.depth", 1)
		};
		case "sphere": return {
			kind,
			radius: positive(input.radius, "geometry.radius", 1)
		};
		case "cylinder":
		case "cone":
		case "capsule": return {
			kind,
			radius: positive(input.radius, "geometry.radius", 1),
			height: positive(input.height, "geometry.height", 1)
		};
		case "torus": return {
			kind,
			radius: positive(input.radius, "geometry.radius", 1),
			tube: positive(input.tube, "geometry.tube", .25)
		};
		case "ellipsoid": return {
			kind,
			radii: positiveVec3(input.radii, "geometry.radii")
		};
		case "plane": return {
			kind,
			width: positive(input.width, "geometry.width", 1),
			height: positive(input.height, "geometry.height", 1)
		};
		case "lathe": return {
			kind,
			profile: boundedArray(input.profile, "geometry.profile", 2, LIMITS.lathePoints).map((point, index) => vec2(point, `geometry.profile[${index}]`)).map(([radius, z], index) => [nonNegative(radius, `geometry.profile[${index}][0]`), z])
		};
		case "tube": return {
			kind,
			path: boundedArray(input.path, "geometry.path", 2, LIMITS.pathPoints).map((point, index) => vec3(point, `geometry.path[${index}]`, [
				0,
				0,
				0
			])),
			radius: positive(input.radius, "geometry.radius", .1),
			closed: booleanValue(input.closed, "geometry.closed", false)
		};
		case "mesh": {
			const vertices = boundedArray(input.vertices, "geometry.vertices", 3, LIMITS.meshVerticesPerObject).map((point, index) => vec3(point, `geometry.vertices[${index}]`, [
				0,
				0,
				0
			]));
			return {
				kind,
				vertices,
				triangles: boundedArray(input.triangles, "geometry.triangles", 1, LIMITS.meshTrianglesPerObject).map((value$1, triangleIndex) => {
					if (!Array.isArray(value$1) || value$1.length !== 3) throw new TypeError(`geometry.triangles[${triangleIndex}] must contain 3 indices`);
					const parsed = value$1.map((index, corner) => {
						if (!Number.isInteger(index) || index < 0 || index >= vertices.length) throw new RangeError(`geometry.triangles[${triangleIndex}][${corner}] is outside the vertex array`);
						return index;
					});
					if (new Set(parsed).size !== 3) throw new RangeError(`geometry.triangles[${triangleIndex}] is degenerate`);
					return parsed;
				})
			};
		}
		default: throw new TypeError("object.geometry.kind is not supported");
	}
}
function sceneObject(value) {
	const input = record(value, "operation.object");
	const parentId = optionalText(input.parentId, "object.parentId");
	const role = optionalText(input.role, "object.role");
	return {
		id: text$2(input.id, "object.id"),
		label: text$2(input.label, "object.label", String(input.id ?? "object")),
		...role === void 0 ? {} : { role },
		...parentId === void 0 ? {} : { parentId },
		geometry: geometry(input.geometry),
		position: vec3(input.position, "object.position", [
			0,
			0,
			0
		]),
		rotation: vec3(input.rotation, "object.rotation", [
			0,
			0,
			0
		]),
		scale: vec3(input.scale, "object.scale", [
			1,
			1,
			1
		]),
		color: color$1(input.color, "object.color", "#76a9ff"),
		opacity: unitInterval(input.opacity, "object.opacity", 1),
		roughness: unitInterval(input.roughness, "object.roughness", .58),
		metalness: unitInterval(input.metalness, "object.metalness", .12),
		emissive: color$1(input.emissive, "object.emissive", "#000000"),
		doubleSided: booleanValue(input.doubleSided, "object.doubleSided", false)
	};
}
function rigJoint(value) {
	const input = record(value, "operation.joint");
	const parentId = optionalText(input.parentId, "joint.parentId");
	return {
		id: text$2(input.id, "joint.id"),
		label: text$2(input.label, "joint.label", String(input.id ?? "joint")),
		role: text$2(input.role, "joint.role", "joint"),
		...parentId === void 0 ? {} : { parentId },
		position: vec3(input.position, "joint.position", [
			0,
			0,
			0
		]),
		rotation: vec3(input.rotation, "joint.rotation", [
			0,
			0,
			0
		])
	};
}
function uniqueIds(items, label) {
	const ids = /* @__PURE__ */ new Set();
	for (const item of items) {
		if (ids.has(item.id)) throw new RangeError(`${label} contains duplicate id “${item.id}”`);
		ids.add(item.id);
	}
}
function stringArray(value, label) {
	return boundedArray(value, label, 1, LIMITS.objects).map((item, index) => text$2(item, `${label}[${index}]`));
}
function assetSemantics(value) {
	const input = record(value, "semantics");
	const pivotInput = record(input.pivot, "semantics.pivot");
	const boundsInput = record(input.bounds, "semantics.bounds");
	const min = vec3(boundsInput.min, "semantics.bounds.min", [
		0,
		0,
		0
	]);
	const max = vec3(boundsInput.max, "semantics.bounds.max", [
		0,
		0,
		0
	]);
	if (min.some((item, index) => item >= max[index])) throw new RangeError("semantics.bounds.min must be below max on every axis");
	const sockets = (input.sockets === void 0 ? [] : boundedArray(input.sockets, "semantics.sockets", 0, 128)).map((value$1, index) => {
		const item = record(value$1, `semantics.sockets[${index}]`);
		const parentId = optionalText(item.parentId, `semantics.sockets[${index}].parentId`);
		return {
			id: text$2(item.id, `semantics.sockets[${index}].id`),
			label: text$2(item.label, `semantics.sockets[${index}].label`, String(item.id ?? "socket")),
			...parentId === void 0 ? {} : { parentId },
			position: vec3(item.position, `semantics.sockets[${index}].position`, [
				0,
				0,
				0
			]),
			rotation: vec3(item.rotation, `semantics.sockets[${index}].rotation`, [
				0,
				0,
				0
			])
		};
	});
	uniqueIds(sockets, "semantics.sockets");
	const colliders = (input.colliders === void 0 ? [] : boundedArray(input.colliders, "semantics.colliders", 0, 128)).map((value$1, index) => {
		const item = record(value$1, `semantics.colliders[${index}]`);
		if (item.shape !== "box" && item.shape !== "sphere" && item.shape !== "capsule") throw new TypeError(`semantics.colliders[${index}].shape is not supported`);
		const ownerId = optionalText(item.ownerId, `semantics.colliders[${index}].ownerId`);
		return {
			id: text$2(item.id, `semantics.colliders[${index}].id`),
			label: text$2(item.label, `semantics.colliders[${index}].label`, String(item.id ?? "collider")),
			...ownerId === void 0 ? {} : { ownerId },
			shape: item.shape,
			center: vec3(item.center, `semantics.colliders[${index}].center`, [
				0,
				0,
				0
			]),
			...item.shape === "box" ? { size: positiveVec3(item.size, `semantics.colliders[${index}].size`) } : {},
			...item.shape === "sphere" || item.shape === "capsule" ? { radius: positive(item.radius, `semantics.colliders[${index}].radius`, .5) } : {},
			...item.shape === "capsule" ? { height: positive(item.height, `semantics.colliders[${index}].height`, 1) } : {},
			trigger: booleanValue(item.trigger, `semantics.colliders[${index}].trigger`, false)
		};
	});
	uniqueIds(colliders, "semantics.colliders");
	const materialSlots = (input.materialSlots === void 0 ? [] : boundedArray(input.materialSlots, "semantics.materialSlots", 0, 64)).map((value$1, index) => {
		const item = record(value$1, `semantics.materialSlots[${index}]`);
		return {
			id: text$2(item.id, `semantics.materialSlots[${index}].id`),
			label: text$2(item.label, `semantics.materialSlots[${index}].label`, String(item.id ?? "material")),
			objectIds: stringArray(item.objectIds, `semantics.materialSlots[${index}].objectIds`)
		};
	});
	uniqueIds(materialSlots, "semantics.materialSlots");
	const lodGroups = (input.lodGroups === void 0 ? [] : boundedArray(input.lodGroups, "semantics.lodGroups", 0, 32)).map((value$1, index) => {
		const item = record(value$1, `semantics.lodGroups[${index}]`);
		const levels = boundedArray(item.levels, `semantics.lodGroups[${index}].levels`, 1, 8).map((value$2, levelIndex) => {
			const level = record(value$2, `semantics.lodGroups[${index}].levels[${levelIndex}]`);
			const parsedLevel = finite(level.level, `semantics.lodGroups[${index}].levels[${levelIndex}].level`, levelIndex);
			if (!Number.isInteger(parsedLevel) || parsedLevel < 0) throw new RangeError("LOD level must be a non-negative integer");
			return {
				level: parsedLevel,
				screenCoverage: unitInterval(level.screenCoverage, `semantics.lodGroups[${index}].levels[${levelIndex}].screenCoverage`, 1),
				objectIds: stringArray(level.objectIds, `semantics.lodGroups[${index}].levels[${levelIndex}].objectIds`)
			};
		});
		if (new Set(levels.map((level) => level.level)).size !== levels.length) throw new RangeError("LOD levels must be unique within a group");
		return {
			id: text$2(item.id, `semantics.lodGroups[${index}].id`),
			levels
		};
	});
	uniqueIds(lodGroups, "semantics.lodGroups");
	let modularGrid;
	if (input.modularGrid !== void 0) {
		const grid = record(input.modularGrid, "semantics.modularGrid");
		modularGrid = {
			size: positiveVec3(grid.size, "semantics.modularGrid.size"),
			origin: vec3(grid.origin, "semantics.modularGrid.origin", [
				0,
				0,
				0
			])
		};
	}
	return {
		pivot: {
			position: vec3(pivotInput.position, "semantics.pivot.position", [
				0,
				0,
				0
			]),
			rotation: vec3(pivotInput.rotation, "semantics.pivot.rotation", [
				0,
				0,
				0
			])
		},
		bounds: {
			min,
			max
		},
		...modularGrid === void 0 ? {} : { modularGrid },
		sockets,
		colliders,
		materialSlots,
		lodGroups
	};
}
function operation(value) {
	const input = record(value, "operation");
	if (input.type === "clear") return { type: "clear" };
	if (input.type === "clear_rig") return { type: "clear_rig" };
	if (input.type === "remove") return {
		type: "remove",
		id: text$2(input.id, "operation.id")
	};
	if (input.type === "remove_joint") return {
		type: "remove_joint",
		id: text$2(input.id, "operation.id")
	};
	if (input.type === "upsert") return {
		type: "upsert",
		object: sceneObject(input.object)
	};
	if (input.type === "upsert_joint") return {
		type: "upsert_joint",
		joint: rigJoint(input.joint)
	};
	throw new TypeError("operation.type must be upsert, remove, clear, upsert_joint, remove_joint, or clear_rig");
}
function profile(value) {
	const input = record(value, "profile");
	if (input.kind === "object") return { kind: "object" };
	if (input.kind === "game-asset") {
		const categories = [
			"humanoid",
			"creature",
			"building",
			"vehicle",
			"prop",
			"vegetation",
			"terrain",
			"environment"
		];
		const styles$1 = [
			"realistic",
			"stylized",
			"low-poly",
			"voxel",
			"custom"
		];
		const usages = [
			"static",
			"skeletal",
			"modular",
			"environment"
		];
		const targets$1 = [
			"generic",
			"godot",
			"unity",
			"unreal",
			"web",
			"custom"
		];
		const units$1 = [
			"m",
			"cm",
			"mm"
		];
		const category = input.category ?? "prop";
		const style$1 = input.style ?? "stylized";
		const usage = input.usage ?? (category === "humanoid" || category === "creature" ? "skeletal" : "static");
		const target$1 = input.target ?? "generic";
		const unit$1 = input.unit ?? "m";
		if (!categories.includes(category)) throw new TypeError("profile.category is not supported");
		if (!styles$1.includes(style$1)) throw new TypeError("profile.style is not supported");
		if (!usages.includes(usage)) throw new TypeError("profile.usage is not supported");
		if (!targets$1.includes(target$1)) throw new TypeError("profile.target is not supported");
		if (!units$1.includes(unit$1)) throw new TypeError("profile.unit is not supported");
		return {
			kind: "game-asset",
			category,
			archetype: text$2(input.archetype, "profile.archetype", "generic"),
			style: style$1,
			usage,
			target: target$1,
			unit: unit$1
		};
	}
	if (input.kind !== "character") throw new TypeError("profile.kind must be object, character, or game-asset");
	const styles = [
		"realistic",
		"stylized",
		"anime",
		"custom"
	];
	const targets = [
		"static",
		"game",
		"mmd",
		"vtuber",
		"interactive",
		"print",
		"custom"
	];
	const units = [
		"m",
		"cm",
		"mm"
	];
	const style = input.style ?? "stylized";
	const target = input.target ?? "static";
	const unit = input.unit ?? "m";
	if (!styles.includes(style)) throw new TypeError("profile.style is not supported");
	if (!targets.includes(target)) throw new TypeError("profile.target is not supported");
	if (!units.includes(unit)) throw new TypeError("profile.unit is not supported");
	return {
		kind: "character",
		style,
		target,
		unit,
		height: positive(input.height, "profile.height", 1.7)
	};
}
function phase(value, action) {
	const fallback = action === "complete" ? "complete" : "assembly";
	if (value === void 0) return fallback;
	if (!BUILD_PHASES.includes(value)) throw new TypeError("phase is not supported");
	return value;
}
function translations$1(value) {
	if (value === void 0) return void 0;
	const input = record(value, "translations");
	const result = {};
	for (const locale of ["en", "zh-CN"]) {
		if (input[locale] === void 0) continue;
		const localized = record(input[locale], `translations.${locale}`);
		const note = optionalText(localized.note, `translations.${locale}.note`);
		result[locale] = {
			title: text$2(localized.title, `translations.${locale}.title`),
			...note === void 0 ? {} : { note }
		};
	}
	if (Object.keys(result).length === 0) throw new RangeError("translations must contain en or zh-CN");
	return result;
}
function parseBuildCommand(value) {
	const input = record(value, "arguments");
	if (input.action !== "start" && input.action !== "apply" && input.action !== "complete" && input.action !== "resume") throw new TypeError("action must be start, apply, complete, or resume");
	if (input.profile !== void 0 && input.action !== "start") throw new TypeError("profile may only be set when action is start");
	const rawOperations = input.operations ?? [];
	if (!Array.isArray(rawOperations)) throw new TypeError("operations must be an array");
	if (rawOperations.length > LIMITS.operations) throw new RangeError(`operations may contain at most ${LIMITS.operations} items`);
	const operations = rawOperations.map(operation);
	if (input.action === "apply" && operations.length === 0 && input.semantics === void 0) throw new RangeError("apply requires at least one operation or game semantics");
	if (input.action === "resume" && operations.length !== 0) throw new RangeError("resume does not accept operations");
	if (input.action === "resume" && input.semantics !== void 0) throw new RangeError("resume does not accept game semantics");
	if (input.action === "resume" && (typeof input.sourceBuildId !== "string" || input.sourceBuildId.trim().length === 0)) throw new TypeError("resume requires sourceBuildId");
	if (input.action !== "resume" && (input.sourceBuildId !== void 0 || input.sourceStep !== void 0)) throw new TypeError("sourceBuildId and sourceStep may only be set when action is resume");
	const sourceStep = input.sourceStep === void 0 ? void 0 : finite(input.sourceStep, "sourceStep", 0);
	if (input.action === "resume" && (sourceStep === void 0 || !Number.isInteger(sourceStep) || sourceStep < 1)) throw new RangeError("resume requires sourceStep as a positive integer");
	if (operations.reduce((total, item) => item.type === "upsert" && item.object.geometry.kind === "mesh" ? total + (item.object.geometry.vertices?.length ?? 0) : total, 0) > LIMITS.meshVerticesPerCommand) throw new RangeError(`a command may contain at most ${LIMITS.meshVerticesPerCommand} custom-mesh vertices`);
	const parsedProfile = input.profile === void 0 ? void 0 : profile(input.profile);
	const parsedTranslations = translations$1(input.translations);
	const parsedSemantics = input.semantics === void 0 ? void 0 : assetSemantics(input.semantics);
	return {
		action: input.action,
		title: text$2(input.title, "title"),
		...input.note === void 0 ? {} : { note: text$2(input.note, "note") },
		...parsedTranslations === void 0 ? {} : { translations: parsedTranslations },
		phase: phase(input.phase, input.action),
		...parsedProfile === void 0 ? {} : { profile: parsedProfile },
		...input.action === "resume" ? {
			sourceBuildId: text$2(input.sourceBuildId, "sourceBuildId"),
			sourceStep
		} : {},
		...parsedSemantics === void 0 ? {} : { semantics: parsedSemantics },
		operations
	};
}
const BUILD_LIMITS = LIMITS;
const BUILD_PHASE_VALUES = BUILD_PHASES;

//#endregion
//#region src/plugins/governance.ts
const PLUGIN_API_VERSION = 1;
function assertIdentifier(value, label) {
	if (!/^[a-z][a-z0-9.-]*$/.test(value)) throw new TypeError(`${label} must use lowercase letters, digits, dots, or hyphens`);
}
var PluginGovernor = class {
	#manifests = /* @__PURE__ */ new Map();
	register(manifest) {
		assertIdentifier(manifest.id, "plugin id");
		if (manifest.apiVersion !== PLUGIN_API_VERSION) throw new RangeError(`plugin “${manifest.id}” requires unsupported API ${manifest.apiVersion}`);
		if (this.#manifests.has(manifest.id)) throw new Error(`plugin “${manifest.id}” is already registered`);
		if (manifest.provides.length === 0) throw new RangeError(`plugin “${manifest.id}” must provide a capability`);
		for (const capability of manifest.provides) assertIdentifier(capability, "capability");
		for (const scope of manifest.ownsMutationScopes ?? []) assertIdentifier(scope, "mutation scope");
		this.#manifests.set(manifest.id, structuredClone(manifest));
	}
	resolve(requestedIds = [...this.#manifests.keys()]) {
		const selected = /* @__PURE__ */ new Map();
		const visit = (id, ancestry) => {
			if (ancestry.includes(id)) throw new Error(`plugin dependency cycle: ${[...ancestry, id].join(" -> ")}`);
			if (selected.has(id)) return;
			const manifest = this.#manifests.get(id);
			if (manifest === void 0) throw new Error(`required plugin “${id}” is not registered`);
			for (const required of manifest.requires ?? []) visit(required, [...ancestry, id]);
			selected.set(id, manifest);
		};
		for (const id of requestedIds) visit(id, []);
		for (const manifest of selected.values()) for (const conflict of manifest.conflicts ?? []) if (selected.has(conflict)) throw new Error(`plugin “${manifest.id}” conflicts with “${conflict}”`);
		const capabilities = {};
		const mutationOwners = {};
		for (const manifest of selected.values()) {
			for (const capability of manifest.provides) {
				const owner = capabilities[capability];
				if (owner !== void 0) throw new Error(`capability “${capability}” is provided by both “${owner}” and “${manifest.id}”`);
				capabilities[capability] = manifest.id;
			}
			for (const scope of manifest.ownsMutationScopes ?? []) {
				const owner = mutationOwners[scope];
				if (owner !== void 0) throw new Error(`mutation scope “${scope}” is owned by both “${owner}” and “${manifest.id}”`);
				mutationOwners[scope] = manifest.id;
			}
		}
		return {
			plugins: [...selected.values()].map((manifest) => structuredClone(manifest)),
			capabilities,
			mutationOwners,
			promptSections: [...selected.values()].flatMap((manifest) => manifest.prompt === void 0 ? [] : [manifest.prompt])
		};
	}
};

//#endregion
//#region src/plugins/builtins.ts
const BUILTIN_PLUGIN_MANIFESTS = [
	{
		id: "illusion.coordinator",
		version: "1.0.0",
		apiVersion: PLUGIN_API_VERSION,
		description: "Owns reviewable history, branching, and user-directed execution.",
		provides: [
			"build-history",
			"checkpoint-review",
			"plan-routing"
		],
		risk: "read-only",
		prompt: "Publish every semantic node as an independently reviewable checkpoint. Keep historical nodes immutable and branch when revising an older checkpoint."
	},
	{
		id: "illusion.deepseek-modeler",
		version: "1.0.0",
		apiVersion: PLUGIN_API_VERSION,
		description: "Owns DeepSeek scene and modeling-semantics mutations.",
		provides: ["scene-modeling", "game-asset-taxonomy"],
		requires: ["illusion.coordinator"],
		ownsMutationScopes: ["model-scene", "model-semantics"],
		risk: "model-write",
		prompt: "DeepSeek is the only modeling role. Apply scene and semantic changes through visible tool operations with stable IDs."
	},
	{
		id: "illusion.game-semantics",
		version: "1.0.0",
		apiVersion: PLUGIN_API_VERSION,
		description: "Defines and validates game-engine pivot, bounds, sockets, colliders, material slots, modular grids, and LOD groups.",
		provides: ["game-semantics-schema", "game-semantics-validation"],
		requires: ["illusion.deepseek-modeler"],
		risk: "read-only",
		prompt: "For game-ready checkpoints, declare semantics with pivot, bounds, sockets, colliders, material slots, modular grid, and LOD groups as applicable. Every referenced object ID must exist."
	},
	{
		id: "illusion.technical-validator",
		version: "1.0.0",
		apiVersion: PLUGIN_API_VERSION,
		description: "Reports observable gates without silently editing the model.",
		provides: ["technical-validation"],
		requires: ["illusion.game-semantics"],
		risk: "read-only",
		prompt: "Separate pass, needs-revision, and not-observable findings. Validation never grants authority to mutate or export."
	},
	{
		id: "illusion.2d-art",
		version: "1.0.0",
		apiVersion: PLUGIN_API_VERSION,
		description: "Owns versioned 2D art briefs, style contracts, and production plans.",
		provides: ["art-2d-pipeline", "style-contracts"],
		requires: ["illusion.coordinator"],
		ownsMutationScopes: ["art-direction"],
		risk: "content-write",
		prompt: "Treat the author as the owner of style intent. Illusion may propose a concrete style contract, but the author must confirm it before production treats it as accepted."
	},
	{
		id: "illusion.2d-validator",
		version: "1.0.0",
		apiVersion: PLUGIN_API_VERSION,
		description: "Validates observable 2D art structure and style-contract consistency without repainting.",
		provides: ["art-2d-validation"],
		requires: ["illusion.2d-art"],
		risk: "read-only",
		prompt: "Validate canvas, palette, transparency, slicing, and accepted style invariants separately from subjective art approval. Never repaint as a hidden validation step."
	},
	{
		id: "illusion.export-coordinator",
		version: "1.0.0",
		apiVersion: PLUGIN_API_VERSION,
		description: "Creates user-requested JSON and GLB artifacts bound to a checkpoint.",
		provides: ["build-json-export", "glb-export"],
		requires: ["illusion.coordinator"],
		ownsMutationScopes: ["download-artifact"],
		risk: "artifact-write",
		prompt: "Export only on explicit user action. Bind every artifact to its build ID and selected step; do not claim engine import acceptance."
	}
];
function createBuiltinPluginPlan() {
	const governor = new PluginGovernor();
	for (const manifest of BUILTIN_PLUGIN_MANIFESTS) governor.register(manifest);
	return governor.resolve();
}

//#endregion
//#region src/scene.ts
function cloneAssetSemantics(semantics) {
	return structuredClone(semantics);
}
function validateAssetSemantics(semantics, objects) {
	const requireObject = (id, label) => {
		if (!objects.has(id)) throw new RangeError(`${label} references missing object “${id}”`);
	};
	for (const socket of semantics.sockets) if (socket.parentId !== void 0) requireObject(socket.parentId, `socket “${socket.id}”`);
	for (const collider of semantics.colliders) if (collider.ownerId !== void 0) requireObject(collider.ownerId, `collider “${collider.id}”`);
	const slottedObjects = /* @__PURE__ */ new Set();
	for (const slot of semantics.materialSlots) for (const id of slot.objectIds) {
		requireObject(id, `material slot “${slot.id}”`);
		if (slottedObjects.has(id)) throw new RangeError(`object “${id}” belongs to more than one material slot`);
		slottedObjects.add(id);
	}
	for (const group of semantics.lodGroups) {
		let previousCoverage = Number.POSITIVE_INFINITY;
		const members = /* @__PURE__ */ new Set();
		for (const level of [...group.levels].sort((left, right) => left.level - right.level)) {
			if (level.screenCoverage >= previousCoverage) throw new RangeError(`LOD group “${group.id}” screen coverage must decrease by level`);
			previousCoverage = level.screenCoverage;
			for (const id of level.objectIds) {
				requireObject(id, `LOD group “${group.id}”`);
				if (members.has(id)) throw new RangeError(`object “${id}” appears in more than one level of LOD group “${group.id}”`);
				members.add(id);
			}
		}
	}
}
function cloneGeometry(geometry$1) {
	return {
		...geometry$1,
		...geometry$1.radii === void 0 ? {} : { radii: [...geometry$1.radii] },
		...geometry$1.profile === void 0 ? {} : { profile: geometry$1.profile.map((point) => [...point]) },
		...geometry$1.path === void 0 ? {} : { path: geometry$1.path.map((point) => [...point]) },
		...geometry$1.vertices === void 0 ? {} : { vertices: geometry$1.vertices.map((point) => [...point]) },
		...geometry$1.triangles === void 0 ? {} : { triangles: geometry$1.triangles.map((triangle) => [...triangle]) }
	};
}
function cloneSceneObject(object$2) {
	return {
		...object$2,
		geometry: cloneGeometry(object$2.geometry),
		position: [...object$2.position],
		rotation: [...object$2.rotation],
		scale: [...object$2.scale]
	};
}
function cloneRigJoint(joint) {
	return {
		...joint,
		position: [...joint.position],
		rotation: [...joint.rotation]
	};
}
function cloneOperation(operation$1) {
	if (operation$1.type === "upsert") return {
		type: "upsert",
		object: cloneSceneObject(operation$1.object)
	};
	if (operation$1.type === "upsert_joint") return {
		type: "upsert_joint",
		joint: cloneRigJoint(operation$1.joint)
	};
	if (operation$1.type === "remove" || operation$1.type === "remove_joint") return {
		type: operation$1.type,
		id: operation$1.id
	};
	return { type: operation$1.type };
}
function applyOperations(objects, joints, operations) {
	for (const operation$1 of operations) {
		if (operation$1.type === "clear") objects.clear();
		if (operation$1.type === "clear_rig") joints.clear();
		if (operation$1.type === "remove") objects.delete(operation$1.id);
		if (operation$1.type === "remove_joint") joints.delete(operation$1.id);
		if (operation$1.type === "upsert") objects.set(operation$1.object.id, cloneSceneObject(operation$1.object));
		if (operation$1.type === "upsert_joint") joints.set(operation$1.joint.id, cloneRigJoint(operation$1.joint));
	}
}
function validateHierarchy(nodes, label) {
	for (const node of nodes.values()) {
		if (node.parentId !== void 0 && !nodes.has(node.parentId)) throw new RangeError(`${label} “${node.id}” references missing parent “${node.parentId}”`);
		const visited = new Set([node.id]);
		let parentId = node.parentId;
		while (parentId !== void 0) {
			if (visited.has(parentId)) throw new RangeError(`${label} hierarchy contains a cycle at “${parentId}”`);
			visited.add(parentId);
			parentId = nodes.get(parentId)?.parentId;
		}
	}
}
function materializeBuildScene(snapshot, stepIndex) {
	const objects = /* @__PURE__ */ new Map();
	const joints = /* @__PURE__ */ new Map();
	const last = Math.min(Math.max(stepIndex, 0), snapshot.steps.length - 1);
	let semantics;
	for (let index = 0; index <= last; index += 1) {
		const step = snapshot.steps[index];
		if (step === void 0) continue;
		const hasMaterializedState = step.objects !== void 0 || step.joints !== void 0;
		if (step.objects !== void 0) {
			objects.clear();
			for (const object$2 of step.objects) objects.set(object$2.id, cloneSceneObject(object$2));
		}
		if (step.joints !== void 0) {
			joints.clear();
			for (const joint of step.joints) joints.set(joint.id, cloneRigJoint(joint));
		}
		if (!hasMaterializedState && step.operations !== void 0) applyOperations(objects, joints, step.operations);
		if (step.semantics !== void 0) semantics = cloneAssetSemantics(step.semantics);
	}
	return {
		objects: [...objects.values()].map(cloneSceneObject),
		joints: [...joints.values()].map(cloneRigJoint),
		...semantics === void 0 ? {} : { semantics }
	};
}

//#endregion
//#region src/store.ts
var BuildStore = class {
	#createId;
	#buildId = "";
	#title = "";
	#profile = { kind: "object" };
	#status = "building";
	#revision = 0;
	#lineage;
	#steps = [];
	#objects = /* @__PURE__ */ new Map();
	#joints = /* @__PURE__ */ new Map();
	#semantics;
	constructor(options = {}) {
		this.#createId = options.createId ?? (() => `illusion-${Date.now().toString(36)}`);
	}
	apply(command) {
		if (command.action === "resume") throw new Error("resume requires a source snapshot");
		if (command.action === "start" || this.#buildId.length === 0) this.#reset(command.title, command.profile ?? { kind: "object" });
		if (this.#status === "complete" && command.action === "complete") throw new Error("build is already complete; apply a revision before completing it again");
		const nextObjects = new Map([...this.#objects].map(([id, object$2]) => [id, cloneSceneObject(object$2)]));
		const nextJoints = new Map([...this.#joints].map(([id, joint]) => [id, cloneRigJoint(joint)]));
		applyOperations(nextObjects, nextJoints, command.operations);
		if (nextObjects.size > BUILD_LIMITS.objects) throw new RangeError(`a build may contain at most ${BUILD_LIMITS.objects} objects`);
		if (nextJoints.size > BUILD_LIMITS.joints) throw new RangeError(`a build may contain at most ${BUILD_LIMITS.joints} joints`);
		validateHierarchy(nextObjects, "object");
		validateHierarchy(nextJoints, "joint");
		const nextSemantics = command.semantics === void 0 ? this.#semantics : cloneAssetSemantics(command.semantics);
		if (nextSemantics !== void 0 && this.#profile.kind !== "game-asset") throw new TypeError("game semantics require a game-asset build profile");
		if (nextSemantics !== void 0) validateAssetSemantics(nextSemantics, nextObjects);
		this.#objects = nextObjects;
		this.#joints = nextJoints;
		this.#semantics = nextSemantics;
		this.#revision += 1;
		this.#title = command.action === "start" ? command.title : this.#title;
		this.#status = command.action === "complete" ? "complete" : "building";
		const step = {
			index: this.#revision,
			title: command.title,
			...command.note === void 0 ? {} : { note: command.note },
			...command.translations === void 0 ? {} : { translations: structuredClone(command.translations) },
			phase: command.phase,
			status: this.#status,
			operations: command.operations.map(cloneOperation),
			objectCount: this.#objects.size,
			jointCount: this.#joints.size,
			...command.semantics === void 0 ? {} : { semantics: cloneAssetSemantics(command.semantics) }
		};
		this.#steps.push(step);
		if (this.#steps.length > BUILD_LIMITS.steps) this.#compactHistory();
		return this.snapshot();
	}
	snapshot() {
		return {
			protocol: PROTOCOL_VERSION,
			buildId: this.#buildId,
			title: this.#title,
			profile: { ...this.#profile },
			status: this.#status,
			revision: this.#revision,
			activeStep: Math.max(0, this.#steps.length - 1),
			...this.#lineage === void 0 ? {} : { lineage: { ...this.#lineage } },
			...this.#semantics === void 0 ? {} : { semantics: cloneAssetSemantics(this.#semantics) },
			steps: this.#steps.map((step) => ({
				...step,
				...step.translations === void 0 ? {} : { translations: structuredClone(step.translations) },
				...step.operations === void 0 ? {} : { operations: step.operations.map(cloneOperation) },
				...step.semantics === void 0 ? {} : { semantics: cloneAssetSemantics(step.semantics) }
			}))
		};
	}
	resume(source, sourceStep, command) {
		if (command.action !== "resume") throw new TypeError("resume requires a resume command");
		const stepIndex = source.steps.findIndex((step) => step.index === sourceStep);
		if (stepIndex < 0) throw new RangeError(`source step ${sourceStep} is not available`);
		const scene = materializeBuildScene(source, stepIndex);
		this.#reset(command.title, source.profile ?? { kind: "object" });
		this.#lineage = {
			buildId: source.buildId,
			step: sourceStep
		};
		this.#objects = new Map(scene.objects.map((object$2) => [object$2.id, cloneSceneObject(object$2)]));
		this.#joints = new Map(scene.joints.map((joint) => [joint.id, cloneRigJoint(joint)]));
		this.#semantics = scene.semantics === void 0 ? void 0 : cloneAssetSemantics(scene.semantics);
		this.#revision = 1;
		this.#steps = [{
			index: 1,
			title: command.title,
			...command.note === void 0 ? {} : { note: command.note },
			...command.translations === void 0 ? {} : { translations: structuredClone(command.translations) },
			phase: command.phase,
			status: "building",
			objectCount: scene.objects.length,
			jointCount: scene.joints.length,
			objects: scene.objects.map(cloneSceneObject),
			joints: scene.joints.map(cloneRigJoint),
			...scene.semantics === void 0 ? {} : { semantics: cloneAssetSemantics(scene.semantics) }
		}];
		return this.snapshot();
	}
	#reset(title, profile$1) {
		this.#buildId = this.#createId();
		this.#title = title;
		this.#profile = { ...profile$1 };
		this.#status = "building";
		this.#revision = 0;
		this.#lineage = void 0;
		this.#steps = [];
		this.#objects.clear();
		this.#joints.clear();
		this.#semantics = void 0;
	}
	#compactHistory() {
		const firstRetained = this.#steps[1];
		if (firstRetained === void 0) return;
		const scene = materializeBuildScene({
			protocol: PROTOCOL_VERSION,
			buildId: this.#buildId,
			title: this.#title,
			profile: { ...this.#profile },
			status: this.#status,
			revision: this.#revision,
			activeStep: 1,
			steps: this.#steps
		}, 1);
		this.#steps = [{
			index: firstRetained.index,
			title: firstRetained.title,
			...firstRetained.note === void 0 ? {} : { note: firstRetained.note },
			...firstRetained.translations === void 0 ? {} : { translations: structuredClone(firstRetained.translations) },
			...firstRetained.phase === void 0 ? {} : { phase: firstRetained.phase },
			status: firstRetained.status,
			objectCount: scene.objects.length,
			jointCount: scene.joints.length,
			objects: scene.objects,
			joints: scene.joints,
			...scene.semantics === void 0 ? {} : { semantics: cloneAssetSemantics(scene.semantics) }
		}, ...this.#steps.slice(2)];
	}
};

//#endregion
//#region src/art/protocol.ts
const ART_LIMITS = {
	frames: 24,
	frameSize: 512,
	rectsPerFrame: 512,
	objectsPerFrame: 64,
	steps: 96,
	text: 160
};
const phases = new Set([
	"brief",
	"style",
	"composition",
	"draft",
	"pixel-cleanup",
	"lineart",
	"color",
	"render",
	"slicing",
	"validation",
	"complete"
]);
function object$1(value, label) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
	return value;
}
function text$1(value, label) {
	if (typeof value !== "string" || value.trim().length === 0 || value.trim().length > ART_LIMITS.text) throw new TypeError(`${label} must be a non-empty string of at most ${ART_LIMITS.text} characters`);
	return value.trim();
}
function integer(value, label, minimum, maximum) {
	if (!Number.isInteger(value) || value < minimum || value > maximum) throw new RangeError(`${label} must be an integer between ${minimum} and ${maximum}`);
	return value;
}
function translations(value) {
	if (value === void 0) return void 0;
	const input = object$1(value, "translations");
	const result = {};
	for (const locale of ["en", "zh-CN"]) {
		if (input[locale] === void 0) continue;
		const item = object$1(input[locale], `translations.${locale}`);
		result[locale] = {
			title: text$1(item.title, `translations.${locale}.title`),
			...item.note === void 0 ? {} : { note: text$1(item.note, `translations.${locale}.note`) }
		};
	}
	return result;
}
function parseArtCommand(value) {
	const input = object$1(value, "art command");
	if (input.action !== "start" && input.action !== "apply" && input.action !== "complete") throw new TypeError("action is not supported");
	if (!phases.has(input.phase)) throw new TypeError("phase is not supported");
	const frameWidth = integer(input.frameWidth, "frameWidth", 1, ART_LIMITS.frameSize);
	const frameHeight = integer(input.frameHeight, "frameHeight", 1, ART_LIMITS.frameSize);
	if (!Array.isArray(input.frames) || input.frames.length < 1 || input.frames.length > ART_LIMITS.frames) throw new RangeError(`frames must contain between 1 and ${ART_LIMITS.frames} items`);
	const frames = input.frames.map((value$1, frameIndex) => {
		const frame = object$1(value$1, `frames[${frameIndex}]`);
		if (!Array.isArray(frame.rects) || frame.rects.length > ART_LIMITS.rectsPerFrame) throw new RangeError(`frames[${frameIndex}].rects may contain at most ${ART_LIMITS.rectsPerFrame} items`);
		const parseRects = (values, label) => values.map((value$2, rectIndex) => {
			const rect = object$1(value$2, `frames[${frameIndex}].rects[${rectIndex}]`);
			const x = integer(rect.x, `rect.x`, 0, frameWidth - 1);
			const y = integer(rect.y, `rect.y`, 0, frameHeight - 1);
			const width = integer(rect.width, `rect.width`, 1, frameWidth);
			const height = integer(rect.height, `rect.height`, 1, frameHeight);
			if (x + width > frameWidth || y + height > frameHeight) throw new RangeError(`frames[${frameIndex}].rects[${rectIndex}] exceeds the frame`);
			const fill = text$1(rect.fill, "rect.fill").toLowerCase();
			if (!/^#[0-9a-f]{6}$/.test(fill)) throw new TypeError("rect.fill must be a six-digit hex color");
			return {
				id: text$1(rect.id, "rect.id"),
				x,
				y,
				width,
				height,
				fill
			};
		});
		const rects = parseRects(frame.rects, `frames[${frameIndex}].rects`);
		if (new Set(rects.map((rect) => rect.id)).size !== rects.length) throw new RangeError(`frames[${frameIndex}] rect IDs must be unique`);
		let objects;
		if (frame.objects !== void 0) {
			if (!Array.isArray(frame.objects) || frame.objects.length > ART_LIMITS.objectsPerFrame) throw new RangeError(`frames[${frameIndex}].objects may contain at most ${ART_LIMITS.objectsPerFrame} items`);
			objects = frame.objects.map((value$2, objectIndex) => {
				const item = object$1(value$2, `frames[${frameIndex}].objects[${objectIndex}]`);
				if (!Array.isArray(item.rects) || item.rects.length < 1 || item.rects.length > ART_LIMITS.rectsPerFrame) throw new RangeError(`frames[${frameIndex}].objects[${objectIndex}].rects is invalid`);
				return {
					id: text$1(item.id, "object.id"),
					label: text$1(item.label, "object.label"),
					...item.role === void 0 ? {} : { role: text$1(item.role, "object.role") },
					zIndex: integer(item.zIndex ?? objectIndex, "object.zIndex", -1e4, 1e4),
					locked: item.locked === true,
					rects: parseRects(item.rects, `frames[${frameIndex}].objects[${objectIndex}].rects`)
				};
			});
			if (new Set(objects.map((item) => item.id)).size !== objects.length) throw new RangeError(`frames[${frameIndex}] object IDs must be unique`);
			const objectRectIds = objects.flatMap((item) => item.rects.map((rect) => rect.id));
			if (new Set(objectRectIds).size !== objectRectIds.length) throw new RangeError(`frames[${frameIndex}] object rect IDs must be unique`);
			if (rects.length + objectRectIds.length > ART_LIMITS.rectsPerFrame) throw new RangeError(`frames[${frameIndex}] contains too many total rects`);
		}
		const localized$1 = translations(frame.translations);
		return {
			id: text$1(frame.id, `frames[${frameIndex}].id`),
			label: text$1(frame.label, `frames[${frameIndex}].label`),
			...localized$1 === void 0 ? {} : { translations: localized$1 },
			rects,
			...objects === void 0 ? {} : { objects }
		};
	});
	if (new Set(frames.map((frame) => frame.id)).size !== frames.length) throw new RangeError("frame IDs must be unique");
	const localized = translations(input.translations);
	return {
		action: input.action,
		title: text$1(input.title, "title"),
		...input.note === void 0 ? {} : { note: text$1(input.note, "note") },
		...localized === void 0 ? {} : { translations: localized },
		phase: input.phase,
		frameWidth,
		frameHeight,
		frames
	};
}

//#endregion
//#region src/art/store.ts
var ArtStore = class {
	#createId;
	#artId = "";
	#title = "";
	#revision = 0;
	#status = "building";
	#steps = [];
	constructor(createId = () => `illusion-art-${Date.now().toString(36)}`) {
		this.#createId = createId;
	}
	apply(command) {
		if (command.action === "start" || this.#artId.length === 0) {
			this.#artId = this.#createId();
			this.#title = command.title;
			this.#revision = 0;
			this.#status = "building";
			this.#steps = [];
		}
		if (this.#status === "complete" && command.action === "complete") throw new Error("art production is already complete");
		this.#revision += 1;
		this.#status = command.action === "complete" ? "complete" : "building";
		this.#steps.push(structuredClone({
			...command,
			index: this.#revision,
			status: this.#status
		}));
		if (this.#steps.length > ART_LIMITS.steps) this.#steps.shift();
		return this.snapshot();
	}
	snapshot() {
		return structuredClone({
			protocol: 1,
			artId: this.#artId,
			title: this.#title,
			status: this.#status,
			revision: this.#revision,
			activeStep: Math.max(0, this.#steps.length - 1),
			steps: this.#steps
		});
	}
};

//#endregion
//#region src/art/style.ts
function object(value, label) {
	if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError(`${label} must be an object`);
	return value;
}
function text(value, label) {
	if (typeof value !== "string" || value.trim().length === 0) throw new TypeError(`${label} must be a non-empty string`);
	if (value.trim().length > 240) throw new RangeError(`${label} is too long`);
	return value.trim();
}
function textList(value, label, maximum) {
	if (value === void 0) return [];
	if (!Array.isArray(value) || value.length > maximum) throw new RangeError(`${label} must contain at most ${maximum} items`);
	return value.map((item, index) => text(item, `${label}[${index}]`));
}
function positiveInteger(value, label, maximum) {
	if (!Number.isInteger(value) || value < 1 || value > maximum) throw new RangeError(`${label} must be an integer between 1 and ${maximum}`);
	return value;
}
function color(value, label) {
	const parsed = text(value, label);
	if (!/^#[0-9a-f]{6}$/i.test(parsed)) throw new TypeError(`${label} must be a six-digit hex color`);
	return parsed.toLowerCase();
}
function parseArtStyleContract(value) {
	const input = object(value, "style");
	if (input.family !== "pixel" && input.family !== "anime" && input.family !== "custom") throw new TypeError("style.family must be pixel, anime, or custom");
	if (input.authority !== "author" && input.authority !== "shared" && input.authority !== "illusion-proposal") throw new TypeError("style.authority is not supported");
	if (input.status !== "proposed" && input.status !== "accepted") throw new TypeError("style.status is not supported");
	if (input.authority === "illusion-proposal" && input.status === "accepted") throw new RangeError("an Illusion proposal must be confirmed by the author before acceptance");
	const authority = input.authority;
	const status = input.status;
	const visual = object(input.visualLanguage, "style.visualLanguage");
	const references = input.references === void 0 ? [] : (() => {
		if (!Array.isArray(input.references) || input.references.length > 16) throw new RangeError("style.references must contain at most 16 items");
		return input.references.map((value$1, index) => {
			const item = object(value$1, `style.references[${index}]`);
			if (item.rights !== "owned" && item.rights !== "licensed" && item.rights !== "public-domain" && item.rights !== "unknown") throw new TypeError(`style.references[${index}].rights is not supported`);
			return {
				id: text(item.id, `style.references[${index}].id`),
				label: text(item.label, `style.references[${index}].label`),
				rights: item.rights,
				...item.note === void 0 ? {} : { note: text(item.note, `style.references[${index}].note`) }
			};
		});
	})();
	if (new Set(references.map((item) => item.id)).size !== references.length) throw new RangeError("style reference IDs must be unique");
	const base = {
		schema: "dsh-illusion/style-contract@1",
		id: text(input.id, "style.id"),
		name: text(input.name, "style.name"),
		version: positiveInteger(input.version, "style.version", 1e4),
		family: input.family,
		authority,
		status,
		description: text(input.description, "style.description"),
		visualLanguage: {
			palette: (() => {
				if (!Array.isArray(visual.palette) || visual.palette.length < 1 || visual.palette.length > 64) throw new RangeError("style.visualLanguage.palette must contain between 1 and 64 colors");
				return visual.palette.map((item, index) => color(item, `style.visualLanguage.palette[${index}]`));
			})(),
			line: text(visual.line, "style.visualLanguage.line"),
			shape: text(visual.shape, "style.visualLanguage.shape"),
			shading: text(visual.shading, "style.visualLanguage.shading"),
			texture: text(visual.texture, "style.visualLanguage.texture"),
			lighting: text(visual.lighting, "style.visualLanguage.lighting")
		},
		invariants: textList(input.invariants, "style.invariants", 32),
		avoid: textList(input.avoid, "style.avoid", 32),
		references
	};
	if (input.family === "pixel") {
		const pixel = object(input.pixel, "style.pixel");
		if (!Array.isArray(pixel.canvas) || pixel.canvas.length !== 2) throw new TypeError("style.pixel.canvas must contain width and height");
		if (pixel.dithering !== "none" && pixel.dithering !== "ordered" && pixel.dithering !== "manual") throw new TypeError("style.pixel.dithering is not supported");
		return {
			...base,
			family: "pixel",
			pixel: {
				canvas: [positiveInteger(pixel.canvas[0], "style.pixel.canvas[0]", 4096), positiveInteger(pixel.canvas[1], "style.pixel.canvas[1]", 4096)],
				colorLimit: positiveInteger(pixel.colorLimit, "style.pixel.colorLimit", 256),
				pixelPerfect: pixel.pixelPerfect !== false,
				dithering: pixel.dithering
			}
		};
	}
	if (input.family === "anime") {
		const anime = object(input.anime, "style.anime");
		if (anime.lineWeight !== "thin" && anime.lineWeight !== "medium" && anime.lineWeight !== "varied") throw new TypeError("style.anime.lineWeight is not supported");
		return {
			...base,
			family: "anime",
			anime: {
				lineWeight: anime.lineWeight,
				celBands: positiveInteger(anime.celBands, "style.anime.celBands", 8),
				proportion: text(anime.proportion, "style.anime.proportion")
			}
		};
	}
	if (base.invariants.length === 0 && references.length === 0) throw new RangeError("a custom style requires author invariants or references");
	return {
		...base,
		family: "custom"
	};
}
function createArtProductionPlan(style, brief) {
	positiveInteger(brief.width, "brief.width", 16384);
	positiveInteger(brief.height, "brief.height", 16384);
	const phases$1 = [
		"brief",
		"style",
		"composition",
		"draft"
	];
	if (style.family === "pixel") phases$1.push("pixel-cleanup", "color");
	else phases$1.push("lineart", "color", "render");
	if (brief.deliverable === "sprite-sheet" || brief.deliverable === "tile-set") phases$1.push("slicing");
	phases$1.push("validation", "complete");
	return phases$1;
}

//#endregion
//#region src/index.ts
const name = "dsh-illusion";
const inject = ["tools", "systemPrompt"];
const vec3Schema = {
	type: "array",
	minItems: 3,
	maxItems: 3,
	items: { type: "number" }
};
const vec2Schema = {
	type: "array",
	minItems: 2,
	maxItems: 2,
	items: { type: "number" }
};
const triangleSchema = {
	type: "array",
	minItems: 3,
	maxItems: 3,
	items: {
		type: "integer",
		minimum: 0
	}
};
const geometrySchema = {
	type: "object",
	additionalProperties: false,
	required: ["kind"],
	description: "Procedural or custom geometry. Local coordinates are right-handed [x, y, z] with Z up.",
	properties: {
		kind: {
			type: "string",
			enum: [
				"box",
				"sphere",
				"cylinder",
				"cone",
				"torus",
				"capsule",
				"ellipsoid",
				"plane",
				"lathe",
				"tube",
				"mesh"
			]
		},
		width: {
			type: "number",
			exclusiveMinimum: 0
		},
		height: {
			type: "number",
			exclusiveMinimum: 0
		},
		depth: {
			type: "number",
			exclusiveMinimum: 0
		},
		radius: {
			type: "number",
			exclusiveMinimum: 0
		},
		tube: {
			type: "number",
			exclusiveMinimum: 0
		},
		radii: {
			...vec3Schema,
			description: "Positive ellipsoid radii in [x, y, z] order."
		},
		profile: {
			type: "array",
			minItems: 2,
			maxItems: BUILD_LIMITS.lathePoints,
			items: vec2Schema,
			description: "Lathe profile points in [radius, z] order."
		},
		path: {
			type: "array",
			minItems: 2,
			maxItems: BUILD_LIMITS.pathPoints,
			items: vec3Schema,
			description: "Tube centerline points in local [x, y, z] coordinates."
		},
		closed: { type: "boolean" },
		vertices: {
			type: "array",
			minItems: 3,
			maxItems: BUILD_LIMITS.meshVerticesPerObject,
			items: vec3Schema,
			description: "Custom-mesh vertices in local [x, y, z] coordinates."
		},
		triangles: {
			type: "array",
			minItems: 1,
			maxItems: BUILD_LIMITS.meshTrianglesPerObject,
			items: triangleSchema,
			description: "Counter-clockwise vertex-index triangles viewed from outside."
		}
	}
};
const objectSchema = {
	type: "object",
	additionalProperties: false,
	required: ["id", "geometry"],
	description: "A stable character or scene part. parentId creates a local-transform assembly hierarchy.",
	properties: {
		id: {
			type: "string",
			maxLength: BUILD_LIMITS.text
		},
		label: {
			type: "string",
			maxLength: BUILD_LIMITS.text
		},
		role: {
			type: "string",
			maxLength: BUILD_LIMITS.text,
			description: "Semantic role such as body.head, face.eye.left, hair.front, clothing.coat, or accessory.weapon."
		},
		parentId: {
			type: "string",
			maxLength: BUILD_LIMITS.text,
			description: "Optional parent part ID. Position, rotation, and scale become local to the parent."
		},
		geometry: geometrySchema,
		position: {
			...vec3Schema,
			description: "Local position in [x, y, z] order. Z is vertical; do not use Y as the up axis."
		},
		rotation: {
			...vec3Schema,
			description: "Local right-handed Euler rotation in DEGREES, in [x, y, z] order. Never use radians."
		},
		scale: {
			...vec3Schema,
			description: "Local scale in [x, y, z] order."
		},
		color: {
			type: "string",
			description: "Six-digit hex RGB base color."
		},
		opacity: {
			type: "number",
			minimum: 0,
			maximum: 1
		},
		roughness: {
			type: "number",
			minimum: 0,
			maximum: 1
		},
		metalness: {
			type: "number",
			minimum: 0,
			maximum: 1
		},
		emissive: {
			type: "string",
			description: "Six-digit hex RGB emissive color."
		},
		doubleSided: { type: "boolean" }
	}
};
const jointSchema = {
	type: "object",
	additionalProperties: false,
	required: ["id"],
	description: "A reviewable rig joint. This records hierarchy and rest pose, not skin weights.",
	properties: {
		id: {
			type: "string",
			maxLength: BUILD_LIMITS.text
		},
		label: {
			type: "string",
			maxLength: BUILD_LIMITS.text
		},
		role: {
			type: "string",
			maxLength: BUILD_LIMITS.text
		},
		parentId: {
			type: "string",
			maxLength: BUILD_LIMITS.text
		},
		position: {
			...vec3Schema,
			description: "Local joint position in [x, y, z] with Z up."
		},
		rotation: {
			...vec3Schema,
			description: "Local rest rotation in degrees."
		}
	}
};
const localizedStepTextSchema = {
	type: "object",
	additionalProperties: false,
	required: ["title"],
	properties: {
		title: {
			type: "string",
			maxLength: BUILD_LIMITS.text
		},
		note: {
			type: "string",
			maxLength: BUILD_LIMITS.text
		}
	}
};
const assetSemanticsSchema = {
	type: "object",
	additionalProperties: false,
	required: ["pivot", "bounds"],
	description: "Game-engine semantics for the selected checkpoint. References must resolve to scene object IDs.",
	properties: {
		pivot: {
			type: "object",
			additionalProperties: false,
			required: ["position"],
			properties: {
				position: vec3Schema,
				rotation: vec3Schema
			}
		},
		bounds: {
			type: "object",
			additionalProperties: false,
			required: ["min", "max"],
			properties: {
				min: vec3Schema,
				max: vec3Schema
			}
		},
		modularGrid: {
			type: "object",
			additionalProperties: false,
			required: ["size"],
			properties: {
				size: vec3Schema,
				origin: vec3Schema
			}
		},
		sockets: {
			type: "array",
			maxItems: 128,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["id"],
				properties: {
					id: { type: "string" },
					label: { type: "string" },
					parentId: { type: "string" },
					position: vec3Schema,
					rotation: vec3Schema
				}
			}
		},
		colliders: {
			type: "array",
			maxItems: 128,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["id", "shape"],
				properties: {
					id: { type: "string" },
					label: { type: "string" },
					ownerId: { type: "string" },
					shape: {
						type: "string",
						enum: [
							"box",
							"sphere",
							"capsule"
						]
					},
					center: vec3Schema,
					size: vec3Schema,
					radius: {
						type: "number",
						exclusiveMinimum: 0
					},
					height: {
						type: "number",
						exclusiveMinimum: 0
					},
					trigger: { type: "boolean" }
				}
			}
		},
		materialSlots: {
			type: "array",
			maxItems: 64,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["id", "objectIds"],
				properties: {
					id: { type: "string" },
					label: { type: "string" },
					objectIds: {
						type: "array",
						minItems: 1,
						items: { type: "string" }
					}
				}
			}
		},
		lodGroups: {
			type: "array",
			maxItems: 32,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["id", "levels"],
				properties: {
					id: { type: "string" },
					levels: {
						type: "array",
						minItems: 1,
						maxItems: 8,
						items: {
							type: "object",
							additionalProperties: false,
							required: [
								"level",
								"screenCoverage",
								"objectIds"
							],
							properties: {
								level: {
									type: "integer",
									minimum: 0
								},
								screenCoverage: {
									type: "number",
									minimum: 0,
									maximum: 1
								},
								objectIds: {
									type: "array",
									minItems: 1,
									items: { type: "string" }
								}
							}
						}
					}
				}
			}
		}
	}
};
const parameters = {
	type: "object",
	additionalProperties: false,
	required: ["action", "title"],
	properties: {
		action: {
			type: "string",
			enum: [
				"start",
				"apply",
				"complete",
				"resume"
			],
			description: "start resets the scene; apply adds one visible step; complete seals the build; resume restores an exact live branch checkpoint."
		},
		title: {
			type: "string",
			maxLength: BUILD_LIMITS.text,
			description: `Short human-readable name for this construction step, at most ${BUILD_LIMITS.text} characters.`
		},
		note: {
			type: "string",
			maxLength: BUILD_LIMITS.text,
			description: `Optional concise explanation of what changed and why, at most ${BUILD_LIMITS.text} characters.`
		},
		translations: {
			type: "object",
			additionalProperties: false,
			description: "Localized visible step text. Always provide zh-CN so the viewer can switch between English and Chinese.",
			properties: {
				en: localizedStepTextSchema,
				"zh-CN": localizedStepTextSchema
			}
		},
		phase: {
			type: "string",
			enum: BUILD_PHASE_VALUES,
			description: "Visible production phase. Character builds should advance through blockout, anatomy, identity parts, rig, and validation."
		},
		profile: {
			type: "object",
			additionalProperties: false,
			required: ["kind"],
			description: "Set only on start. Use game-asset for categorized game production, character for the legacy character workflow, or object for an uncategorized assembly.",
			properties: {
				kind: {
					type: "string",
					enum: [
						"object",
						"character",
						"game-asset"
					]
				},
				category: {
					type: "string",
					enum: [
						"humanoid",
						"creature",
						"building",
						"vehicle",
						"prop",
						"vegetation",
						"terrain",
						"environment"
					]
				},
				archetype: {
					type: "string",
					maxLength: BUILD_LIMITS.text
				},
				style: {
					type: "string",
					enum: [
						"realistic",
						"stylized",
						"anime",
						"low-poly",
						"voxel",
						"custom"
					]
				},
				usage: {
					type: "string",
					enum: [
						"static",
						"skeletal",
						"modular",
						"environment"
					]
				},
				target: {
					type: "string",
					enum: [
						"static",
						"game",
						"mmd",
						"vtuber",
						"interactive",
						"print",
						"generic",
						"godot",
						"unity",
						"unreal",
						"web",
						"custom"
					]
				},
				unit: {
					type: "string",
					enum: [
						"m",
						"cm",
						"mm"
					]
				},
				height: {
					type: "number",
					exclusiveMinimum: 0
				}
			}
		},
		sourceBuildId: {
			type: "string",
			maxLength: BUILD_LIMITS.text,
			description: "Required only for resume. Build ID of the live checkpoint selected by the branch UI."
		},
		sourceStep: {
			type: "integer",
			minimum: 1,
			description: "Required only for resume. Published step number to restore."
		},
		semantics: assetSemanticsSchema,
		operations: {
			type: "array",
			maxItems: BUILD_LIMITS.operations,
			description: "Atomic scene and rig mutations. Prefer one reviewable modeling step per tool call.",
			items: {
				type: "object",
				additionalProperties: false,
				required: ["type"],
				properties: {
					type: {
						type: "string",
						enum: [
							"upsert",
							"remove",
							"clear",
							"upsert_joint",
							"remove_joint",
							"clear_rig"
						]
					},
					id: {
						type: "string",
						description: "Required for remove and remove_joint."
					},
					object: objectSchema,
					joint: jointSchema
				}
			}
		}
	}
};
const outputSchema = {
	type: "object",
	additionalProperties: false,
	required: ["summary", "snapshot"],
	properties: {
		summary: { type: "string" },
		snapshot: {
			type: "object",
			additionalProperties: true
		}
	}
};
const artRectSchema = {
	type: "object",
	additionalProperties: false,
	required: [
		"id",
		"x",
		"y",
		"width",
		"height",
		"fill"
	],
	properties: {
		id: {
			type: "string",
			maxLength: ART_LIMITS.text
		},
		x: {
			type: "integer",
			minimum: 0
		},
		y: {
			type: "integer",
			minimum: 0
		},
		width: {
			type: "integer",
			minimum: 1
		},
		height: {
			type: "integer",
			minimum: 1
		},
		fill: {
			type: "string",
			description: "Six-digit hex RGB color."
		}
	}
};
const artParameters = {
	type: "object",
	additionalProperties: false,
	required: [
		"action",
		"title",
		"phase",
		"frameWidth",
		"frameHeight",
		"frames"
	],
	properties: {
		action: {
			type: "string",
			enum: [
				"start",
				"apply",
				"complete"
			]
		},
		title: {
			type: "string",
			maxLength: ART_LIMITS.text
		},
		note: {
			type: "string",
			maxLength: ART_LIMITS.text
		},
		translations: parameters.properties.translations,
		phase: {
			type: "string",
			enum: [
				"brief",
				"style",
				"composition",
				"draft",
				"pixel-cleanup",
				"lineart",
				"color",
				"render",
				"slicing",
				"validation",
				"complete"
			]
		},
		frameWidth: {
			type: "integer",
			minimum: 1,
			maximum: ART_LIMITS.frameSize
		},
		frameHeight: {
			type: "integer",
			minimum: 1,
			maximum: ART_LIMITS.frameSize
		},
		frames: {
			type: "array",
			minItems: 1,
			maxItems: ART_LIMITS.frames,
			items: {
				type: "object",
				additionalProperties: false,
				required: [
					"id",
					"label",
					"rects"
				],
				properties: {
					id: {
						type: "string",
						maxLength: ART_LIMITS.text
					},
					label: {
						type: "string",
						maxLength: ART_LIMITS.text
					},
					translations: parameters.properties.translations,
					rects: {
						type: "array",
						maxItems: ART_LIMITS.rectsPerFrame,
						items: artRectSchema
					},
					objects: {
						type: "array",
						maxItems: ART_LIMITS.objectsPerFrame,
						description: "Semantic composition layers. Reuse stable object IDs across revisions and animation frames.",
						items: {
							type: "object",
							additionalProperties: false,
							required: [
								"id",
								"label",
								"rects"
							],
							properties: {
								id: {
									type: "string",
									maxLength: ART_LIMITS.text
								},
								label: {
									type: "string",
									maxLength: ART_LIMITS.text
								},
								role: {
									type: "string",
									maxLength: ART_LIMITS.text
								},
								zIndex: {
									type: "integer",
									minimum: -1e4,
									maximum: 1e4
								},
								locked: { type: "boolean" },
								rects: {
									type: "array",
									minItems: 1,
									maxItems: ART_LIMITS.rectsPerFrame,
									items: artRectSchema
								}
							}
						}
					}
				}
			}
		}
	}
};
const builtinPluginPlan = createBuiltinPluginPlan();
function apply(ctx) {
	const stores = /* @__PURE__ */ new WeakMap();
	const artStores = /* @__PURE__ */ new WeakMap();
	const fallbackStore = new BuildStore();
	const fallbackArtStore = new ArtStore();
	const snapshots = /* @__PURE__ */ new Map();
	const tools = ctx.tools;
	const systemPrompt = ctx.systemPrompt;
	ctx.effect(() => systemPrompt.section({
		name: "tool:illusion-build",
		order: 5800,
		interpolate: false,
		text: [
			...builtinPluginPlan.promptSections,
			"When creating or modifying a 3D model and illusion_build is available, keep its visual construction record in sync.",
			"When the user asks DeepSeek to assemble the model in Illusion, DeepSeek owns the modeling decisions and must build it directly through tool operations rather than asking the user to author the parts.",
			"Call start before the first modeling operation, apply for one meaningful visible geometry change, and complete only after validation.",
			"Choose the construction workflow as the modeler. In interactive mode, publish one semantic checkpoint and stop for review. In Plan execution mode, first divide the work into coherent semantic nodes, then publish each node with a separate illusion_build call and continue automatically to the requested node or finished model. Never merge several planned nodes into one call because every published node must remain independently visible, editable, exportable, and branchable in chat history.",
			"After an interactive checkpoint, the requested Plan target, or the completed model, ask whether it matches the user expectation. Mention that they may reply with text, attach reference files with a description, run the plan to a named node or completion, export the checkpoint, or branch from it. Treat attached feedback as a revision of the selected checkpoint, reuse stable IDs, publish exactly one correction step, and stop again.",
			"A completed build may be reopened with action=apply when the user requests a change; validate it again before calling complete. When feedback targets an older step, the client creates a branch and first resumes that exact checkpoint.",
			"Never start over for a refinement unless the user explicitly requests a new build. In a branched session, first use action=resume with the sourceBuildId and sourceStep supplied by the branch request; do not imitate a resume with a new start.",
			"For a game asset, start with profile.kind=game-asset and choose a category, archetype, style, usage, engine target, and unit. Work from silhouette and scale through structure, category-defining details, materials, optional collision and LOD representations, then validation. A preview is not game-ready unless the requested pivot, modular boundaries, collision intent, scale, and export target have been stated and checked.",
			"For a complex humanoid, creature, or mascot, start with profile.kind=character and advance through reviewable phases: blockout, anatomy, face, hair, clothing, accessories, materials, rig, expressions, and validation as applicable.",
			"Use stable semantic IDs, role labels, and parentId hierarchies. Parent-relative transforms are local. Prefer capsules and ellipsoids for body volumes, tubes for hair or tails, lathe profiles for rotational forms, planes for panels, and bounded custom meshes for identity-defining shapes.",
			"Build from global proportions to identity features. Add rig joints as a rest-pose review skeleton after the assembly is stable; joint records do not prove skin weights or deformation quality.",
			"The scene uses right-handed [x, y, z] coordinates with Z up, not Y up. Boxes use width=X, depth=Y, height=Z; cylinders and cones point along local Z. Rotations are Euler angles in degrees, never radians.",
			"Illusion can be the editable modular assembly artifact for its JSON and preview GLB exports. If another CAD/DCC tool is used, that tool remains authoritative and its accepted changes should be synchronized here.",
			"Use title and note for observable operations and results. Never put hidden chain-of-thought or private reasoning in them.",
			"Write the canonical title and note in English and always provide a concise Simplified Chinese version in translations.zh-CN so the user can switch the visible build record between English and Chinese."
		].join(" ")
	}), "dsh-illusion: modeling guidance");
	ctx.effect(() => systemPrompt.section({
		name: "tool:illusion-art",
		order: 5810,
		interpolate: false,
		text: [
			"When producing pixel art or frame-based 2D art and illusion_art is available, publish the visible work through it instead of hiding the artifact in a file-only response.",
			"Set the exact per-frame width and height. For animation, include stable frame IDs and publish coherent motion frames in order.",
			"In interactive mode, publish one reviewable art step and stop. Ask whether it matches the expectation before continuing.",
			"The reviewer can inspect one enlarged frame at a time and select a pixel or rectangular region. When feedback names a frame and region, preserve every other frame and edit only the requested area unless the user asks for a broader change.",
			"For multi-object composition, put semantic layers in frames[].objects with stable IDs, labels, roles, and zIndex. Keep background, characters, props, effects, and foreground elements independently editable. A locked object must not change unless the reviewer explicitly unlocks it.",
			"Use stable rect IDs across revisions so localized changes remain auditable. Always provide translations.zh-CN for visible titles and notes.",
			"Never include private reasoning in visible art-step text."
		].join(" ")
	}), "dsh-illusion: 2d art guidance");
	ctx.effect(() => tools.register({
		name: "illusion_build",
		description: "Build and publish one visible 3D construction step. Supports hierarchical character parts, procedural and bounded custom geometry, material controls, and reviewable rig joints. Call start first, apply after each meaningful change, and complete after validation. Use right-handed [x, y, z] coordinates with Z up and rotations in degrees, never radians.",
		parameters,
		output: {
			schema: outputSchema,
			render: (_args, value) => [{
				type: "text",
				text: value.summary
			}],
			presentationMeta: (_args, value) => ({ illusionSnapshot: value.snapshot })
		},
		async execute(args, exec) {
			if (exec.signal.aborted) throw exec.signal.reason;
			const command = parseBuildCommand(args);
			const agent = exec.agent;
			let store = fallbackStore;
			if (typeof agent === "object" && agent !== null) {
				store = stores.get(agent) ?? new BuildStore();
				stores.set(agent, store);
			}
			let snapshot;
			if (command.action === "resume") {
				const source = snapshots.get(command.sourceBuildId ?? "")?.get(command.sourceStep ?? -1);
				if (source === void 0) throw new Error("the requested live branch checkpoint is unavailable after the source Harness process ended");
				snapshot = store.resume(source, command.sourceStep, command);
			} else snapshot = store.apply(command);
			let revisions = snapshots.get(snapshot.buildId);
			if (revisions === void 0) {
				revisions = /* @__PURE__ */ new Map();
				snapshots.set(snapshot.buildId, revisions);
			}
			const publishedStep = snapshot.steps[snapshot.activeStep]?.index ?? snapshot.revision;
			revisions.set(publishedStep, snapshot);
			const active = snapshot.steps[snapshot.activeStep];
			const objectCount = active?.objectCount ?? active?.objects?.length ?? 0;
			const jointCount = active?.jointCount ?? active?.joints?.length ?? 0;
			return {
				summary: `${command.action === "complete" ? "Completed" : command.action === "resume" ? "Resumed" : "Updated"} “${snapshot.title}”: step ${snapshot.revision}, ${objectCount} visible part${objectCount === 1 ? "" : "s"}, ${jointCount} rig joint${jointCount === 1 ? "" : "s"}. Review this checkpoint before continuing.`,
				snapshot
			};
		}
	}), "dsh-illusion: illusion_build tool");
	ctx.effect(() => tools.register({
		name: "illusion_art",
		description: "Publish one reviewable 2D pixel-art step with exact frame dimensions. Frames are shown individually at pixel zoom and can receive coordinate-specific review feedback.",
		parameters: artParameters,
		output: {
			schema: outputSchema,
			render: (_args, value) => [{
				type: "text",
				text: value.summary
			}],
			presentationMeta: (_args, value) => ({ illusionArtSnapshot: value.snapshot })
		},
		async execute(args, exec) {
			if (exec.signal.aborted) throw exec.signal.reason;
			const command = parseArtCommand(args);
			let store = fallbackArtStore;
			if (typeof exec.agent === "object" && exec.agent !== null) {
				store = artStores.get(exec.agent) ?? new ArtStore();
				artStores.set(exec.agent, store);
			}
			const snapshot = store.apply(command);
			const step = snapshot.steps[snapshot.activeStep];
			return {
				summary: `${command.action === "complete" ? "Completed" : "Published"} “${snapshot.title}”: step ${snapshot.revision}, ${step?.frames.length ?? 0} reviewable frame${step?.frames.length === 1 ? "" : "s"} at ${command.frameWidth}×${command.frameHeight}. Review frames individually before continuing.`,
				snapshot
			};
		}
	}), "dsh-illusion: illusion_art tool");
}

//#endregion
export { ArtStore, BUILTIN_PLUGIN_MANIFESTS, BuildStore, PLUGIN_API_VERSION, PluginGovernor, apply, createArtProductionPlan, createBuiltinPluginPlan, inject, materializeBuildScene, name, parseArtCommand, parseArtStyleContract, parseBuildCommand };