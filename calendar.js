(function(){
  // ---------- Template & Styles ----------
  const tpl = document.createElement('template');
  tpl.innerHTML = `
    <style>
      *, *::before, *::after { box-sizing: border-box; }
      :host { display:block; font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,Arial,sans-serif; color:var(--ink,#37474f); }
      .wrap{max-width:100%}
      .legend{display:flex;gap:12px;flex-wrap:wrap;margin:0 0 10px}
      .key{display:flex;align-items:center;gap:6px;font-size:.85rem;opacity:.95}
      .swatch{width:12px;height:12px;border-radius:3px;border:1px solid rgba(0,0,0,.12)}

      .calendars{display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(240px,1fr))}
      .cal{border:1px solid var(--bdr,#d9dee2);border-radius:12px;overflow:hidden;background:var(--bg,#fff);display:flex;flex-direction:column;max-width:100%}
      .cal-header{display:flex;align-items:center;padding:8px 10px;background:var(--hd,#f7f9fb);border-bottom:1px solid var(--bdr,#d9dee2);font-weight:600}
      .grid{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));width:100%}
      .dow{background:var(--hd,#fcfdff);color:var(--mut,#607d8b);font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;padding:6px;border-bottom:1px solid var(--sub,#eceff1);text-align:center;min-width:0}
      .cell{min-height:36px;position:relative;border-right:1px solid var(--sub,#eceff1);border-bottom:1px solid var(--sub,#eceff1);padding:4px;display:flex;align-items:flex-start;justify-content:flex-end;min-width:0}
      .cell:nth-child(7n){border-right:none}
      .date{font-size:.78rem;color:var(--ink,#37474f);background:rgba(255,255,255,.85);padding:1px 5px;border-radius:6px}
      .cell.outside{background:var(--out,#fafafa);color:#9e9e9e}
      .cell[title]{cursor:default}

      :host([dark]) .cal{background:#0f171d;border-color:#20303b}
      :host([dark]) .cal-header{background:#0b141a;border-bottom-color:#20303b}
      :host([dark]) .dow{background:#0b141a;border-bottom-color:#20303b;color:#93a4b3}
      :host([dark]) .cell{border-color:#20303b}
      :host([dark]) .cell.outside{background:#0c1218;color:#6e7e8d}
      :host([dark]) .date{color:#e3eef6;background:rgba(20,28,35,.85)}
    </style>
    <div class="wrap">
      <div class="legend" id="legend"></div>
      <div class="calendars" id="calendars"></div>
    </div>
  `;

  // ---------- Utils ----------
  const pad2 = n => String(n).padStart(2,"0");
  const monthName = (y,m) => new Date(y,m,1).toLocaleString(undefined,{month:"long",year:"numeric"});
  const daysInMonth = (y,m) => new Date(y,m+1,0).getDate();
  const firstWeekdayIndex = (y,m) => new Date(y,m,1).getDay();
  const clamp01 = x => Math.max(0, Math.min(1, x));

  function toISODate(v){
    if (v instanceof Date) return `${v.getFullYear()}-${pad2(v.getMonth()+1)}-${pad2(v.getDate())}`;
    if (typeof v!=="string") return null;
    const s=v.trim(); if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const mIso=s.match(/^(\d{4}-\d{2}-\d{2})/); if(mIso) return mIso[1];
    const mUS=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); if(mUS) return `${mUS[3]}-${pad2(+mUS[1])}-${pad2(+mUS[2])}`;
    return null;
  }
  function tint(hex,a=0.22){const h=(hex||"#999").replace("#","");const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);return `rgba(${r},${g},${b},${clamp01(a)})`;}
  function rangeMonths(s,e){const[sy,sm]=s.split("-").map(Number);const[ey,em]=e.split("-").map(Number);let y=sy,m=sm-1,EY=ey,EM=em-1,out=[];if(y>EY||(y===EY&&m>EM))return out;while(y<EY||(y===EY&&m<=EM)){out.push({year:y,month:m});m++;if(m>11){m=0;y++;}}return out;}
  function monthsFromData(map){ const ks=Object.keys(map).sort(); if(!ks.length) return []; return rangeMonths(ks[0].slice(0,7), ks[ks.length-1].slice(0,7)); }
  function uniqueStatuses(map){ return Array.from(new Set(Object.values(map))).filter(Boolean); }
  function resolveLegend({overrides,palette,statuses}){ const legend={...(overrides||{})}; const pal=(Array.isArray(palette)&&palette.length)?palette:["#66bb6a","#e57373","#64b5f6","#ffb74d","#ba68c8","#4db6ac","#ffd54f","#90a4ae","#81c784","#f06292"]; let i=0; statuses.forEach(s=>{ if(!legend[s]) legend[s]=pal[i++%pal.length]; }); return legend; }

  // ---------- Robust binding reader ----------
  function findRowsBlock(obj){
    if (!obj || typeof obj !== 'object') return [];
    if (Array.isArray(obj)) return obj;
    for (const k of ['rows','data','table','values']) {
      if (Array.isArray(obj[k])) return obj[k];
    }
    for (const key in obj) {
      const v = obj[key];
      if (v && typeof v === 'object') {
        const arr = findRowsBlock(v);
        if (Array.isArray(arr) && arr.length) return arr;
      }
    }
    return [];
  }

  function rowsToDays(rows, dimsMeta){
    const feedMap = { date:'date', status:'status' };
    if (Array.isArray(dimsMeta)) {
      feedMap.date   = dimsMeta[0]?.id || 'date';
      feedMap.status = dimsMeta[1]?.id || 'status';
    }
    const out = {};
    rows.forEach(r=>{
      let d, s;
      if (r && r.dimensions) {
        d = r.dimensions[feedMap.date]   ?? r.dimensions.date   ?? r.dimensions.Date;
        s = r.dimensions[feedMap.status] ?? r.dimensions.status ?? r.dimensions.Status;
      } else if (Array.isArray(r)) {
        d = r[0]; s = r[1];
      } else if (r && typeof r === 'object') {
        d = r[feedMap.date]   ?? r.date   ?? r.Date;
        s = r[feedMap.status] ?? r.status ?? r.Status;
      }
      const iso = toISODate(d);
      if (iso && s!=null) out[iso] = String(s);
    });
    return out;
  }

  async function loadDaysFromBinding(binding){
    if (!binding) return {};
    try {
      // OSE: fetch rows explicitly
      if (typeof binding.getData === 'function') {
        const payload = await binding.getData();
        const rows = findRowsBlock(payload);
        const dims = payload.dimensions || payload?.data?.dimensions || binding.dimensions || null;
        return rowsToDays(rows, dims);
      }
    } catch (e) {
      // fallback to whatever is already on the binding
      console.warn("getData() failed, falling back to static binding payload", e);
    }
    const rows = findRowsBlock(binding);
    const dims = binding.dimensions || binding?.data?.dimensions || null;
    return rowsToDays(rows, dims);
  }

  class SacCalendar extends HTMLElement {
    constructor(){
      super();
      this._shadow = this.attachShadow({mode:'open'});
      this._shadow.appendChild(tpl.content.cloneNode(true));
      this._props = {
        darkMode:true, autoLegend:true,
        statusInfoJson:"{}", paletteJson:"[]",
        style_headerBg:"#f7f9fb", style_cardBg:"#ffffff", style_border:"#d9dee2", style_text:"#37474f"
      };
      this.$legend = this._shadow.getElementById('legend');
      this.$calendars = this._shadow.getElementById('calendars');
      this._renderPending = false;
    }

    onCustomWidgetBeforeUpdate(changed){ Object.assign(this._props, changed); }
    onCustomWidgetAfterUpdate(){
      // theme vars
      if (this._props.darkMode) this.setAttribute('dark',''); else this.removeAttribute('dark');
      const root=this._shadow.host.style;
      root.setProperty("--hd",  this._props.style_headerBg||"#f7f9fb");
      root.setProperty("--bg",  this._props.style_cardBg||"#ffffff");
      root.setProperty("--bdr", this._props.style_border||"#d9dee2");
      root.setProperty("--ink", this._props.style_text||"#37474f");

      // load binding every update (covers first assignment & subsequent filter changes)
      const db = this.dataBindings?.getDataBinding?.("main");
      if (!db) {
        this._clear();
        return;
      }
      // avoid overlapping loads if SAC fires multiple updates quickly
      if (this._renderPending) return;
      this._renderPending = true;

      loadDaysFromBinding(db).then(daysMap => {
        this._renderPending = false;
        if (!Object.keys(daysMap).length){ this._clear(); return; }

        // legend
        let overrides={}; try{ overrides=JSON.parse(this._props.statusInfoJson||"{}"); }catch{}
        let palette=[];  try{ palette =JSON.parse(this._props.paletteJson||"[]"); }catch{}
        const statuses = uniqueStatuses(daysMap);
        this._legend = this._props.autoLegend ? resolveLegend({overrides,palette,statuses})
                                              : (Object.keys(overrides).length?overrides:resolveLegend({overrides:{},palette,statuses}));
        this._days = daysMap;
        this._render();
      }).catch(err=>{
        this._renderPending = false;
        console.error("Failed to load binding data:", err);
        this._clear();
      });
    }

    _clear(){
      this.$legend.innerHTML = "";
      this.$calendars.innerHTML = "";
    }

    _render(){
      const legend=this._legend||{}; const daysMap=this._days||{};

      // legend UI
      this.$legend.innerHTML="";
      Object.entries(legend).forEach(([label,hex])=>{
        const key=document.createElement("div"); key.className="key";
        const sw=document.createElement("span"); sw.className="swatch"; sw.style.background=hex; key.appendChild(sw);
        const t=document.createElement("span"); t.textContent=label; key.appendChild(t);
        this.$legend.appendChild(key);
      });

      // months from data
      const months = monthsFromData(daysMap);
      this.$calendars.innerHTML="";
      months.forEach(({year,month})=>{
        const cal=document.createElement("section"); cal.className="cal";
        const header=document.createElement("div"); header.className="cal-header"; header.textContent=monthName(year,month); cal.appendChild(header);
        const grid=document.createElement("div"); grid.className="grid"; cal.appendChild(grid);

        ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].forEach(d=>{
          const el=document.createElement("div"); el.className="dow"; el.textContent=d; grid.appendChild(el);
        });

        const startIdx=firstWeekdayIndex(year,month), total=daysInMonth(year,month);
        for(let i=0;i<startIdx;i++){ const c=document.createElement("div"); c.className="cell outside"; c.setAttribute("aria-hidden","true"); grid.appendChild(c); }
        for(let d=1; d<=total; d++){
          const cell=document.createElement("div"); cell.className="cell";
          const dateStr=`${year}-${pad2(month+1)}-${pad2(d)}`;
          const status=daysMap[dateStr];
          if(status && legend[status]){ cell.style.background=tint(legend[status],0.22); cell.title=`${dateStr} — ${status}`; }
          else { cell.title=`${dateStr}`; }
          const badge=document.createElement("span"); badge.className="date"; badge.textContent=d; cell.appendChild(badge);
          grid.appendChild(cell);
        }
        const cellsSoFar=7+startIdx+total, rem=cellsSoFar%7;
        if(rem){ for(let i=0;i<7-rem;i++){ const c=document.createElement("div"); c.className="cell outside"; c.setAttribute("aria-hidden","true"); grid.appendChild(c); } }
        this.$calendars.appendChild(cal);
      });
    }

    onCustomWidgetDestroy(){}
  }

  customElements.define('com-example-sac-calendar', SacCalendar);
})();
