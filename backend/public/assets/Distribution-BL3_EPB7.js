import{c as S,u as xe,e as me,r as p,j as t,b as $,i as he,N as be}from"./index-CvT5A25U.js";import{C as fe}from"./chevron-left-DKNrtaTh.js";import{C as ue}from"./calendar-CtA9Z2Pa.js";import{C as Y}from"./chevron-right-DFJKOmap.js";import{P as ge}from"./phone-BGSrj2tP.js";import{P as ye}from"./package-CdvM1RyS.js";import{P as ve}from"./printer-zz48SQaL.js";import{C as we}from"./circle-check-CKAYHW3O.js";import{M as Ne}from"./map-pin-Dy6DvWFu.js";import{C as ke}from"./clock-DbGL6xqt.js";import{a as je,A as _e}from"./arrow-up-BpVio-sh.js";import{X as De}from"./x-NukdCJiq.js";/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=S("ArrowLeftRight",[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]]);/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Re=S("Share2",[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]]);/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const B=S("SquareCheckBig",[["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}],["path",{d:"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",key:"1jnkn4"}]]);/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ee=S("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]),H=i=>typeof i=="string"?i.split("T")[0]:"",w=i=>{const d=(i||"").split("-");return d.length===3?`${d[2]}/${d[1]}/${d[0]}`:i||"Undated"},P=i=>{try{return new Date(`${i}T00:00:00`).toLocaleDateString("en-IN",{weekday:"long"})}catch{return""}},G=i=>{if(i.google_location&&i.google_location.startsWith("http"))return i.google_location;const d=`${i.institution_name}, ${i.complete_address||""}, PIN ${i.pin_code||""}, India`;return`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d)}`},W={PENDING:"bg-amber-50 text-amber-700 border-amber-200",OUT_FOR_DELIVERY:"bg-blue-50 text-blue-700 border-blue-200",ARRIVED:"bg-indigo-50 text-indigo-700 border-indigo-200",DELIVERED:"bg-emerald-50 text-emerald-700 border-emerald-200",REJECTED:"bg-rose-50 text-rose-700 border-rose-200"};function Me(){const{token:i}=xe(),{events:d}=me(),[g,N]=p.useState([]),[y,K]=p.useState([]),[J,X]=p.useState(!0),[x,u]=p.useState(""),[C,T]=p.useState(null),[b,k]=p.useState([]),[j,_]=p.useState({open:!1,ids:[]}),[A,L]=p.useState(!1),f=p.useCallback(async()=>{if(i)try{const e=Date.now(),s={Authorization:`Bearer ${i}`},[r,a]=await Promise.all([fetch(`/api/delivery/demands?t=${e}`,{headers:s}),fetch(`/api/delivery/partners?t=${e}`,{headers:s})]);if(r.ok){const n=await r.json();N(Array.isArray(n)?n:[])}if(a.ok){const n=await a.json();K(Array.isArray(n)?n:[])}}catch(e){console.error("Distribution fetch error:",e)}finally{X(!1)}},[i]);p.useEffect(()=>{f()},[f]),p.useEffect(()=>{(d!=null&&d.DEMAND_UPDATED||d!=null&&d.timestamp)&&f()},[d==null?void 0:d.DEMAND_UPDATED,d==null?void 0:d.timestamp,f]);const[V,Q]=p.useState(!1),[h,O]=p.useState("DRIVER"),Z=[{key:"DRIVER",label:"CAR"},{key:"PORTER",label:"PORTER"},{key:"SELF_DELIVERY",label:"SELF DELIVERY"}],D=p.useMemo(()=>g.filter(e=>(e.delivery_mode||"DRIVER")!==h?!1:h==="DRIVER"?!!e.delivery_partner_id:!!(e.delivery_partner_id||e.delivery_partner_name)),[g,h]),R=p.useMemo(()=>{const e={};return D.forEach(s=>{const r=H(s.demand_date);e[r]||(e[r]={date:r,stops:0,packets:0}),e[r].stops+=1,e[r].packets+=Number(s.total_quantity)||0}),Object.values(e).sort((s,r)=>s.date<r.date?-1:1)},[D]),E=()=>{const e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`},z=()=>{const e=new Date;return e.setDate(e.getDate()+1),`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`};p.useEffect(()=>{x||u(E())},[x]);const q=e=>{const s=new Date(`${x||E()}T00:00:00`);s.setDate(s.getDate()+e),u(`${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,"0")}-${String(s.getDate()).padStart(2,"0")}`)},M=e=>e.sort((s,r)=>{const a=Number(s.delivery_sequence)||0,n=Number(r.delivery_sequence)||0;return a!==n?a-n:(s.id||0)-(r.id||0)}),F=p.useMemo(()=>{const e=D.filter(r=>H(r.demand_date)===x);if(h==="DRIVER")return y.filter(r=>!["PORTER","SELF_SERVICE"].includes(r.vehicle_type)).map(r=>({key:`p${r.id}`,vehicle_no:r.vehicle_no,name:r.name,phone:r.phone,stops:M(e.filter(a=>String(a.delivery_partner_id)===String(r.id)))}));const s={};return e.forEach(r=>{const a=r.delivery_partner_name||(h==="PORTER"?"Porter":"Self Delivery");s[a]||(s[a]={key:a,vehicle_no:h==="PORTER"?"PORTER":"SELF DELIVERY",name:a,phone:r.delivery_partner_phone||"",stops:[]}),s[a].stops.push(r)}),Object.values(s).map(r=>({...r,stops:M(r.stops)}))},[D,y,x,h]),U=async(e,s,r)=>{const a=r==="UP"?s-1:s+1;if(a<0||a>=e.length)return;const n=[...e];[n[s],n[a]]=[n[a],n[s]];const l=n.map((c,m)=>({id:c.id,delivery_sequence:m+1}));T(e[s].id),N(c=>c.map(m=>{const o=l.find(v=>v.id===m.id);return o?{...m,delivery_sequence:o.delivery_sequence}:m}));try{const c=await fetch("/api/delivery/reorder",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${i}`},body:JSON.stringify({sequences:l})});if(!c.ok){let m="Failed to save order";try{const o=await c.json();o&&o.error&&(m=o.error)}catch{}throw new Error(m)}}catch(c){alert(c.message),f()}finally{T(null)}},ee=e=>k(s=>s.includes(e)?s.filter(r=>r!==e):[...s,e]),te=e=>{const s=e.filter(a=>(a.delivery_status||"PENDING")!=="DELIVERED").map(a=>a.id),r=s.length>0&&s.every(a=>b.includes(a));k(a=>r?a.filter(n=>!s.includes(n)):Array.from(new Set([...a,...s])))},se=p.useMemo(()=>[...y.filter(s=>s.is_active!==0&&!["PORTER","SELF_SERVICE"].includes(s.vehicle_type)).map(s=>({key:"D:"+s.id,mode:"DRIVER",partnerId:s.id,title:s.name?`${s.name} - ${s.vehicle_no||"CAR"}`:s.vehicle_no||"CAR",sub:s.vehicle_model||"Delivery Vehicle",phone:s.phone})),{key:"PORTER",mode:"PORTER",partnerId:null,title:"PORTER",sub:"Handled by Porter"},{key:"SELF_DELIVERY",mode:"SELF_DELIVERY",partnerId:null,title:"SELF DELIVERY",sub:"Admin Direct"}],[y]),ae=e=>{const s=e.delivery_mode||"DRIVER";return s==="DRIVER"?"D:"+e.delivery_partner_id:s},ne=async(e,s)=>{if(!e.length||!s)return;L(!0);const r=g,a=s.mode==="DRIVER"?y.find(n=>n.id===s.partnerId):null;N(n=>n.map(l=>e.includes(l.id)?s.mode==="DRIVER"?{...l,delivery_mode:"DRIVER",delivery_partner_id:s.partnerId,delivery_partner_name:(a==null?void 0:a.name)||l.delivery_partner_name,delivery_partner_phone:(a==null?void 0:a.phone)||"",delivery_partner_vehicle:(a==null?void 0:a.vehicle_no)||"",delivery_sequence:9999}:{...l,delivery_mode:s.mode,delivery_partner_id:null,delivery_partner_name:s.mode==="PORTER"?"Handled by Porter":"Admin Self Delivery",delivery_partner_phone:s.mode==="PORTER"?"Porter Staff":"Self Service Rep",delivery_sequence:9999}:l));try{const n=await fetch("/api/delivery/switch",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${i}`},body:JSON.stringify({demandIds:e,targetMode:s.mode,targetPartnerId:s.partnerId})}),l=await n.json().catch(()=>({}));if(!n.ok)throw new Error(l.error||"Failed to transfer demand");l.skipped&&l.skipped.length&&alert(`${l.skipped.length} delivered demand(s) were not moved.`),k(c=>c.filter(m=>!e.includes(m))),_({open:!1,ids:[]}),s.mode!==h&&O(s.mode),await f()}catch(n){N(r),alert(n.message||"Failed to transfer demand")}finally{L(!1)}},re=(e,s)=>{let a=`🚚 *DISTRIBUTION LIST - ${e.name?e.vehicle_no&&e.vehicle_no!==e.name?`${e.name} - ${e.vehicle_no}`:e.name:e.vehicle_no||"DRIVER"}*
📅 ${w(x)} (${P(x)})

`;s.forEach((c,m)=>{a+=`${m+1}. *${c.institution_name}* - ${c.total_quantity||0} Pkts
   PIN ${c.pin_code}
   ${G(c)}
`});let n=(e.phone||"").replace(/\D/g,"");n.length===10&&(n="91"+n);const l=n?`https://api.whatsapp.com/send?phone=${n}&text=${encodeURIComponent(a)}`:`https://api.whatsapp.com/send?text=${encodeURIComponent(a)}`;window.open(l,"_blank")},le=(e,s)=>{if(!s||s.length===0)return;const r=window.open("","_blank","width=900,height=1000");if(!r){alert("Please allow popups to print delivery run sheet.");return}const a=s.reduce((o,v)=>o+(Number(v.total_quantity)||0),0),n=w(x),l=P(x),c=e.name||"DRIVER",m=e.vehicle_no||"CAR";r.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Delivery Run Sheet - ${c} (${m}) - ${n}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 8mm 8mm 10mm 8mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.3;
            }
            .header-bar {
              border-bottom: 2px solid #0f172a;
              padding-bottom: 8px;
              margin-bottom: 10px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .org-title {
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #0f172a;
              margin: 0;
            }
            .doc-subtitle {
              font-size: 11px;
              font-weight: 700;
              color: #475569;
              text-transform: uppercase;
              letter-spacing: 0.3px;
              margin-top: 2px;
            }
            .meta-box {
              text-align: right;
              font-size: 10px;
              color: #475569;
            }
            .meta-box strong {
              color: #0f172a;
              font-size: 11px;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              background-color: #f8fafc;
              border: 1px solid #cbd5e1;
              border-radius: 6px;
              padding: 8px 12px;
              margin-bottom: 12px;
            }
            .summary-col label {
              display: block;
              font-size: 9px;
              font-weight: 800;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .summary-col .val {
              font-size: 12px;
              font-weight: 900;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 12px;
            }
            th, td {
              border: 1px solid #94a3b8;
              padding: 6px 7px;
              text-align: left;
              vertical-align: middle;
            }
            th {
              background-color: #e2e8f0;
              color: #0f172a;
              font-weight: 800;
              font-size: 9.5px;
              text-transform: uppercase;
              letter-spacing: 0.4px;
            }
            tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .seq-cell {
              text-align: center;
              font-weight: 900;
              font-size: 12px;
              width: 32px;
              background-color: #f1f5f9;
            }
            .inst-title {
              font-weight: 800;
              font-size: 11px;
              color: #0f172a;
            }
            .inst-addr {
              font-size: 9px;
              color: #475569;
              margin-top: 1px;
            }
            .pkts-cell {
              text-align: center;
              font-weight: 900;
              font-size: 12px;
              color: #0f172a;
              background-color: #eff6ff;
              width: 65px;
            }
            .pin-cell {
              text-align: center;
              font-weight: 800;
              font-size: 10px;
              width: 65px;
            }
            .unit-cell {
              text-align: center;
              font-weight: 700;
              font-size: 10px;
              width: 75px;
            }
            .contact-cell {
              font-size: 9.5px;
              width: 125px;
            }
            .contact-name {
              font-weight: 700;
              color: #1e293b;
            }
            .contact-phone {
              color: #1d4ed8;
              font-weight: 700;
            }
            .sign-cell {
              width: 110px;
              height: 40px;
              background-color: #ffffff;
              text-align: center;
              vertical-align: bottom;
              padding-bottom: 2px;
            }
            .sign-prompt {
              font-size: 8px;
              color: #94a3b8;
              border-top: 1px dashed #cbd5e1;
              padding-top: 2px;
            }
            .total-row {
              background-color: #0f172a !important;
              color: #ffffff !important;
              font-weight: 900;
              font-size: 11px;
            }
            .total-row td {
              border-color: #0f172a;
              color: #ffffff !important;
            }
            .footer-signatures {
              margin-top: 18px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              page-break-inside: avoid;
            }
            .sign-box {
              border-top: 1.5px solid #0f172a;
              padding-top: 4px;
              text-align: center;
              font-size: 9.5px;
              font-weight: 800;
              color: #334155;
            }
            .sign-box .note {
              font-size: 8px;
              color: #64748b;
              margin-top: 2px;
              font-weight: normal;
            }
            .screen-action-bar {
              margin-bottom: 12px;
              padding: 8px 12px;
              background: #eff6ff;
              border: 1px solid #bfdbfe;
              border-radius: 6px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .print-button {
              background: #2563eb;
              color: white;
              border: none;
              padding: 6px 16px;
              border-radius: 4px;
              font-weight: 800;
              font-size: 12px;
              cursor: pointer;
            }
            @media print {
              .screen-action-bar {
                display: none !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="screen-action-bar">
            <span>🖨️ <strong>Portrait Delivery Run Sheet Ready</strong> (A4 Format)</span>
            <button class="print-button" onclick="window.print()">Print / Save PDF</button>
          </div>

          <div class="header-bar">
            <div>
              <h1 class="org-title">NCC Refreshment Supply & Distribution</h1>
              <div class="doc-subtitle">Daily Delivery Run Sheet & Gate Pass • Driver Route Manifest</div>
            </div>
            <div class="meta-box">
              <div>Delivery Date: <strong>${n} (${l})</strong></div>
              <div>Generated: <strong>${new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</strong></div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-col">
              <label>Assigned Driver</label>
              <div class="val">${c}</div>
            </div>
            <div class="summary-col">
              <label>Vehicle / Car No</label>
              <div class="val">${m}</div>
            </div>
            <div class="summary-col">
              <label>Total Stops</label>
              <div class="val">${s.length} Institutions</div>
            </div>
            <div class="summary-col">
              <label>Total Refreshment Load</label>
              <div class="val">${a.toLocaleString("en-IN")} Packets</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 32px; text-align: center;">#</th>
                <th>Institution Name & Address</th>
                <th style="width: 65px; text-align: center;">PIN</th>
                <th style="width: 75px; text-align: center;">Unit</th>
                <th style="width: 65px; text-align: center;">Packets</th>
                <th style="width: 125px;">ANO / Contact</th>
                <th style="width: 110px; text-align: center;">Receiver Sign & Stamp</th>
              </tr>
            </thead>
            <tbody>
              ${s.map((o,v)=>{const oe=Number(o.total_quantity)||0,ie=o.complete_address?`<div class="inst-addr">${o.complete_address}</div>`:"",de=o.ano_cto_name?`<div class="contact-name">${o.ano_cto_name}</div>`:'<div class="contact-name">ANO / Caretaker</div>',ce=o.ano_cto_contact?`<div class="contact-phone">📞 ${o.ano_cto_contact}</div>`:"",pe=o.unit_code||o.unit_name||"—";return`
                  <tr>
                    <td class="seq-cell">${v+1}</td>
                    <td>
                      <div class="inst-title">${o.institution_name}</div>
                      ${ie}
                    </td>
                    <td class="pin-cell">${o.pin_code||"—"}</td>
                    <td class="unit-cell">${pe}</td>
                    <td class="pkts-cell">${oe}</td>
                    <td class="contact-cell">
                      ${de}
                      ${ce}
                    </td>
                    <td class="sign-cell">
                      <div class="sign-prompt">Sign & Stamp</div>
                    </td>
                  </tr>
                `}).join("")}
              <tr class="total-row">
                <td colspan="4" style="text-align: right; padding-right: 12px; font-weight: 900;">
                  TOTAL VALUATION / REFRESHMENT LOAD (${s.length} STOPS):
                </td>
                <td class="pkts-cell" style="background-color: #1e293b !important; color: #ffffff !important; font-size: 13px;">
                  ${a.toLocaleString("en-IN")}
                </td>
                <td colspan="2" style="font-size: 9.5px; font-weight: 700; padding-left: 8px;">
                  Full Batch Handover Verified
                </td>
              </tr>
            </tbody>
          </table>

          <div class="footer-signatures">
            <div class="sign-box">
              Driver Route Clearance (${c})
              <div class="note">Packets counted & accepted for delivery</div>
            </div>
            <div class="sign-box">
              Warehouse Dispatch Manager
              <div class="note">Dispatched as per daily demand manifest</div>
            </div>
            <div class="sign-box">
              Central Gate Security
              <div class="note">Vehicle out-time & gate pass verified</div>
            </div>
          </div>

          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 400);
            };
          <\/script>
        </body>
      </html>
    `),r.document.close()};return J?t.jsx("div",{className:"p-12 text-center font-bold text-slate-500",children:"Loading distribution..."}):t.jsxs("div",{className:"space-y-5",children:[t.jsxs("div",{className:"flex items-center justify-between gap-3",children:[t.jsxs("div",{children:[t.jsxs("h1",{className:"text-xl font-black text-slate-900 flex items-center gap-2",children:[t.jsx($,{className:"w-6 h-6 text-cyan-600"})," Distribution"]}),t.jsx("p",{className:"text-xs text-slate-500 font-medium mt-0.5",children:"Day-wise delivery list of each partner. Use ▲ ▼ to set which stop is delivered first — drivers see the same order."})]}),t.jsx("button",{onClick:f,className:"p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600",title:"Refresh",children:t.jsx(he,{className:"w-4 h-4"})})]}),t.jsx("div",{className:"flex items-center bg-slate-100 p-1 rounded-2xl w-fit",children:Z.map(e=>t.jsx("button",{onClick:()=>O(e.key),className:`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${h===e.key?"bg-white text-blue-700 shadow-sm":"text-slate-600 hover:text-slate-900"}`,children:e.label},e.key))}),t.jsxs("div",{className:"bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-2.5",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("button",{onClick:()=>q(-1),className:"p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700",title:"Previous day",children:t.jsx(fe,{className:"w-4 h-4"})}),t.jsxs("div",{className:"flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200",children:[t.jsx(ue,{className:"w-4 h-4 text-blue-600"}),t.jsx("input",{type:"date",value:x,onChange:e=>e.target.value&&u(e.target.value),className:"bg-transparent text-xs font-black text-blue-900 focus:outline-none"}),t.jsx("span",{className:"text-xs font-bold text-blue-700",children:P(x)})]}),t.jsx("button",{onClick:()=>q(1),className:"p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700",title:"Next day",children:t.jsx(Y,{className:"w-4 h-4"})}),t.jsx("button",{type:"button",onClick:()=>u(E()),className:`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${x===E()?"bg-slate-900 text-white shadow-xs":"bg-slate-100 text-slate-700 hover:bg-slate-200"}`,children:"Today"}),t.jsx("button",{type:"button",onClick:()=>u(z()),className:`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${x===z()?"bg-blue-600 text-white shadow-xs":"bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"}`,children:"Tomorrow"}),R.length>0&&t.jsx("button",{onClick:()=>Q(e=>!e),className:"ml-auto px-3 py-1.5 rounded-xl text-xs font-black bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100",children:V?"Hide Days":`Show Days (${R.length})`})]}),V&&R.length>0&&t.jsx("div",{className:"flex items-center gap-2 overflow-x-auto pt-1 pb-3.5",style:{scrollbarWidth:"thin",scrollbarColor:"#94a3b8 #f1f5f9"},children:R.map(e=>t.jsxs("button",{onClick:()=>u(e.date),className:`px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap border transition-all ${x===e.date?"bg-blue-600 text-white border-blue-600":"bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"}`,children:[w(e.date)," (",e.stops," • ",e.packets," Pkts)"]},e.date))})]}),h!=="DRIVER"&&F.length===0&&t.jsxs("div",{className:"text-center text-xs text-slate-400 italic py-8 bg-white rounded-2xl border border-dashed border-slate-200",children:["No ",h==="PORTER"?"Porter":"Self Delivery"," demands on ",w(x)]}),t.jsx("div",{className:"grid grid-cols-1 xl:grid-cols-3 gap-5",children:F.map(e=>{const s=e.stops,r=s.reduce((a,n)=>a+(Number(n.total_quantity)||0),0);return t.jsxs("div",{className:"bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden",children:[t.jsxs("div",{className:"px-3 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 flex-nowrap overflow-x-auto",style:{scrollbarWidth:"none",msOverflowStyle:"none"},children:[t.jsx("div",{className:"w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0",children:t.jsx($,{className:"w-4 h-4"})}),t.jsxs("span",{className:"font-black text-sm text-slate-900 whitespace-nowrap uppercase",children:[e.name||"DRIVER",e.vehicle_no&&e.vehicle_no!==e.name?t.jsxs("span",{className:"font-extrabold text-slate-600",children:[" - ",e.vehicle_no]}):""]}),e.phone&&t.jsxs("a",{href:`tel:${e.phone}`,className:"text-[11px] text-blue-600 font-bold flex items-center gap-0.5 whitespace-nowrap",children:[t.jsx(ge,{className:"w-3 h-3"}),e.phone]}),t.jsxs("span",{className:"px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-black whitespace-nowrap",children:[s.length," Stops"]}),t.jsxs("span",{className:"px-1.5 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 text-[10px] font-black flex items-center gap-1 whitespace-nowrap",children:[t.jsx(ye,{className:"w-3 h-3"}),r," Pkts"]}),t.jsxs("button",{onClick:()=>te(s),disabled:s.length===0,className:"ml-auto px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-[10px] font-black flex items-center gap-1 shrink-0",title:"Select all stops of this car",children:[t.jsx(B,{className:"w-3 h-3"})," All"]}),t.jsxs("button",{type:"button",onClick:()=>le(e,s),disabled:s.length===0,className:"px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all",title:"Print portrait delivery run sheet for this driver",children:[t.jsx(ve,{className:"w-3 h-3"})," Print"]}),t.jsxs("button",{onClick:()=>re(e,s),disabled:s.length===0,className:"px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-black flex items-center gap-1 shrink-0",title:"Send this day's list on WhatsApp",children:[t.jsx(Re,{className:"w-3 h-3"})," Share"]})]}),t.jsx("div",{className:"p-3 space-y-2 flex-1",children:s.length===0?t.jsxs("div",{className:"text-center text-xs text-slate-400 italic py-8",children:["Nothing assigned on ",x?w(x):"this day"]}):s.map((a,n)=>{const l=a.delivery_status||"PENDING";return t.jsxs("div",{className:`p-2.5 rounded-xl border bg-white flex items-center gap-2 ${b.includes(a.id)?"border-blue-400 ring-2 ring-blue-100":"border-slate-200"}`,children:[t.jsx("button",{type:"button",onClick:()=>ee(a.id),disabled:l==="DELIVERED",className:"shrink-0 text-slate-400 hover:text-blue-600 disabled:opacity-30",title:"Select for transfer",children:b.includes(a.id)?t.jsx(B,{className:"w-4 h-4 text-blue-600"}):t.jsx(Ee,{className:"w-4 h-4"})}),t.jsx("span",{className:`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${l==="DELIVERED"?"bg-emerald-600 text-white":"bg-slate-800 text-white"}`,children:l==="DELIVERED"?t.jsx(we,{className:"w-4 h-4"}):n+1}),t.jsxs("div",{className:"min-w-0 flex-1",children:[t.jsx("div",{className:"font-extrabold text-xs text-slate-900 truncate",children:a.institution_name}),t.jsxs("div",{className:"text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-x-1.5",children:[a.unit_code&&t.jsx("span",{className:"font-bold text-indigo-700",children:a.unit_code}),t.jsxs("span",{className:"flex items-center gap-0.5",children:[t.jsx(Ne,{className:"w-3 h-3"}),"PIN ",a.pin_code]}),a.demand_time&&t.jsxs("span",{className:"flex items-center gap-0.5",children:[t.jsx(ke,{className:"w-3 h-3"}),a.demand_time]})]}),t.jsx("span",{className:`inline-block mt-1 px-1.5 py-0.5 rounded border text-[9px] font-black ${W[l]||W.PENDING}`,children:l.replace(/_/g," ")})]}),t.jsx("button",{type:"button",onClick:()=>_({open:!0,ids:[a.id]}),disabled:l==="DELIVERED",className:"shrink-0 p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 disabled:opacity-30 active:scale-95 transition-all",title:"Switch to another car / Porter / Self Delivery",children:t.jsx(I,{className:"w-4 h-4"})}),t.jsxs("div",{className:"flex flex-col items-end gap-1 shrink-0",children:[t.jsxs("span",{className:"text-xs font-black text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md",children:[a.total_quantity||0," Pkts"]}),t.jsxs("div",{className:"flex items-center gap-1",children:[t.jsx("a",{href:G(a),target:"_blank",rel:"noopener noreferrer",className:"p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200",title:"Navigate",children:t.jsx(be,{className:"w-3.5 h-3.5"})}),t.jsx("button",{onClick:()=>U(s,n,"UP"),disabled:n===0||C===a.id,className:"p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30",title:"Deliver earlier",children:t.jsx(je,{className:"w-3.5 h-3.5"})}),t.jsx("button",{onClick:()=>U(s,n,"DOWN"),disabled:n===s.length-1||C===a.id,className:"p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30",title:"Deliver later",children:t.jsx(_e,{className:"w-3.5 h-3.5"})})]})]})]},a.id)})})]},e.key)})}),b.length>0&&!j.open&&t.jsxs("div",{className:"fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap justify-center max-w-[95vw]",children:[t.jsxs("span",{className:"text-xs font-black",children:[b.length," selected (",g.filter(e=>b.includes(e.id)).reduce((e,s)=>e+(Number(s.total_quantity)||0),0)," Pkts)"]}),t.jsxs("button",{type:"button",onClick:()=>_({open:!0,ids:b}),className:"px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black flex items-center gap-1.5",children:[t.jsx(I,{className:"w-3.5 h-3.5"})," Transfer"]}),t.jsx("button",{type:"button",onClick:()=>k([]),className:"px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold",children:"Clear"})]}),j.open&&(()=>{const e=g.filter(n=>j.ids.includes(n.id)),s=new Set(e.map(ae)),r=s.size===1?Array.from(s)[0]:null,a=e.reduce((n,l)=>n+(Number(l.total_quantity)||0),0);return t.jsx("div",{className:"fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4",children:t.jsxs("div",{className:"bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3",children:[t.jsxs("div",{className:"flex items-start justify-between border-b border-slate-100 pb-3",children:[t.jsxs("div",{children:[t.jsxs("h3",{className:"text-sm font-black text-slate-900 flex items-center gap-1.5",children:[t.jsx(I,{className:"w-4 h-4 text-amber-600"})," Transfer ",e.length," demand",e.length!==1?"s":""]}),t.jsx("p",{className:"text-[11px] text-slate-500 font-bold mt-0.5 truncate max-w-[240px]",children:e.length===1?e[0].institution_name:`${a} packets total`})]}),t.jsx("button",{type:"button",onClick:()=>_({open:!1,ids:[]}),className:"p-1 rounded-lg text-slate-400 hover:text-slate-600",children:t.jsx(De,{className:"w-5 h-5"})})]}),t.jsx("div",{className:"space-y-2",children:se.filter(n=>n.key!==r).map(n=>t.jsxs("button",{type:"button",disabled:A,onClick:()=>ne(j.ids,n),className:"w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-all disabled:opacity-50",children:[t.jsx("span",{className:"w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0",children:t.jsx($,{className:"w-4 h-4"})}),t.jsxs("span",{className:"min-w-0 flex-1",children:[t.jsx("span",{className:"block text-xs font-black text-slate-900",children:n.title}),t.jsxs("span",{className:"block text-[10px] text-slate-500 font-semibold truncate",children:[n.sub,n.phone?` • ${n.phone}`:""]})]}),t.jsx(Y,{className:"w-4 h-4 text-slate-400"})]},n.key))}),A&&t.jsx("p",{className:"text-center text-[11px] font-bold text-slate-500",children:"Saving..."})]})})})()]})}export{Me as default};
