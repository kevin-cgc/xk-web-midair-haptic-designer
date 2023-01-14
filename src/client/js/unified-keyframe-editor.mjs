/** @typedef {import("./fe/keyframes/index.mjs").MAHKeyframeFE} MAHKeyframeFE */
/** @typedef {import("./fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */
/** @typedef {import("../../shared/types").MidAirHapticsAnimationFileFormat} MidAirHapticsAnimationFileFormat */
/** @typedef {import("../../shared/types").MAHKeyframe} MAHKeyframe */

import { has_brush, has_coords, has_intensity } from "./fe/keyframes/index.mjs";
import { notnull } from "./util.mjs";

export class UnifiedKeyframeEditor {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {HTMLDivElement} unifiedkeyframeeditorDiv
	 */
	constructor(pattern_design, unifiedkeyframeeditorDiv) {
		this.pattern_design = pattern_design;
		this.unifiedkeyframeeditorDiv = unifiedkeyframeeditorDiv;

		this.pattern_design.state_change_events.addEventListener("rerender", _ev => this.select_update());
		this.pattern_design.state_change_events.addEventListener("kf_reorder", _ev => this.select_update());
		this.pattern_design.state_change_events.addEventListener("kf_select", _ev => this.select_update());
		this.pattern_design.state_change_events.addEventListener("kf_update", ev => {
			if (this.pattern_design.selected_keyframes.has(ev.detail.keyframe)) this.select_update();
		});
		this.pattern_design.state_change_events.addEventListener("kf_deselect", _ev => this.select_update());

		this.ukfeForm = notnull(this.unifiedkeyframeeditorDiv.querySelector("form"));
		this.ukfeForm.addEventListener("submit", ev => {
			ev.preventDefault();
		});
		// this.ukfeForm.addEventListener("focusin", ev => {
		// this.ukfeForm.addEventListener("focusout", ev => {
		notnull(this.ukfeForm.querySelector("div.typecontainer")).addEventListener("change", _ev => {
			this.on_type_change();
		});
		/** @type {HTMLDetailsElement} */
		this.coords_details = notnull(this.ukfeForm.querySelector("details.coords"));
		this.coords_inputs = notnull(this.coords_details.querySelector(".coordsconfig")).querySelectorAll("input");
		this.coords_transition_select = /** @type {HTMLSelectElement} */(this.coords_details.querySelector("div.transitionconfig select"));

		/** @type {HTMLDetailsElement} */
		this.brush_details = notnull(this.ukfeForm.querySelector("details.brush"));
		this.brush_type_select = notnull(this.brush_details.querySelector("select"));
		this.brush_inputs = notnull(this.brush_details.querySelector(".brushconfig")).querySelectorAll("input");
		this.brush_transition_select = /** @type {HTMLSelectElement} */(this.brush_details.querySelector("div.transitionconfig select"));

		/** @type {HTMLDetailsElement} */
		this.intensity_details = notnull(this.ukfeForm.querySelector("details.intensity"));

		this.coords_details.addEventListener("change", _ev => {
			this.on_coords_change();
		});
		this.brush_details.addEventListener("change", _ev => {
			this.on_brush_change();
		});
		this.intensity_details.addEventListener("change", _ev => {
			this.on_intensity_change();
		});



		/** @type {HTMLSelectElement} */
		this.keyframe_type_select = notnull(this.unifiedkeyframeeditorDiv.querySelector("select.keyframe.type"));


		this.select_update();
	}



	/**
	 * @template T
	 * @template F
	 * @param {T[]} keyframes
	 * @param {(arg0: T) => F} map_to_field
	 * @returns {F | null}
	 */
	get_if_field_identical(keyframes, map_to_field) {
		const fa = keyframes.map(map_to_field);
		if (fa.every(v => v == fa[0])) return fa[0];
		else return null;
	}


	select_update() {
		const selected = [...this.pattern_design.selected_keyframes];
		if (selected.length == 0) return this.unifiedkeyframeeditorDiv.classList.add("showhelp");
		else this.unifiedkeyframeeditorDiv.classList.remove("showhelp");


		const selected_type = this.get_if_field_identical(selected, kf => kf.type);
		this.keyframe_type_select.value = selected_type || "multipletypes";



		const common_fields = new Set(["coords", "brush", "intensity"]);
		for (const field of common_fields) {
			/** @type {HTMLDetailsElement} */
			const field_details = notnull(this.ukfeForm.querySelector(`details.${field}`));
			field_details.style.display = "none";
		}
		for (const kf of selected) {
			for (const common_field of common_fields) {
				if (common_field in kf) continue;
				else common_fields.delete(common_field);
			}
		}

		if (common_fields.has("coords")) {
			this.coords_details.style.display = "";
			const for_type_check = selected.filter(has_coords);

			this.coords_inputs.forEach(i => i.value = this.get_if_field_identical(for_type_check, kf => kf.coords.coords[i.name]));

			const selected_transition = this.get_if_field_identical(for_type_check, kf => kf.coords.transition.name);
			this.coords_transition_select.value = selected_transition || "multipletypes";
		}
		if (common_fields.has("brush")) {
			this.brush_details.style.display = "";
			const for_type_check = selected.filter(has_brush);

			const brush_type = this.get_if_field_identical(for_type_check, kf => kf.brush?.brush.name || "omitted");
			this.brush_type_select.value = brush_type || "multipletypes";

			this.brush_inputs.forEach(i => {
				const parent_label = notnull(i.parentElement);
				if (for_type_check.find(kf => kf.brush?.brush.params[i.name] == undefined)) parent_label.style.display = "none";
				else {
					parent_label.style.display = "";
					const val = this.get_if_field_identical(for_type_check, kf => kf.brush?.brush.params[i.name]);
					i.value = val;
				}
			});

			const transition_div = /** @type {HTMLDivElement} */ (this.brush_details.querySelector("div.transition"));
			if (for_type_check.find(kf => kf.brush == undefined)) transition_div.style.display = "none";
			else {
				transition_div.style.display = "";
				const selected_transition = this.get_if_field_identical(for_type_check, kf => kf.brush?.transition.name);
				this.brush_transition_select.value = selected_transition || "multipletypes";
			}
		}
		if (common_fields.has("intensity")) {
			this.intensity_details.style.display = "";
			const for_type_check = selected.filter(has_intensity);

		}
	}


	on_type_change() {
		this.pattern_design.save_state();

		const new_type = this.keyframe_type_select.value;
		const selected = [...this.pattern_design.selected_keyframes];
		const deleted_keyframes = this.pattern_design.delete_keyframes(selected);
		const new_keyframes = deleted_keyframes.map(dkf => this.pattern_design.insert_new_keyframe({
			...dkf,
			//@ts-ignore
			type: new_type
		}));

		this.pattern_design.commit_operation({ deleted_keyframes, new_keyframes });
		this.pattern_design.select_keyframes(new_keyframes);
	}
	on_coords_change() {
		this.pattern_design.save_state();

		const keyframes = [...this.pattern_design.selected_keyframes].filter(has_coords); //filter for type_check;
		this.coords_inputs.forEach(i => keyframes.forEach(kf => kf.coords[i.name] = Math.min(Math.max(parseFloat(i.value), 0), 500)));
		// @ts-ignore
		keyframes.forEach(kf => kf.coords.transition.name = this.coords_transition_select.value);

		this.pattern_design.commit_operation({ updated_keyframes: keyframes });
	}
	on_brush_change() {
		this.pattern_design.save_state();

		const keyframes = [...this.pattern_design.selected_keyframes].filter(has_brush); //filter for type_check;
		// keyframes.forEach(kf => kf.brush.brush.name = this.brush_type_select.value);

		const kf = keyframes[0];
		if (kf.brush) {
			kf.brush.brush.name = "point";
			kf.brush.brush.params
		}

		// @ts-ignore
		keyframes.forEach(kf => { if (kf.brush) kf.brush.transition.name = this.brush_transition_select.value; });


		this.pattern_design.commit_operation();
	}
	on_intensity_change() {
		this.pattern_design.save_state();

		this.pattern_design.commit_operation();
	}

}