(function () {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <style>
      :host{display:block;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:10px}
      fieldset{border:1px solid #d9dee2;border-radius:8px;padding:10px;margin:0 0 10px}
      legend{font-weight:600}
      .row{display:flex;gap:8px;align-items:center;margin:6px 0}
      .row label{min-width:150px;font-size:.9rem;color:#394b59}
      input[type="text"], input[type="month"], textarea{
        width:100%; padding:6px 8px; border:1px solid #c7d0d9; border-radius:6px; font:inherit;
      }
      textarea{min-height:80px;font-family:ui-monospace,Consolas,monospace}
      .grid{display:grid;grid-template-columns:1fr;gap:6px}
    </style>
    <form id="form">
      <fieldset>
        <legend>Calendar Settings</legend>
        <div class="grid">
          <div class="row"><label>Employee Name</label><input id="employeeName" type="text" placeholder="e.g. Bryan Paculan"></div>
          <div class="row"><label>Start Month (YYYY-MM)</label><input id="startMonth" type="month" placeholder="auto from data"></div>
          <div class="row"><label>End Month (YYYY-MM)</label><input id="endMonth" type="month" placeholder="auto from data"></div>
          <div class="row"><label>Dark Mode</label><input id="darkMode" type="checkbox"></div>
        </div>
      </fieldset>

      <fieldset>
        <legend>Legend</legend>
        <div class="row"><label>Auto Legend (from data)</label><input id="autoLegend" type="checkbox"></div>
        <div class="row"><label>Overrides (statusInfoJson)</label>
          <textarea id="statusInfoJson" spellcheck="false" placeholder='{"Rostered Shift":"#66bb6a","AL":"#ffa726"}'></textarea>
        </div>
        <div class="row"><label>Palette (paletteJson)</label>
          <textarea id="paletteJson" spellcheck="false" placeholder='["#66bb6a","#e57373","#64b5f6","#ffb74d"]'></textarea>
        </div>
      </fieldset>

      <fieldset>
        <legend>Manual Data (optional)</legend>
        <div class="row"><label>daysJson (YYYY-MM-DD → Status)</label>
          <textarea id="daysJson" spellcheck="false" placeholder='{"2025-08-12":"Rostered Shift","2025-08-13":"Unplanned Leave"}'></textarea>
        </div>
      </fieldset>
    </form>
  `;

  class CalendarBuilder extends HTMLElement {
    constructor(){
      super();
      this._shadow = this.attachShadow({mode:'open'});
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this.$ = (id)=>this._shadow.getElementById(id);
    }

    onCustomWidgetBeforeUpdate(changed){ Object.assign(this, changed); }

    onCustomWidgetAfterUpdate(){
      this.$("employeeName").value = this.employeeName || "Employee";
      this.$("startMonth").value   = this.startMonth || "";
      this.$("endMonth").value     = this.endMonth   || "";
      this.$("darkMode").checked   = !!this.darkMode;

      this.$("autoLegend").checked = (this.autoLegend !== false);
      this.$("statusInfoJson").value = this.statusInfoJson || "{}";
      this.$("paletteJson").value    = this.paletteJson || "[]";
      this.$("daysJson").value       = this.daysJson || "{}";

      if (this._wired) return;
      this._wired = true;

      ["employeeName","startMonth","endMonth","statusInfoJson","paletteJson","daysJson"].forEach(id=>{
        this.$(id).addEventListener("change", ()=>this._fire());
        this.$(id).addEventListener("blur", ()=>this._fire());
      });
      ["darkMode","autoLegend"].forEach(id=>{
        this.$(id).addEventListener("change", ()=>this._fire());
      });
    }

    _fire(){
      const props = {
        employeeName: this.$("employeeName").value,
        startMonth: this.$("startMonth").value,
        endMonth: this.$("endMonth").value,
        darkMode: this.$("darkMode").checked,

        autoLegend: this.$("autoLegend").checked,
        statusInfoJson: this.$("statusInfoJson").value,
        paletteJson: this.$("paletteJson").value,

        daysJson: this.$("daysJson").value
      };
      this.dispatchEvent(new CustomEvent("propertiesChanged", { detail: { properties: props }}));
    }

    onCustomWidgetDestroy(){}
  }

  customElements.define("com-example-sac-calendar-builder", CalendarBuilder);
})();
