import Split from "../thirdparty/split-grid.mjs";
import { KonvaPatternStage } from "./konvapatternstage.mjs";
import { KonvaTimelineStage } from "./konvatimeline.mjs";
const SplitGrid = /** @type {import("split-grid").default} */(/** @type {unknown} */(Split));
const Konva = /** @type {import("konva").default} */ (window["Konva"]);

/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */
/** @typedef {import("../../shared/gui-types").StateChangeEventTarget} StateChangeEventTarget */
/** @typedef {import("../../shared/gui-types").StateEventMap} StateEventMap */

const mainsplitgridDiv = /** @type {HTMLDivElement} */ (document.querySelector("div.mainsplitgrid"));
const centerDiv = /** @type {HTMLDivElement} */ (mainsplitgridDiv.querySelector("div.center"));
const timelineDiv = /** @type {HTMLDivElement} */ (document.querySelector("div.timeline"));
const savedstateSpan = /** @type {HTMLSpanElement} */ (document.querySelector("span.savedstate"));
/**
 * Assert Not Null
 * @template T
 * @param {T | null} t 
 * @returns {T}
 */
const notnull = t => { if (t) { return t; } else { throw new TypeError("Unexpected null"); } };

/**
 * @template {keyof StateEventMap} K
 */
export class StateChangeEvent extends CustomEvent {
	/**
	 * 
	 * @param {K} event 
	 * @param {CustomEventInit<StateEventMap[K]>} eventInitDict
	 */
	constructor(event, eventInitDict) {
		super(event, eventInitDict);
	}
}

export class MAHPatternDesignFE {
	/**
	 * 
	 * @param {string} filename 
	 * @param {MidAirHapticsAnimationFileFormat} filedata 
	 */
	constructor(filename, filedata, undo_states = [], redo_states = [], undo_states_size = 50, redo_states_size = 50) {
		this.filename = filename;
		this.filedata = filedata;
		this.undo_states = undo_states;
		this.undo_states_size = undo_states_size;
		this.redo_states = redo_states;
		this.redo_states_size = redo_states_size;

		this.filedata.keyframes = this.filedata.keyframes.map(kf => new MAHKeyframeFE(kf));

		this.state_change_events = /** @type {StateChangeEventTarget} */ (new EventTarget());
	}



	undo_states = [];
	undo_states_size = 50;
	redo_states = [];
	redo_states_size = 50;

	// save_working_copy_to_localstorage_timer = null; #this is not atomic
	_commited = false;
	get commited() {
		return this._commited;
	}
	set commited(v) {
		savedstateSpan.textContent = v ? "saved to localstorage" : "pending change";
		this._commited = v;
	}

	save_state() {
		if (!this.commited) {
			alert("save_state before commit");
			throw new Error("save_state before commit");
		}
		this.commited = false;
		this.redo_states.length = 0;
		this.undo_states.push(window.structuredClone(this.filedata));
		if (this.undo_states.length > this.undo_states_size) this.undo_states.shift();

		this.save_to_localstorage();

		//# this is not atomic
		// if (this.save_working_copy_to_localstorage_timer) clearTimeout(this.save_working_copy_to_localstorage_timer);
		// setTimeout(() => this.save_to_localstorage(), 1800);
	}
	/**
	 * 
	 * @param {{
	 * 	rerender?: boolean,
	 * 	new_keyframes?: MAHKeyframeFE[]
	 * 	updated_keyframes?: MAHKeyframeFE[]
	 * 	deleted_keyframes?: MAHKeyframeFE[]
	 * }} param0
	 */
	commit_operation({ rerender, new_keyframes, updated_keyframes, deleted_keyframes }) {
		if (this.commited) {
			alert("commit_operation before save");
			throw new Error("commit_operation before save");
		}
		this.save_to_localstorage();
		this.commited = true;


		// it might be better to run everything through es6 proxies than trust we provide all modified objects, but im just gonna with this for now
		if (rerender) {
			const change_event = new StateChangeEvent("rerender", { detail: {} });
			this.state_change_events.dispatchEvent(change_event);
			return;
		}

		if (new_keyframes) {
			for (const keyframe of new_keyframes) {
				const change_event = new StateChangeEvent("kf_new", { detail: { keyframe } });
				this.state_change_events.dispatchEvent(change_event);
			}
		}
		if (updated_keyframes) {
			for (const keyframe of updated_keyframes) {
				const change_event = new StateChangeEvent("kf_update", { detail: { keyframe } });
				this.state_change_events.dispatchEvent(change_event);
			}
		}
		if (deleted_keyframes) {
			for (const keyframe of deleted_keyframes) {
				const change_event = new StateChangeEvent("kf_delete", { detail: { keyframe } });
				this.state_change_events.dispatchEvent(change_event);
			}
		}
	}

	undo() {
		if (this.undo_states.length == 0) return false;

		this.redo_states.push(window.structuredClone(this.filedata));
		if (this.redo_states.length > this.redo_states_size) this.redo_states.shift();

		this.selected_keyframes.clear();
		this.filedata = this.undo_states.pop();
		this.commited = false;
		this.commit_operation({ rerender: true });
		return true;
	}

	redo() {
		if (this.redo_states.length == 0) return false;

		this.undo_states.push(window.structuredClone(this.filedata));
		if (this.undo_states.length > this.undo_states_size) this.undo_states.shift();

		this.selected_keyframes.clear();
		this.filedata = this.redo_states.pop();
		this.commited = false;
		this.commit_operation({ rerender: true });
		return true;
	}



	/**
	 * 
	 * @param {Object} set
	 * @param {{ x: number, y: number, z: number }} [set.coords]
	 * @param {number} [set.time]
	 * @returns 
	 */
	append_new_keyframe(set) {
		const last_keyframe = this.get_last_keyframe();
		const secondlast_keyframe = this.get_secondlast_keyframe();
		const keyframe = new MAHKeyframeFE(window.structuredClone({ ...MAHKeyframeFE.default, ...last_keyframe, ...set }));
		if (last_keyframe) {
			if (set.time == undefined) {
				let add_to_time = 500;
				if (secondlast_keyframe) { // linterp
					add_to_time = last_keyframe.time - secondlast_keyframe.time;
				}
				keyframe.time += Math.max(add_to_time, 1);
			}
			if (set.coords == undefined) {
				let newcoords = keyframe.coords;
				Object.keys(newcoords).forEach(k => newcoords[k] += 5);
				if (secondlast_keyframe) { // linterp
					Object.keys(newcoords).forEach(k => newcoords[k] = 2 * last_keyframe.coords[k] - secondlast_keyframe.coords[k], 500);
				}
				Object.keys(newcoords).forEach(k => newcoords[k] = Math.min(Math.max(newcoords[k], 0), 500));
				keyframe.coords = newcoords;
			}
		}
		this.filedata.keyframes.push(keyframe);
		this.filedata.keyframes.sort();
		return keyframe;
	}

	
	selected_keyframes = new Set();

	/**
	 * 
	 * @param {MAHKeyframeFE[]} selected_keyframes 
	 */
	select_keyframes(selected_keyframes) {
		for (const keyframe of selected_keyframes) {
			this.selected_keyframes.add(keyframe);
			const change_event = new StateChangeEvent("kf_select", { detail: { keyframe } });
			this.state_change_events.dispatchEvent(change_event);
		}
	}
	/**
	 * 
	 * @param {MAHKeyframeFE[]} deselected_keyframes 
	 */
	deselect_keyframes(deselected_keyframes) {
		for (const keyframe of deselected_keyframes) {
			this.selected_keyframes.delete(keyframe);
			const change_event = new StateChangeEvent("kf_deselect", { detail: { keyframe } });
			this.state_change_events.dispatchEvent(change_event);
		}
	}
	select_all_keyframes() {
		this.select_keyframes(this.filedata.keyframes);
	}
	deselect_all_keyframes() {
		this.deselect_keyframes([...this.selected_keyframes]);
	}
	/**
	 * 
	 * @param {MAHKeyframeFE} keyframe 
	 * @returns {boolean}
	 */
	is_keyframe_selected(keyframe) {
		return this.selected_keyframes.has(keyframe);
	}


	/**
	 * 
	 * @returns {MAHKeyframeFE[]}
	 */
	get_sorted_keyframes() {
		this.filedata.keyframes.sort((a, b) => a.time - b.time);
		return this.filedata.keyframes;
	}
	/**
	 * 
	 * @returns {MAHKeyframeFE | undefined}
	 */
	get_last_keyframe() {
		return this.get_sorted_keyframes()[this.filedata.keyframes.length - 1];
	}
	/**
	 * 
	 * @returns {MAHKeyframeFE | undefined}
	 */
	get_secondlast_keyframe() {
		return this.get_sorted_keyframes()[this.filedata.keyframes.length - 2];
	}
	/**
	 * 
	 * @param {MAHKeyframeFE} keyframe 
	 */
	get_keyframe_index(keyframe) {
		return this.get_sorted_keyframes().indexOf(keyframe);
	}

	/**
	 * 
	 * @param {MAHKeyframeFE[]} keyframes 
	 */
	delete_keyframes(keyframes) {
		this.deselect_all_keyframes();
		for (const keyframe of keyframes) {
			const index = this.get_keyframe_index(keyframe);
			if (index == -1) throw new TypeError("keyframe not in array");
			this.filedata.keyframes.splice(index, 1);
		}
		return keyframes;
	}






	serialize() {
		return JSON.stringify(this);
	}
	/**
	 * 
	 * @param {string} json_str 
	 * @returns {MAHPatternDesignFE}
	 */
	static deserialize(json_str) {
		const { filename, filedata, undo_states, redo_states, undo_states_size, redo_states_size } = JSON.parse(json_str);
		return new MAHPatternDesignFE(filename, filedata, undo_states, redo_states, undo_states_size, redo_states_size);
	}

	static get LOCAL_STORAGE_KEY() { return "primary_design"; }

	save_to_localstorage() {
		window.localStorage.setItem(MAHPatternDesignFE.LOCAL_STORAGE_KEY, this.serialize());
	}
	static load_from_localstorage() {
		const lssf = window.localStorage.getItem(MAHPatternDesignFE.LOCAL_STORAGE_KEY);
		if (lssf) {
			return this.deserialize(lssf);
		} else {
			return null;
		}
	}
}

/**
 * @implements {MAHKeyframe}
 */
export class MAHKeyframeFE {
	/**
	 * 
	 * @param {MAHKeyframe} keyframe 
	 */
	constructor(keyframe) {
		this.time = keyframe.time;
		this.brush = keyframe.brush;
		this.intensity = keyframe.intensity;
		this.coords = keyframe.coords;
		this.transition = keyframe.transition;
	}
}
/** @type {MAHKeyframe} */
MAHKeyframeFE.default = {
	time: 0.000,
	coords: { x: 0, y: 0, z: 0, },
	intensity: {
		name: "Constant",
		params: {
			value: 1.00
		}
	},
	brush: {
		name: "Point",
		params: {
			size: 1.00
		}
	},
	transition: {
		name: "Linear",
		params: {}
	}
};


const mainsplit = SplitGrid({
	columnGutters: [
		{ track: 1, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.leftcenter")) },
		{ track: 3, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.centerright")) },
	],
	rowGutters: [
		{ track: 1, element: notnull(mainsplitgridDiv.querySelector("div.mainsplitgrid > div.gutter.topbottom")) },
	],
});
const bottomsplit = SplitGrid({
	columnGutters: [
		{ track: 1, element: notnull(document.querySelector("div.bottom > div.gutter.column")) },
	],
});

document.addEventListener("keydown", ev => {
	if (ev.key == "/" || ev.key == "?") alert(`Help:
	ctrl+z to undo
	ctrl+shift+z to redo
	double click on the pattern canvas to create a new control point
	alt+click on a control point to delete it
	`);
	if (ev.key == "z" && ev.ctrlKey && !ev.shiftKey && !ev.altKey) {
		console.log("undo");
		if (primary_design.undo()) {
			//success
		} else {
			//do nothing
		}
	}
	if (ev.key == "Z" && ev.ctrlKey && ev.shiftKey && !ev.altKey) {
		console.log("redo");
		if (primary_design.redo()) {
			//success
		} else {
			//do nothing
		}
	}
});



const primary_design = MAHPatternDesignFE.load_from_localstorage() || new MAHPatternDesignFE("test.json", {
	revision: "0.0.1-alpha.1",
	name: "test",

	direction: "normal",
	duration: 5 * 1000,
	iteration_count: 1,

	projection: "plane",
	update_rate: 1,

	keyframes: [
		{
			time: 0.000,
			coords: {
				x: 250,
				y: 250,
				z: 0,
			},
			intensity: {
				name: "Constant",
				params: {
					value: 1.00
				}
			},
			brush: {
				name: "Point",
				params: {
					size: 1.00
				}
			},
			transition: {
				name: "Linear",
				params: {}
			}
		}
	]
});
primary_design.commit_operation({});
const konva_pattern_stage = new KonvaPatternStage(primary_design, "patternstage", centerDiv);
const konva_timeline_stage = new KonvaTimelineStage(primary_design, "timelinestage", timelineDiv);

// @ts-ignore
window.konva_pattern_stage = konva_pattern_stage;
// @ts-ignore
window.konva_timeline_stage = konva_timeline_stage;
// @ts-ignore
window.primary_design = primary_design;
