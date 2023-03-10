/** @typedef {import("./fe/patterndesign.mjs").MAHPatternDesignFE} MAHPatternDesignFE */

import { notnull } from "./util.mjs";


export class ParameterEditor {
	/**
	 *
	 * @param {MAHPatternDesignFE} pattern_design
	 * @param {HTMLDivElement} patterneditor_div
	 */
	constructor(pattern_design, patterneditor_div) {
		this._pattern_design = pattern_design;
		this._patterneditor_div = patterneditor_div;

		{ //init timecontrol
			this._timecontrol_div = notnull(document.querySelector("div.timecontrol"));
			this._timecontrol_input = notnull(this._timecontrol_div.querySelector("input"));
			this._timecontrol_input.addEventListener("input", _ev => {
				const v = parseFloat(this._timecontrol_input.value);
				if (Number.isFinite(v)) {
					this._pattern_design.update_pattern_time(Math.max(v, 0));
				} else {
					this._timecontrol_input.value = this._pattern_design.evaluator_params.time.toFixed(0);
				}
			});
			/** @type {HTMLButtonElement} */
			this._timecontrol_play = notnull(this._timecontrol_div.querySelector("button.play"));
			/** @type {HTMLButtonElement} */
			this._timecontrol_pause = notnull(this._timecontrol_div.querySelector("button.pause"));
			/** @type {HTMLButtonElement} */
			this._timecontrol_reset = notnull(this._timecontrol_div.querySelector("button.reset"));

			this._timecontrol_play.addEventListener("click", _ev => {
				this._pattern_design.update_playstart(Date.now() - this._pattern_design.evaluator_params.time);
			});
			this._timecontrol_pause.addEventListener("click", _ev => {
				this._pattern_design.update_playstart(0);
			});
			this._timecontrol_reset.addEventListener("click", _ev => {
				this._pattern_design.update_playstart(0);
				this._pattern_design.update_pattern_time(0);
			});
		}


		// for (const [key, val] of pattern_design.evaluator_params.user_parameters) {
		// 	throw new Error("TODO");
		// }


		this._pattern_design.state_change_events.addEventListener("parameters_update", () => {
			this.update_controls();
		});
		this._pattern_design.state_change_events.addEventListener("playstart_update", () => {
			this.update_controls();
		});

		this.update_controls();
	}

	// append_param_control(key, val) {
	// 	const control_div = document.createElement("div");
	// 	throw new Error("TODO");
	// 	this.patterneditorDiv.appendChild(control_div);
	// }

	update_controls() {
		this._timecontrol_input.value = this._pattern_design.evaluator_params.time.toFixed(0);
		if (this._pattern_design.is_playing()) {
			this._timecontrol_play.style.display = "none";
			this._timecontrol_pause.style.display = "";
		} else {
			this._timecontrol_play.style.display = "";
			this._timecontrol_pause.style.display = "none";
		}
	}

}