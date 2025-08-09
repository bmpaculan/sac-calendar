(function () {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <style>
      :host{display:block;font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif;padding:10px;color:#1f2937}
      fieldset{border:1px solid #d9dee2;border-radius:8px;padding:10px;margin:0;background:#fff}
      legend{font-weight:600;padding:0 6px}
      .row{display:flex;gap:10px;align-items:center;margin:8px 0}
      .row label{min-width:180px;font-size:.9rem;color:#374151}
      input[type="color"]{width:120px;height:36px;border-radius:8px;border:1px solid #c7d0d9;background:#fff}
      .hint{font-size:.8rem;color:#6b7280;margin-top:4px}
    </style>

    <form id="form" autocomplete="off">
      <fieldset>
        <legend>Calendar Styling</legend>
        <div class="row"><label for="style_headerBg">Header Background</label><input id="style_headerBg" type="color" value="#f7f9fb"/></div>
        <div class="row"><label for="style_cardBg">Card Background</label><input id="style_cardBg" type="color" value="#ffffff"/></div>
        <div class="row"><label for="style_border">Border Color</label><input id="style_border" type="color" value="#d9dee2"/></div>
        <div class="row"><label for="style_text">Text Color</label><input id="style_text" type="color" value="#37474f"/></div>
        <div class="hint">These update CSS variables used by the main widget.</div>
      </fieldset>
    </form>
  `;

  class CalendarStyling extends HTMLElement {
    constructor(){
      super();
      this._shadow = this.attachShadow({mode:'open'});
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this.$ = id => this._shadow.getElementById(id);
      this._wired = false;
    }
    onCustomWidgetBeforeUpdate(changed){ Object.assign(this, changed); }
    onCustomWidgetAfterUpdate(){
      ["style_headerBg","style_cardBg","style_border","style_text"].forEach(k=>{
        if (this[k]) this.$(k).value = this[k];
      });
      if (this._wired) return; this._wired = true;

      const fire = () => this.dispatchEvent(new CustomEvent("styleChanged", { detail: {
        styles: {
          style_headerBg: this.$("style_headerBg").value,
          style_cardBg:   this.$("style_cardBg").value,
          style_border:   this.$("style_border").value,
          style_text:     this.$("style_text").value
        } } }));
      ["style_headerBg","style_cardBg","style_border","style_text"].forEach(id=>{
        this.$(id).addEventListener("input", fire);
        this.$(id).addEventListener("change", fire);
      });
    }
    onCustomWidgetDestroy(){}
  }
  customElements.define("com-example-sac-calendar-styling", CalendarStyling);
})();
