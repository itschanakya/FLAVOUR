import{c as $,u as xe,e as me,r as p,j as t,b as P,i as he,N as be}from"./index-Ds_H9Vii.js";import{C as fe}from"./chevron-left-BSbA2Vw1.js";import{C as ue}from"./calendar-5cYRLECV.js";import{C as Y}from"./chevron-right-CHz7dbPL.js";import{P as ge}from"./phone-CuoS3IuQ.js";import{P as ye}from"./package-CkesfEUq.js";import{P as ve}from"./printer-DSISQe-E.js";import{C as we}from"./circle-check--wWW5iH2.js";import{M as ke}from"./map-pin-DCSiB0dL.js";import{C as Ne}from"./clock-BsAppiFf.js";import{a as je,A as _e}from"./arrow-up-DWohFCzN.js";import{X as De}from"./x-D4aX-gT4.js";/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const I=$("ArrowLeftRight",[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]]);/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ee=$("Share2",[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]]);/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const W=$("SquareCheckBig",[["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}],["path",{d:"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",key:"1jnkn4"}]]);/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Re=$("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]),G=l=>typeof l=="string"?l.split("T")[0]:"",k=l=>{const d=(l||"").split("-");return d.length===3?`${d[2]}/${d[1]}/${d[0]}`:l||"Undated"},C=l=>{try{return new Date(`${l}T00:00:00`).toLocaleDateString("en-IN",{weekday:"long"})}catch{return""}},H=l=>{if(l.google_location&&l.google_location.startsWith("http"))return l.google_location;const d=`${l.institution_name}, ${l.complete_address||""}, PIN ${l.pin_code||""}, India`;return`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d)}`},K={PENDING:"bg-amber-50 text-amber-700 border-amber-200",OUT_FOR_DELIVERY:"bg-blue-50 text-blue-700 border-blue-200",ARRIVED:"bg-indigo-50 text-indigo-700 border-indigo-200",DELIVERED:"bg-emerald-50 text-emerald-700 border-emerald-200",REJECTED:"bg-rose-50 text-rose-700 border-rose-200"};function qe(){const{token:l}=xe(),{events:d}=me(),[y,N]=p.useState([]),[v,J]=p.useState([]),[X,Q]=p.useState(!0),[x,g]=p.useState(""),[T,L]=p.useState(null),[f,j]=p.useState([]),[_,D]=p.useState({open:!1,ids:[]}),[A,V]=p.useState(!1),u=p.useCallback(async()=>{if(l)try{const e=Date.now(),s={Authorization:`Bearer ${l}`},[n,a]=await Promise.all([fetch(`/api/delivery/demands?t=${e}`,{headers:s}),fetch(`/api/delivery/partners?t=${e}`,{headers:s})]);if(n.ok){const r=await n.json();N(Array.isArray(r)?r:[])}if(a.ok){const r=await a.json();J(Array.isArray(r)?r:[])}}catch(e){console.error("Distribution fetch error:",e)}finally{Q(!1)}},[l]);p.useEffect(()=>{u()},[u]),p.useEffect(()=>{(d!=null&&d.DEMAND_UPDATED||d!=null&&d.timestamp)&&u()},[d==null?void 0:d.DEMAND_UPDATED,d==null?void 0:d.timestamp,u]);const[z,Z]=p.useState(!1),[h,O]=p.useState("DRIVER"),ee=[{key:"DRIVER",label:"CAR"},{key:"PORTER",label:"PORTER"},{key:"SELF_DELIVERY",label:"SELF DELIVERY"}],E=p.useMemo(()=>y.filter(e=>(e.delivery_mode||"DRIVER")!==h?!1:h==="DRIVER"?!!e.delivery_partner_id:!!(e.delivery_partner_id||e.delivery_partner_name)),[y,h]),R=p.useMemo(()=>{const e={};return E.forEach(s=>{const n=G(s.demand_date);e[n]||(e[n]={date:n,stops:0,packets:0}),e[n].stops+=1,e[n].packets+=Number(s.total_quantity)||0}),Object.values(e).sort((s,n)=>s.date<n.date?-1:1)},[E]),S=()=>{const e=new Date;return`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`},M=()=>{const e=new Date;return e.setDate(e.getDate()+1),`${e.getFullYear()}-${String(e.getMonth()+1).padStart(2,"0")}-${String(e.getDate()).padStart(2,"0")}`};p.useEffect(()=>{x||g(S())},[x]);const q=e=>{const s=new Date(`${x||S()}T00:00:00`);s.setDate(s.getDate()+e),g(`${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,"0")}-${String(s.getDate()).padStart(2,"0")}`)},F=e=>e.sort((s,n)=>{const a=Number(s.delivery_sequence)||0,r=Number(n.delivery_sequence)||0;return a!==r?a-r:(s.id||0)-(n.id||0)}),U=p.useMemo(()=>{const e=E.filter(n=>G(n.demand_date)===x);if(h==="DRIVER")return v.filter(n=>!["PORTER","SELF_SERVICE"].includes(n.vehicle_type)).map(n=>({key:`p${n.id}`,vehicle_no:n.vehicle_no,name:n.name,phone:n.phone,stops:F(e.filter(a=>String(a.delivery_partner_id)===String(n.id)))}));const s={};return e.forEach(n=>{const a=n.delivery_partner_name||(h==="PORTER"?"Porter":"Self Delivery");s[a]||(s[a]={key:a,vehicle_no:h==="PORTER"?"PORTER":"SELF DELIVERY",name:a,phone:n.delivery_partner_phone||"",stops:[]}),s[a].stops.push(n)}),Object.values(s).map(n=>({...n,stops:F(n.stops)}))},[E,v,x,h]),B=async(e,s,n)=>{const a=n==="UP"?s-1:s+1;if(a<0||a>=e.length)return;const r=[...e];[r[s],r[a]]=[r[a],r[s]];const o=r.map((c,m)=>({id:c.id,delivery_sequence:m+1}));L(e[s].id),N(c=>c.map(m=>{const i=o.find(b=>b.id===m.id);return i?{...m,delivery_sequence:i.delivery_sequence}:m}));try{const c=await fetch("/api/delivery/reorder",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${l}`},body:JSON.stringify({sequences:o})});if(!c.ok){let m="Failed to save order";try{const i=await c.json();i&&i.error&&(m=i.error)}catch{}throw new Error(m)}}catch(c){alert(c.message),u()}finally{L(null)}},te=e=>j(s=>s.includes(e)?s.filter(n=>n!==e):[...s,e]),se=e=>{const s=e.filter(a=>(a.delivery_status||"PENDING")!=="DELIVERED").map(a=>a.id),n=s.length>0&&s.every(a=>f.includes(a));j(a=>n?a.filter(r=>!s.includes(r)):Array.from(new Set([...a,...s])))},ae=p.useMemo(()=>[...v.filter(s=>s.is_active!==0&&!["PORTER","SELF_SERVICE"].includes(s.vehicle_type)).map(s=>({key:"D:"+s.id,mode:"DRIVER",partnerId:s.id,title:s.name?`${s.name} - ${s.vehicle_no||"CAR"}`:s.vehicle_no||"CAR",sub:s.vehicle_model||"Delivery Vehicle",phone:s.phone})),{key:"PORTER",mode:"PORTER",partnerId:null,title:"PORTER",sub:"Handled by Porter"},{key:"SELF_DELIVERY",mode:"SELF_DELIVERY",partnerId:null,title:"SELF DELIVERY",sub:"Admin Direct"}],[v]),ne=e=>{const s=e.delivery_mode||"DRIVER";return s==="DRIVER"?"D:"+e.delivery_partner_id:s},re=async(e,s)=>{if(!e.length||!s)return;V(!0);const n=y,a=s.mode==="DRIVER"?v.find(r=>r.id===s.partnerId):null;N(r=>r.map(o=>e.includes(o.id)?s.mode==="DRIVER"?{...o,delivery_mode:"DRIVER",delivery_partner_id:s.partnerId,delivery_partner_name:(a==null?void 0:a.name)||o.delivery_partner_name,delivery_partner_phone:(a==null?void 0:a.phone)||"",delivery_partner_vehicle:(a==null?void 0:a.vehicle_no)||"",delivery_sequence:9999}:{...o,delivery_mode:s.mode,delivery_partner_id:null,delivery_partner_name:s.mode==="PORTER"?"Handled by Porter":"Admin Self Delivery",delivery_partner_phone:s.mode==="PORTER"?"Porter Staff":"Self Service Rep",delivery_sequence:9999}:o));try{const r=await fetch("/api/delivery/switch",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${l}`},body:JSON.stringify({demandIds:e,targetMode:s.mode,targetPartnerId:s.partnerId})}),o=await r.json().catch(()=>({}));if(!r.ok)throw new Error(o.error||"Failed to transfer demand");o.skipped&&o.skipped.length&&alert(`${o.skipped.length} delivered demand(s) were not moved.`),j(c=>c.filter(m=>!e.includes(m))),D({open:!1,ids:[]}),s.mode!==h&&O(s.mode),await u()}catch(r){N(n),alert(r.message||"Failed to transfer demand")}finally{V(!1)}},oe=(e,s)=>{let a=`🚚 *DISTRIBUTION LIST - ${e.name?e.vehicle_no&&e.vehicle_no!==e.name?`${e.name} - ${e.vehicle_no}`:e.name:e.vehicle_no||"DRIVER"}*
📅 ${k(x)} (${C(x)})

`;s.forEach((c,m)=>{a+=`${m+1}. *${c.institution_name}* - ${c.total_quantity||0} Pkts
   PIN ${c.pin_code}
   ${H(c)}
`});let r=(e.phone||"").replace(/\D/g,"");r.length===10&&(r="91"+r);const o=r?`https://api.whatsapp.com/send?phone=${r}&text=${encodeURIComponent(a)}`:`https://api.whatsapp.com/send?text=${encodeURIComponent(a)}`;window.open(o,"_blank")},ie=(e,s)=>{if(!s||s.length===0)return;const n=window.open("","_blank","width=900,height=1000");if(!n){alert("Please allow popups to print delivery run sheet.");return}const a=s.reduce((i,b)=>i+(Number(b.total_quantity)||0),0),r=k(x),o=C(x),c=e.name||"DRIVER",m=e.vehicle_no||"CAR";n.document.open(),n.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Delivery Run Sheet - ${c} (${m}) - ${r}</title>
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
              color: #000000;
              background: #ffffff;
              margin: 0;
              padding: 0;
              font-size: 11px;
              line-height: 1.3;
            }
            .screen-action-bar {
              margin-bottom: 12px;
              padding: 8px 12px;
              background: #ffffff;
              border: 1.5px solid #000000;
              border-radius: 4px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              font-weight: 700;
            }
            .print-button {
              background: #000000;
              color: #ffffff;
              border: none;
              padding: 6px 18px;
              border-radius: 4px;
              font-weight: 900;
              font-size: 12px;
              cursor: pointer;
            }
            .header-bar {
              border-bottom: 2px solid #000000;
              padding-bottom: 6px;
              margin-bottom: 8px;
              display: flex;
              justify-content: space-between;
              align-items: flex-end;
            }
            .org-title {
              font-size: 16px;
              font-weight: 900;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              color: #000000;
              margin: 0;
            }
            .doc-subtitle {
              font-size: 10.5px;
              font-weight: 800;
              color: #000000;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              margin-top: 2px;
            }
            .meta-box {
              text-align: right;
              font-size: 10px;
              color: #000000;
              font-weight: 600;
            }
            .meta-box strong {
              color: #000000;
              font-size: 11px;
              font-weight: 900;
            }
            .summary-grid {
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 8px;
              background-color: #ffffff;
              border: 1.5px solid #000000;
              border-radius: 4px;
              padding: 6px 10px;
              margin-bottom: 10px;
            }
            .summary-col label {
              display: block;
              font-size: 8.5px;
              font-weight: 800;
              color: #000000;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .summary-col .val {
              font-size: 12px;
              font-weight: 900;
              color: #000000;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 10px;
            }
            th, td {
              border: 1px solid #000000;
              padding: 5px 6px;
              text-align: left;
              vertical-align: middle;
              color: #000000;
            }
            th {
              background-color: #f2f2f2;
              color: #000000;
              font-weight: 900;
              font-size: 9.5px;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              border: 1.5px solid #000000;
            }
            .seq-cell {
              text-align: center;
              font-weight: 900;
              font-size: 11.5px;
              width: 30px;
              background-color: #ffffff;
            }
            .inst-title {
              font-weight: 900;
              font-size: 11px;
              color: #000000;
            }
            .inst-addr {
              font-size: 8.5px;
              color: #000000;
              margin-top: 1px;
            }
            .pkts-cell {
              text-align: center;
              font-weight: 900;
              font-size: 12px;
              color: #000000;
              background-color: #ffffff;
              width: 60px;
            }
            .pin-cell {
              text-align: center;
              font-weight: 900;
              font-size: 10px;
              width: 65px;
            }
            .unit-cell {
              text-align: center;
              font-weight: 800;
              font-size: 10px;
              width: 75px;
            }
            .contact-cell {
              font-size: 9px;
              width: 120px;
              color: #000000;
            }
            .contact-name {
              font-weight: 800;
              color: #000000;
            }
            .contact-phone {
              color: #000000;
              font-weight: 800;
            }
            .sign-cell {
              width: 110px;
              height: 38px;
              background-color: #ffffff;
              text-align: center;
              vertical-align: bottom;
              padding-bottom: 2px;
            }
            .sign-prompt {
              font-size: 8px;
              font-weight: 700;
              color: #000000;
              border-top: 1px dashed #000000;
              padding-top: 2px;
            }
            .total-row {
              background-color: #f2f2f2 !important;
              color: #000000 !important;
              font-weight: 900;
              font-size: 11px;
            }
            .total-row td {
              border-top: 2px solid #000000;
              border-bottom: 3px double #000000;
              border-left: 1px solid #000000;
              border-right: 1px solid #000000;
              color: #000000 !important;
            }
            .footer-signatures {
              margin-top: 14px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 20px;
              page-break-inside: avoid;
            }
            .sign-box {
              border-top: 1.5px solid #000000;
              padding-top: 4px;
              text-align: center;
              font-size: 9.5px;
              font-weight: 900;
              color: #000000;
            }
            .sign-box .note {
              font-size: 8px;
              color: #000000;
              margin-top: 2px;
              font-weight: 600;
            }
            @media print {
              .screen-action-bar {
                display: none !important;
              }
              body {
                color: #000000 !important;
                background: #ffffff !important;
              }
              * {
                color: #000000 !important;
                border-color: #000000 !important;
              }
              th, .total-row, .total-row td {
                background-color: #f2f2f2 !important;
                color: #000000 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="screen-action-bar">
            <span>🖨️ <strong>Pure Black & White Portrait Delivery Run Sheet</strong> (A4 Format)</span>
            <div style="display: flex; gap: 8px; align-items: center;">
              <span style="font-size: 10px; font-weight: normal; color: #444;">(Shortcut: Ctrl + P)</span>
              <button id="printManifestBtn" class="print-button" type="button" onclick="window.focus(); window.print();">Print / Save PDF</button>
            </div>
          </div>

          <div class="header-bar">
            <div>
              <h1 class="org-title">NCC Refreshment Supply & Distribution</h1>
              <div class="doc-subtitle">Daily Delivery Run Sheet & Gate Pass • Driver Route Manifest</div>
            </div>
            <div class="meta-box">
              <div>Delivery Date: <strong>${r} (${o})</strong></div>
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
                <th style="width: 30px; text-align: center;">#</th>
                <th>Institution Name & Address</th>
                <th style="width: 65px; text-align: center;">PIN</th>
                <th style="width: 75px; text-align: center;">Unit</th>
                <th style="width: 60px; text-align: center;">Packets</th>
                <th style="width: 120px;">ANO / Contact</th>
                <th style="width: 110px; text-align: center;">Receiver Sign & Stamp</th>
              </tr>
            </thead>
            <tbody>
              ${s.map((i,b)=>{const w=Number(i.total_quantity)||0,le=i.complete_address?`<div class="inst-addr">${i.complete_address}</div>`:"",de=i.ano_cto_name?`<div class="contact-name">${i.ano_cto_name}</div>`:'<div class="contact-name">ANO / Caretaker</div>',ce=i.ano_cto_contact?`<div class="contact-phone">Tel: ${i.ano_cto_contact}</div>`:"",pe=i.unit_code||i.unit_name||"—";return`
                  <tr>
                    <td class="seq-cell">${b+1}</td>
                    <td>
                      <div class="inst-title">${i.institution_name}</div>
                      ${le}
                    </td>
                    <td class="pin-cell">${i.pin_code||"—"}</td>
                    <td class="unit-cell">${pe}</td>
                    <td class="pkts-cell">${w}</td>
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
                <td colspan="4" style="text-align: right; padding-right: 10px; font-weight: 900;">
                  TOTAL REFRESHMENT LOAD (${s.length} STOPS):
                </td>
                <td class="pkts-cell" style="font-weight: 900; font-size: 13px;">
                  ${a.toLocaleString("en-IN")}
                </td>
                <td colspan="2" style="font-size: 9.5px; font-weight: 800; padding-left: 8px;">
                  Verified & Dispatched in Full
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
            function triggerPrint() {
              try {
                window.focus();
                window.print();
              } catch (err) {
                console.error('Print trigger error:', err);
              }
            }
            var btn = document.getElementById('printManifestBtn');
            if (btn) {
              btn.addEventListener('click', triggerPrint);
            }
            window.addEventListener('load', function() {
              setTimeout(triggerPrint, 300);
            });
            setTimeout(triggerPrint, 500);
          <\/script>
        </body>
      </html>
    `),n.document.close(),setTimeout(()=>{try{if(n&&!n.closed){const i=n.document,b=i?i.getElementById("printManifestBtn"):null;b&&(b.onclick=function(){try{n.focus(),n.print()}catch(w){console.error(w)}},b.addEventListener("click",function(){try{n.focus(),n.print()}catch(w){console.error(w)}})),n.focus(),n.print()}}catch(i){console.warn("Opener direct print trigger:",i)}},400)};return X?t.jsx("div",{className:"p-12 text-center font-bold text-slate-500",children:"Loading distribution..."}):t.jsxs("div",{className:"space-y-5",children:[t.jsxs("div",{className:"flex items-center justify-between gap-3",children:[t.jsxs("div",{children:[t.jsxs("h1",{className:"text-xl font-black text-slate-900 flex items-center gap-2",children:[t.jsx(P,{className:"w-6 h-6 text-cyan-600"})," Distribution"]}),t.jsx("p",{className:"text-xs text-slate-500 font-medium mt-0.5",children:"Day-wise delivery list of each partner. Use ▲ ▼ to set which stop is delivered first — drivers see the same order."})]}),t.jsx("button",{onClick:u,className:"p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600",title:"Refresh",children:t.jsx(he,{className:"w-4 h-4"})})]}),t.jsx("div",{className:"flex items-center bg-slate-100 p-1 rounded-2xl w-fit",children:ee.map(e=>t.jsx("button",{onClick:()=>O(e.key),className:`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${h===e.key?"bg-white text-blue-700 shadow-sm":"text-slate-600 hover:text-slate-900"}`,children:e.label},e.key))}),t.jsxs("div",{className:"bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-2.5",children:[t.jsxs("div",{className:"flex items-center gap-2",children:[t.jsx("button",{onClick:()=>q(-1),className:"p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700",title:"Previous day",children:t.jsx(fe,{className:"w-4 h-4"})}),t.jsxs("div",{className:"flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200",children:[t.jsx(ue,{className:"w-4 h-4 text-blue-600"}),t.jsx("input",{type:"date",value:x,onChange:e=>e.target.value&&g(e.target.value),className:"bg-transparent text-xs font-black text-blue-900 focus:outline-none"}),t.jsx("span",{className:"text-xs font-bold text-blue-700",children:C(x)})]}),t.jsx("button",{onClick:()=>q(1),className:"p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700",title:"Next day",children:t.jsx(Y,{className:"w-4 h-4"})}),t.jsx("button",{type:"button",onClick:()=>g(S()),className:`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${x===S()?"bg-slate-900 text-white shadow-xs":"bg-slate-100 text-slate-700 hover:bg-slate-200"}`,children:"Today"}),t.jsx("button",{type:"button",onClick:()=>g(M()),className:`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${x===M()?"bg-blue-600 text-white shadow-xs":"bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"}`,children:"Tomorrow"}),R.length>0&&t.jsx("button",{onClick:()=>Z(e=>!e),className:"ml-auto px-3 py-1.5 rounded-xl text-xs font-black bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100",children:z?"Hide Days":`Show Days (${R.length})`})]}),z&&R.length>0&&t.jsx("div",{className:"flex items-center gap-2 overflow-x-auto pt-1 pb-3.5",style:{scrollbarWidth:"thin",scrollbarColor:"#94a3b8 #f1f5f9"},children:R.map(e=>t.jsxs("button",{onClick:()=>g(e.date),className:`px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap border transition-all ${x===e.date?"bg-blue-600 text-white border-blue-600":"bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"}`,children:[k(e.date)," (",e.stops," • ",e.packets," Pkts)"]},e.date))})]}),h!=="DRIVER"&&U.length===0&&t.jsxs("div",{className:"text-center text-xs text-slate-400 italic py-8 bg-white rounded-2xl border border-dashed border-slate-200",children:["No ",h==="PORTER"?"Porter":"Self Delivery"," demands on ",k(x)]}),t.jsx("div",{className:"grid grid-cols-1 xl:grid-cols-3 gap-5",children:U.map(e=>{const s=e.stops,n=s.reduce((a,r)=>a+(Number(r.total_quantity)||0),0);return t.jsxs("div",{className:"bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden",children:[t.jsxs("div",{className:"px-3 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2 flex-nowrap overflow-x-auto",style:{scrollbarWidth:"none",msOverflowStyle:"none"},children:[t.jsx("div",{className:"w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0",children:t.jsx(P,{className:"w-4 h-4"})}),t.jsxs("span",{className:"font-black text-sm text-slate-900 whitespace-nowrap uppercase",children:[e.name||"DRIVER",e.vehicle_no&&e.vehicle_no!==e.name?t.jsxs("span",{className:"font-extrabold text-slate-600",children:[" - ",e.vehicle_no]}):""]}),e.phone&&t.jsxs("a",{href:`tel:${e.phone}`,className:"text-[11px] text-blue-600 font-bold flex items-center gap-0.5 whitespace-nowrap",children:[t.jsx(ge,{className:"w-3 h-3"}),e.phone]}),t.jsxs("span",{className:"px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-black whitespace-nowrap",children:[s.length," Stops"]}),t.jsxs("span",{className:"px-1.5 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 text-[10px] font-black flex items-center gap-1 whitespace-nowrap",children:[t.jsx(ye,{className:"w-3 h-3"}),n," Pkts"]}),t.jsxs("button",{onClick:()=>se(s),disabled:s.length===0,className:"ml-auto px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-[10px] font-black flex items-center gap-1 shrink-0",title:"Select all stops of this car",children:[t.jsx(W,{className:"w-3 h-3"})," All"]}),t.jsxs("button",{type:"button",onClick:()=>ie(e,s),disabled:s.length===0,className:"px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all",title:"Print portrait delivery run sheet for this driver",children:[t.jsx(ve,{className:"w-3 h-3"})," Print"]}),t.jsxs("button",{onClick:()=>oe(e,s),disabled:s.length===0,className:"px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-black flex items-center gap-1 shrink-0",title:"Send this day's list on WhatsApp",children:[t.jsx(Ee,{className:"w-3 h-3"})," Share"]})]}),t.jsx("div",{className:"p-3 space-y-2 flex-1",children:s.length===0?t.jsxs("div",{className:"text-center text-xs text-slate-400 italic py-8",children:["Nothing assigned on ",x?k(x):"this day"]}):s.map((a,r)=>{const o=a.delivery_status||"PENDING";return t.jsxs("div",{className:`p-2.5 rounded-xl border bg-white flex items-center gap-2 ${f.includes(a.id)?"border-blue-400 ring-2 ring-blue-100":"border-slate-200"}`,children:[t.jsx("button",{type:"button",onClick:()=>te(a.id),disabled:o==="DELIVERED",className:"shrink-0 text-slate-400 hover:text-blue-600 disabled:opacity-30",title:"Select for transfer",children:f.includes(a.id)?t.jsx(W,{className:"w-4 h-4 text-blue-600"}):t.jsx(Re,{className:"w-4 h-4"})}),t.jsx("span",{className:`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${o==="DELIVERED"?"bg-emerald-600 text-white":"bg-slate-800 text-white"}`,children:o==="DELIVERED"?t.jsx(we,{className:"w-4 h-4"}):r+1}),t.jsxs("div",{className:"min-w-0 flex-1",children:[t.jsx("div",{className:"font-extrabold text-xs text-slate-900 truncate",children:a.institution_name}),t.jsxs("div",{className:"text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-x-1.5",children:[a.unit_code&&t.jsx("span",{className:"font-bold text-indigo-700",children:a.unit_code}),t.jsxs("span",{className:"flex items-center gap-0.5",children:[t.jsx(ke,{className:"w-3 h-3"}),"PIN ",a.pin_code]}),a.demand_time&&t.jsxs("span",{className:"flex items-center gap-0.5",children:[t.jsx(Ne,{className:"w-3 h-3"}),a.demand_time]})]}),t.jsx("span",{className:`inline-block mt-1 px-1.5 py-0.5 rounded border text-[9px] font-black ${K[o]||K.PENDING}`,children:o.replace(/_/g," ")})]}),t.jsx("button",{type:"button",onClick:()=>D({open:!0,ids:[a.id]}),disabled:o==="DELIVERED",className:"shrink-0 p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 disabled:opacity-30 active:scale-95 transition-all",title:"Switch to another car / Porter / Self Delivery",children:t.jsx(I,{className:"w-4 h-4"})}),t.jsxs("div",{className:"flex flex-col items-end gap-1 shrink-0",children:[t.jsxs("span",{className:"text-xs font-black text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md",children:[a.total_quantity||0," Pkts"]}),t.jsxs("div",{className:"flex items-center gap-1",children:[t.jsx("a",{href:H(a),target:"_blank",rel:"noopener noreferrer",className:"p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200",title:"Navigate",children:t.jsx(be,{className:"w-3.5 h-3.5"})}),t.jsx("button",{onClick:()=>B(s,r,"UP"),disabled:r===0||T===a.id,className:"p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30",title:"Deliver earlier",children:t.jsx(je,{className:"w-3.5 h-3.5"})}),t.jsx("button",{onClick:()=>B(s,r,"DOWN"),disabled:r===s.length-1||T===a.id,className:"p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30",title:"Deliver later",children:t.jsx(_e,{className:"w-3.5 h-3.5"})})]})]})]},a.id)})})]},e.key)})}),f.length>0&&!_.open&&t.jsxs("div",{className:"fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap justify-center max-w-[95vw]",children:[t.jsxs("span",{className:"text-xs font-black",children:[f.length," selected (",y.filter(e=>f.includes(e.id)).reduce((e,s)=>e+(Number(s.total_quantity)||0),0)," Pkts)"]}),t.jsxs("button",{type:"button",onClick:()=>D({open:!0,ids:f}),className:"px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black flex items-center gap-1.5",children:[t.jsx(I,{className:"w-3.5 h-3.5"})," Transfer"]}),t.jsx("button",{type:"button",onClick:()=>j([]),className:"px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold",children:"Clear"})]}),_.open&&(()=>{const e=y.filter(r=>_.ids.includes(r.id)),s=new Set(e.map(ne)),n=s.size===1?Array.from(s)[0]:null,a=e.reduce((r,o)=>r+(Number(o.total_quantity)||0),0);return t.jsx("div",{className:"fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4",children:t.jsxs("div",{className:"bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3",children:[t.jsxs("div",{className:"flex items-start justify-between border-b border-slate-100 pb-3",children:[t.jsxs("div",{children:[t.jsxs("h3",{className:"text-sm font-black text-slate-900 flex items-center gap-1.5",children:[t.jsx(I,{className:"w-4 h-4 text-amber-600"})," Transfer ",e.length," demand",e.length!==1?"s":""]}),t.jsx("p",{className:"text-[11px] text-slate-500 font-bold mt-0.5 truncate max-w-[240px]",children:e.length===1?e[0].institution_name:`${a} packets total`})]}),t.jsx("button",{type:"button",onClick:()=>D({open:!1,ids:[]}),className:"p-1 rounded-lg text-slate-400 hover:text-slate-600",children:t.jsx(De,{className:"w-5 h-5"})})]}),t.jsx("div",{className:"space-y-2",children:ae.filter(r=>r.key!==n).map(r=>t.jsxs("button",{type:"button",disabled:A,onClick:()=>re(_.ids,r),className:"w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-all disabled:opacity-50",children:[t.jsx("span",{className:"w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0",children:t.jsx(P,{className:"w-4 h-4"})}),t.jsxs("span",{className:"min-w-0 flex-1",children:[t.jsx("span",{className:"block text-xs font-black text-slate-900",children:r.title}),t.jsxs("span",{className:"block text-[10px] text-slate-500 font-semibold truncate",children:[r.sub,r.phone?` • ${r.phone}`:""]})]}),t.jsx(Y,{className:"w-4 h-4 text-slate-400"})]},r.key))}),A&&t.jsx("p",{className:"text-center text-[11px] font-bold text-slate-500",children:"Saving..."})]})})})()]})}export{qe as default};
