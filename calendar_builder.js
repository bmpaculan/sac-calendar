(function () {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <style>
      :host{display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;padding:10px;color:#1f2937}
      fieldset{border:1px solid #d9dee2;border-radius:8px;padding:10px;margin:0 0 12px;background:#fff}
      legend{font-weight:600;padding:0 6px}
      .row{display:flex;gap:10px;align-items:center;margin:8px 0}
      .row label{min-width:180px;font-size:.9rem;color:#374151}
      input[type="checkbox"]{transform:translateY(1px)}
      textarea{width:100%;min-height:92px;resize:vertical;border:1px solid #c7d0d9;border-radius:8px;padding:8px 10px;font-family:ui-monospace,Consolas,Menlo,monospace}
      .hint{font-size:.8rem;color:#6b7280}
    </style>

    <form id="form" autocomplete="off">
      <fieldset>
        <legend>Calendar</legend>
        <div class="row"><label for="darkMode">Dark Mode</label><input id="darkMode" type="checkbox"/></div>
      </fieldset>

      <fieldset>
        <legend>Legend</legend>
        <div class="row"><label for="autoLegend">Auto Legend (from Status)</label><input id="autoLegend" type="checkbox"/></div>
        <div class="row"><label for="statusInfoJson">Overrides (status → #hex)</label><textarea id="statusInfoJson" spellcheck="false">{}</textarea></div>
        <div class="row"><label for="paletteJson">Palette (array of colors)</label><textarea id="paletteJson" spellcheck="false">[]</textarea></div>
        <div class="hint">Statuses not listed in Overrides get colors from the palette.</div>
      </fieldset>
    </form>
  `;

  class CalendarBuilder extends HTMLElement {
    constructor(){
      super();
      this._shadow = this.attachShadow({mode:'open'});
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this.$ = id => this._shadow.getElementById(id);
      this._wired = false;
    }
    onCustomWidgetBeforeUpdate(changed){ Object.assign(this, changed); }
    onCustomWidgetAfterUpdate(){
      this.$("darkMode").checked      = !!this.darkMode;
      this.$("autoLegend").checked    = (this.autoLegend !== false);
      this.$("statusInfoJson").value  = this.statusInfoJson || "{}";
      this.$("paletteJson").value     = this.paletteJson || "[]";

      if (this._wired) return; this._wired = true;
      const fire = () => this.dispatchEvent(new CustomEvent("propertiesChanged", { detail: {
        properties: {
          darkMode:       this.$("darkMode").checked,
          autoLegend:     this.$("autoLegend").checked,
          statusInfoJson: this.$("statusInfoJson").value,
          paletteJson:    this.$("paletteJson").value
        } } }));
      ["darkMode","autoLegend"].forEach(id=> this.$(id).addEventListener("change", fire));
      ["statusInfoJson","paletteJson"].forEach(id=>{
        this.$(id).addEventListener("change", fire); this.$(id).addEventListener("blur", fire);
      });
    }
    onCustomWidgetDestroy(){}
  }
  customElements.define("com-example-sac-calendar-builder", CalendarBuilder);
})();
