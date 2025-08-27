// BUILD: 2025-08-24g (live style swap fixed; editor always emits config-changed)
class ThreeWayEntityRowPro extends HTMLElement {
  static getStubConfig() { return { entity: "", automations: [] }; }
  static getConfigElement() { return document.createElement("threeway-entity-row-pro-editor"); }

  setConfig(cfg) {
    this._cfg = {
      entity: cfg?.entity ?? null,
      name: typeof cfg?.name === "string" ? cfg.name : undefined,
      automations: Array.isArray(cfg?.automations) ? cfg.automations : [],
      service_domain: cfg?.service_domain,
      force_auto_window_ms: cfg?.force_auto_window_ms ?? 5000,
      debug: !!cfg?.debug,

      icon: typeof cfg?.icon === "string" && cfg.icon ? cfg.icon : "mdi:lightbulb",
      auto_icon: typeof cfg?.auto_icon === "string" && cfg.auto_icon ? cfg.auto_icon : "mdi:lightbulb-auto",

      variant: cfg?.variant === "toggle" ? "toggle" : "labeled",
      highlight_labels: cfg?.highlight_labels !== false, // default true

      width: Number.isFinite(cfg?.width) ? cfg.width : 96,
      height: Number.isFinite(cfg?.height) ? cfg.height : 10,
      labels: Array.isArray(cfg?.labels) && cfg.labels.length === 3 ? cfg.labels : ["Off","Auto","On"],
      labeled_right_offset: Number.isFinite(cfg?.labeled_right_offset) ? cfg.labeled_right_offset : 15,

      toggle_width: Number.isFinite(cfg?.toggle_width) ? cfg.toggle_width : 52,
      toggle_height: Number.isFinite(cfg?.toggle_height) ? cfg.toggle_height : 14,
      toggle_knob: Number.isFinite(cfg?.toggle_knob) ? cfg.toggle_knob : 20,
      toggle_right_offset: Number.isFinite(cfg?.toggle_right_offset) ? cfg.toggle_right_offset : 15,
    };

    this.innerHTML = `
      <style>
        .twer-row{display:flex;align-items:center}
        .twer-icon{width:40px;height:24px;display:grid;place-items:center;margin-right:16px}
        .twer-name{flex:1 1 auto;color:var(--primary-text-color);font:inherit}
        .twer-wrap{
          position:relative;
          margin-left:16px;

          /* Themeable colors (with your measured fallbacks) */
          --twer-track-off:  var(--switch-unchecked-track-color, #9d9d9d);
          --twer-knob-off:   var(--switch-unchecked-button-color, #fafafa);
          --twer-track-on:   var(--switch-checked-track-color,   #76d0f9);
          --twer-knob-on:    var(--switch-checked-button-color,  #03a9f4);
          --twer-track-auto: var(--switch-disabled-track-color, #dadada);
          --twer-knob-auto:  var(--primary-color);
        }
        .twer-track{position:absolute;inset:0;border-radius:999px;background:var(--disabled-color);opacity:.35}
        .twer-tick{position:absolute;top:50%;width:2px;height:100%;background:var(--divider-color);opacity:.6;transform:translateY(-50%)}
        .twer-tick.mid{left:calc(50% - 1px)}
        .twer-knob{position:absolute;top:50%;border-radius:50%;
                   transform:translate(-50%,-50%);box-shadow:0 2px 6px rgba(0,0,0,.25);transition:left 160ms ease}
        .twer-zones{position:absolute;inset:-8px 0;display:flex}
        .twer-zone{flex:1 1 0;cursor:pointer}

        .twer-labels{position:absolute;top:calc(100% + 4px);left:0;width:100%;height:12px}
        .twer-labels span{position:absolute;font-size:10px;color:var(--secondary-text-color);line-height:12px;white-space:nowrap}
        .twer-labels .lab0{left:0}
        .twer-labels .lab1{left:50%;transform:translateX(-50%)}
        .twer-labels .lab2{right:0}
        .hl.pos-0 .twer-labels .lab0,
        .hl.pos-1 .twer-labels .lab1,
        .hl.pos-2 .twer-labels .lab2{color:var(--primary-color);font-weight:600}

        .variant-labeled .twer-labels{display:block}
        .variant-toggle  .twer-labels{display:none}

        .twer-empty{opacity:.6}
      </style>
      <div class="twer-row">
        <ha-state-icon class="twer-icon"></ha-state-icon>
        <div class="twer-name"></div>
        <div class="twer-wrap">
          <div class="twer-track"></div>
          <div class="twer-tick mid"></div>
          <div class="twer-knob"></div>
          <div class="twer-zones">
            <div class="twer-zone" data-v="0" title="${this._cfg.labels[0]}"></div>
            <div class="twer-zone" data-v="1" title="${this._cfg.labels[1]}"></div>
            <div class="twer-zone" data-v="2" title="${this._cfg.labels[2]}"></div>
          </div>
          <div class="twer-labels">
            <span class="lab0">${this._cfg.labels[0]}</span>
            <span class="lab1">${this._cfg.labels[1]}</span>
            <span class="lab2">${this._cfg.labels[2]}</span>
          </div>
        </div>
      </div>
    `;

    this._rowEl = this.querySelector(".twer-row");
    this._icon  = this.querySelector(".twer-icon");
    this._name  = this.querySelector(".twer-name");
    this._wrap  = this.querySelector(".twer-wrap");
    this._knob  = this.querySelector(".twer-knob");
    this._track = this.querySelector(".twer-track");

    this.querySelectorAll(".twer-zone").forEach(z =>
      z.addEventListener("click", e => this._setMode(Number(e.currentTarget.dataset.v)))
    );

    this._rowEl.classList.toggle("hl", this._cfg.highlight_labels && this._cfg.variant === "labeled");
    if (!this._cfg.entity || !this._cfg.automations?.length) this._rowEl.classList.add("twer-empty"); else this._rowEl.classList.remove("twer-empty");

    this._curVariant = this._cfg.variant;
    this._lastMode = -1;            // force first paint
    this._pendingAutoUntil = 0;

    this._applyVariantGeometry();   // apply immediately
  }

  _applyVariantGeometry() {
    const v = this._cfg.variant;
    this._rowEl.classList.toggle("variant-labeled", v === "labeled");
    this._rowEl.classList.toggle("variant-toggle",  v === "toggle");

    if (v === "labeled") {
      this._wrap.style.width       = `${this._cfg.width}px`;
      this._wrap.style.height      = `${this._cfg.height}px`;
      this._wrap.style.marginRight = `${this._cfg.labeled_right_offset}px`;
      this._knob.style.width = `18px`; this._knob.style.height = `18px`;
    } else {
      this._wrap.style.width       = `${this._cfg.toggle_width}px`;
      this._wrap.style.height      = `${this._cfg.toggle_height}px`;
      this._wrap.style.marginRight = `${this._cfg.toggle_right_offset}px`;
      this._knob.style.width = `${this._cfg.toggle_knob}px`; this._knob.style.height = `${this._cfg.toggle_knob}px`;
    }
  }

  getCardSize(){ return 1; }

  set hass(hass) {
    this._hass = hass;

    // Live: if editor changed style, re-apply geometry + classes
    if (this._curVariant !== this._cfg.variant) {
      this._curVariant = this._cfg.variant;
      this._applyVariantGeometry();
    }
    this._rowEl?.classList.toggle("hl", this._cfg.highlight_labels && this._cfg.variant === "labeled");

    const id = this._cfg.entity;
    const ent = id ? hass?.states?.[id] : undefined;
    if (!ent) return;

    const name = this._cfg.name ?? (ent.attributes.friendly_name || "");
    if (this._name.textContent !== name) this._name.textContent = name;

    const autos = Array.isArray(this._cfg.automations) ? this._cfg.automations : [];
    const autoStates = autos.map(aid => hass.states[aid]?.state ?? "na");
    const now = Date.now();
    const inHold = now < this._pendingAutoUntil;
    const allOn = autos.length > 0 && autoStates.every(s => s === "on");
    const anyOff = autoStates.includes("off");
    const anyPending = autoStates.some(s => s === "na" || s === "unknown" || s === "unavailable");
    const entityState = ent.state;

    const mode = allOn ? 1 : ((inHold && !anyOff) || (this._lastMode === 1 && anyPending)) ? 1 : (entityState === "on" ? 2 : 0);
    this._applyColors(mode, entityState);

    this._icon.icon = mode === 1 ? this._cfg.auto_icon : this._cfg.icon;
    const css = getComputedStyle(document.documentElement);
    const cOn  = css.getPropertyValue("--state-active-color") || "#fdd835";
    const cOff = css.getPropertyValue("--state-icon-color")   || "#44739e";
    const cDis = css.getPropertyValue("--disabled-color")     || "#9e9e9e";
    this._icon.style.color = entityState === "on" ? cOn : (entityState === "off" ? cOff : cDis);

    // Always update knob + label class (so preview reacts even with no state change)
    this._positionKnob(mode);
    this._rowEl.classList.remove("pos-0","pos-1","pos-2");
    this._rowEl.classList.add(`pos-${mode}`);
    this._lastMode = mode;
  }

  _applyColors(mode, entityState) {
    // mode: 0=Off, 1=Auto, 2=On
    const key = (mode === 1) ? "auto" : (entityState === "on" ? "on" : "off");
    if (this._track) this._track.style.background = `var(--twer-track-${key})`;
    if (this._knob)  this._knob.style.background  = `var(--twer-knob-${key})`;
  }
  _trackWidth(){ return this._cfg.variant === "toggle" ? this._cfg.toggle_width : this._cfg.width; }
  _domain(){
    const d = String(this._cfg.entity || "").split(".")[0];
    return ["switch","light","fan","input_boolean"].includes(d) ? d : (this._cfg.service_domain || "homeassistant");
  }
  _positionKnob(v){
    const w = this._trackWidth();
    this._knob.style.left = (v===0 ? "0px" : (v===1 ? `${w/2}px` : `${w}px`));
  }

  async _setMode(v){
    if (!this._hass) return;
    if (v === this._lastMode) return;
    const hass = this._hass;
    const id = this._cfg.entity; if (!id) return;
    const autos = Array.isArray(this._cfg.automations) ? this._cfg.automations : [];
    const domain = this._domain();
    try {
      if (v === 1) {
        this._pendingAutoUntil = Date.now() + this._cfg.force_auto_window_ms;
        this._positionKnob(1);
        this._rowEl.classList.remove("pos-0","pos-1","pos-2"); this._rowEl.classList.add("pos-1");
        this._lastMode = 1;
        if (autos.length) hass.callService("automation","turn_on",{ entity_id: autos });
      } else if (v === 0) {
        if (autos.length) await hass.callService("automation","turn_off",{ entity_id: autos });
        await hass.callService(domain,"turn_off",{ entity_id: id });
        this._pendingAutoUntil = 0;
        this._positionKnob(0);
        this._rowEl.classList.remove("pos-0","pos-1","pos-2"); this._rowEl.classList.add("pos-0");
        this._lastMode = 0;
      } else if (v === 2) {
        if (autos.length) await hass.callService("automation","turn_off",{ entity_id: autos });
        await hass.callService(domain,"turn_on",{ entity_id: id });
        this._pendingAutoUntil = 0;
        this._positionKnob(2);
        this._rowEl.classList.remove("pos-0","pos-1","pos-2"); this._rowEl.classList.add("pos-2");
        this._lastMode = 2;
      }
    } catch(e){ console.error("threeway-entity-row-pro:", e); }
  }
}

/* -------- Visual editor (ha-form; conditional fields; defaults; Name) -------- */
class ThreeWayEntityRowProEditor extends HTMLElement {
  setConfig(config) { this._config = { ...config }; this._render(); }
  set hass(hass) { this._hass = hass; if (this._form) this._form.hass = hass; }

  _defaults(){
    return {
      name: "",
      icon: "mdi:lightbulb",
      auto_icon: "mdi:lightbulb-auto",
      variant: "labeled",
      highlight_labels: true,
      width: 96, height: 10, labeled_right_offset: 15,
      toggle_width: 52, toggle_height: 14, toggle_knob: 20, toggle_right_offset: 15,
      force_auto_window_ms: 5000, debug: false,
    };
  }

  _buildSchema(variant){
    const base = [
      { name:"name", label:"Name (optional)", selector:{ text:{} } },
      { name:"entity", label:"Entity", selector:{ entity:{ multiple:false, domain:["switch","light","fan","input_boolean"] } } },
      { name:"automations", label:"Linked automations", selector:{ entity:{ multiple:true, domain:["automation"] } } },
      { name:"icon", label:"Icon (Manual)", selector:{ icon:{} } },
      { name:"auto_icon", label:"Auto icon", selector:{ icon:{} } },
      { name:"variant", label:"Slider style", selector:{ select:{ options:[
        { value:"labeled", label:"Labeled (Off / Auto / On)" },
        { value:"toggle",  label:"Toggle-like" }
      ] } } },
    ];
    const labeled = [
      { name:"highlight_labels", label:"Highlight active label", selector:{ boolean:{} } },
      { name:"width",  label:"Labeled: track width (px)",  selector:{ number:{ min:48, max:240, mode:"box" } } },
      { name:"height", label:"Labeled: track height (px)", selector:{ number:{ min:6,  max:24,  mode:"box" } } },
      { name:"labeled_right_offset", label:"Labeled: right offset (px)", selector:{ number:{ min:0, max:40, mode:"box" } } },
    ];
    const toggle = [
      { name:"toggle_width",  label:"Toggle: track width (px)", selector:{ number:{ min:40, max:120, mode:"box" } } },
      { name:"toggle_height", label:"Toggle: track height (px)", selector:{ number:{ min:10, max:24, mode:"box" } } },
      { name:"toggle_knob",   label:"Toggle: knob size (px)",   selector:{ number:{ min:16, max:28, mode:"box" } } },
      { name:"toggle_right_offset", label:"Toggle: right offset (px)", selector:{ number:{ min:0, max:40, mode:"box" } } },
    ];
    const adv = [
      { name:"force_auto_window_ms", label:"Sticky Auto window (ms)", selector:{ number:{ min:1000, max:15000, step:100, mode:"box" } } },
      { name:"debug", label:"Debug logs", selector:{ boolean:{} } },
    ];
    return variant==="toggle" ? [...base, ...toggle, ...adv] : [...base, ...labeled, ...adv];
  }

  _render(){
    const defaults = this._defaults();
    const data = { ...defaults, ...this._config };
    const variant = data.variant === "toggle" ? "toggle" : "labeled";
    const schema = this._buildSchema(variant);

    this.innerHTML = "";
    const form = document.createElement("ha-form");
    form.schema = schema;
    form.data = data;
    form.hass = this._hass;
    form.computeLabel = (s)=> s.label || s.name;

    // ✅ Always emit config-changed; rebuild if style changed so preview updates
    form.addEventListener("value-changed", (e)=>{
      const prevVariant = this._config?.variant ?? defaults.variant;
      this._config = e.detail.value;
      this.dispatchEvent(new CustomEvent("config-changed", { detail:{ config: this._config } }));
      if (this._config.variant !== prevVariant) { this._render(); }
    });

    this._form = form;
    this.appendChild(form);
  }
}

if (!customElements.get("threeway-entity-row-pro")) {
  customElements.define("threeway-entity-row-pro", ThreeWayEntityRowPro);
}
if (!customElements.get("threeway-entity-row-pro-editor")) {
  customElements.define("threeway-entity-row-pro-editor", ThreeWayEntityRowProEditor);
}
window.customCards = window.customCards || [];
window.customCards.push({
  type:"threeway-entity-row-pro",
  name:"Three-way Entity Row Pro",
  description:"Off / Auto / On row with linked automations (explicit list, sticky Auto) + visual editor",
});
