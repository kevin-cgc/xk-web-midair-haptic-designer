/** @typedef {import("../../../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/**
 * @template T
 * @typedef {import("../../../../shared/util").NotNullable<T>} NotNullable
 */

import { BoundsCheck } from "./bounds-check.mjs";
import { MAHKeyframePauseFE } from "./pause.mjs";
import { MAHKeyframeStandardFE } from "./standard.mjs";

export { MAHKeyframePauseFE , MAHKeyframeStandardFE };

/** @typedef {MAHKeyframeStandardFE | MAHKeyframePauseFE} MAHKeyframeFE */


/**
 *
 * @param {MAHKeyframeFE} keyframe
 */
export function filter_by_coords(keyframe) {
	if ("coords" in keyframe) return keyframe;
	else null;
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_by_coords>> } */
export function has_coords(keyframe) {
	return "coords" in keyframe;
}
/**
 *
 * @param {MAHKeyframeFE} keyframe
 */
export function filter_by_brush(keyframe) {
	if ("brush" in keyframe) return keyframe;
	else null;
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_by_brush>> } */
export function has_brush(keyframe) {
	return "brush" in keyframe;
}
/**
 *
 * @param {MAHKeyframeFE} keyframe
 */
export function filter_by_intensity(keyframe) {
	if ("intensity" in keyframe) return keyframe;
	else null;
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_by_intensity>> } */
export function has_intensity(keyframe) {
	return "intensity" in keyframe;
}
/**
 *
 * @param {MAHKeyframeFE} keyframe
 */
export function filter_by_transition(keyframe) {
	if ("transition" in keyframe) return keyframe;
	else null;
}
/** @type {(a0: MAHKeyframeFE) => a0 is NotNullable<ReturnType<typeof filter_by_transition>> } */
export function has_transition(keyframe) {
	return "transition" in keyframe;
}

/**
 *
 * @param {MAHKeyframe} keyframe
 * @param {MAHPatternDesignFE} pattern_design
 * @returns {MAHKeyframeFE}
 */
export function create_correct_keyframefe_wrapper(keyframe, pattern_design) {
	switch (keyframe.type) {
		case "standard": return new MAHKeyframeStandardFE(keyframe, pattern_design);
		case "pause": return new MAHKeyframePauseFE(keyframe, pattern_design);
		// @ts-ignore
		default: throw new TypeError(`Unknown keyframe type '${keyframe.type}'`);
	}
}


export class NewKeyframeCommon {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {number | null} time
	 */
	constructor(pattern_design, time) {
		this.pattern_design = pattern_design;
		this.time = time!=null ? time : NewKeyframeCommon.next_timestamp(pattern_design);
	}
	/**
	 * @param {MAHPatternDesignFE} pattern_design
	 * @returns {number} timestamp for next keyframe
	 */
	static next_timestamp(pattern_design) {
		const last_keyframe = pattern_design.get_last_keyframe();
		const secondlast_keyframe = pattern_design.get_secondlast_keyframe();
		if (last_keyframe) { // linear extrapolation
			if (secondlast_keyframe) {
				return 2 * last_keyframe.time - secondlast_keyframe.time;
			} else {
				return last_keyframe.time + 500;
			}
		} else {
			return 0;
		}
	}

	/** @type {import("../../../../shared/types").MAHKeyframeCoords['coords']['transition']} */
	static DEFAULT_COORDS_TRANSITION = {
		name: "linear",
		params: {}
	};

	/**
	 * @returns {import("../../../../shared/types").MAHKeyframeCoords['coords']}
	 */
	get coords() {
		const current_keyframes_sorted = this.pattern_design.get_sorted_keyframes();
		let next_keyframe_index = current_keyframes_sorted.findIndex(kf => kf.time > this.time);
		if (next_keyframe_index == -1) next_keyframe_index = current_keyframes_sorted.length;
		/** @type {(MAHKeyframeStandardFE | undefined)[]} */
		const next_neighbors = [];
		for (let i=next_keyframe_index; i<current_keyframes_sorted.length; i++) {
			const kf = current_keyframes_sorted[i];
			if (kf.type == "standard") next_neighbors.push(kf);
			if (next_neighbors.length == 2) break;
			else continue;
		}
		/** @type {(MAHKeyframeStandardFE | undefined)[]} */
		const prev_neighbors = [];
		for (let i=next_keyframe_index; i--; ) {
			const kf = current_keyframes_sorted[i];
			if (kf.type == "standard") prev_neighbors.push(kf);
			if (prev_neighbors.length == 2) break;
			else continue;
		}
		const [next_keyframe, secondnext_keyframe] = next_neighbors;
		const [prev_keyframe, secondprev_keyframe] = prev_neighbors;

		let coords = { x: 0, y: 0, z: 0 };
		if (prev_keyframe && next_keyframe) {
			Object.keys(coords).forEach(k => coords[k] = (prev_keyframe.coords.coords[k] + next_keyframe.coords.coords[k])/2);
		} else if (secondprev_keyframe && prev_keyframe) {
			Object.keys(coords).forEach(k => coords[k] = 2*prev_keyframe.coords.coords[k] - secondprev_keyframe.coords.coords[k]);
		} else if (secondnext_keyframe && next_keyframe) {
			Object.keys(coords).forEach(k => coords[k] = 2*next_keyframe.coords.coords[k] - secondnext_keyframe.coords.coords[k]);
		} else if (prev_keyframe) {
			Object.keys(coords).forEach(k => coords[k] = prev_keyframe.coords.coords[k] + 5);
		}
		coords = BoundsCheck.coords(coords);
		return {
			coords,
			transition: prev_keyframe?.coords.transition || NewKeyframeCommon.DEFAULT_COORDS_TRANSITION
		};
	}

	#find_neighbors() {
		const current_keyframes_sorted = this.pattern_design.get_sorted_keyframes();
		const next_keyframe_index = current_keyframes_sorted.findIndex(kf => kf.time > this.time);
		const next_keyframe = (next_keyframe_index == -1) ? undefined : current_keyframes_sorted[next_keyframe_index];
		const prev_keyframe = (next_keyframe_index == -1 || next_keyframe_index == 0) ? undefined : current_keyframes_sorted[next_keyframe_index-1];
		return { next_keyframe, prev_keyframe };
	}


	/** @type {typeof NewKeyframeCommon.prototype.brush} */
	static DEFAULT_BRUSH = {
		brush: {
			name: "circle",
			params: {
				size: 1.00
			}
		},
		transition: {
			name: "linear",
			params: {}
		}
	};
	/**
	 * @returns {import("../../../../shared/types").MAHKeyframeBrush['brush']}
	 */
	get brush() {
		const { next_keyframe, prev_keyframe } = this.#find_neighbors();
		return prev_keyframe?.brush || next_keyframe?.brush || NewKeyframeCommon.DEFAULT_BRUSH;
	}


	/** @type {typeof NewKeyframeCommon.prototype.intensity} */
	static DEFAULT_INTENSITY = {
		intensity: {
			name: "constant",
			params: {
				value: 1.00
			}
		},
		transition: {
			name: "linear",
			params: {}
		}
	};
	/**
	 * @returns {import("../../../../shared/types").MAHKeyframeIntensity['intensity']}
	 */
	get intensity() {
		const { next_keyframe, prev_keyframe } = this.#find_neighbors();
		return prev_keyframe?.intensity || next_keyframe?.intensity || NewKeyframeCommon.DEFAULT_INTENSITY;
	}
}
