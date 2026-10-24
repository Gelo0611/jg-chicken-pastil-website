import {JGApi} from './api.js';
import {openAccountSettings} from './account-settings.js';
import {Pending} from './offline.js';
import {submitVerifiedEvent,replayPendingEvent,withExclusiveIssuanceLock} from './issuance-safety.js';
import {qrSvg} from './qr.js';

const api=new JGApi(window.JG_CONFIG||{});
const DEMO=!api.enabled;
const $=s=>document.querySelector(s);
const app=$('#app'),toastEl=$('#toast'),dialog=$('#app-dialog');
const ITEMS={regular:{label:'Regular meal / combo',stamps:1},bff:{label:'BFF Duo',stamps:2},barkada:{label:'Barkada Meal',stamps:4},jar:{label:'Pastil in a Jar',stamps:2}};
// Consistent self-contained SVG icons: no third-party scripts, network requests, or emoji fonts.
const ICON_PATHS={
 star:'<path d="m12 2 3.1 6.3 7 1-5.1 5 1.2 7-6.2-3.3-6.2 3.3 1.2-7-5.1-5 7-1z"/>',
 cup:'<path d="M5 3h14l-1.5 15h-11L5 3Z"/><path d="M9 21h6M12 18v3M14 3l3-2"/>',
 bowl:'<path d="M3 12h18a9 9 0 0 1-18 0Z"/><path d="M7 21h10M8 8c-2-3 2-3 0-6M13 8c-2-3 2-3 0-6M18 8c-2-3 2-3 0-6"/>',
 gift:'<rect x="3" y="9" width="18" height="12" rx="2"/><path d="M12 9v12M3 13h18M12 9c-5-1-6-7-2-7 2 0 2 5 2 7Zm0 0c5-1 6-7 2-7-2 0-2 5-2 7Z"/>',
 close:'<path d="M18 6 6 18M6 6l12 12"/>',
 qr:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M6 6h1m10 0h1M6 17h1m7-3h3v3h-3v4m7-7v4h-3m0 3h3"/>',
 scan:'<path d="M4 9V6a2 2 0 0 1 2-2h3M15 4h3a2 2 0 0 1 2 2v3M20 15v3a2 2 0 0 1-2 2h-3M9 20H6a2 2 0 0 1-2-2v-3M4 12h16"/>',
 search:'<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.7 4.7"/>',
 refresh:'<path d="M20 6v5h-5M4 18v-5h5"/><path d="M5.8 9A7 7 0 0 1 18.4 6.4L20 11M4 13l1.6 4.6A7 7 0 0 0 18.2 15"/>',
 check:'<path d="m5 12 4 4L19 6"/>',
 shield:'<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
 user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 users:'<circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m1 4a5 5 0 0 1 4 5"/>',
 chart:'<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 17v-4m5 4V7m5 10v-7"/>',
 alert:'<path d="M10.3 3.7a2 2 0 0 1 3.4 0L22 18a2 2 0 0 1-1.7 3H3.7A2 2 0 0 1 2 18l8.3-14.3Z"/><path d="M12 9v5m0 3h.01"/>',
 mail:'<rect x="2" y="4" width="20" height="16" rx="3"/><path d="m3 6 9 7 9-7"/>',
 celebrate:'<path d="m4 20 7-3-4-4-3 7ZM7 13l9-9M14 4l1 3m4 0 2-1m-1 7 2 2M10 5 8 3M15 15l2 1"/>',
 sparkle:'<path d="m12 2 2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2Z"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
 eye:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
 eyeOff:'<path d="m3 3 18 18"/><path d="M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a15 15 0 0 1-4 4.7"/><path d="M6.2 6.2C3.5 8.2 2 12 2 12s3.6 7 10 7c1.6 0 3.1-.4 4.4-1"/><path d="M9.6 9.6a3.4 3.4 0 0 0 4.8 4.8"/>'
};
function icon(name,extra=''){
 const path=ICON_PATHS[name]||ICON_PATHS.gift;
 return `<svg class="ui-icon ${extra}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
}
const REWARDS={gulaman:{label:'Free Gulaman',icon:'cup',at:4},busog:{label:'Free Busog Meal',icon:'bowl',at:8}};
const seed=[
 {name:'Ana Reyes',memberCode:'JG-DEMO1001',qrToken:'06d39be1-4b04-4c55-9428-ed765a9b2001',stamps:3,cycle:1,firstPurchaseDone:true,history:[{itemCode:'regular',stamps:1,verifiedAt:'2026-10-17T10:24:00+08:00',branch:'Tamaraw'}]},
 {name:'Carlo Santos',memberCode:'JG-DEMO1002',qrToken:'06d39be1-4b04-4c55-9428-ed765a9b2002',stamps:4,cycle:1,firstPurchaseDone:true,history:[]},
 {name:'Mika Cruz',memberCode:'JG-DEMO1003',qrToken:'06d39be1-4b04-4c55-9428-ed765a9b2003',stamps:8,cycle:1,firstPurchaseDone:true,history:[]},
 {name:'Leo Garcia',memberCode:'JG-DEMO1004',qrToken:'06d39be1-4b04-4c55-9428-ed765a9b2004',stamps:0,cycle:1,firstPurchaseDone:false,history:[]}
];
const expiry=()=>{const date=new Date();date.setMonth(date.getMonth()+6);return date.toISOString()};
const demoDefault=()=>({members:seed.map(x=>({...x,expiresAt:expiry(),vouchers:x.stamps>=4?[{id:x.memberCode+'-G1',kind:'gulaman',cycle:1,expiresAt:expiry(),claimedAt:null}]:[],history:[...x.history]})).map(x=>{if(x.stamps>=8)x.vouchers.push({id:x.memberCode+'-B1',kind:'busog',cycle:1,expiresAt:expiry(),claimedAt:null});return x}),claims:[],notifications:[],stampsTotal:18});
let demo;
try{demo=JSON.parse(localStorage.getItem('jg_suki_demo_v2')||'null')||demoDefault()}catch{demo=demoDefault()}
function saveDemo(){try{localStorage.setItem('jg_suki_demo_v2',JSON.stringify(demo))}catch{ /* opaque preview origin: in-memory demo still works */ }}
let state={role:'customer',user:null,authTab:'login',demoCustomer:demo.members[0].memberCode,card:null,cachedAt:null,member:null,order:'regular',branch:'Tamaraw',busy:false,owner:null,ownerSearch:'',ownerPage:1,ownerAlertsPage:1,ownerClaimsPage:1,pending:[],demoOffline:false,staffAccess:null,staffAccessError:'',accessAccount:null,accessSearch:'',accessSearchMessage:'',staffBusy:false,syncBusy:false};
const online=()=>navigator.onLine&&!state.demoOffline;
let lastAcceptedPurchase=null;
async function withPurchaseLock(work){
 const result=await withExclusiveIssuanceLock(!DEMO?navigator.locks:null,work);
 if(result.busy){toast('Another loyalty purchase/sync is active in this browser. Finish it before trying again.');return;}
 return result.result;
}

const txt=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=v=>v?new Intl.DateTimeFormat('en-PH',{year:'numeric',month:'short',day:'numeric',timeZone:'Asia/Manila'}).format(new Date(v)):'—';
const time=v=>v?new Intl.DateTimeFormat('en-PH',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZone:'Asia/Manila'}).format(new Date(v)):'—';
function uuid(){
 if(typeof crypto.randomUUID==='function')return crypto.randomUUID();
 const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);
 bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;
 const h=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
 return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}
const rewardStatus=v=>v.claimedAt?'claimed':new Date(v.expiresAt)<=new Date()?'expired':'available';
function toast(message){toastEl.textContent=message;toastEl.hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>toastEl.hidden=true,4700)}
function modal(title,description,symbol='gift',actions=''){const content=$('#dialog-content');content.innerHTML=`<div class="modal"><div class="modal-icon">${icon(symbol)}</div><h2>${txt(title)}</h2><p>${txt(description)}</p><div class="modal-actions">${actions||'<button class="button primary" data-action="close-modal">Got it!</button>'}</div></div>`;dialog.removeAttribute('aria-labelledby');if(!dialog.open)dialog.showModal()}
function openQrPreview(card){
 if(!card?.qrToken){toast('Your membership QR is not available yet.');return;}
 const content=$('#dialog-content');
 content.innerHTML=`<div class="modal qr-modal"><button class="qr-modal-close" type="button" data-action="close-modal" aria-label="Close QR preview">${icon('close')}</button><div class="modal-icon" aria-hidden="true">${icon('qr')}</div><h2 id="membership-qr-title">Your membership QR</h2><p>Show this QR code to J&G staff at checkout.</p><div class="qr-modal-frame">${qrSvg(card.qrToken)}</div><div class="qr-modal-meta"><strong>${txt(card.name)}</strong><span class="mono">${txt(card.memberCode)}</span><span class="pill gray">Valid until ${date(card.expiresAt)}</span></div><div class="modal-actions"><button type="button" class="button primary" data-action="close-modal">Done</button></div></div>`;
 dialog.setAttribute('aria-labelledby','membership-qr-title');
 if(!dialog.open)dialog.showModal();
}
function notice(){const connection=$('#connection');connection.classList.toggle('offline',!online());connection.innerHTML=`<span class="dot"></span> ${online()?'Online':'Offline'}`;const banner=$('#mode-notice');if(DEMO){banner.classList.add('show');banner.innerHTML='<b>DESIGN + WORKFLOW DEMO</b> · Sample accounts and sample stamps only. No real customer data or server verification yet.'}else if(!online()){banner.classList.add('show');banner.innerHTML='<b>OFFLINE MODE</b> · Your saved card is last-synced; purchases remain pending until server verification. Rewards cannot be claimed offline.'}else{banner.classList.remove('show');banner.textContent=''}}
function showHeader(){const el=$('#account-actions');if(DEMO){el.innerHTML=''}else if(state.user){el.innerHTML=`<div class="summary-bar"><span class="header-user">${txt(state.user.name)}</span><div class="jg-as-desktop-actions"><button type="button" class="header-exit jg-settings-toggle" data-action="account-settings" aria-label="Open account settings">Account settings</button><button class="header-exit" data-action="logout" ${state.busy||state.syncBusy?'disabled':''}>Log out</button></div><details class="jg-as-mobile-menu"><summary aria-label="Open account menu" title="Account menu" aria-haspopup="true"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"/></svg></summary><div class="jg-as-mobile-panel"><div class="jg-as-mobile-identity"><strong>${txt(state.user.name)}</strong><span class="jg-as-mobile-status">${online()?'Online':'Offline'}</span></div><button type="button" class="jg-as-mobile-action" data-action="account-settings">Account settings</button><button type="button" class="jg-as-mobile-action jg-as-mobile-logout" data-action="logout">Log out</button></div></details></div>`}else el.innerHTML='';const tabs=$('#demo-switch');tabs.hidden=!DEMO;if(DEMO){tabs.innerHTML=['customer','employee','admin'].map(role=>`<button type="button" class="demo-tab ${state.role===role?'active':''}" data-action="role" data-value="${role}" aria-pressed="${state.role===role}">${{customer:icon('user')+' Customer',employee:icon('scan')+' Employee',admin:icon('chart')+' Owner / Admin'}[role]}</button>`).join('')}}
function pageHead(kicker,title,subtitle,actions=''){return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${subtitle}</p></div>${actions}</div>`}
function voucherList(vouchers,employee=false){const list=(vouchers||[]).filter(x=>rewardStatus(x)==='available');return list.length?`<div class="reward-list">${list.map(r=>`<div class="reward-card"><div class="reward-symbol">${icon(REWARDS[r.kind]?.icon||'gift')}</div><div style="min-width:0;flex:1"><strong>${REWARDS[r.kind]?.label||txt(r.kind)}</strong><p>Claim before ${date(r.expiresAt)}</p></div>${employee?`<button class="button primary small" data-action="claim" data-value="${txt(r.id)}" ${!online()?'disabled':''}>Claim</button>`:'<span class="pill gold">READY</span>'}</div>`).join('')}</div>`:'<div class="empty">No rewards available yet. Keep collecting stamps.</div>'}
function stampVisual(c){let n=Math.max(0,Math.min(8,Number(c.stamps)||0));return `<div class="loyalty-visual"><div class="loyalty-card-header"><div><strong>${icon('star')} J&G SUKI REWARDS</strong><small>OFFICIAL VIRTUAL LOYALTY CARD</small></div><div class="loyalty-emblem"><img src="./assets/jg-logo.png" alt=""/></div></div><div class="card-name">${txt(c.name)}</div><div class="card-number">MEMBER ID: ${txt(c.memberCode)}</div><div class="stamps" aria-label="${n} out of 8 stamps">${Array.from({length:8},(_,i)=>`<div aria-label="Stamp ${i+1} ${i<n?'earned':'unearned'}" class="stamp-slot ${i<n?'filled':''} ${i===3||i===7?'milestone':''}">${i<n?icon('check'):String(i+1)}</div>`).join('')}</div><div class="card-bottom"><span>${icon('cup')} <strong>4 STAMPS</strong> · Gulaman</span><span>${icon('bowl')} <strong>8 STAMPS</strong> · Busog Meal</span></div></div>`}
function demoCard(){return demo.members.find(m=>m.memberCode===state.demoCustomer)||demo.members[0]}
function renderCustomer(){const c=DEMO?demoCard():state.card;if(!c){app.innerHTML=pageHead('MY REWARDS','Your Suki Card','Keep collecting stamps on eligible purchases.')+'<div class="empty">Sign in to load your loyalty card.</div>';return;}// P1H-CUSTOMER-HISTORY-EMAIL-20261024-V4: UI-only pagination; no stamp, voucher, or purchase writes.
const purchaseEntries = [...(Array.isArray(c.history)?c.history:[])].sort((a,b)=>{const x=Date.parse(a.verifiedAt)||0,y=Date.parse(b.verifiedAt)||0;return y-x;});
if(state.customerPurchaseCardId!==c.memberCode){state.customerPurchaseCardId=c.memberCode;state.customerPurchasePage=1;}
const purchasePages=Math.max(1,Math.ceil(purchaseEntries.length/5));
state.customerPurchasePage=Math.max(1,Math.min(purchasePages,Number(state.customerPurchasePage)||1));
const purchaseStart=(state.customerPurchasePage-1)*5;
const purchaseVisible=purchaseEntries.slice(purchaseStart,purchaseStart+5);
const active=(c.vouchers||[]).filter(r=>rewardStatus(r)==='available');const qr=c.qrToken;const stampNum=Number(c.stamps||0);
app.innerHTML=pageHead('MY LOYALTY CARD',`Hello, ${txt(c.name.split(' ')[0])}!`,'Every order brings you closer to something delicious.',DEMO?`<label class="field" style="min-width:175px"><small>Preview customer</small><select id="demo-customer" aria-label="Select sample customer">${demo.members.map(p=>`<option ${p.memberCode===c.memberCode?'selected':''} value="${txt(p.memberCode)}">${txt(p.name)}</option>`).join('')}</select></label>`:'')+
(!online()?`<div class="offline-banner">${icon('alert')} You are viewing ${DEMO?'sample data':'your last-synced card'}. New stamps will appear only after verification and synchronization.</div>`:'')+
`<div class="dashboard-layout"><div class="stack">${stampVisual(c)}<div class="panel"><div class="panel-heading"><div><h2>My membership QR</h2><p class="panel-desc">Let your J&G staff scan this at checkout.</p></div><span class="pill green">MEMBER</span></div><div class="qr-area"><button type="button" class="qr-frame qr-trigger" data-action="open-qr" aria-label="Open full-size membership QR code" title="Open full-size QR">${qrSvg(qr)}</button><div class="qr-info"><div class="mini-label">YOUR UNIQUE MEMBER ID</div><strong>${txt(c.memberCode)}</strong><p>Present your QR code or Member ID for stamps and reward claims.</p><p class="qr-help">Tap the QR card or use the button below to open a larger scan-ready view.</p><div class="qr-actions"><button type="button" class="button outline small qr-open-button" data-action="open-qr">Open full-size QR</button></div><span class="pill gray">Valid until ${date(c.expiresAt)}</span></div></div></div></div><div class="customer-right"><div class="highlight"><div><div class="mini-label">YOUR STAMP PROGRESS</div><strong class="mono">${stampNum} / 8</strong><div><span>Collect more to unlock free treats!</span></div></div><div class="reward-icon">${icon('star')}</div></div><div class="panel"><div class="panel-heading"><h2>My rewards</h2><span class="pill gold">${active.length} available</span></div>${voucherList(c.vouchers)}<div class="progress-track"><div class="progress-fill" style="width:${Math.round(100*stampNum/8)}%"></div></div><div class="progress-text">${stampNum<4?`${4-stampNum} stamp(s) to Free Gulaman!`:stampNum<8?`${8-stampNum} stamp(s) to Free Busog Meal!`:'All 8 stamps collected!'}</div></div><div class="panel"><div class="panel-heading"><h2>Recent purchases</h2><span class="pill">${purchaseEntries.length} total</span></div><div class="history-list">${purchaseEntries.length?purchaseVisible.map(t=>`<div class="history-row"><div class="history-left"><div class="history-icon">${icon('star')}</div><div><strong>${txt(ITEMS[t.itemCode]?.label||'Qualifying purchase')}</strong><small>${time(t.verifiedAt)} · ${txt(t.branch||'J&G Stall')}</small></div></div><span class="history-amount">+${Number(t.stamps)||0} ${icon('star')}</span></div>`).join(''):'<div class="empty">Your verified purchases will appear here.</div>'}</div>${purchasePages>1?`<nav class="purchase-pagination" aria-label="Recent purchases pages"><button type="button" class="button outline small" data-action="customer-purchases-page" data-value="${state.customerPurchasePage-1}" ${state.customerPurchasePage===1?'disabled':''}>Previous</button><span class="purchase-page-info" aria-live="polite">Page ${state.customerPurchasePage} of ${purchasePages} · ${purchaseEntries.length} purchases</span><button type="button" class="button outline small" data-action="customer-purchases-page" data-value="${state.customerPurchasePage+1}" ${state.customerPurchasePage===purchasePages?'disabled':''}>Next</button></nav>`:''}</div></div></div>`;
}
function cardMini(member){const unverified=Boolean(member.offlinePendingVerification);return `<div class="customer-mini"><div class="summary-bar"><div><h3>${txt(member.name)}</h3><p>${txt(member.memberCode)}</p></div><span class="pill ${unverified?'gold':'green'}">${unverified?'PENDING ONLINE VERIFICATION':'VERIFIED MEMBER'}</span></div><div class="details"><div><div class="mini-label">CARD STAMPS</div><b>${unverified?'Not verified':`${member.stamps} / 8 ${icon('star')}`}</b></div><div><div class="mini-label">CARD EXPIRY</div><b style="font-size:13px">${unverified?'Online check required':date(member.expiresAt)}</b></div></div></div>`}
function renderEmployee(){const m=state.member;const unverified=Boolean(m?.offlinePendingVerification);const first=m&&m.firstPurchaseDone===false;const expected=first?Math.max(2,ITEMS[state.order].stamps):ITEMS[state.order].stamps;const pending=state.pending.filter(p=>p.demo===DEMO&&p.employeeId===(DEMO?'demo-employee':state.user?.id));
app.innerHTML=pageHead('EMPLOYEE PORTAL','Verify. Stamp. Reward.','Quick and secure loyalty processing for J&G staff.')+
(!online()?`<div class="offline-banner">${icon('alert')} Offline: Purchase requests can be queued, but stamps are NOT issued until approved by the server after reconnecting. Reward claims are disabled.</div>`:'')+
`<div class="staff-layout"><div class="stack"><div class="panel"><div class="panel-heading"><h2>1. Identify customer</h2><span class="pill red">SCAN FIRST</span></div><div class="scan-illustration"><div class="scan-img">${icon('scan')}</div><strong>Ready to scan a loyalty card</strong><small>Scan QR or enter the customer's Member ID below</small></div><button data-action="open-scanner" class="button dark wide">${icon('scan')} Open QR scanner</button><div class="divider"></div><form id="lookup-form" class="form-stack"><label class="field">Member ID or QR token<input id="lookup-input" name="memberId" autocomplete="off" placeholder="e.g. JG-DEMO1001" required /></label><button class="button outline wide" type="submit">${icon('search')} Find customer</button></form>${DEMO?'<p class="hint">Demo IDs: JG-DEMO1001 · JG-DEMO1002 · JG-DEMO1003 · JG-DEMO1004</p>':''}</div><div class="panel"><div class="panel-heading"><h2>Pending purchases / retries</h2><span class="pill ${pending.length?'gold':'gray'}">${pending.length} pending</span></div>${pending.length?pending.map(p=>`<div class="queue-item"><div><strong>${txt(p.memberCode||'QR member')}</strong><br/><span class="muted">${txt(ITEMS[p.item]?.label||p.item)} · not yet verified</span></div><span class="pill gold">PENDING</span></div>`).join(''):'<div class="empty">No unsynced purchase requests.</div>'}<button class="button secondary wide" data-action="sync" ${!online()||!pending.length||state.syncBusy||state.busy?'disabled':''} style="margin-top:13px">${icon('refresh')} Sync pending records</button>${DEMO?`<label class="hint" style="display:flex;align-items:center;gap:8px;margin-top:12px"><input type="checkbox" id="simulate-offline" ${state.demoOffline?'checked':''}/> Simulate offline (demo)</label>`:''}</div></div><div class="stack"><div class="panel"><div class="panel-heading"><h2>2. Verify customer purchase</h2><span class="pill gold">AUTO STAMPS</span></div>${m?cardMini(m):'<div class="empty">Find or scan a customer to continue.</div>'}<form id="award-form" class="form-stack" style="margin-top:20px"><label class="field">Qualifying order<select id="order-select" name="order" ${!m?'disabled':''}>${Object.entries(ITEMS).map(([key,item])=>`<option value="${key}" ${state.order===key?'selected':''}>${item.label} · ${item.stamps} stamps</option>`).join('')}</select></label><label class="field">Store / stall location<select id="branch-select" name="branch" ${!m?'disabled':''}>${['Tamaraw','BB Marulas','Main Stall'].map(x=>`<option ${state.branch===x?'selected':''}>${x}</option>`).join('')}</select></label><div class="earned-preview"><div><strong>Stamps for this purchase</strong><div class="hint">${unverified?'Final stamps determined after online verification':first?'First eligible purchase: minimum 2 stamps':'Based on the selected purchase type'}</div></div><b>${m?(unverified?'—':expected):0} ${icon('star')}</b></div><button type="submit" ${!m||state.busy||state.syncBusy?'disabled':''} class="button primary wide">${online()?'Confirm purchase & issue stamps':'Save pending offline purchase'}</button></form><p class="hint">Only employee-authorized server verification can issue actual stamps. Offline records stay pending.</p></div><div class="panel"><div class="panel-heading"><h2>3. Reward claims</h2><span class="pill gold">CHECK & CLAIM</span></div>${m?voucherList(m.vouchers,true):'<div class="empty">Select a customer to see claimable rewards.</div>'}<p class="hint">Redeeming rewards requires an online server check, even when the card is available offline.</p></div></div></div>`}
function ownerData(){if(!DEMO)return state.owner;const claims=demo.claims.map(cl=>({...cl,claimedAt:cl.claimedAt})).slice().reverse();return {membersTotal:demo.members.length,stampsTotal:demo.stampsTotal,claimsTotal:claims.length,gulamanClaims:claims.filter(c=>c.kind==='gulaman').length,busogClaims:claims.filter(c=>c.kind==='busog').length,availableRewards:demo.members.reduce((n,m)=>n+m.vouchers.filter(v=>rewardStatus(v)==='available').length,0),members:demo.members.map(x=>({...x,availableRewards:x.vouchers.filter(v=>rewardStatus(v)==='available').length})),claims,notifications:demo.notifications.slice().reverse()}}

function ownerEmployeeAccessHtml(){
 if(DEMO)return `<section class="panel staff-control-panel"><div class="panel-heading"><h2>${icon('shield')} Employee access</h2><span class="pill gray">DEMO ONLY</span></div><p class="panel-desc">Only verified owner accounts can grant or revoke real employee access. This preview cannot update roles.</p></section>`;
 const account=state.accessAccount, directory=state.staffAccess?.employees||[],history=state.staffAccess?.history||[];
 const result=account?`<div class="staff-search-result"><div><strong>${txt(account.name)}</strong><small>${txt(account.email)}</small><span class="pill ${account.role==='admin'?'red':account.role==='employee'?'green':'gray'}">${txt(account.role.toUpperCase())}</span>${!account.emailVerified?'<small class="warn">Email not verified — cannot grant access.</small>':''}${!account.active?'<small class="warn">Account disabled — cannot grant access.</small>':''}</div>${account.role==='customer'&&account.active&&account.emailVerified?`<button type="button" class="button primary small" data-action="employee-change" data-value="${txt(account.userId)}" data-enabled="true" ${state.staffBusy?'disabled':''}>${icon('shield')} Grant employee access</button>`:account.role==='employee'?`<button type="button" class="button outline small" data-action="employee-change" data-value="${txt(account.userId)}" data-enabled="false" ${state.staffBusy?'disabled':''}>Revoke access</button>`:'<span class="muted">Protected / not eligible</span>'}</div>`:state.accessSearchMessage?`<div class="empty">${txt(state.accessSearchMessage)}</div>`:'';
 return `<section class="panel staff-control-panel" aria-label="Owner employee access management">
   <div class="panel-heading"><div><h2>${icon('shield')} Employee Access Management</h2><p class="panel-desc">Owner-only authorization. Customers cannot register themselves as employees.</p></div><span class="pill green">ADMIN ONLY</span></div>
   <form id="owner-employee-search-form" class="staff-search-form"><label class="field"><small>Existing customer account email</small><input type="email" autocomplete="off" name="employeeEmail" maxlength="254" placeholder="employee@example.com" value="${txt(state.accessSearch)}" required /></label><button class="button dark" type="submit" ${state.staffBusy?'disabled':''}>${icon('search')} Find account</button></form>
   <p class="hint">The employee must first register and verify their email using the normal customer signup. Registration never grants staff privileges.</p>
   ${result}
   ${state.staffAccessError?`<div class="offline-banner">${icon('alert')} ${txt(state.staffAccessError)}</div>`:''}
   <div class="staff-list-heading"><h3>Authorized employees</h3><span class="pill gray">${directory.length} listed</span></div>
   ${directory.length?`<div class="staff-access-list">${directory.map(s=>`<div class="staff-access-row"><div><strong>${txt(s.name)}</strong><small>${txt(s.email)}</small><span class="pill ${s.active?'green':'red'}">${s.active?'ACTIVE':'DISABLED'}</span></div><button type="button" class="button outline small" data-action="employee-change" data-value="${txt(s.userId)}" data-enabled="false" ${state.staffBusy?'disabled':''}>Revoke access</button></div>`).join('')}</div>`:'<div class="empty">No employee accounts granted yet.</div>'}
   <details class="staff-access-history"><summary>Recent access changes (${history.length})</summary>${history.length?history.map(h=>`<div class="staff-audit-row"><span><b>${txt(h.targetName)}</b> — ${h.newRole==='employee'?'Granted':'Revoked'} by ${txt(h.actorName)}</span><small>${time(h.changedAt)}</small></div>`).join(''):'<p class="hint">No access changes recorded yet.</p>'}</details>
 </section>`;
}
async function ownerStaffRefresh(){
 if(DEMO||state.role!=='admin'||!online())return;
 try{state.staffAccess=await api.ownerStaffDirectory();state.staffAccessError='';}
 catch(e){state.staffAccessError=`Staff permissions could not load: ${e.message}`;}
}
async function ownerFindEmployee(email){
 if(DEMO||state.role!=='admin'||!online())return toast('Owner access lookup requires an online admin session.');
 state.accessSearch=email;state.accessAccount=null;state.accessSearchMessage='';state.staffBusy=true;render();
 try{state.accessAccount=await api.ownerFindAccount(email);if(!state.accessAccount)state.accessSearchMessage='No registered account found for this email.';}
 catch(e){state.accessSearchMessage=e.message;}
 finally{state.staffBusy=false;render();}
}
function requestStaffChange(id,enabled){
 if(DEMO||state.role!=='admin'||!online()||state.staffBusy)return toast('Sign in as the online owner to manage employees.');
 const target=[state.accessAccount,...(state.staffAccess?.employees||[])].find(a=>a&&a.userId===id);
 if(!target)return toast('Refresh the employee list and try again.');
 if(id===state.user?.id)return toast('You cannot change your own admin access.');
 const verb=enabled?'GRANT':'REVOKE';
 modal(`${verb} employee access?`,`${enabled?'Grant staff QR scanner and stamp processing privileges to':'Remove staff QR scanner and stamp processing privileges from'} ${target.name} (${target.email})? This change is immediately enforced by Supabase.`, 'shield',`<button type="button" class="button outline" data-action="close-modal">Cancel</button><button type="button" class="button ${enabled?'primary':'dark'}" data-action="confirm-employee-change" data-value="${txt(id)}" data-enabled="${String(enabled)}">Yes, ${enabled?'grant':'revoke'} access</button>`);
}
async function confirmStaffChange(id,enabled){
 if(DEMO||state.role!=='admin'||!online()||state.staffBusy)return;
 const target=[state.accessAccount,...(state.staffAccess?.employees||[])].find(a=>a&&a.userId===id);
 if(!target)return toast('Account not found; refresh before trying again.');
 dialog.close();state.staffBusy=true;render();
 try{
  const changed=await api.setEmployee(id,enabled);
  await ownerStaffRefresh();
  if(state.accessAccount?.userId===id)state.accessAccount=await api.ownerFindAccount(target.email);
  toast(changed?`Employee access ${enabled?'granted':'revoked'} successfully.`:'Account already has that access state.');
 }catch(e){toast(e.message);}
 finally{state.staffBusy=false;render();}
}

// P1H-A3: Bounded owner lists. Server's newest-first ordering is retained.
const OWNER_PAGE_SIZE=5;
function ownerPaginate(items,key){
 const total=items.length;
 const pages=Math.max(1,Math.ceil(total/OWNER_PAGE_SIZE));
 const requested=Number(state[key]);
 const page=Number.isInteger(requested)?Math.min(Math.max(requested,1),pages):1;
 state[key]=page;
 const offset=(page-1)*OWNER_PAGE_SIZE;
 return {rows:items.slice(offset,offset+OWNER_PAGE_SIZE),page,pages,total,
  from:total?offset+1:0,to:Math.min(total,offset+OWNER_PAGE_SIZE)};
}
function ownerPager(label,action,part){
 return `<nav class="owner-pager" aria-label="${txt(label)} pagination">
  <span class="owner-pager-info" role="status">Showing ${part.from}–${part.to} of ${part.total} · Page ${part.page} of ${part.pages}</span>
  <div class="owner-pager-buttons">
   <button type="button" class="owner-pager-btn" data-action="${action}" data-value="${part.page-1}" ${part.page===1?'disabled':''} aria-label="Previous ${txt(label)} page">Previous</button>
   <button type="button" class="owner-pager-btn" data-action="${action}" data-value="${part.page+1}" ${part.page===part.pages?'disabled':''} aria-label="Next ${txt(label)} page">Next</button>
  </div>
 </nav>`;
}
function renderAdmin(){
 const data=ownerData();
 if(!data){app.innerHTML=pageHead('OWNER OVERVIEW','J&G Loyalty Dashboard','Loading your verified member and reward records…');return;}
 const members=data.members||[];
 const search=state.ownerSearch.trim().toLowerCase();
 const matched=members.filter(x=>String(x.name||'').toLowerCase().includes(search)||String(x.memberCode||'').toLowerCase().includes(search));
 const customers=ownerPaginate(matched,'ownerPage');
 const allAlerts=data.notifications||[];
 const alerts=ownerPaginate(allAlerts,'ownerAlertsPage');
 const allClaims=data.claims||[];
 const claims=ownerPaginate(allClaims,'ownerClaimsPage');
 const unread=allAlerts.filter(n=>!n.readAt).length;

 app.innerHTML=pageHead('OWNER OVERVIEW','Suki Rewards Dashboard','Monitor loyal customers, reward claims, and employee-confirmed activity.',`<button class="button outline small" data-action="refresh-owner">${icon('refresh')} Refresh</button>`)+
 (!online()?`<div class="offline-banner">${icon('alert')} Showing last loaded admin data. New claims will appear after you reconnect.</div>`:'')+
 `<div class="admin-metrics">
  <div class="metric"><div class="eyebrow">TOTAL CUSTOMERS</div><strong class="mono">${data.membersTotal||0}</strong><small>Registered members</small></div>
  <div class="metric"><div class="eyebrow">STAMPS ISSUED</div><strong class="mono">${data.stampsTotal||0}</strong><small>Server-verified stamps</small></div>
  <div class="metric"><div class="eyebrow">REWARDS CLAIMED</div><strong class="mono">${data.claimsTotal||0}</strong><small>${data.gulamanClaims||0} Gulaman · ${data.busogClaims||0} Busog</small></div>
  <div class="metric"><div class="eyebrow">READY TO CLAIM</div><strong class="mono">${data.availableRewards||0}</strong><small>Available vouchers</small></div>
 </div>
 <div class="admin-content">
  <section class="panel">
   <div class="panel-heading"><h2>Customer loyalty monitoring</h2><span class="pill gray">${matched.length} matching</span></div>
   <div class="search-row"><input id="owner-search" class="text-input" aria-label="Search customers" placeholder="Search name or Member ID" value="${txt(state.ownerSearch)}" /></div>
   <div class="table-overflow"><table class="customer-table">
    <thead><tr><th>Customer</th><th>Member ID</th><th>Card</th><th>Stamps</th><th>Rewards</th></tr></thead>
    <tbody>${customers.rows.map(x=>`<tr>
      <td data-label="Customer"><b>${txt(x.name)}</b></td>
      <td data-label="Member ID">${txt(x.memberCode)}</td>
      <td data-label="Card">#${x.cycle}</td>
      <td data-label="Stamps"><span class="pill red">${icon('star')} ${x.stamps}/8</span></td>
      <td data-label="Rewards">${x.availableRewards?`<span class="pill gold">${x.availableRewards} ready</span>`:'—'}</td>
     </tr>`).join('')||'<tr><td colspan="5">No matching members.</td></tr>'}</tbody>
   </table></div>
   ${ownerPager('customers','owner-customers-page',customers)}
   <p class="hint">${DEMO?'Sample member records.':'Showing the latest loaded accounts (up to 150). Page controls cover these loaded records.'}</p>
  </section>
  <div class="stack">
   <section class="panel">
    <div class="panel-heading"><h2>${icon('gift')} Reward claim alerts</h2><span class="pill ${unread?'red':'gray'}">${unread} new</span></div>
    ${allAlerts.length?`<div class="owner-list-scroll" tabindex="0" aria-label="Reward claim alerts">
     ${alerts.rows.map(n=>`<div class="claim-item">
      <div class="claim-emoji">${icon('check')}</div>
      <div style="flex:1;min-width:0"><strong>${txt(n.message)}</strong><small>${time(n.createdAt)}</small></div>
      ${!n.readAt?`<button class="button outline small" data-action="read-notice" data-value="${txt(n.id)}">Seen</button>`:''}
     </div>`).join('')}
    </div>`:'<div class="empty">No reward claims yet.</div>'}
    ${ownerPager('reward alerts','owner-alerts-page',alerts)}
   </section>
   <section class="panel">
    <div class="panel-heading"><h2>Claim breakdown</h2><span class="pill gold">ALL TIME</span></div>
    <div class="cards-quick">
     <div class="quick"><div class="quick-icon">${icon('cup')}</div><b>${data.gulamanClaims||0}</b><small>Free Gulaman claimed</small></div>
     <div class="quick"><div class="quick-icon">${icon('bowl')}</div><b>${data.busogClaims||0}</b><small>Free Busog Meal claimed</small></div>
    </div>
    <div class="divider"></div><div class="mini-label">RECENT CLAIMS</div>
    ${allClaims.length?`<div class="owner-list-scroll" tabindex="0" aria-label="Recent reward claims">
     ${claims.rows.map(c=>`<div class="history-row"><div class="history-left">
      <div class="history-icon">${icon('gift')}</div><div><strong>${txt(c.name)} · ${REWARDS[c.kind]?.label||''}</strong><small>${time(c.claimedAt)} · ${txt(c.employee||'J&G Staff')}</small></div>
     </div></div>`).join('')}
    </div>`:'<div class="empty" style="margin-top:12px">Claims will show here after approval.</div>'}
    ${ownerPager('recent claims','owner-claims-page',claims)}
   </section>
  </div>
 </div>`;
 app.insertAdjacentHTML('beforeend',ownerEmployeeAccessHtml());
}

function renderAuth(){
 const isSignup=state.authTab==='signup';
 const isRecover=state.authTab==='recover';
 const isUpdate=state.authTab==='update-password';
 const needsConfirm=isSignup||isUpdate;
 const passwordField=()=>`<div class="field"><label for="auth-password">${isUpdate?'New password':'Password'}</label><div class="password-row"><input id="auth-password" type="password" name="password" autocomplete="${needsConfirm?'new-password':'current-password'}" minlength="8" placeholder="At least 8 characters" required /><button type="button" class="password-toggle" data-action="toggle-password" data-value="auth-password" aria-controls="auth-password" aria-label="Show password" aria-pressed="false" title="Show password">${icon('eye')}</button></div></div>`;
 const confirmField=()=>`<div class="field"><label for="auth-confirm-password">Confirm password</label><div class="password-row"><input id="auth-confirm-password" type="password" name="confirm_password" autocomplete="new-password" minlength="8" placeholder="Re-enter your password" required /><button type="button" class="password-toggle" data-action="toggle-password" data-value="auth-confirm-password" aria-controls="auth-confirm-password" aria-label="Show confirm password" aria-pressed="false" title="Show confirm password">${icon('eye')}</button></div><small>Both passwords must match.</small></div>`;
 app.innerHTML=`<div class="auth-shell"><div class="auth-left"><img src="./assets/jg-logo.png" alt="J&G Chicken Pastil logo"/><div class="eyebrow" style="color:#ffe2a1">WELCOME, SUKI!</div><h1>Eat more.<br/><span>Earn more.</span><br/>Enjoy more.</h1><p>Join J&G Suki Rewards! Collect stamps with every eligible order and enjoy free treats, all from your phone.</p><div class="auth-benefits"><span>${icon('star')} Earn stamps</span><span>${icon('gift')} Redeem rewards</span><span>${icon('qr')} Virtual QR card</span></div></div><div class="auth-right"><div class="eyebrow">YOUR LOYALTY STARTS HERE</div><h2>${isSignup?'Create your account':isRecover?'Reset password':isUpdate?'Set new password':'Welcome back!'}</h2><p class="sub">${isSignup?'Your next Chicken Pastil order could earn rewards.':isRecover?'Enter your email to receive a reset link.':isUpdate?'Email link verified. Set a new password using the eye buttons to review both entries.':'Sign in to see your virtual loyalty card.'}</p>${isUpdate?'':`<div class="auth-tabs"><button type="button" data-action="auth-tab" data-value="login" class="${state.authTab==='login'?'active':''}">Sign in</button><button type="button" data-action="auth-tab" data-value="signup" class="${isSignup?'active':''}">Create account</button></div>`}<form id="auth-form" class="form-stack">${isSignup?'<div class="field"><label for="auth-name">Full name</label><input id="auth-name" autocomplete="name" name="name" maxlength="100" minlength="2" placeholder="Enter your name" required /></div>':''}${isUpdate?'':'<div class="field"><label for="auth-email">Email address</label><input id="auth-email" type="email" autocomplete="email" name="email" placeholder="you@example.com" required /></div>'}${isRecover?'':passwordField()}${needsConfirm?confirmField():''}<button class="button primary wide" type="submit">${isSignup?'Create my account →':isRecover?'Email reset link':isUpdate?'Save new password':'Sign in →'}</button></form>${state.authTab==='login'?'<button type="button" class="button outline wide" style="margin-top:11px" data-action="auth-tab" data-value="recover">Forgot password?</button>':''}<p class="auth-note">We keep your loyalty history private. Purchases and claims must be verified by J&G staff. Staff and Owner access require separate authorization.</p></div></div>`;
}
function render(){notice();showHeader();if(!DEMO&&(state.authTab==='update-password'||!state.user)){renderAuth();return;}if(state.role==='customer')renderCustomer();else if(state.role==='employee')renderEmployee();else renderAdmin()}
async function loadRole(){if(DEMO)return;try{state.user=await api.whoami();if(!state.user&&api.session&&!online()){state.user=api.lastProfile()}
 if(!state.user&&api.session&&online()){api.saveSession(null)}if(state.user){state.role=state.user.role||'customer';await loadData();}}catch(e){api.saveSession(null);state.user=null;toast(e.message)}}
async function loadData(){
 if(DEMO)return;
 if(state.role==='customer'){
  try{
   state.card=await api.myCard();state.cachedAt=null;
   const key='jg_suki_seen_rewards_'+state.card.memberCode;
   let seen=[];try{seen=JSON.parse(localStorage.getItem(key)||'[]')}catch{}
   const newly=state.card.vouchers.filter(v=>rewardStatus(v)==='available'&&!seen.includes(v.id));
   localStorage.setItem(key,JSON.stringify(state.card.vouchers.map(v=>v.id)));
   if(newly.length&&state.user&&document.visibilityState==='visible'){
    queueMicrotask(()=>modal('Yeyyy! Reward unlocked!',`You have earned ${newly.map(x=>REWARDS[x.kind].label).join(' and ')}! Visit J&G Chicken Pastil to claim.`, 'celebrate'));
   }
  }catch(e){const cached=api.cachedCard();if(cached&&!online()){state.card=cached.data;state.cachedAt=cached.at;}else toast(e.message)}
 }else if(state.role==='admin'&&online()){
  try{
   const oldIds=new Set((state.owner?.notifications||[]).map(n=>n.id));
   const loaded=await api.owner();const fresh=(loaded.notifications||[]).filter(n=>!oldIds.has(n.id)&&!n.readAt);
   const hadPrior=Boolean(state.owner);state.owner=loaded;
   if(hadPrior&&fresh.length&&document.visibilityState==='visible')queueMicrotask(()=>modal('New loyalty reward claimed!',fresh[0].message,'celebrate'));
  }catch(e){toast(e.message)}
  await ownerStaffRefresh();
 }
}
// Phase 1E-C4: An old member must never stay selected after a new identification attempt.
// A generation counter also prevents an older, slower lookup from replacing a newer one.
let memberLookupGeneration=0;
function clearStaffSelection(){
 memberLookupGeneration++;
 state.member=null;
 if(state.role==='employee')renderEmployee();
}
async function reloadMember(token){
 if(state.busy){toast('Wait for the current purchase to finish before finding another customer.');return;}
 clearStaffSelection();
 const lookupGeneration=memberLookupGeneration;
 let loaded;
 if(DEMO){
  loaded=demo.members.find(m=>m.memberCode.toUpperCase()===token.toUpperCase()||m.qrToken===token)||null;
  if(!loaded)throw new Error('Member not found.');
 }else if(!online()){
  if(!/^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i.test(token))throw new Error('Offline: scan a member QR token; manual Member ID lookup needs internet.');
  loaded={name:'Pending customer verification',memberCode:'QR scan pending',qrToken:token,stamps:0,cycle:'—',expiresAt:null,vouchers:[],firstPurchaseDone:null,offlinePendingVerification:true};
 }else{
  loaded=await api.staffLookup(token);
 }
 if(lookupGeneration!==memberLookupGeneration)return;
 state.member=loaded;
 render();toast(`Member loaded: ${loaded.name}`);
}
function demoIssue(m,item,eventId){const prior=m.stamps;const amount=m.firstPurchaseDone?ITEMS[item].stamps:Math.max(2,ITEMS[item].stamps);m.firstPurchaseDone=true;let remaining=amount,unlocked=[];while(remaining){if(m.stamps>=8){m.cycle++;m.stamps=0;m.expiresAt=expiry()}const before=m.stamps;const add=Math.min(8-m.stamps,remaining);m.stamps+=add;remaining-=add;for(const [at,kind] of [[4,'gulaman'],[8,'busog']])if(before<at&&m.stamps>=at){m.vouchers.unshift({id:uuid(),kind,cycle:m.cycle,expiresAt:m.expiresAt,claimedAt:null});unlocked.push(kind)}}m.history.unshift({itemCode:item,stamps:amount,verifiedAt:new Date().toISOString(),branch:state.branch});demo.stampsTotal+=amount;saveDemo();return{awarded:amount,stamps:m.stamps,cycle:m.cycle,unlocked}}
// Phase 1E-C9: one submission per in-flight operation; never imply a queued event is verified.
// C16: serialize local purchase mutations when Web Locks is available.
// The database's unique client_event_id is the final defense when a receipt is retried.
async function issue(){
 if(!state.member)return toast('Scan or find a member first.');
 if(state.busy||state.syncBusy)return toast('Please wait for the current purchase or sync to finish.');
 return withPurchaseLock(issueUnlocked);
}
async function issueUnlocked(){
 if(!state.member||state.busy||state.syncBusy)return;
 if(!DEMO&&(state.role!=='employee'||!state.user))return toast('Authorized employee sign-in required.');
 const member=state.member,eventId=uuid(),item=state.order,branch=state.branch,token=member.qrToken;
 if(!token)return toast('Scan the customer QR first.');
 if(lastAcceptedPurchase&&lastAcceptedPurchase.token===token&&lastAcceptedPurchase.item===item&&lastAcceptedPurchase.branch===branch&&Date.now()-lastAcceptedPurchase.at<4000){
  return toast('This purchase was just processed. Wait before submitting another sale.');
 }
 const employeeId=DEMO?'demo-employee':state.user?.id;
 if(!employeeId)return toast('Employee sign-in is required.');
 state.busy=true;
 const submit=$('#award-form button[type="submit"]');if(submit)submit.disabled=true;
 try{
  // Before issuing a new event, detect a previous event that has not been acknowledged.
  // This also recovers pending transactions saved before a browser reload.
  const existing=await Pending.all();
  state.pending=existing;
  if(existing.some(p=>p.demo===DEMO&&p.employeeId===employeeId&&p.memberToken===token)){
   toast('Unresolved pending purchase for this customer. Sync/review it first; do not create a second event.');
   return;
  }
  const event={eventId,employeeId,memberToken:token,memberCode:member.memberCode,item,branch,createdAt:new Date().toISOString(),demo:DEMO};
  if(!online()){
   await Pending.add(event);
   state.pending=[...existing,event];
   toast('Pending purchase saved. No stamps have been issued.');
   return;
  }
  // Offline-only QR information is not online verification.
  if(!DEMO&&member.offlinePendingVerification){
   const verified=await api.staffLookup(token);
   if(!verified?.qrToken)throw new Error('Customer verification failed; purchase not issued.');
   state.member=verified;
  }
  let receipt;
  if(DEMO){
   receipt=demoIssue(state.member,item,eventId);
  }else{
   // Persist EXACTLY this event UUID before sending to Supabase. If connection drops
   // after the server commits, the same UUID must be retried from IndexedDB.
   const outcome=await submitVerifiedEvent({
    pending:Pending,event,
    award:e=>api.award(e.memberToken,e.item,e.eventId,e.branch)
   });
   if(outcome.status==='pending'){
    state.pending=[...existing,event];
    toast('Purchase result uncertain. Saved for safe retry with SAME event ID. Use Sync pending records; do NOT submit this sale again.');
    console.warn('Purchase retained for safe retry:',outcome.error?.message);
    return;
   }
   receipt=outcome.receipt;
   if(outcome.status==='acknowledged-pending-cleanup'){
    state.pending=[...existing,event];
    toast('Server confirmed purchase, but local pending cleanup failed. Sync the retained event; do not reissue.');
    return;
   }
   try{state.pending=await Pending.all()}
   catch{state.pending=existing;toast('Purchase confirmed, but local queue refresh failed. Review pending records before another sale.');}
  }
  lastAcceptedPurchase={token,item,branch,at:Date.now()};
  if(!DEMO){
   try{state.member=await api.staffLookup(token)}
   catch{state.member=null;toast('Purchase confirmed; member refresh failed. Do not reissue this sale.');return;}
  }
  toast(`${receipt.awarded} stamp(s) verified and issued.`);
  if(receipt.unlocked?.length)modal('Yeyyy! Reward unlocked!',`${member.name} can now claim: ${receipt.unlocked.map(x=>REWARDS[x].label).join(' and ')} at J&G Chicken Pastil.`,'celebrate');
 }catch(e){toast('Purchase not completed: '+e.message+' Check pending records before trying again.');}
 finally{state.busy=false;render();}
}

// Replay saved event IDs only. A successful or duplicate server receipt is an ack.
async function sync(){
 if(!online())return toast('Reconnect before synchronizing.');
 if(state.busy||state.syncBusy)return toast('A purchase or synchronization is already in progress.');
 if(!DEMO&&(state.role!=='employee'||!state.user))return toast('Employee sign-in required to synchronize.');
 return withPurchaseLock(syncUnlocked);
}
async function syncUnlocked(){
 if(state.busy||state.syncBusy)return;
 state.syncBusy=true;render();
 let accepted=0,rejected=0;
 try{
  if(!DEMO){
   const verified=await api.whoami();
   if(!verified||verified.id!==state.user.id||verified.role!=='employee'){
    state.member=null;
    toast('Employee access is not active. Pending records retained, no sync performed.');
    return;
   }
  }
  const queue=await Pending.all();
  for(const event of queue){
   if(event.demo!==DEMO||event.employeeId!==(DEMO?'demo-employee':state.user?.id))continue;
   try{
    // No new UUID is ever generated during replay.
    await replayPendingEvent({pending:Pending,event,award:async e=>{
     if(DEMO){const m=demo.members.find(m=>m.qrToken===e.memberToken);if(!m)throw Error('Demo member missing');return demoIssue(m,e.item,e.eventId)}
     return api.award(e.memberToken,e.item,e.eventId,e.branch);
    }});
    accepted++;
   }catch(e){rejected++;console.warn('Queued event retained for review:',e.message);}
  }
  state.pending=await Pending.all();
  if(state.member&&!state.member.offlinePendingVerification&&!DEMO){
   try{state.member=await api.staffLookup(state.member.qrToken)}
   catch{state.member=null;toast('Customer refresh failed; select the customer again before issuing purchases.');}
  }
  toast(`${accepted} confirmed/duplicates cleared; ${rejected} retained for review.`);
 }catch(e){toast(`Sync stopped: ${e.message}. Pending records were not cleared.`)}
 finally{state.syncBusy=false;render();}
}
async function claim(id){const m=state.member;if(!m)return;if(!online())return toast('Go online to redeem a reward.');const r=m.vouchers?.find(v=>v.id===id&&rewardStatus(v)==='available');if(!r)return toast('Voucher is not available.');modal('Confirm reward release',`Confirm you are giving ${REWARDS[r.kind].label} to ${m.name}. Once claimed, the voucher cannot be used again.`,REWARDS[r.kind].icon,`<button class="button outline" data-action="close-modal">Cancel</button><button class="button primary" data-action="confirm-claim" data-value="${txt(id)}">Yes, item released</button>`)}
async function confirmClaim(id){const m=state.member;dialog.close();try{if(DEMO){const r=m.vouchers.find(x=>x.id===id);if(!r||rewardStatus(r)!=='available')throw Error('Voucher unavailable');r.claimedAt=new Date().toISOString();const notification={id:uuid(),message:`${m.name} claimed ${REWARDS[r.kind].label}`,createdAt:new Date().toISOString(),readAt:null};demo.claims.push({name:m.name,memberCode:m.memberCode,kind:r.kind,claimedAt:r.claimedAt,employee:'Demo Employee'});demo.notifications.push(notification);saveDemo()}else{await api.claim(id,uuid());state.member=await api.staffLookup(m.qrToken)}render();modal('Reward successfully claimed!',`${m.name} received ${REWARDS[m.vouchers?.find(x=>x.id===id)?.kind||'gulaman']?.label||'the reward'}. The Owner Dashboard records this claim.`,'gift')}catch(e){toast(e.message)}}
async function ownerRefresh(){if(!DEMO&&online()){try{state.owner=await api.owner()}catch(e){toast(e.message)}await ownerStaffRefresh()}render()}
async function handleAuth(form){
 const fd=new FormData(form),email=String(fd.get('email')||'').trim().toLowerCase(),pwd=String(fd.get('password')||''),confirmPwd=String(fd.get('confirm_password')||'');
 try{
  if(state.authTab==='update-password'){
   if(pwd.length<8)throw Error('Use a password with at least 8 characters.');
   if(pwd!==confirmPwd){form.querySelector('[name=confirm_password]')?.focus();throw Error('Passwords do not match. Please try again.');}
   await api.updatePassword(pwd);
   state.authTab='login';await loadRole();render();toast('Password updated. Your account is ready.');return;
  }
  if(state.authTab==='signup'){
   const name=String(fd.get('name')||'').trim();if(name.length<2)throw Error('Please enter your full name.');
   if(pwd.length<8)throw Error('Use a password with at least 8 characters.');
   if(pwd!==confirmPwd){form.querySelector('[name=confirm_password]')?.focus();throw Error('Passwords do not match. Please try again.');}
   const response=await api.signup(name,email,pwd);
   if(response.access_token){api.saveSession(response);await loadRole();render();}
   else modal('Check your email',`We sent a confirmation email to ${email}. Verify your email, then return to your virtual card.`,'mail');
  }else if(state.authTab==='recover'){
   await api.recover(email);modal('Check your inbox','If the email is registered, you will receive a password reset link.','mail');
  }else{await api.login(email,pwd);await loadRole();render();if(state.user)toast('Welcome to J&G Suki Rewards!');}
 }catch(e){toast(e.message)}
}
// Phase 1E-C1: QR fallback decoder is bundled locally; no CDN or external image service.
let localQrDecoderPromise;
function loadLocalQrDecoder(){
 if(typeof window.jsQR==='function')return Promise.resolve(window.jsQR);
 if(!localQrDecoderPromise){
  localQrDecoderPromise=new Promise((resolve,reject)=>{
   const script=document.createElement('script');
   script.src=new URL('./vendor/jsqr/jsQR.js',import.meta.url).href;
   script.async=true;
   script.onload=()=>typeof window.jsQR==='function'?resolve(window.jsQR):reject(new Error('QR decoding library did not initialize.'));
   script.onerror=()=>reject(new Error('Local QR scanner library is unavailable. Re-run the QR patch installer.'));
   document.head.appendChild(script);
  }).catch(error=>{localQrDecoderPromise=null;throw error});
 }
 return localQrDecoderPromise;
}
function explainCameraError(error){
 if(error?.name==='NotAllowedError'||error?.name==='PermissionDeniedError')return 'Camera access was denied. Allow camera permission in your browser settings, then reopen the scanner.';
 if(error?.name==='NotFoundError'||error?.name==='DevicesNotFoundError')return 'No camera was found on this device. Enter the Member ID manually.';
 if(error?.name==='NotReadableError'||error?.name==='TrackStartError')return 'Camera is busy or unavailable. Close other apps using the camera and try again.';
 if(error?.name==='OverconstrainedError')return 'Camera settings are unsupported on this device. Please try again or enter the Member ID.';
 return String(error?.message||'Unable to start the scanner. Enter the Member ID manually.');
}
async function startScanner(){
 const dlg=$('#scanner-dialog');
 if(dlg.open)return;
 if(state.role!=='employee')return;
 if(state.busy){toast('Wait for the current purchase to finish before scanning another customer.');return;}
 // Clear previously verified member BEFORE opening the camera. Invalid QR, cancelled
 // camera permission, scanner errors, and closing the dialog leave no member selected.
 clearStaffSelection();
 const help=$('#scanner-help'),video=$('#scanner-video');
 let stream=null,stopped=false;
 function stop(){
  stopped=true;
  if(stream){for(const track of stream.getTracks())track.stop();stream=null;}
  video.pause();video.srcObject=null;
 }
 dlg.addEventListener('close',stop,{once:true});
 help.textContent='Preparing QR scanner…';
 dlg.showModal();
 try{
  if(!window.isSecureContext)throw new Error('Camera access requires HTTPS or localhost. On iPhone, use an HTTPS staging website.');
  if(!navigator.mediaDevices?.getUserMedia)throw new Error('This browser does not support camera access. Enter the Member ID manually.');
  let nativeDetector=null,decodeFallback=null;
  if(typeof window.BarcodeDetector==='function'){
   try{
    const supported=await window.BarcodeDetector.getSupportedFormats();
    if(supported.includes('qr_code'))nativeDetector=new window.BarcodeDetector({formats:['qr_code']});
   }catch{ /* fall back to locally bundled jsQR */ }
  }
  if(!nativeDetector)decodeFallback=await loadLocalQrDecoder();
  if(stopped||!dlg.open)return;
  try{
   stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false});
  }catch(e){
   if(e?.name==='OverconstrainedError')stream=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
   else throw e;
  }
  if(stopped||!dlg.open){stop();return;}
  video.srcObject=stream;
  await video.play();
  if(stopped||!dlg.open){stop();return;}
  const canvas=decodeFallback?document.createElement('canvas'):null;
  const context=canvas?.getContext('2d',{willReadFrequently:true})||null;
  if(decodeFallback&&!context)throw new Error('Camera frame decoding is unavailable in this browser.');
  help.textContent='Point the camera at the customer QR code. Scanning happens on this device.';
  while(dlg.open&&!stopped){
   let raw='';
   try{
    if(video.readyState>=HTMLMediaElement.HAVE_CURRENT_DATA && video.videoWidth>0){
     if(nativeDetector){
      const codes=await nativeDetector.detect(video);
      raw=String(codes[0]?.rawValue||'').trim();
     }else{
      const w=Math.min(720,video.videoWidth),h=Math.round(w*video.videoHeight/video.videoWidth);
      if(w>0&&h>0){
       if(canvas.width!==w)canvas.width=w;
       if(canvas.height!==h)canvas.height=h;
       context.drawImage(video,0,0,w,h);
       const image=context.getImageData(0,0,w,h);
       raw=String(decodeFallback(image.data,w,h,{inversionAttempts:'attemptBoth'})?.data||'').trim();
      }
     }
    }
   }catch(error){console.warn('QR frame skipped:',error?.message||error)}
   if(raw){
    const memberCode=/^JG-[A-Z0-9-]{4,40}$/i.test(raw);
    const token=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(raw);
    if(!memberCode&&!token){
     help.textContent='QR detected but it is not a J&G loyalty QR. Please scan a customer card.';
    }else{
     stop();dlg.close();
     try{await reloadMember(raw)}catch(error){toast(error.message)}
     return;
    }
   }
   await new Promise(resolve=>setTimeout(resolve,180));
  }
 }catch(error){
  if(!stopped&&dlg.open){stop();help.textContent=explainCameraError(error)}
 }
}
app.addEventListener('submit',async e=>{if(e.target.id==='owner-employee-search-form'){e.preventDefault();const email=String(new FormData(e.target).get('employeeEmail')||'').trim().toLowerCase();if(email)await ownerFindEmployee(email);}else if(e.target.id==='lookup-form'){e.preventDefault();const val=String(new FormData(e.target).get('memberId')||'').trim();try{await reloadMember(val)}catch(err){toast(err.message)}}else if(e.target.id==='award-form'){e.preventDefault();state.order=e.target.querySelector('#order-select').value;state.branch=e.target.querySelector('#branch-select').value;await issue()}else if(e.target.id==='auth-form'){e.preventDefault();await handleAuth(e.target)}});
document.addEventListener('input',e=>{if(e.target.id==='owner-search'){state.ownerSearch=e.target.value;state.ownerPage=1;const pos=e.target.selectionStart;renderAdmin();const input=$('#owner-search');input.focus();input.setSelectionRange(pos,pos)}if(e.target.id==='simulate-offline'){state.demoOffline=e.target.checked;render()}});
document.addEventListener('change',e=>{if(e.target.id==='demo-customer'){state.demoCustomer=e.target.value;render()}if(e.target.id==='order-select'){state.order=e.target.value;renderEmployee()}if(e.target.id==='branch-select'){state.branch=e.target.value}if(e.target.id==='simulate-offline'){state.demoOffline=e.target.checked;render()}});
document.addEventListener('click',async e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const action=btn.dataset.action,v=btn.dataset.value;if(action==='toggle-password'){const field=document.getElementById(v);if(field){const willShow=field.type==='password';field.type=willShow?'text':'password';btn.innerHTML=icon(willShow?'eyeOff':'eye');btn.setAttribute('aria-pressed',String(willShow));const label=`${willShow?'Hide':'Show'} ${v==='auth-confirm-password'?'confirm password':'password'}`;btn.setAttribute('aria-label',label);btn.title=label;}}else if(action==='owner-customers-page'||action==='owner-alerts-page'||action==='owner-claims-page'){const key=action==='owner-customers-page'?'ownerPage':action==='owner-alerts-page'?'ownerAlertsPage':'ownerClaimsPage';const requested=Number(v);if(Number.isInteger(requested)&&requested>=1){state[key]=requested;renderAdmin();}}else if(action==='customer-purchases-page'){if(state.role!=='customer')return;const c=DEMO?demoCard():state.card;const total=Math.max(1,Math.ceil((Array.isArray(c?.history)?c.history.length:0)/5));const requested=Number(v);if(Number.isInteger(requested)&&requested>=1&&requested<=total){state.customerPurchasePage=requested;renderCustomer();}}else if(action==='account-settings'){document.querySelector('#account-actions .jg-as-mobile-menu')?.removeAttribute('open');try{await openAccountSettings(api)}catch(err){toast(err.message)}}else if(action==='open-qr'){const customer=DEMO?demoCard():state.card;if(customer)openQrPreview(customer);}else if(action==='role'&&DEMO){state.role=v;state.member=null;if(v==='admin')await ownerRefresh();else render()}else if(action==='close-modal')dialog.close();else if(action==='auth-tab'){state.authTab=v;render()}else if(action==='employee-change')requestStaffChange(v,btn.dataset.enabled==='true');else if(action==='confirm-employee-change')await confirmStaffChange(v,btn.dataset.enabled==='true');else if(action==='open-scanner')await startScanner();else if(action==='claim')claim(v);else if(action==='confirm-claim')await confirmClaim(v);else if(action==='sync')await sync();else if(action==='refresh-owner')await ownerRefresh();else if(action==='read-notice'){try{if(DEMO){let n=demo.notifications.find(n=>n.id===v);if(n)n.readAt=new Date().toISOString();saveDemo()}else await api.markNotification(v);await ownerRefresh()}catch(err){toast(err.message)}}else if(action==='logout'){if(state.busy||state.syncBusy){toast('Complete the active purchase or sync before logging out.');return;}await api.logout();state.user=null;state.card=null;state.member=null;state.owner=null;render()}});
$('#close-scanner').addEventListener('click',()=>$('#scanner-dialog').close());
async function refreshRoleIfChanged(){
 if(DEMO||!state.user||!online())return false;
 try{const current=await api.whoami();if(current&&current.role!==state.role){state.user=current;state.role=current.role;state.member=null;state.owner=null;state.staffAccess=null;state.card=null;await loadData();render();toast('Your account permissions have changed.');return true;}}catch(e){console.warn('Role recheck failed:',e.message)}
 return false;
}
window.addEventListener('online',async()=>{notice();if(!DEMO&&state.user){if(!(await refreshRoleIfChanged())){await loadData();render()}}else render()});window.addEventListener('offline',render);
document.addEventListener('visibilitychange',async()=>{if(!document.hidden&&online()&&!DEMO&&state.user){if(!(await refreshRoleIfChanged())){await loadData();render()}}});
async function boot(){try{try{state.pending=await Pending.all()}catch{state.pending=[]}if(!DEMO){const redirect=api.acceptRedirectSession();if(redirect.error)toast(redirect.error);if(redirect.kind==='recovery')state.authTab='update-password';await loadRole();}render();if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('./sw.js').catch(()=>{});if(!DEMO)setInterval(async()=>{if(!document.hidden&&online()&&state.user){if(!(await refreshRoleIfChanged())){if(state.role==='customer'||state.role==='admin'){await loadData();render()}}}},60000);}catch(e){app.innerHTML=`<div class="empty">Unable to initialize: ${txt(e.message)}</div>`}}
boot();

// P1H-A12-ACCOUNT-SETTINGS-20261024: isolated settings dialog imported above.

// P1H-A13-MOBILE-SETTINGS-UI-20261024: close the mobile menu on outside clicks, without changing loyalty actions.
document.addEventListener('click',event=>{const menu=document.querySelector('#account-actions .jg-as-mobile-menu');if(menu?.open&&!menu.contains(event.target))menu.open=false;});

// P1H-A15-EMAIL-VERIFIED-PASSWORD-20261024: reset-password route retains existing Show/Hide eye controls.

// P1H-A16-RESET-TABS-UI-20261024: auth tabs are not rendered in verified password-reset mode.
