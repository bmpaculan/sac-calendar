(function () {
  const tpl = document.createElement("template");
  tpl.innerHTML = `
    <style>
      :host{display:block;font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:10px}
      fieldset{border:1px solid #d9dee2;border-radius:8px;padding:10px;margin:0}
      legend{font-weight:600}
      .row{display:flex;gap:8px;align-items:center;margin:6px 0}
      .row label{min-width:150px;font-size:.9rem;color:#394b59}
      input[type="color"]{width:120px;height:32px;border-radius:6px;border:1px solid #c7d0d9}
    </style>
    <form id="form">
      <fieldset>
        <legend>Calendar Styling</legend>
        <div class="row"><label>Header Background</label><input id="style_headerBg" type="color" value="#f7f9fb"></div>
        <div class="row"><label>Card Background</label><input id="style_cardBg" type="color" value="#ffffff"></div>
        <div class="row"><label>Border Color</label><input id="style_border" type="color" value="#d9dee2"></div>
        <div class="row"><label>Text Color</label><input id="style_text" type="color" value="#37474f"></div>
      </fieldset>
    </form>
  `;

  class CalendarStyling extends HTMLElement {
    constructor(){
      super();
      this._shadow = this.attachShadow({mode:'open'});
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this.$ = (id)=>this._shadow.getElementById(id);
    }

    onCustomWidgetBeforeUpdate(changed){ Object.assign(this, changed); }

    onCustomWidgetAfterUpdate(){
      ["style_headerBg","style_cardBg","style_border","style_text"].forEach(k=>{
        if (this[k]) this.$(k).value = this[k];
        this.$(k).addEventListener("input", ()=>this._send());
        this.$(k).addEventListener("change", ()=>this._send());
      });
    }

    _send(){
      const styles = {
        style_headerBg: this.$("style_headerBg").value,
        style_cardBg:   this.$("style_cardBg").value,
        style_border:   this.$("style_border").value,
        style_text:     this.$("style_text").value
      };
      this.dispatchEvent(new CustomEvent("styleChanged", { detail: { styles } }));
    }

    onCustomWidgetDestroy(){}
  }

  customElements.define("com-example-sac-calendar-styling", CalendarStyling);
})();
