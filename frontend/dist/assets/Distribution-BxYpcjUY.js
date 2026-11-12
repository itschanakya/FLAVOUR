import{c as H,u as xt,e as ut,r as w,j as e,b as ue,p as ht,i as gt,T as ft,N as Ce,k as bt,o as yt}from"./index-Lm91cugm.js";import{M as ee}from"./map-pin-CpeDEyNm.js";import{R as ce}from"./rotate-ccw-B-lVEss7.js";import{S as Pe}from"./sparkles-n1zmNHdD.js";import{C as wt}from"./chevron-left-Bh9Ls34W.js";import{C as vt}from"./calendar-NMjQ-Pba.js";import{C as Ae}from"./chevron-right-CaKktDFA.js";import{P as Nt}from"./phone-BJqSPmAo.js";import{P as kt}from"./package-BWhR8baM.js";import{P as jt}from"./printer-weswWem8.js";import{C as St}from"./circle-check-0tLcuXJd.js";import{C as _t}from"./clock-WCg6E5Q1.js";import{L as Tt}from"./lock-BrixFw05.js";import{a as Et,A as $t}from"./arrow-up-yl6B7Myi.js";import{X as de}from"./x-Bjf6FbyR.js";import{E as Dt}from"./external-link-BWpQL2dd.js";/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const he=H("ArrowLeftRight",[["path",{d:"M8 3 4 7l4 4",key:"9rb6wj"}],["path",{d:"M4 7h16",key:"6tx8e3"}],["path",{d:"m16 21 4-4-4-4",key:"siv7j2"}],["path",{d:"M20 17H4",key:"h6l3hr"}]]);/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Rt=H("Compass",[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["polygon",{points:"16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76",key:"m9r19z"}]]);/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Ct=H("LockOpen",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 9.9-1",key:"1mm8w8"}]]);/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Pt=H("Share2",[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]]);/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Me=H("SquareCheckBig",[["path",{d:"m9 11 3 3L22 4",key:"1pflzl"}],["path",{d:"M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11",key:"1jnkn4"}]]);/**
 * @license lucide-react v0.380.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const At=H("Square",[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}]]),te={name:"Manesar Sector 1, Gurgaon",address:"Sector 1, IMT Manesar, Gurugram, Haryana 122051",lat:28.3588,lng:76.9382},Mt=1.4,It=30,ge=10;function J(n){if(!n)return null;if(typeof n=="object"&&n.lat!==void 0&&n.lng!==void 0){const f=Number(n.lat),d=Number(n.lng);return!isNaN(f)&&!isNaN(d)&&f>=-90&&f<=90&&d>=-180&&d<=180?{lat:f,lng:d}:null}if(typeof n!="string")return null;const c=n.trim(),g=c.match(/^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/);if(g){const f=parseFloat(g[1]),d=parseFloat(g[2]);if(!isNaN(f)&&!isNaN(d)&&f>=-90&&f<=90&&d>=-180&&d<=180)return{lat:f,lng:d}}const p=c.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);if(p)return{lat:parseFloat(p[1]),lng:parseFloat(p[2])};const y=c.match(/[?&](?:q|ll|query)=(-?\d+\.\d+),(-?\d+\.\d+)/);return y?{lat:parseFloat(y[1]),lng:parseFloat(y[2])}:null}function Lt(n,c){if(!n||!c)return 0;const g=6371,p=(c.lat-n.lat)*Math.PI/180,y=(c.lng-n.lng)*Math.PI/180,f=Math.sin(p/2)*Math.sin(p/2)+Math.cos(n.lat*Math.PI/180)*Math.cos(c.lat*Math.PI/180)*Math.sin(y/2)*Math.sin(y/2),d=2*Math.atan2(Math.sqrt(f),Math.sqrt(1-f));return g*d}function we(n,c){const g=Lt(n,c),p=Math.round(g*Mt*10)/10,y=Math.max(2,Math.round(p/It*60));return{distanceKm:p,durationMin:y,isApprox:!0}}const ve="wh_distance_cache_v1";function Ot(){try{const n=localStorage.getItem(ve);return n?JSON.parse(n):{}}catch{return{}}}function zt(n){try{localStorage.setItem(ve,JSON.stringify(n))}catch{}}function fe(){try{localStorage.removeItem(ve)}catch{}}function Ie(n,c){if(!n||!c)return{distanceKm:0,durationMin:0,isApprox:!0};const g=d=>Number(d).toFixed(4),p=`${g(n.lat)},${g(n.lng)}__${g(c.lat)},${g(c.lng)}`,y=Ot();if(y[p])return y[p];const f=we(n,c);return y[p]=f,zt(y),f}function Ve(n,c,g={}){if(!n||n.length===0)return{orderIndices:[],stops:[],legs:[],totalKm:0,totalTourMin:0,returnLeg:null};const p=[c,...n],y=p.length,f=Array.from({length:y},()=>Array(y).fill(null));for(let C=0;C<y;C++)for(let x=0;x<y;x++)C===x?f[C][x]={distanceKm:0,durationMin:0}:f[C][x]=we(p[C],p[x]);const d=n.length,P=new Set,m=[];let R=0;for(let C=0;C<d;C++){let x=-1,h=1/0;for(let E=0;E<d;E++)if(!P.has(E)){const I=E+1,k=f[R][I],$=(k.durationMin||0)*1e3+(k.distanceKm||0);$<h&&(h=$,x=E)}x!==-1&&(P.add(x),m.push(x),R=x+1)}return ye(m,n,c,f,g.departureTime||"07:00")}function Le(n,c,g={}){if(!n||n.length===0)return{orderIndices:[],stops:[],legs:[],totalKm:0,totalTourMin:0,returnLeg:null};const p=n.length,y=[c,...n],f=y.length,d=Array.from({length:f},()=>Array(f).fill(null));for(let x=0;x<f;x++)for(let h=0;h<f;h++)x===h?d[x][h]={distanceKm:0,durationMin:0}:d[x][h]=we(y[x],y[h]);if(p<=12){const x=1<<p,h=Array.from({length:x},()=>new Float64Array(p).fill(1/0)),E=Array.from({length:x},()=>new Int8Array(p).fill(-1));for(let S=0;S<p;S++)h[1<<S][S]=d[0][S+1].distanceKm||0;for(let S=1;S<x;S++)for(let A=0;A<p;A++){if(!(S&1<<A))continue;const _=h[S][A];if(_!==1/0)for(let D=0;D<p;D++){if(S&1<<D)continue;const G=S|1<<D,W=_+(d[A+1][D+1].distanceKm||0);W<h[G][D]&&(h[G][D]=W,E[G][D]=A)}}const I=(1<<p)-1;let k=1/0,$=-1;for(let S=0;S<p;S++){const A=h[I][S]+(d[S+1][0].distanceKm||0);A<k&&(k=A,$=S)}const M=[];let v=$,O=I;for(;v!==-1;){M.push(v);const S=E[O][v];O^=1<<v,v=S}return M.reverse(),ye(M,n,c,d,g.departureTime||"07:00")}let m=[...Ve(n,c,g).orderIndices],R=!0,C=0;for(;R&&C<300;){R=!1,C++;for(let x=0;x<p-1;x++){for(let h=x+1;h<p;h++){const E=x===0?0:m[x-1]+1,I=m[x]+1,k=m[h]+1,$=h===p-1?0:m[h+1]+1,M=(d[E][I].distanceKm||0)+(d[k][$].distanceKm||0);if((d[E][k].distanceKm||0)+(d[I][$].distanceKm||0)+.001<M){const O=m.slice(x,h+1).reverse();m.splice(x,O.length,...O),R=!0;break}}if(R)break}}return ye(m,n,c,d,g.departureTime||"07:00")}function ye(n,c,g,p,y="07:00"){const f=n.length,d=[],P=[];let m=0,R=0;const C=k=>{const $=(k||"07:00").match(/(\d{1,2}):(\d{2})/);return $?parseInt($[1],10)*60+parseInt($[2],10):420},x=k=>{const $=Math.floor(k/60)%24,M=k%60;return`${String($).padStart(2,"0")}:${String(M).padStart(2,"0")}`};let h=C(y),E=0;for(let k=0;k<f;k++){const $=n[k],M=c[$],v=$+1,O=p[E][v],S=O.distanceKm||0,A=O.durationMin||0;m+=S,R+=A,h+=A;const _=x(h);h+=ge;const D=M.demand_time?C(M.demand_time):null,G=D!==null&&h-ge>D+15,W=D!==null&&(D<360||D>1200),Y=p[0][v],Q={...M,delivery_sequence:k+1,leg_km:Math.round(S*10)/10,leg_min:A,eta:_,wh_distance_km:Math.round((Y.distanceKm||0)*10)/10,wh_duration_min:Y.durationMin||0,is_late:G,is_odd_time:W};d.push(Q),P.push({from:E===0?"Warehouse":c[n[k-1]].institution_name,to:M.institution_name,distanceKm:Q.leg_km,durationMin:A,eta:_}),E=v}let I=null;if(f>0){const k=n[f-1]+1,$=p[k][0],M=Math.round(($.distanceKm||0)*10)/10,v=$.durationMin||0;m+=M,R+=v,h+=v,I={title:"Return to Warehouse",address:g.address||"Sector 1, IMT Manesar, Gurugram",distanceKm:M,durationMin:v,returnTime:x(h)}}return{orderIndices:n,stops:d,legs:P,totalKm:Math.round(m*10)/10,totalDrivingMin:R,totalTourMin:R+f*ge,returnLeg:I}}function Oe(n,c){if(!n||n.length===0)return[];const g=[c,...n.map(d=>J(d.google_location)||d),c].filter(d=>d&&d.lat&&d.lng),p=8,y=[];let f=1;for(let d=0;d<g.length-1;d+=p){const P=g.slice(d,Math.min(d+p+1,g.length));if(P.length<2)break;const m=`${P[0].lat.toFixed(6)},${P[0].lng.toFixed(6)}`,R=`${P[P.length-1].lat.toFixed(6)},${P[P.length-1].lng.toFixed(6)}`,C=P.slice(1,P.length-1).map(k=>`${k.lat.toFixed(6)},${k.lng.toFixed(6)}`).join("|");let x=`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(m)}&destination=${encodeURIComponent(R)}`;C&&(x+=`&waypoints=${encodeURIComponent(C)}`);const h=d===0?"Warehouse":`Stop #${d}`,E=d+P.length-1,I=E>=g.length-1?"Warehouse":`Stop #${E}`;y.push({partNumber:f,label:`Part ${f} (${h} ➔ ${I})`,url:x,qrUrl:`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(x)}`}),f++}return y}const ze=Ve,se=n=>typeof n=="string"?n.split("T")[0]:"",ae=n=>{const c=(n||"").split("-");return c.length===3?`${c[2]}/${c[1]}/${c[0]}`:n||"Undated"},be=n=>{try{return new Date(`${n}T00:00:00`).toLocaleDateString("en-IN",{weekday:"long"})}catch{return""}},Fe=n=>{if(n.google_location&&n.google_location.startsWith("http"))return n.google_location;const c=`${n.institution_name}, ${n.complete_address||""}, PIN ${n.pin_code||""}, India`;return`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c)}`},Ke={PENDING:"bg-amber-50 text-amber-700 border-amber-200",OUT_FOR_DELIVERY:"bg-blue-50 text-blue-700 border-blue-200",ARRIVED:"bg-indigo-50 text-indigo-700 border-indigo-200",DELIVERED:"bg-emerald-50 text-emerald-700 border-emerald-200",REJECTED:"bg-rose-50 text-rose-700 border-rose-200"};function ss(){const{token:n}=xt(),{events:c}=ut(),[g,p]=w.useState([]),[y,f]=w.useState([]),[d,P]=w.useState(!0),[m,R]=w.useState(""),[C,x]=w.useState(null),[h,E]=w.useState([]),[I,k]=w.useState({open:!1,ids:[]}),[$,M]=w.useState(!1),[v,O]=w.useState(()=>{try{const t=localStorage.getItem("fb_warehouse_depot");return t?JSON.parse(t):te}catch{return te}}),[S,A]=w.useState(!1),[_,D]=w.useState(()=>{try{const t=localStorage.getItem("fb_warehouse_depot");return t?JSON.parse(t):te}catch{return te}}),[G,W]=w.useState(!1),[Y,Q]=w.useState({}),[Ne,ke]=w.useState(!1),[X,qe]=w.useState({}),[Ge,Ue]=w.useState(()=>{try{const t=localStorage.getItem("locked_delivery_stops");return t?JSON.parse(t):[]}catch{return[]}}),[T,V]=w.useState({open:!1,loading:!1,applying:!1,plan:null,respectLocks:!0,schoolTimeAware:!1}),[We,Be]=w.useState(!0),[L,U]=w.useState({open:!1,stop:null,inputVal:"",resolving:!1,error:""}),[ne,re]=w.useState(null),z=w.useCallback(async()=>{if(n)try{const t=Date.now(),s={Authorization:`Bearer ${n}`},[a,r,o]=await Promise.all([fetch(`/api/delivery/demands?t=${t}`,{headers:s}),fetch(`/api/delivery/partners?t=${t}`,{headers:s}),fetch(`/api/delivery/warehouse?t=${t}`,{headers:s})]);if(a.ok){const u=await a.json().catch(()=>null);Array.isArray(u)&&p(u)}if(r.ok){const u=await r.json().catch(()=>null);Array.isArray(u)&&f(u)}if(o.ok&&(o.headers.get("content-type")||"").includes("application/json")){const i=await o.json().catch(()=>null);i&&i.warehouse&&(O(i.warehouse),D(i.warehouse),localStorage.setItem("fb_warehouse_depot",JSON.stringify(i.warehouse)))}}catch(t){console.error("Distribution fetch error:",t)}finally{P(!1)}},[n]);w.useEffect(()=>{z()},[z]),w.useEffect(()=>{(c!=null&&c.DEMAND_UPDATED||c!=null&&c.timestamp)&&z(),c!=null&&c.WAREHOUSE_SETTINGS_UPDATED&&z()},[c==null?void 0:c.DEMAND_UPDATED,c==null?void 0:c.WAREHOUSE_SETTINGS_UPDATED,c==null?void 0:c.timestamp,z]);const[je,Je]=w.useState(!1),[F,Se]=w.useState("DRIVER"),He=[{key:"DRIVER",label:"CAR"},{key:"PORTER",label:"PORTER"},{key:"SELF_DELIVERY",label:"SELF DELIVERY"}],Ye=t=>{Ue(s=>{const a=s.includes(t)?s.filter(r=>r!==t):[...s,t];try{localStorage.setItem("locked_delivery_stops",JSON.stringify(a))}catch{}return a})},oe=w.useMemo(()=>g.filter(t=>(t.delivery_mode||"DRIVER")!==F?!1:F==="DRIVER"?!!t.delivery_partner_id:!!(t.delivery_partner_id||t.delivery_partner_name)),[g,F]),le=w.useMemo(()=>{const t={};return oe.forEach(s=>{const a=se(s.demand_date);t[a]||(t[a]={date:a,stops:0,packets:0}),t[a].stops+=1,t[a].packets+=Number(s.total_quantity)||0}),Object.values(t).sort((s,a)=>s.date<a.date?-1:1)},[oe]),ie=()=>{const t=new Date;return`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`},_e=()=>{const t=new Date;return t.setDate(t.getDate()+1),`${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,"0")}-${String(t.getDate()).padStart(2,"0")}`};w.useEffect(()=>{m||R(ie())},[m]);const Te=t=>{const s=new Date(`${m||ie()}T00:00:00`);s.setDate(s.getDate()+t),R(`${s.getFullYear()}-${String(s.getMonth()+1).padStart(2,"0")}-${String(s.getDate()).padStart(2,"0")}`)},Ee=t=>t.sort((s,a)=>{const r=Number(s.delivery_sequence)||0,o=Number(a.delivery_sequence)||0;return r!==o?r-o:(s.id||0)-(a.id||0)});w.useEffect(()=>{if(!g.length||!v)return;const t=g.filter(a=>se(a.demand_date)===m),s={};t.forEach(a=>{const r=J(a.google_location);r?s[a.id]=Ie(v,r):s[a.id]={distanceKm:0,durationMin:0,noGeotag:!0}}),Q(s)},[g,m,v]);const $e=()=>{ke(!0),fe();const t=g.filter(a=>se(a.demand_date)===m),s={};t.forEach(a=>{const r=J(a.google_location);r?s[a.id]=Ie(v,r):s[a.id]={distanceKm:0,durationMin:0,noGeotag:!0}}),Q(s),setTimeout(()=>ke(!1),300)},pe=w.useMemo(()=>g.filter(s=>se(s.demand_date)===m).filter(s=>!J(s.google_location)),[g,m]),Z=w.useMemo(()=>{const t=oe.filter(a=>se(a.demand_date)===m);if(F==="DRIVER")return y.filter(a=>!["PORTER","SELF_SERVICE"].includes(a.vehicle_type)).map(a=>{const r=Ee(t.filter(o=>String(o.delivery_partner_id)===String(a.id)));return{key:`p${a.id}`,partnerId:a.id,vehicle_no:a.vehicle_no,name:a.name,phone:a.phone,stops:r}});const s={};return t.forEach(a=>{const r=a.delivery_partner_name||(F==="PORTER"?"Porter":"Self Delivery");s[r]||(s[r]={key:r,partnerId:null,vehicle_no:F==="PORTER"?"PORTER":"SELF DELIVERY",name:r,phone:a.delivery_partner_phone||"",stops:[]}),s[r].stops.push(a)}),Object.values(s).map(a=>({...a,stops:Ee(a.stops)}))},[oe,y,m,F]),me=w.useMemo(()=>{const t={};return Z.forEach(s=>{const a=X[s.key]||{mode:"najdik",schoolTimeAware:!1,departureTime:"07:00"},r=s.stops.map(i=>{const l=J(i.google_location);return{...i,lat:l?l.lat:v.lat+.05,lng:l?l.lng:v.lng+.05}}),o=a.mode==="kam_km"?Le(r,v,{departureTime:a.departureTime}):ze(r,v,{schoolTimeAware:a.schoolTimeAware,departureTime:a.departureTime}),u=a.mode==="kam_km"?ze(r,v,{schoolTimeAware:a.schoolTimeAware,departureTime:a.departureTime}):Le(r,v,{departureTime:a.departureTime});t[s.key]={tour:o,altKm:u.totalKm,altName:a.mode==="kam_km"?"Nearest First":"Shortest Distance (Min Km)",departureTime:a.departureTime||"07:00",mode:a.mode||"najdik",schoolTimeAware:!!a.schoolTimeAware}}),t},[Z,X,v]),xe=async(t,s=null,a=null)=>{const r=t.key,o=X[r]||{mode:"najdik",schoolTimeAware:!1,departureTime:"07:00"},u=s!==null?s:o.mode,i=a!==null?a:o.schoolTimeAware;re(r);try{const l=await fetch("/api/delivery/optimize-car-route",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({partnerId:t.partnerId,date:m,mode:u,schoolTimeAware:i,departureTime:o.departureTime||"07:00"})}),j=await l.json();if(!l.ok)throw new Error(j.error||"Failed to optimize route");qe(N=>({...N,[r]:{...o,mode:u,schoolTimeAware:i}})),await z()}catch(l){alert(l.message||"Route optimization error")}finally{re(null)}},Qe=async()=>{const t=Z.filter(s=>s.partnerId&&s.stops.length>0);if(!t.length){alert("No active cars with assigned stops found for this date.");return}re("ALL");try{for(const s of t){const a=X[s.key]||{mode:"najdik",schoolTimeAware:!1,departureTime:"07:00"};await fetch("/api/delivery/optimize-car-route",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({partnerId:s.partnerId,date:m,mode:a.mode||"najdik",schoolTimeAware:a.schoolTimeAware||!1,departureTime:a.departureTime||"07:00"})})}await z(),alert(`Routes for all ${t.length} vehicles have been successfully optimized and set.`)}catch(s){alert("Error setting routes: "+s.message)}finally{re(null)}},De=async()=>{V(t=>({...t,open:!0,loading:!0,plan:null}));try{const t=await fetch("/api/delivery/auto-plan",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({date:m,respectLocks:T.respectLocks,schoolTimeAware:T.schoolTimeAware})}),s=await t.json();if(!t.ok)throw new Error(s.error||"Failed to generate auto plan");V(a=>({...a,plan:s.plan,loading:!1}))}catch(t){alert(t.message||"Auto plan error"),V(s=>({...s,open:!1,loading:!1}))}},Xe=async()=>{if(!(!T.plan||!T.plan.carPlans)){V(t=>({...t,applying:!0}));try{const t=await fetch("/api/delivery/apply-auto-plan",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({carPlans:T.plan.carPlans})}),s=await t.json();if(!t.ok)throw new Error(s.error||"Failed to apply auto plan");V({open:!1,loading:!1,applying:!1,plan:null,respectLocks:!0,schoolTimeAware:!1}),await z(),alert(s.message||"Auto Plan successfully applied!")}catch(t){alert(t.message||"Error applying plan"),V(s=>({...s,applying:!1}))}}},Re=async(t,s,a)=>{const r=a==="UP"?s-1:s+1;if(r<0||r>=t.length)return;const o=[...t];[o[s],o[r]]=[o[r],o[s]];const u=o.map((i,l)=>({id:i.id,delivery_sequence:l+1}));x(t[s].id),p(i=>i.map(l=>{const j=u.find(N=>N.id===l.id);return j?{...l,delivery_sequence:j.delivery_sequence}:l}));try{const i=await fetch("/api/delivery/reorder",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({sequences:u})});if(!i.ok){let l="Failed to save order";try{const j=await i.json();j&&j.error&&(l=j.error)}catch{}throw new Error(l)}}catch(i){alert(i.message),z()}finally{x(null)}},Ze=t=>E(s=>s.includes(t)?s.filter(a=>a!==t):[...s,t]),et=t=>{const s=t.filter(r=>(r.delivery_status||"PENDING")!=="DELIVERED").map(r=>r.id),a=s.length>0&&s.every(r=>h.includes(r));E(r=>a?r.filter(o=>!s.includes(o)):Array.from(new Set([...r,...s])))},tt=w.useMemo(()=>[...y.filter(s=>s.is_active!==0&&!["PORTER","SELF_SERVICE"].includes(s.vehicle_type)).map(s=>({key:"D:"+s.id,mode:"DRIVER",partnerId:s.id,title:s.name?`${s.name} - ${s.vehicle_no||"CAR"}`:s.vehicle_no||"CAR",sub:s.vehicle_model||"Delivery Vehicle",phone:s.phone})),{key:"PORTER",mode:"PORTER",partnerId:null,title:"PORTER",sub:"Handled by Porter"},{key:"SELF_DELIVERY",mode:"SELF_DELIVERY",partnerId:null,title:"SELF DELIVERY",sub:"Admin Direct"}],[y]),st=t=>{const s=t.delivery_mode||"DRIVER";return s==="DRIVER"?"D:"+t.delivery_partner_id:s},at=async(t,s)=>{if(!t.length||!s)return;M(!0);const a=g,r=s.mode==="DRIVER"?y.find(o=>o.id===s.partnerId):null;p(o=>o.map(u=>t.includes(u.id)?s.mode==="DRIVER"?{...u,delivery_mode:"DRIVER",delivery_partner_id:s.partnerId,delivery_partner_name:(r==null?void 0:r.name)||u.delivery_partner_name,delivery_partner_phone:(r==null?void 0:r.phone)||"",delivery_partner_vehicle:(r==null?void 0:r.vehicle_no)||"",delivery_sequence:9999}:{...u,delivery_mode:s.mode,delivery_partner_id:null,delivery_partner_name:s.mode==="PORTER"?"Handled by Porter":"Admin Self Delivery",delivery_partner_phone:s.mode==="PORTER"?"Porter Staff":"Self Service Rep",delivery_sequence:9999}:u));try{const o=await fetch("/api/delivery/switch",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({demandIds:t,targetMode:s.mode,targetPartnerId:s.partnerId})}),u=await o.json().catch(()=>({}));if(!o.ok)throw new Error(u.error||"Failed to transfer demand");u.skipped&&u.skipped.length&&alert(`${u.skipped.length} delivered demand(s) were not moved.`),E(i=>i.filter(l=>!t.includes(l))),k({open:!1,ids:[]}),s.mode!==F&&Se(s.mode),await z()}catch(o){p(a),alert(o.message||"Failed to transfer demand")}finally{M(!1)}},nt=async t=>{t&&t.preventDefault(),W(!0);try{localStorage.setItem("fb_warehouse_depot",JSON.stringify(_)),O(_);try{const s=await fetch("/api/delivery/warehouse",{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify(_)});if((s.headers.get("content-type")||"").includes("application/json")){const r=await s.json().catch(()=>null);r&&r.warehouse&&(O(r.warehouse),localStorage.setItem("fb_warehouse_depot",JSON.stringify(r.warehouse)))}}catch(s){console.warn("Backend warehouse sync error:",s)}A(!1),fe(),$e(),alert("Warehouse Depot settings successfully saved!")}catch(s){alert(s.message||"Error saving warehouse settings")}finally{W(!1)}},rt=async()=>{if(!(!L.inputVal||!L.stop)){U(t=>({...t,resolving:!0,error:""}));try{const t=L.stop.institution_id,s=L.stop.institution_name,a=L.inputVal.trim(),r=J(a),o=r?`${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}`:a;let u=!1;try{const i=await fetch("/api/delivery/resolve-geotag",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({institution_id:t,institution_name:s,google_location:a})});if((i.headers.get("content-type")||"").includes("application/json")){const j=await i.json().catch(()=>null);i.ok&&j&&(u=!0)}}catch(i){console.warn("resolve-geotag route warning:",i)}if(!u&&t)try{(await fetch(`/api/institutions/${t}`,{method:"PUT",headers:{"Content-Type":"application/json",Authorization:`Bearer ${n}`},body:JSON.stringify({google_location:o})})).ok&&(u=!0)}catch(i){console.warn("PUT institutions fallback warning:",i)}p(i=>i.map(l=>t&&l.institution_id===t||s&&l.institution_name===s||l.id===L.stop.id?{...l,google_location:o}:l)),U({open:!1,stop:null,inputVal:"",resolving:!1,error:""}),fe(),z().catch(()=>{})}catch(t){U(s=>({...s,resolving:!1,error:t.message||"Geotag save failed"}))}}},ot=(t,s)=>{const a=t.name?t.vehicle_no&&t.vehicle_no!==t.name?`${t.name} - ${t.vehicle_no}`:t.name:t.vehicle_no||"DRIVER",r=me[`p${t.partnerId||t.id}`]||{},o=r.tour||{},u=Oe(s,v);let i=`🚚 *DISTRIBUTION LIST - ${a}*
`;i+=`📅 ${ae(m)} (${be(m)})
`,i+=`🏭 *DEPOT:* ${v.name||"Manesar Sector 1"}
`,i+=`⏰ *DEPARTURE:* ${r.departureTime||"07:00"} AM
`,i+=`📍 *TOTAL ROUTE:* ${o.totalKm||0} km • ${Math.floor((o.totalTourMin||0)/60)}h ${(o.totalTourMin||0)%60}m (${s.length} Stops)

`,s.forEach((N,q)=>{const b=Y[N.id]||{},K=N.leg_km||(b.distanceKm?`${b.distanceKm} km`:"—"),B=N.eta||"08:00";i+=`${q+1}. *${(N.institution_name||"").toUpperCase()}* - ${N.total_quantity||0} Pkts
`,i+=`   ⏰ ETA: ${B} | Leg: ${K} (${b.distanceKm||"—"} km from depot)
`,i+=`   PIN ${N.pin_code||"—"}${N.ano_cto_contact?" | 📞 "+N.ano_cto_contact:""}
`,i+=`   ${Fe(N)}

`}),o.returnLeg&&(i+=`🏁 *RETURN TO WAREHOUSE:* ${o.returnLeg.address}
`,i+=`   Return Time: ${o.returnLeg.returnTime} (${o.returnLeg.distanceKm} km return leg)

`),u.length>0&&(i+=`🗺️ *GOOGLE MAPS NAVIGATION (FULL ROUTE):*
`,u.forEach(N=>{i+=`${N.label}:
${N.url}

`}));let l=(t.phone||"").replace(/\D/g,"");l.length===10&&(l="91"+l);const j=l?`https://api.whatsapp.com/send?phone=${l}&text=${encodeURIComponent(i)}`:`https://api.whatsapp.com/send?text=${encodeURIComponent(i)}`;window.open(j,"_blank")},lt=(t,s)=>{if(!s||s.length===0)return;const a=window.open("","_blank","width=900,height=1000");if(!a){alert("Please allow popups to print delivery run sheet.");return}const r=s.reduce((b,K)=>b+(Number(K.total_quantity)||0),0),o=ae(m),u=be(m),i=t.name||"DRIVER",l=t.vehicle_no||"CAR",j=me[`p${t.partnerId||t.id}`]||{},N=j.tour||{},q=Oe(s,v);a.document.open(),a.document.write(`
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Delivery Run Sheet - ${i} (${l}) - ${o}</title>
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
              grid-template-columns: repeat(5, 1fr);
              gap: 8px;
              background-color: #ffffff;
              border: 1.5px solid #000000;
              border-radius: 4px;
              padding: 6px 10px;
              margin-bottom: 10px;
            }
            .summary-col label {
              display: block;
              font-size: 8px;
              font-weight: 800;
              color: #000000;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 2px;
            }
            .summary-col .val {
              font-size: 11px;
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
              font-size: 9px;
              text-transform: uppercase;
              letter-spacing: 0.4px;
              border: 1.5px solid #000000;
            }
            .seq-cell {
              text-align: center;
              font-weight: 900;
              font-size: 11px;
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
            .wh-tag {
              display: inline-block;
              font-size: 8px;
              font-weight: 800;
              border: 1px solid #000000;
              padding: 1px 4px;
              margin-top: 2px;
            }
            .pkts-cell {
              text-align: center;
              font-weight: 900;
              font-size: 12px;
              color: #000000;
              background-color: #ffffff;
              width: 55px;
            }
            .eta-cell {
              text-align: center;
              font-weight: 900;
              font-size: 10.5px;
              width: 70px;
            }
            .eta-sub {
              font-size: 8px;
              font-weight: normal;
              margin-top: 1px;
            }
            .pin-cell {
              text-align: center;
              font-weight: 900;
              font-size: 9.5px;
              width: 60px;
            }
            .unit-cell {
              text-align: center;
              font-weight: 800;
              font-size: 9.5px;
              width: 70px;
            }
            .contact-cell {
              font-size: 9px;
              width: 110px;
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
              width: 100px;
              height: 36px;
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
              font-size: 10.5px;
            }
            .total-row td {
              border-top: 2px solid #000000;
              border-bottom: 2px solid #000000;
              color: #000000 !important;
            }
            .return-row {
              background-color: #ffffff;
              border: 1.5px solid #000000;
              font-weight: 900;
              font-size: 10px;
            }
            .qr-section {
              margin-top: 10px;
              margin-bottom: 10px;
              border: 1.5px solid #000000;
              border-radius: 4px;
              padding: 8px;
              page-break-inside: avoid;
            }
            .qr-grid {
              display: flex;
              gap: 16px;
              align-items: center;
              justify-content: space-around;
            }
            .qr-card {
              text-align: center;
            }
            .qr-card img {
              border: 1px solid #000000;
              padding: 2px;
            }
            .qr-card .qr-label {
              font-size: 9px;
              font-weight: 900;
              margin-top: 3px;
              text-transform: uppercase;
            }
            .footer-signatures {
              margin-top: 12px;
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 16px;
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
              <div>Delivery Date: <strong>${o} (${u})</strong></div>
              <div>Generated: <strong>${new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"})}</strong></div>
            </div>
          </div>

          <div class="summary-grid">
            <div class="summary-col">
              <label>Assigned Driver</label>
              <div class="val">${i}</div>
            </div>
            <div class="summary-col">
              <label>Vehicle / Car No</label>
              <div class="val">${l}</div>
            </div>
            <div class="summary-col">
              <label>Departure From Depot</label>
              <div class="val">${j.departureTime||"07:00"} AM</div>
            </div>
            <div class="summary-col">
              <label>Total Refreshment Load</label>
              <div class="val">${r.toLocaleString("en-IN")} Pkts (${s.length} Stops)</div>
            </div>
            <div class="summary-col">
              <label>Total Route Distance</label>
              <div class="val">${N.totalKm||0} km • ${Math.floor((N.totalTourMin||0)/60)}h ${(N.totalTourMin||0)%60}m</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 28px; text-align: center;">#</th>
                <th>Institution Name & Address</th>
                <th style="width: 70px; text-align: center;">ETA / Leg</th>
                <th style="width: 55px; text-align: center;">PIN</th>
                <th style="width: 65px; text-align: center;">Unit</th>
                <th style="width: 55px; text-align: center;">Packets</th>
                <th style="width: 110px;">ANO / Contact</th>
                <th style="width: 100px; text-align: center;">Receiver Sign & Stamp</th>
              </tr>
            </thead>
            <tbody>
              ${s.map((b,K)=>{const B=Number(b.total_quantity)||0,it=b.complete_address?`<div class="inst-addr">${b.complete_address}</div>`:"",ct=b.ano_cto_name?`<div class="contact-name">${b.ano_cto_name}</div>`:'<div class="contact-name">ANO / Caretaker</div>',dt=b.ano_cto_contact?`<div class="contact-phone">Tel: ${b.ano_cto_contact}</div>`:"",pt=b.unit_code||b.unit_name||"—",mt=b.wh_distance_km?`<div class="wh-tag">${b.wh_distance_km} km from depot</div>`:"";return`
                  <tr>
                    <td class="seq-cell">${K+1}</td>
                    <td>
                      <div class="inst-title">${(b.institution_name||"").toUpperCase()}</div>
                      ${it}
                      ${mt}
                    </td>
                    <td class="eta-cell">
                      <strong>${b.eta||"—"}</strong>
                      <div class="eta-sub">${b.leg_km!==void 0?`Leg: ${b.leg_km} km`:""}</div>
                    </td>
                    <td class="pin-cell">${b.pin_code||"—"}</td>
                    <td class="unit-cell">${pt}</td>
                    <td class="pkts-cell">${B}</td>
                    <td class="contact-cell">
                      ${ct}
                      ${dt}
                    </td>
                    <td class="sign-cell">
                      <div class="sign-prompt">Sign & Stamp</div>
                    </td>
                  </tr>
                `}).join("")}
              <tr class="total-row">
                <td colspan="5" style="text-align: right; padding-right: 10px; font-weight: 900;">
                  TOTAL REFRESHMENT LOAD (${s.length} STOPS):
                </td>
                <td class="pkts-cell" style="font-weight: 900; font-size: 13px;">
                  ${r.toLocaleString("en-IN")}
                </td>
                <td colspan="2" style="font-size: 9px; font-weight: 800; padding-left: 8px;">
                  Verified & Dispatched in Full
                </td>
              </tr>
              ${N.returnLeg?`
                <tr class="return-row">
                  <td class="seq-cell" style="background: #f2f2f2;">🏁</td>
                  <td colspan="4">
                    <strong>RETURN: Central Warehouse Depot (${v.name})</strong>
                    <div class="inst-addr">${N.returnLeg.address}</div>
                  </td>
                  <td class="eta-cell" colspan="3" style="text-align: right; padding-right: 10px;">
                    Expected Return In-Time: <strong>${N.returnLeg.returnTime}</strong>
                    <span style="font-size: 8.5px; margin-left: 6px;">(${N.returnLeg.distanceKm} km return leg)</span>
                  </td>
                </tr>
              `:""}
            </tbody>
          </table>

          ${q.length>0?`
            <div class="qr-section">
              <div style="font-size: 9.5px; font-weight: 900; text-transform: uppercase; margin-bottom: 6px; text-align: center;">
                📱 Scan QR Code on Driver Phone for Google Maps Turn-By-Turn Route Navigation
              </div>
              <div class="qr-grid">
                ${q.map(b=>`
                  <div class="qr-card">
                    <img src="${b.qrUrl}" alt="${b.label}" width="84" height="84" />
                    <div class="qr-label">${b.label}</div>
                  </div>
                `).join("")}
              </div>
            </div>
          `:""}

          <div class="footer-signatures">
            <div class="sign-box">
              Driver Route Clearance (${i})
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
    `),a.document.close(),setTimeout(()=>{try{if(a&&!a.closed){const b=a.document,K=b?b.getElementById("printManifestBtn"):null;K&&(K.onclick=function(){try{a.focus(),a.print()}catch(B){console.error(B)}},K.addEventListener("click",function(){try{a.focus(),a.print()}catch(B){console.error(B)}})),a.focus(),a.print()}}catch(b){console.warn("Opener direct print trigger:",b)}},400)};return d?e.jsx("div",{className:"p-12 text-center font-bold text-slate-500",children:"Loading distribution..."}):e.jsxs("div",{className:"space-y-4 max-w-full overflow-x-hidden",children:[e.jsxs("div",{className:"flex flex-col sm:flex-row sm:items-center justify-between gap-3",children:[e.jsxs("div",{children:[e.jsxs("h1",{className:"text-xl font-black text-slate-900 flex items-center gap-2",children:[e.jsx(ue,{className:"w-6 h-6 text-cyan-600"})," Distribution & Route Planning"]}),e.jsx("p",{className:"text-xs text-slate-500 font-medium mt-0.5",children:"Automatic warehouse distance, nearest-neighbour route optimization, and balanced car assignment."})]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsxs("button",{type:"button",onClick:()=>A(!0),className:"px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer",title:"Edit warehouse depot location & routing settings",children:[e.jsx(ee,{className:"w-3.5 h-3.5 text-rose-600"}),e.jsx("span",{className:"hidden sm:inline",children:"Depot:"})," ",v.name.split(",")[0],e.jsx(ht,{className:"w-3 h-3 text-slate-400 ml-0.5"})]}),e.jsxs("button",{type:"button",onClick:$e,disabled:Ne,className:"px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center gap-1 shadow-2xs cursor-pointer disabled:opacity-50",title:"Recalculate road distances from warehouse",children:[e.jsx(Rt,{className:`w-3.5 h-3.5 text-blue-600 ${Ne?"animate-spin":""}`}),e.jsx("span",{className:"hidden md:inline",children:"Refresh Distances"})]}),e.jsxs("button",{type:"button",onClick:Qe,disabled:ne==="ALL",className:"px-3 py-1.5 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-800 text-xs font-black flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50",title:"Run Nearest-First route optimization across all cars",children:[e.jsx(ce,{className:`w-3.5 h-3.5 text-indigo-600 ${ne==="ALL"?"animate-spin":""}`}),e.jsx("span",{children:"Optimize All Routes"})]}),e.jsxs("button",{type:"button",onClick:De,className:"px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-xs transition-all cursor-pointer",title:"Auto-assign orders across cars with geographic clustering",children:[e.jsx(Pe,{className:"w-4 h-4 text-slate-950"}),e.jsx("span",{children:"Auto Plan"})]}),e.jsx("button",{onClick:z,className:"p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 cursor-pointer",title:"Refresh demands & drivers",children:e.jsx(gt,{className:"w-4 h-4"})})]})]}),We&&pe.length>0&&e.jsxs("div",{className:"bg-amber-50 border border-amber-300 rounded-2xl p-3 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs",children:[e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(ft,{className:"w-4 h-4 text-amber-600 shrink-0 mt-0.5"}),e.jsxs("div",{className:"text-xs",children:[e.jsxs("strong",{className:"font-black",children:[pe.length," stops missing GPS Geotags"]})," (Excluded from automated routing).",e.jsx("span",{className:"text-[11px] block text-amber-800 mt-0.5",children:"Stops without GPS coordinates cannot be road-optimized. Set coordinates to include them."})]})]}),e.jsxs("div",{className:"flex items-center gap-2 self-end sm:self-center",children:[e.jsx("button",{type:"button",onClick:()=>U({open:!0,stop:pe[0],inputVal:"",resolving:!1,error:""}),className:"px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-black cursor-pointer shadow-2xs",children:"Set Geotag"}),e.jsx("button",{type:"button",onClick:()=>Be(!1),className:"text-amber-700 hover:text-amber-900 text-xs font-bold px-1.5 py-0.5",children:"Dismiss"})]})]}),e.jsx("div",{className:"flex items-center bg-slate-100 p-1 rounded-2xl w-fit",children:He.map(t=>e.jsx("button",{onClick:()=>Se(t.key),className:`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${F===t.key?"bg-white text-blue-700 shadow-sm":"text-slate-600 hover:text-slate-900"}`,children:t.label},t.key))}),e.jsxs("div",{className:"bg-white rounded-2xl border border-slate-200 shadow-sm p-3 space-y-2.5",children:[e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsx("button",{onClick:()=>Te(-1),className:"p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer",title:"Previous day",children:e.jsx(wt,{className:"w-4 h-4"})}),e.jsxs("div",{className:"flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200",children:[e.jsx(vt,{className:"w-4 h-4 text-blue-600"}),e.jsx("input",{type:"date",value:m,onChange:t=>t.target.value&&R(t.target.value),className:"bg-transparent text-xs font-black text-blue-900 focus:outline-none cursor-pointer"}),e.jsx("span",{className:"text-xs font-bold text-blue-700",children:be(m)})]}),e.jsx("button",{onClick:()=>Te(1),className:"p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 cursor-pointer",title:"Next day",children:e.jsx(Ae,{className:"w-4 h-4"})}),e.jsx("button",{type:"button",onClick:()=>R(ie()),className:`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${m===ie()?"bg-slate-900 text-white shadow-xs":"bg-slate-100 text-slate-700 hover:bg-slate-200"}`,children:"Today"}),e.jsx("button",{type:"button",onClick:()=>R(_e()),className:`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${m===_e()?"bg-blue-600 text-white shadow-xs":"bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"}`,children:"Tomorrow"}),le.length>0&&e.jsx("button",{onClick:()=>Je(t=>!t),className:"ml-auto px-3 py-1.5 rounded-xl text-xs font-black bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 cursor-pointer",children:je?"Hide Days":`Show Days (${le.length})`})]}),je&&le.length>0&&e.jsx("div",{className:"flex items-center gap-2 overflow-x-auto pt-1 pb-3.5",style:{scrollbarWidth:"thin",scrollbarColor:"#94a3b8 #f1f5f9"},children:le.map(t=>e.jsxs("button",{onClick:()=>R(t.date),className:`px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap border transition-all cursor-pointer ${m===t.date?"bg-blue-600 text-white border-blue-600":"bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"}`,children:[ae(t.date)," (",t.stops," • ",t.packets," Pkts)"]},t.date))})]}),F!=="DRIVER"&&Z.length===0&&e.jsxs("div",{className:"text-center text-xs text-slate-400 italic py-8 bg-white rounded-2xl border border-dashed border-slate-200",children:["No ",F==="PORTER"?"Porter":"Self Delivery"," demands on ",ae(m)]}),e.jsx("div",{className:"grid grid-cols-1 xl:grid-cols-3 gap-5",children:Z.map(t=>{const s=t.stops,a=s.reduce((l,j)=>l+(Number(j.total_quantity)||0),0),r=me[t.key]||{},o=r.tour||{},u=ne===t.key||ne==="ALL",i=X[t.key]||{mode:"najdik",schoolTimeAware:!1};return e.jsxs("div",{className:"bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden",children:[e.jsxs("div",{className:"px-3 py-2.5 bg-slate-50/90 border-b border-slate-200 space-y-2",children:[e.jsxs("div",{className:"flex items-center gap-2 flex-nowrap overflow-x-auto",style:{scrollbarWidth:"none",msOverflowStyle:"none"},children:[e.jsx("div",{className:"w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0",children:e.jsx(ue,{className:"w-4 h-4"})}),e.jsxs("span",{className:"font-black text-sm text-slate-900 whitespace-nowrap uppercase",children:[t.name||"DRIVER",t.vehicle_no&&t.vehicle_no!==t.name?e.jsxs("span",{className:"font-extrabold text-slate-600",children:[" - ",t.vehicle_no]}):""]}),t.phone&&e.jsxs("a",{href:`tel:${t.phone}`,className:"text-[11px] text-blue-600 font-bold flex items-center gap-0.5 whitespace-nowrap",children:[e.jsx(Nt,{className:"w-3 h-3"}),t.phone]}),e.jsxs("span",{className:"px-1.5 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-800 text-[10px] font-black whitespace-nowrap",children:[s.length," Stops"]}),e.jsxs("span",{className:"px-1.5 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 text-[10px] font-black flex items-center gap-1 whitespace-nowrap",children:[e.jsx(kt,{className:"w-3 h-3"}),a," Pkts"]}),e.jsxs("button",{onClick:()=>et(s),disabled:s.length===0,className:"ml-auto px-2 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 text-slate-700 text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer",title:"Select all stops of this car",children:[e.jsx(Me,{className:"w-3 h-3"})," All"]}),e.jsxs("button",{type:"button",onClick:()=>lt(t,s),disabled:s.length===0,className:"px-2 py-1 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer shadow-xs active:scale-95 transition-all",title:"Print portrait delivery run sheet for this driver",children:[e.jsx(jt,{className:"w-3 h-3"})," Print"]}),e.jsxs("button",{onClick:()=>ot(t,s),disabled:s.length===0,className:"px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-[10px] font-black flex items-center gap-1 shrink-0 cursor-pointer",title:"Send this day's list on WhatsApp",children:[e.jsx(Pt,{className:"w-3 h-3"})," Share"]})]}),s.length>0&&e.jsxs("div",{className:"pt-1 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-1.5 text-xs",children:[e.jsxs("div",{className:"flex items-center gap-2 flex-wrap",children:[e.jsxs("span",{className:"px-2 py-0.5 rounded-lg bg-slate-900 text-white font-black text-[11px] flex items-center gap-1",children:[e.jsx(Ce,{className:"w-3 h-3 text-cyan-400"}),o.totalKm||0," km • ",Math.floor((o.totalTourMin||0)/60),"h ",(o.totalTourMin||0)%60,"m"]}),e.jsxs("button",{type:"button",onClick:()=>xe(t,i.mode==="kam_km"?"najdik":"kam_km"),disabled:u,className:"px-2 py-0.5 rounded-lg bg-white border border-slate-300 hover:border-indigo-400 text-[10px] font-bold text-slate-800 flex items-center gap-1 cursor-pointer",title:"Click to toggle between Nearest First and Min Distance",children:[e.jsx(bt,{className:"w-3 h-3 text-indigo-600"}),i.mode==="kam_km"?"Mode: Min Km":"Mode: Nearest First"]}),e.jsxs("button",{type:"button",onClick:()=>xe(t,null,!i.schoolTimeAware),disabled:u,className:`px-1.5 py-0.5 rounded-lg text-[10px] font-bold border cursor-pointer ${i.schoolTimeAware?"bg-amber-100 text-amber-900 border-amber-300":"bg-white text-slate-600 border-slate-200 hover:bg-slate-50"}`,title:"Toggle School Time Priority",children:["🕒 School Time ",i.schoolTimeAware?"ON":"OFF"]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[r.altKm!==void 0&&e.jsxs("span",{className:"text-[10px] text-slate-500 font-semibold",title:r.altName,children:["Alternative: ",e.jsxs("strong",{className:"text-slate-700",children:[r.altKm," km"]})]}),e.jsxs("button",{type:"button",onClick:()=>xe(t),disabled:u,className:"px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[10px] font-black flex items-center gap-1 cursor-pointer shadow-2xs disabled:opacity-50",title:"Re-order stops starting with stop closest to warehouse",children:[e.jsx(ce,{className:`w-3 h-3 ${u?"animate-spin":""}`}),e.jsx("span",{children:"Set Route"})]})]})]})]}),e.jsx("div",{className:"p-3 space-y-2 flex-1",children:s.length===0?e.jsxs("div",{className:"text-center text-xs text-slate-400 italic py-8",children:["Nothing assigned on ",m?ae(m):"this day"]}):e.jsxs(e.Fragment,{children:[s.map((l,j)=>{const N=l.delivery_status||"PENDING",q=Ge.includes(l.id),b=Y[l.id]||{},K=!!J(l.google_location);return e.jsxs("div",{className:`p-2.5 rounded-xl border bg-white flex items-center gap-2 transition-all ${h.includes(l.id)?"border-blue-400 ring-2 ring-blue-100":q?"border-indigo-200 bg-indigo-50/20":"border-slate-200"}`,children:[e.jsx("button",{type:"button",onClick:()=>Ze(l.id),disabled:N==="DELIVERED",className:"shrink-0 text-slate-400 hover:text-blue-600 disabled:opacity-30 cursor-pointer",title:"Select for transfer",children:h.includes(l.id)?e.jsx(Me,{className:"w-4 h-4 text-blue-600"}):e.jsx(At,{className:"w-4 h-4"})}),e.jsx("span",{className:`w-7 h-7 rounded-lg text-xs font-black flex items-center justify-center shrink-0 ${N==="DELIVERED"?"bg-emerald-600 text-white":j===0?"bg-indigo-600 text-white ring-2 ring-indigo-200":"bg-slate-800 text-white"}`,title:j===0?"Stop #1: Nearest to Depot":`Stop #${j+1}`,children:N==="DELIVERED"?e.jsx(St,{className:"w-4 h-4"}):j+1}),e.jsxs("div",{className:"min-w-0 flex-1",children:[e.jsxs("div",{className:"flex items-center gap-1.5 flex-wrap",children:[e.jsx("span",{className:"font-extrabold text-xs text-slate-900 truncate uppercase",children:(l.institution_name||"").toUpperCase()}),K&&b.distanceKm>0?e.jsxs("span",{className:"px-1.5 py-0.2 rounded text-[9.5px] font-black bg-slate-100 text-slate-700 border border-slate-300",title:`Road distance from warehouse (${v.name})`,children:["📍 ",b.distanceKm," km • ",b.durationMin," min"]}):e.jsx("button",{type:"button",onClick:()=>U({open:!0,stop:l,inputVal:"",resolving:!1,error:""}),className:"px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-100 cursor-pointer",title:"Click to set GPS Geotag",children:"⚠️ Pending Geotag"})]}),e.jsxs("div",{className:"text-[10px] text-slate-500 font-medium flex flex-wrap items-center gap-x-1.5 mt-0.5",children:[l.unit_code&&e.jsx("span",{className:"font-bold text-indigo-700",children:l.unit_code}),e.jsxs("span",{className:"flex items-center gap-0.5",children:[e.jsx(ee,{className:"w-3 h-3"}),"PIN ",l.pin_code]}),l.demand_time&&e.jsxs("span",{className:"flex items-center gap-0.5",children:[e.jsx(_t,{className:"w-3 h-3"}),l.demand_time]}),l.eta&&e.jsxs("span",{className:"text-slate-700 font-bold bg-blue-50 px-1 rounded border border-blue-200",children:["ETA: ",l.eta]})]}),e.jsxs("div",{className:"flex items-center gap-1.5 mt-1 flex-wrap",children:[e.jsx("span",{className:`inline-block px-1.5 py-0.2 rounded border text-[9px] font-black ${Ke[N]||Ke.PENDING}`,children:N.replace(/_/g," ")}),l.is_odd_time&&e.jsx("span",{className:"text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-300 px-1 rounded",children:"⚠️ Check Delivery Time"}),l.is_late&&e.jsx("span",{className:"text-[9px] font-bold text-rose-700 bg-rose-50 border border-rose-300 px-1 rounded",children:"⚠️ Late vs Demand Time"})]})]}),e.jsx("button",{type:"button",onClick:()=>Ye(l.id),className:`p-1.5 rounded-lg border transition-all cursor-pointer ${q?"bg-indigo-100 text-indigo-800 border-indigo-300":"bg-slate-50 text-slate-400 hover:text-slate-600 border-slate-200"}`,title:q?"Stop is LOCKED (Auto-Plan will not move it)":"Click to LOCK this stop",children:q?e.jsx(Tt,{className:"w-3.5 h-3.5"}):e.jsx(Ct,{className:"w-3.5 h-3.5"})}),e.jsx("button",{type:"button",onClick:()=>k({open:!0,ids:[l.id]}),disabled:N==="DELIVERED",className:"shrink-0 p-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-700 disabled:opacity-30 active:scale-95 transition-all cursor-pointer",title:"Switch to another car / Porter / Self Delivery",children:e.jsx(he,{className:"w-3.5 h-3.5"})}),e.jsxs("div",{className:"flex flex-col items-end gap-1 shrink-0",children:[e.jsxs("span",{className:"text-xs font-black text-indigo-900 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md",children:[l.total_quantity||0," Pkts"]}),e.jsxs("div",{className:"flex items-center gap-1",children:[e.jsx("a",{href:Fe(l),target:"_blank",rel:"noopener noreferrer",className:"p-1 rounded-md bg-blue-50 text-blue-600 border border-blue-200",title:"Navigate in Google Maps",children:e.jsx(Ce,{className:"w-3.5 h-3.5"})}),e.jsx("button",{onClick:()=>Re(s,j,"UP"),disabled:j===0||C===l.id,className:"p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer",title:"Deliver earlier",children:e.jsx(Et,{className:"w-3.5 h-3.5"})}),e.jsx("button",{onClick:()=>Re(s,j,"DOWN"),disabled:j===s.length-1||C===l.id,className:"p-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 cursor-pointer",title:"Deliver later",children:e.jsx($t,{className:"w-3.5 h-3.5"})})]})]})]},l.id)}),o.returnLeg&&e.jsxs("div",{className:"p-2.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 flex items-center justify-between text-xs font-bold text-slate-700",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"w-7 h-7 rounded-lg bg-slate-200 text-slate-800 font-black text-xs flex items-center justify-center shrink-0",children:"🏁"}),e.jsxs("div",{children:[e.jsx("div",{className:"font-black text-slate-900",children:"Return to Warehouse"}),e.jsx("div",{className:"text-[10px] text-slate-500 font-medium truncate max-w-[180px]",children:o.returnLeg.address})]})]}),e.jsxs("div",{className:"text-right",children:[e.jsxs("div",{className:"font-black text-slate-900",children:["ETA: ",o.returnLeg.returnTime]}),e.jsxs("div",{className:"text-[10px] text-slate-500",children:[o.returnLeg.distanceKm," km return leg"]})]})]})]})})]},t.key)})}),h.length>0&&!I.open&&e.jsxs("div",{className:"fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white rounded-2xl shadow-2xl px-4 py-3 flex items-center gap-3 flex-wrap justify-center max-w-[95vw]",children:[e.jsxs("span",{className:"text-xs font-black",children:[h.length," selected (",g.filter(t=>h.includes(t.id)).reduce((t,s)=>t+(Number(s.total_quantity)||0),0)," Pkts)"]}),e.jsxs("button",{type:"button",onClick:()=>k({open:!0,ids:h}),className:"px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 text-xs font-black flex items-center gap-1.5 cursor-pointer",children:[e.jsx(he,{className:"w-3.5 h-3.5"})," Transfer"]}),e.jsx("button",{type:"button",onClick:()=>E([]),className:"px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold cursor-pointer",children:"Clear"})]}),I.open&&(()=>{const t=g.filter(o=>I.ids.includes(o.id)),s=new Set(t.map(st)),a=s.size===1?Array.from(s)[0]:null,r=t.reduce((o,u)=>o+(Number(u.total_quantity)||0),0);return e.jsx("div",{className:"fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4",children:e.jsxs("div",{className:"bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3",children:[e.jsxs("div",{className:"flex items-start justify-between border-b border-slate-100 pb-3",children:[e.jsxs("div",{children:[e.jsxs("h3",{className:"text-sm font-black text-slate-900 flex items-center gap-1.5",children:[e.jsx(he,{className:"w-4 h-4 text-amber-600"})," Transfer ",t.length," demand",t.length!==1?"s":""]}),e.jsx("p",{className:"text-[11px] text-slate-500 font-bold mt-0.5 truncate max-w-[240px]",children:t.length===1?t[0].institution_name:`${r} packets total`})]}),e.jsx("button",{type:"button",onClick:()=>k({open:!1,ids:[]}),className:"p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer",children:e.jsx(de,{className:"w-5 h-5"})})]}),e.jsx("div",{className:"space-y-2",children:tt.filter(o=>o.key!==a).map(o=>e.jsxs("button",{type:"button",disabled:$,onClick:()=>at(I.ids,o),className:"w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50 text-left transition-all disabled:opacity-50 cursor-pointer",children:[e.jsx("span",{className:"w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0",children:e.jsx(ue,{className:"w-4 h-4"})}),e.jsxs("span",{className:"min-w-0 flex-1",children:[e.jsx("span",{className:"block text-xs font-black text-slate-900",children:o.title}),e.jsxs("span",{className:"block text-[10px] text-slate-500 font-semibold truncate",children:[o.sub,o.phone?` • ${o.phone}`:""]})]}),e.jsx(Ae,{className:"w-4 h-4 text-slate-400"})]},o.key))}),$&&e.jsx("p",{className:"text-center text-[11px] font-bold text-slate-500",children:"Saving..."})]})})})(),T.open&&e.jsx("div",{className:"fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5",children:e.jsxs("div",{className:"bg-white rounded-3xl max-w-3xl w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto",children:[e.jsxs("div",{className:"flex items-center justify-between border-b border-slate-100 pb-3",children:[e.jsxs("div",{children:[e.jsxs("h3",{className:"text-base font-black text-slate-900 flex items-center gap-2",children:[e.jsx(Pe,{className:"w-5 h-5 text-amber-500"}),"Auto Plan Assignment Preview"]}),e.jsx("p",{className:"text-xs text-slate-500 font-medium mt-0.5",children:"Review planned car clusters, balanced packet counts, and route distances before applying."})]}),e.jsx("button",{type:"button",onClick:()=>V(t=>({...t,open:!1})),className:"p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer",children:e.jsx(de,{className:"w-5 h-5"})})]}),e.jsxs("div",{className:"p-3 bg-slate-50 rounded-2xl flex items-center justify-between flex-wrap gap-2 text-xs",children:[e.jsxs("label",{className:"flex items-center gap-2 cursor-pointer font-bold text-slate-700",children:[e.jsx("input",{type:"checkbox",checked:T.respectLocks,onChange:t=>{const s=t.target.checked;V(a=>({...a,respectLocks:s}))},className:"rounded text-indigo-600 cursor-pointer"}),e.jsx("span",{children:"Respect manually locked stops"})]}),e.jsxs("label",{className:"flex items-center gap-2 cursor-pointer font-bold text-slate-700",children:[e.jsx("input",{type:"checkbox",checked:T.schoolTimeAware,onChange:t=>{const s=t.target.checked;V(a=>({...a,schoolTimeAware:s}))},className:"rounded text-indigo-600 cursor-pointer"}),e.jsx("span",{children:"Prioritize School Timings"})]}),e.jsxs("button",{type:"button",onClick:De,disabled:T.loading,className:"px-3 py-1 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-black flex items-center gap-1 cursor-pointer",children:[e.jsx(ce,{className:`w-3.5 h-3.5 ${T.loading?"animate-spin":""}`}),e.jsx("span",{children:"Recalculate Plan"})]})]}),T.loading?e.jsxs("div",{className:"py-12 text-center text-slate-500 font-bold flex flex-col items-center justify-center gap-2",children:[e.jsx(ce,{className:"w-6 h-6 animate-spin text-indigo-600"}),e.jsx("span",{children:"Computing geographical clusters & road routes..."})]}):T.plan?e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"grid grid-cols-2 sm:grid-cols-4 gap-2 text-center",children:[e.jsxs("div",{className:"bg-indigo-50 border border-indigo-200 p-2.5 rounded-2xl",children:[e.jsx("span",{className:"text-[10px] font-black uppercase text-indigo-600 block",children:"Total Cars"}),e.jsx("span",{className:"text-base font-black text-indigo-950",children:T.plan.summary.totalCars})]}),e.jsxs("div",{className:"bg-cyan-50 border border-cyan-200 p-2.5 rounded-2xl",children:[e.jsx("span",{className:"text-[10px] font-black uppercase text-cyan-600 block",children:"Total Stops"}),e.jsx("span",{className:"text-base font-black text-cyan-950",children:T.plan.summary.totalStops})]}),e.jsxs("div",{className:"bg-emerald-50 border border-emerald-200 p-2.5 rounded-2xl",children:[e.jsx("span",{className:"text-[10px] font-black uppercase text-emerald-600 block",children:"Total Packets"}),e.jsx("span",{className:"text-base font-black text-emerald-950",children:T.plan.summary.totalPackets})]}),e.jsxs("div",{className:"bg-amber-50 border border-amber-200 p-2.5 rounded-2xl",children:[e.jsx("span",{className:"text-[10px] font-black uppercase text-amber-700 block",children:"Estimated Km"}),e.jsxs("span",{className:"text-base font-black text-amber-950",children:[T.plan.summary.totalKm," km"]})]})]}),e.jsxs("div",{className:"space-y-2.5",children:[e.jsx("h4",{className:"text-xs font-black text-slate-800 uppercase tracking-wider",children:"Car Allocation Preview:"}),T.plan.carPlans.map((t,s)=>e.jsxs("div",{className:"p-3 border border-slate-200 rounded-2xl bg-white hover:border-indigo-300 transition-all space-y-1.5",children:[e.jsxs("div",{className:"flex items-center justify-between flex-wrap gap-2",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("span",{className:"w-6 h-6 rounded-lg bg-indigo-600 text-white text-xs font-black flex items-center justify-center",children:s+1}),e.jsxs("span",{className:"font-black text-xs text-slate-900",children:[t.driver_name," - ",t.vehicle_no]})]}),e.jsxs("div",{className:"flex items-center gap-2 text-xs",children:[e.jsxs("span",{className:"px-2 py-0.5 rounded-md bg-indigo-50 border border-indigo-200 text-indigo-900 font-black",children:[t.totalStops," Stops"]}),e.jsxs("span",{className:"px-2 py-0.5 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-900 font-black",children:[t.totalPackets," Pkts"]}),e.jsxs("span",{className:"px-2 py-0.5 rounded-md bg-slate-900 text-white font-black",children:[t.totalKm," km • ",Math.floor((t.totalDurationMin||0)/60),"h ",(t.totalDurationMin||0)%60,"m"]})]})]}),e.jsxs("div",{className:"text-[11px] text-slate-500 font-semibold flex items-center gap-1",children:[e.jsx(ee,{className:"w-3 h-3 text-slate-400 shrink-0"}),e.jsxs("span",{children:["Area Coverage: ",e.jsx("strong",{children:t.areaDescription})]}),t.returnLeg&&e.jsxs("span",{className:"ml-auto text-slate-700",children:["Return ETA: ",e.jsx("strong",{children:t.returnLeg.returnTime})]})]})]},s))]}),T.plan.unassignedNoGeo&&T.plan.unassignedNoGeo.length>0&&e.jsxs("div",{className:"p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold",children:["⚠️ ",T.plan.unassignedNoGeo.length," stops without GPS coordinates were excluded from auto-clustering."]})]}):null,e.jsxs("div",{className:"flex items-center justify-end gap-2 pt-3 border-t border-slate-100",children:[e.jsx("button",{type:"button",onClick:()=>V(t=>({...t,open:!1})),className:"px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer",children:"Cancel"}),e.jsxs("button",{type:"button",onClick:Xe,disabled:T.loading||T.applying||!T.plan,className:"px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs",children:[e.jsx(yt,{className:"w-4 h-4"}),e.jsx("span",{children:T.applying?"Applying...":"Apply Plan"})]})]})]})}),S&&e.jsx("div",{className:"fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5",children:e.jsxs("div",{className:"bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4",children:[e.jsxs("div",{className:"flex items-center justify-between border-b border-slate-100 pb-3",children:[e.jsxs("div",{children:[e.jsxs("h3",{className:"text-base font-black text-slate-900 flex items-center gap-2",children:[e.jsx(ee,{className:"w-5 h-5 text-rose-600"}),"Warehouse Depot & Routing Settings"]}),e.jsx("p",{className:"text-xs text-slate-500 font-medium mt-0.5",children:"Set warehouse coordinates for distance computation and return loops."})]}),e.jsx("button",{type:"button",onClick:()=>A(!1),className:"p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer",children:e.jsx(de,{className:"w-5 h-5"})})]}),e.jsxs("form",{onSubmit:nt,className:"space-y-3.5 text-xs",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block font-black text-slate-700 mb-1",children:"Depot / Warehouse Name *"}),e.jsx("input",{type:"text",required:!0,value:_.name,onChange:t=>D({..._,name:t.target.value}),placeholder:"e.g. Manesar Sector 1, Gurgaon",className:"w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:border-indigo-500"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block font-black text-slate-700 mb-1",children:"Address Details"}),e.jsx("input",{type:"text",value:_.address,onChange:t=>D({..._,address:t.target.value}),placeholder:"Sector 1, IMT Manesar, Gurugram, Haryana",className:"w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:border-indigo-500"})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block font-black text-slate-700 mb-1",children:"Latitude (Lat) *"}),e.jsx("input",{type:"number",step:"0.000001",required:!0,value:_.lat,onChange:t=>D({..._,lat:parseFloat(t.target.value)||0}),className:"w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block font-black text-slate-700 mb-1",children:"Longitude (Lng) *"}),e.jsx("input",{type:"number",step:"0.000001",required:!0,value:_.lng,onChange:t=>D({..._,lng:parseFloat(t.target.value)||0}),className:"w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-500"})]})]}),e.jsxs("div",{className:"flex items-center gap-2 flex-wrap pt-1",children:[e.jsx("button",{type:"button",onClick:()=>D(te),className:"px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] cursor-pointer",children:"Reset to Manesar Sector 1"}),e.jsx("button",{type:"button",onClick:()=>{navigator.geolocation?navigator.geolocation.getCurrentPosition(t=>{D(s=>({...s,lat:parseFloat(t.coords.latitude.toFixed(6)),lng:parseFloat(t.coords.longitude.toFixed(6))}))}):alert("Geolocation is not supported by your browser.")},className:"px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] cursor-pointer",children:"📍 Use My Current Location"}),e.jsxs("a",{href:`https://www.google.com/maps/search/?api=1&query=${_.lat},${_.lng}`,target:"_blank",rel:"noopener noreferrer",className:"px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] flex items-center gap-1",children:[e.jsx(Dt,{className:"w-3 h-3"})," View on Maps"]})]}),e.jsx("div",{className:"rounded-xl overflow-hidden border border-slate-300 h-44 bg-slate-100 relative",children:e.jsx("iframe",{title:"Warehouse Geotag Preview",width:"100%",height:"100%",frameBorder:"0",src:`https://www.openstreetmap.org/export/embed.html?bbox=${_.lng-.01}%2C${_.lat-.01}%2C${_.lng+.01}%2C${_.lat+.01}&layer=mapnik&marker=${_.lat}%2C${_.lng}`,style:{border:0}})}),e.jsxs("div",{className:"flex items-center justify-end gap-2 pt-2 border-t border-slate-100",children:[e.jsx("button",{type:"button",onClick:()=>A(!1),className:"px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer",children:"Cancel"}),e.jsx("button",{type:"submit",disabled:G,className:"px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black cursor-pointer shadow-xs disabled:opacity-50",children:G?"Saving...":"Save Warehouse"})]})]})]})}),L.open&&L.stop&&e.jsx("div",{className:"fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4",children:e.jsxs("div",{className:"bg-white rounded-3xl max-w-sm w-full p-5 shadow-2xl space-y-3",children:[e.jsxs("div",{className:"flex items-start justify-between border-b border-slate-100 pb-2",children:[e.jsxs("div",{children:[e.jsxs("h3",{className:"text-sm font-black text-slate-900 flex items-center gap-1.5",children:[e.jsx(ee,{className:"w-4 h-4 text-rose-600"}),"Set GPS Geotag"]}),e.jsx("p",{className:"text-[11px] text-slate-500 font-bold truncate max-w-[240px] mt-0.5",children:L.stop.institution_name})]}),e.jsx("button",{type:"button",onClick:()=>U({open:!1,stop:null,inputVal:"",resolving:!1,error:""}),className:"p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer",children:e.jsx(de,{className:"w-4 h-4"})})]}),e.jsxs("div",{className:"space-y-2 text-xs",children:[e.jsx("label",{className:"block font-black text-slate-700",children:"Enter Lat, Lng or Google Maps Link:"}),e.jsx("input",{type:"text",value:L.inputVal,onChange:t=>U(s=>({...s,inputVal:t.target.value,error:""})),placeholder:"e.g. 28.561285, 77.141532 or maps.app.goo.gl/...",className:"w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-xs text-slate-900 focus:outline-none focus:border-indigo-500"}),e.jsx("p",{className:"text-[10px] text-slate-400",children:"You can paste a WhatsApp Google location pin or raw decimal coordinates."}),L.error&&e.jsx("p",{className:"text-[11px] text-rose-600 font-bold",children:L.error})]}),e.jsxs("div",{className:"flex items-center justify-end gap-2 pt-2 border-t border-slate-100",children:[e.jsx("button",{type:"button",onClick:()=>U({open:!1,stop:null,inputVal:"",resolving:!1,error:""}),className:"px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold cursor-pointer",children:"Cancel"}),e.jsx("button",{type:"button",onClick:rt,disabled:L.resolving||!L.inputVal.trim(),className:"px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black cursor-pointer shadow-xs disabled:opacity-50",children:L.resolving?"Resolving...":"Save Geotag"})]})]})})]})}export{ss as default};
