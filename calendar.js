(function(){
  // ---------- Template & Styles ----------
  const tpl = document.createElement('template');
  tpl.innerHTML = `
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      :host {
        display: block;
        font-family: system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial,"Noto Sans",sans-serif;
        color: var(--ink, #37474f);
      }
      .wrap{max-width: 100%; padding: 0;}
      .controls{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:10px}
      .legend{display:flex;gap:12px;flex-wrap:wrap}
      .key{display:flex;align-items:center;gap:6px;font-size:.85rem;opacity:.95}
      .swatch{width:12px;height:12px;border-radius:3px;border:1px solid rgba(0,0,0,.12)}
      .title{font-size:.9rem;font-weight:600;margin:0 8px 0 0}

      .calendars{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));}
      .cal{border:1px solid var(--bdr,#d9dee2);border-radius:12px;overflow:hidden;background:var(--bg,#fff);display:flex;flex-direction:column;max-width:100%}
      .cal-header{display:flex;align-items:center;padding:8px 10px;background:var(--hd,#f7f9fb);
        border-bottom:1px solid var(--bdr,#d9dee2);font-weight:600}
      .grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));width:100%;}
      .dow{background:var(--hd,#fcfdff);color:var(--mut,#607d8b);font-size:.72rem;text-transform:uppercase;
        letter-spacing:.04em;padding:6px;border-bottom:1px solid var(--sub,#eceff1);text-align:center;min-width:0}
      .cell{min-height:36px;position:relative;border-right:1px solid var(--sub,#eceff1);
        border-bottom:1px solid var(--sub,#eceff1);padding:4px;display:flex;align-items:flex-start;justify-content:flex-end;min-width:0}
      .cell:nth-child(7n){border-right:none}
      .date{font-size:.78rem;color:var(--ink,#37474f);background:rgba(255,255,255,.85);padding:1px 5px;border-radius:6px}
      .cell.outside{background:var(--out,#fafafa);color:#9e9e9e}
      .cell[title]{cursor:default}

      /* Dark mode */
      :host([dark]) .cal{background:#0f171d;border-color:#20303b}
      :host([dark]) .cal-header{background:#0b141a;border-bottom-color:#20303b}
      :host([dark]) .dow{background:#0b141a;border-bottom-color:#20303b;color:#93a4b3}
      :host([dark]) .cell{border-color:#20303b}
      :host([dark]) .cell.outside{background:#0c1218;color:#6e7e8d}
      :host([dark]) .date{color:#e3eef6;background:rgba(20,28,35,.85)}
    </style>
    <div class="wrap">
      <div class="controls">
        <div class="title" id="empName"></div>
        <div class="legend" id="legend"></div>
      </div>
      <div class="calendars" id="calendars"></div>
    </div>
  `;

  // ---------- Utils ----------
  const pad2 = n => String(n).padStart(2,"0");
  const monthName = (y,m) => new Date(y,m,1).toLocaleString(undefined,{month:"long",year:"numeric"});
  const daysInMonth = (y,m) => new Date(y,m+1,0).getDate();
  const firstWeekdayIndex = (y,m) => new Date(y,m,1).getDay();
  const clamp01 = x => Math.max(0, Math.min(1, x));

  function toISODate(value){
    if (value instanceof Date) return `${value.getFullYear()}-${pad2(value.getMonth()+1)}-${pad2(value.getDate())}`;
    if (typeof value !== "string") return null;
    const s = value.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const mIso = s.match(/^(\d{4}-\d{2}-\d{2})/);
    if (mIso) return mIso[1];
    const mUS = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (mUS) return `${mUS[3]}-${pad2(+mUS[1])}-${pad2(+mUS[2])}`;
    return null;
  }

  function tint(hex, alpha=0.22){
    const h = (hex||"#999").replace("#","");
    const r = parseInt(h.slice(0,2),16), g = parseInt(h.slice(2,4),16), b = parseInt(h.slice(4,6),16);
    const a = clamp01(alpha);
    return `rgba(${r},${g},${b},${a})`;
  }

  function monthRangeFromPropsOrData(startMonth, endMonth, daysMap){
    if (startMonth && endMonth) {
      return rangeMonths(startMonth, endMonth);
    }
    // derive from data
    const dates = Object.keys(daysMap).sort();
    if (!dates.length) return [];
    const s = dates[0].slice(0,7);
    const e = dates[dates.length-1].slice(0,7);
    return rangeMonths(s, e);
  }

  function rangeMonths(startYYYYMM, endYYYYMM){
    const [sy, sm] = startYYYYMM.split("-").map(Number);
    const [ey, em] = endYYYYMM.split("-").map(Number);
    let y = sy, m = sm-1, EY = ey, EM = em-1, out=[];
    if (y>EY || (y===EY && m>EM)) return out;
    while (y<EY || (y===EY && m<=EM)) { out.push({year:y, month:m}); m++; if (m>11){m=0;y++;} }
    return out;
  }

  // Parse binding rows (common shapes)
  function rowsFromBinding(binding){
    const dataBlock = binding?.data?.data ?? binding?.data ?? binding;
    const rows = Array.isArray(dataBlock?.rows) ? dataBlock.rows
               : Array.isArray(dataBlock)       ? dataBlock
               : [];
    return rows;
  }

  function buildDaysMap(rows){
    const out = {};
    rows.forEach(r=>{
      let dateVal, statusVal;
      if (r && r.dimensions) {
        dateVal   = r.dimensions.date ?? r.dimensions.Date ?? r.dimensions["date"];
        statusVal = r.dimensions.status ?? r.dimensions.Status ?? r.dimensions["status"];
      } else if (Array.isArray(r)) {
        dateVal = r[0]; statusVal = r[1];
      } else if (r && typeof r === "object") {
        dateVal   = r.date ?? r.Date ?? r["date"];
        statusVal = r.status ?? r.Status ?? r["status"];
      }
      const iso = toISODate(dateVal);
      if (iso && statusVal!=null) out[iso] = String(statusVal);
    });
    return out;
  }

  function uniqueStatuses(daysMap){
    return Array.from(new Set(Object.values(daysMap))).filter(v => v!=null && v!=="");
  }

  function resolveLegend({autoLegend, overrides, palette, statuses}){
    // Start with overrides (status -> color)
    const legend = {};
    Object.entries(overrides || {}).forEach(([k,v])=>{
      if (k && v) legend[k] = v;
    });
    // Fill remaining statuses using palette
    let idx = 0;
    statuses.forEach(s=>{
      if (!legend[s]) {
        legend[s] = palette[idx % palette.length] || "#90a4ae";
        idx++;
      }
    });
    return legend;
  }

  // ---------- Web Component ----------
  class SacCalendar extends HTMLElement {
    constructor(){
      super();
      this._shadow = this.attachShadow({mode:'open'});
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._props = {
        startMonth: "",
        endMonth: "",
        employeeName: "Employee",
        darkMode: true,
        autoLegend: true,
        statusInfoJson: "{}",
        paletteJson: "[]",
        style_headerBg: "#f7f9fb",
        style_border: "#d9dee2",
        style_text: "#37474f",
        style_cardBg: "#ffffff"
      };
      this.$legend = this._shadow.getElementById('legend');
      this.$calendars = this._shadow.getElementById('calendars');
      this._shadow.getElementById('empName').textContent = "";
    }

    onCustomWidgetBeforeUpdate(changedProps) {
      Object.assign(this._props, changedProps);
      if (changedProps.dataBindings) this._dataBindings = changedProps.dataBindings;
    }

    onCustomWidgetAfterUpdate() {
      // Dark and style vars
      if (this._props.darkMode) this.setAttribute('dark',''); else this.removeAttribute('dark');
      const root = this._shadow.host.style;
      root.setProperty("--hd",  this._props.style_headerBg || "#f7f9fb");
      root.setProperty("--bg",  this._props.style_cardBg   || "#ffffff");
      root.setProperty("--bdr", this._props.style_border   || "#d9dee2");
      root.setProperty("--ink", this._props.style_text     || "#37474f");

      // Name
      this._shadow.getElementById('empName').textContent = this._props.employeeName || "Employee";

      // 1) get days map from JSON
      let daysFromJson = {};
      try { daysFromJson = JSON.parse(this._props.daysJson || "{}"); } catch(e){}

      // 2) get days map from binding (preferred)
      const bindingObj = this.dataBindings?.getDataBinding?.("main") || this._dataBindings?.main || null;
      let daysFromBinding = {};
      if (bindingObj){
        const rows = rowsFromBinding(bindingObj);
        daysFromBinding = buildDaysMap(rows);
      }

      // prefer binding; fallback to JSON
      const daysMap = Object.keys(daysFromBinding).length ? daysFromBinding : daysFromJson;

      // Legend: overrides + auto
      let overrides = {};
      try { overrides = JSON.parse(this._props.statusInfoJson || "{}"); } catch(e){}
      let palette = [];
      try { palette = JSON.parse(this._props.paletteJson || "[]"); } catch(e){}
      if (!Array.isArray(palette) || !palette.length){
        palette = ["#66bb6a","#e57373","#64b5f6","#ffb74d","#ba68c8","#4db6ac","#ffd54f","#90a4ae","#81c784","#f06292"];
      }

      const statuses = uniqueStatuses(daysMap);
      const legend = this._props.autoLegend ? resolveLegend({autoLegend:true, overrides, palette, statuses})
                                            : (Object.keys(overrides).length ? overrides : resolveLegend({autoLegend:true, overrides:{}, palette, statuses}));

      this._resolvedLegend = legend;
      this._daysMap = daysMap;

      this.render();
    }

    render(){
      const legend = this._resolvedLegend || {};
      const daysMap = this._daysMap || {};

      // legend UI
      this.$legend.innerHTML = "";
      Object.entries(legend).forEach(([label, hex])=>{
        const key = document.createElement("div");
        key.className = "key";
        const sw = document.createElement("span");
        sw.className = "swatch"; sw.style.background = hex;
        key.appendChild(sw);
        const t = document.createElement("span"); t.textContent = label;
        key.appendChild(t);
        this.$legend.appendChild(key);
      });

      // months to render
      const months = monthRangeFromPropsOrData(this._props.startMonth, this._props.endMonth, daysMap);
      this.$calendars.innerHTML = "";
      months.forEach(({year, month})=>{
        const cal = document.createElement("section");
        cal.className = "cal";
        const header = document.createElement("div");
        header.className = "cal-header";
        header.textContent = monthName(year, month);
        cal.appendChild(header);

        const grid = document.createElement("div");
        grid.className = "grid";
        cal.appendChild(grid);

        ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d=>{
          const el = document.createElement("div");
          el.className="dow"; el.textContent = d;
          grid.appendChild(el);
        });

        const startIdx = firstWeekdayIndex(year, month);
        const total = daysInMonth(year, month);

        for(let i=0;i<startIdx;i++){
          const c = document.createElement("div");
          c.className = "cell outside"; c.setAttribute("aria-hidden","true");
          grid.appendChild(c);
        }

        for(let d=1; d<=total; d++){
          const cell = document.createElement("div");
          cell.className = "cell";
          const dateStr = `${year}-${pad2(month+1)}-${pad2(d)}`;
          const status = daysMap[dateStr];

          if (status && legend[status]){
            cell.style.background = tint(legend[status], 0.22);
            cell.title = `${dateStr} — ${status}`;
          } else {
            cell.title = `${dateStr}`;
          }

          const badge = document.createElement("span");
          badge.className = "date"; badge.textContent = d;
          cell.appendChild(badge);
          grid.appendChild(cell);
        }

        const cellsSoFar = 7 + startIdx + total;
        const remainder = cellsSoFar % 7;
        if (remainder){
          for(let i=0;i<7-remainder;i++){
            const c = document.createElement("div");
            c.className = "cell outside"; c.setAttribute("aria-hidden","true");
            grid.appendChild(c);
          }
        }

        this.$calendars.appendChild(cal);
      });
    }

    onCustomWidgetDestroy(){}
  }

  customElements.define('com-example-sac-calendar', SacCalendar);
})();
