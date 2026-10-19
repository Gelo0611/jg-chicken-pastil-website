/* J&G Sales Tracker V2 — separate carts, owner-only Supabase tables, legacy read-only reporting. */
(()=>{'use strict';
const M=window.JG_SALES_MODEL_V2, cfg=window.JG_LOCATION_CONFIG||{}, $=(q)=>document.querySelector(q);
if(!M||!$('#jgV2DailyForm'))return;
const UI={form:$('#jgV2DailyForm'),entry:$('#jgV2Cart'),date:$('#jgV2Date'),items:$('#jgV2Items'),editId:$('#jgV2Id'),salary:$('#jgV2Salary'),notes:$('#jgV2Notes'),expenses:$('#jgV2Expenses'),total:$('#jgV2Total'),productCost:$('#jgV2ProductCost'),gross:$('#jgV2Gross'),operating:$('#jgV2Operating'),net:$('#jgV2Net'),status:$('#jgV2Status'),save:$('#jgV2Save'),cancel:$('#jgV2Cancel'),addExpense:$('#jgV2AddExpense'),costDetails:$('#jgV2CostsDetails'),costForm:$('#jgV2CostForm'),costFields:$('#jgV2CostFields'),costStatus:$('#jgV2CostStatus'),costSave:$('#jgV2CostSave'),filter:$('#jgV2Filter'),month:$('#jgV2Month'),monthly:$('#jgV2Monthly'),trend:$('#jgV2Trend'),records:$('#jgV2Records'),pagination:$('#jgV2Pages'),legacyWarning:$('#jgV2LegacyWarning')};
let v2=[],legacy=[],costs={...M.DEFAULT_COSTS},snapshots={},editing=null,loaded=false,working=false,reportPage=1,renderNonce=0;
const origin=String(cfg.supabaseUrl||'').replace(/\/$/,'');
const ownerToken=()=>sessionStorage.getItem('jg-owner-access-token')||'';
const money=v=>v===null||v===undefined?'Set cost':`₱${Number(v).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const monthNow=()=>today().slice(0,7);
const labelCart=cart=>({bike:'Bike Cart',food:'Food Cart',legacy:'Legacy — Unassigned'}[cart]||cart);
const setMessage=(el,text,kind='')=>{el.textContent=text;el.className='owner-status '+kind;};
function el(tag,cls,text){const e=document.createElement(tag);if(cls)e.className=cls;if(text!==undefined)e.textContent=text;return e;}
async function request(path,{method='GET',body,headers={}}={}){
 if(!origin.startsWith('https://')||!cfg.supabasePublishableKey)throw Error('Supabase configuration missing.');
 const jwt=ownerToken();if(!jwt)throw Error('Owner session missing. Please sign in again.');
 const response=await fetch(`${origin}/rest/v1/${path}`,{method,cache:'no-store',headers:{apikey:cfg.supabasePublishableKey,Authorization:`Bearer ${jwt}`,'Content-Type':'application/json',...headers},body:body===undefined?undefined:JSON.stringify(body)});
 const raw=await response.text();let value;try{value=raw?JSON.parse(raw):null}catch{value=raw}
 if(!response.ok)throw Error(value?.message||value?.hint||value?.details||`Supabase request failed (${response.status})`);
 return value;
}
async function fetchAll(table){const result=[];for(let offset=0;offset<=10000;offset+=500){const batch=await request(`${table}?select=*&order=sale_date.asc&limit=500&offset=${offset}`);if(!Array.isArray(batch))throw Error('Unexpected Supabase response.');result.push(...batch);if(batch.length<500)return result;}throw Error('More than 10,000 records; stop and request paginated export.');}
function saveCostRows(){UI.costFields.replaceChildren();for(const [key,label] of Object.entries(M.COST_LABELS)){
 const wrap=el('label','jg-v2-cost-field'),txt=el('span','',label),inp=el('input');inp.type='number';inp.min='0';inp.max='10000000';inp.step='0.01';inp.inputMode='decimal';inp.dataset.cost=key;inp.value=costs[key]===null?'':costs[key];inp.placeholder=key.startsWith('soda')?'Required for soda sales':'0.00';wrap.append(txt,inp);UI.costFields.append(wrap);
}}
async function loadSettings(){const rows=await request('jg_cart_cost_settings_v2?select=id,unit_costs&id=eq.1');if(!Array.isArray(rows)||rows.length!==1)throw Error('V2 cost-settings row missing; verify SQL migration.');costs={...M.DEFAULT_COSTS,...rows[0].unit_costs};saveCostRows();}
async function storeCosts(){if(working)return;const updated={};try{
 for(const input of UI.costFields.querySelectorAll('input[data-cost]')){const key=input.dataset.cost;if(input.value.trim()===''){if(key==='soda12'||key==='soda16')updated[key]=null;else throw Error(`${M.COST_LABELS[key]} needs a cost.`);}else updated[key]=M.cents(input.value,M.COST_LABELS[key])/100;}
 working=true;UI.costSave.disabled=true;setMessage(UI.costStatus,'Saving cost settings…');
 await request('jg_cart_cost_settings_v2?id=eq.1',{method:'PATCH',headers:{Prefer:'return=representation'},body:{unit_costs:updated,updated_at:new Date().toISOString()}}).then(rows=>{if(!Array.isArray(rows)||rows.length!==1)throw Error('Cost settings were not acknowledged.');});
 costs=updated;setMessage(UI.costStatus,'Costs saved to Supabase. Existing recorded item costs stay unchanged.','success');drawItems(true);updateTotals();
 }catch(e){setMessage(UI.costStatus,e.message,'error');}finally{working=false;UI.costSave.disabled=false;}}
function qtyMap(){const data={};UI.items.querySelectorAll('input[data-sku]').forEach(input=>data[input.dataset.sku]=input.value);return data;}
function drawItems(retain=false){
 const existing=retain?qtyMap():{};
 UI.items.replaceChildren();
 const menu=M.MENUS[UI.entry.value];
 let lastGroup='';
 function makeProduct(item,displayName=item.name,flavorLabel=''){
  const line=el('label','jg-v2-product'+(flavorLabel?' jg-v2-soda-product':''));
  const info=el('span','jg-v2-product-info'),name=el('strong','',displayName),price=el('small');
  let cost=null;
  if(snapshots[item.sku])cost=snapshots[item.sku].cost;
  else{let total=0,missing=false;for(const [ingredient,count] of Object.entries(item.recipe)){
   if(costs[ingredient]===null||costs[ingredient]===undefined){missing=true;break;}
   total+=Number(costs[ingredient])*count;
  }if(!missing)cost=total;}
  price.textContent=`Sell ${money(snapshots[item.sku]?.price??item.price)} • Cost ${cost===null?'NOT SET':money(cost)}`;
  info.append(name,price);
  const input=el('input');input.type='number';input.min='0';input.max='100000';input.step='1';input.inputMode='numeric';
  input.dataset.sku=item.sku;input.value=existing[item.sku]??'0';
  if(flavorLabel)input.setAttribute('aria-label',`${flavorLabel} ${displayName} quantity`);
  input.addEventListener('input',updateTotals);
  line.append(info,input);
  return line;
 }
 for(let i=0;i<menu.length;i++){
  const item=menu[i];
  if(item.sku.startsWith('soda12_')){
   if(lastGroup!=='Fruit Soda'){
    lastGroup='Fruit Soda';
    UI.items.append(el('h4','jg-v2-group','Fruit Soda · 12oz / 16oz'));
   }
   const paired=menu[i+1];
   const flavor=item.name.replace(/ — 12oz$/,'');
   if(!paired||paired.sku!==`soda16_${item.sku.slice(7)}`||paired.name!==`${flavor} — 16oz`){
    throw Error('Fruit Soda pairing mismatch; stop before rendering quantities.');
   }
   const pair=el('section','jg-v2-soda-pair');
   pair.setAttribute('aria-label',`${flavor} Fruit Soda sizes`);
   pair.append(el('h5','jg-v2-soda-flavor',flavor));
   pair.append(makeProduct(item,'12oz',flavor),makeProduct(paired,'16oz',flavor));
   UI.items.append(pair);
   i++;
   continue;
  }
  if(item.sku.startsWith('soda16_'))throw Error('Fruit Soda 16oz missing matching 12oz item.');
  if(item.group!==lastGroup){lastGroup=item.group;UI.items.append(el('h4','jg-v2-group',lastGroup));}
  UI.items.append(makeProduct(item));
 }
}
function expenseRows(){const res=[];for(const row of UI.expenses.querySelectorAll('.jg-v2-expense'))res.push({label:row.querySelector('[data-label]').value.trim(),amount:row.querySelector('[data-amount]').value||0});return res;}
function addExpense(label='',amount=''){const row=el('div','jg-v2-expense');const name=el('input'),moneyInput=el('input'),remove=el('button','jg-v2-remove','×');name.type='text';name.maxLength=80;name.placeholder='Expense (ice, gas, rent, transport…)';name.value=label;name.dataset.label='';moneyInput.type='number';moneyInput.min='0';moneyInput.step='0.01';moneyInput.inputMode='decimal';moneyInput.placeholder='₱ 0.00';moneyInput.value=amount;moneyInput.dataset.amount='';remove.type='button';remove.setAttribute('aria-label','Remove expense');remove.addEventListener('click',()=>{row.remove();updateTotals()});for(const input of [name,moneyInput])input.addEventListener('input',updateTotals);row.append(name,moneyInput,remove);UI.expenses.append(row);}
function compute(){return M.calculate(UI.entry.value,qtyMap(),costs,expenseRows(),UI.salary.value,snapshots);}
function updateTotals(){try{const a=compute();UI.total.textContent=money(a.sales);UI.productCost.textContent=money(a.productCost);UI.gross.textContent=money(a.grossProfit);UI.operating.textContent=money(a.expenses+a.salary);UI.net.textContent=money(a.netProfit);UI.net.classList.toggle('negative',a.netProfit<0);
 if(!a.complete)setMessage(UI.status,'Missing unit cost: '+a.missing.join(', ')+'. Set costs above before saving.','error');else if(UI.status.textContent.startsWith('Missing unit cost:'))setMessage(UI.status,'');
 }catch(e){UI.net.textContent='Check inputs';setMessage(UI.status,e.message,'error');}}
function reset(){editing=null;snapshots={};UI.editId.value='';UI.entry.disabled=false;UI.entry.value='bike';UI.date.value=today();UI.salary.value='0';UI.notes.value='';UI.expenses.replaceChildren();addExpense();drawItems();UI.save.textContent='Save Cart Sales';setMessage(UI.status,'');updateTotals();}
function editRow(record){if(record.cart==='legacy')return;editing=record;UI.editId.value=record.id;UI.entry.value=record.cart;UI.entry.disabled=true;UI.date.value=record.sale_date;UI.salary.value=record.employee_salary??0;UI.notes.value=record.notes||'';
 snapshots={};for(const line of record.items||[])if(line.sku)snapshots[line.sku]={price:line.price,cost:line.cost};drawItems();for(const line of record.items||[]){const input=UI.items.querySelector(`input[data-sku="${line.sku}"]`);if(input)input.value=line.qty;}
 UI.expenses.replaceChildren();for(const expense of record.expenses||[])addExpense(expense.label,expense.amount);if(!UI.expenses.children.length)addExpense();UI.save.textContent='Update Cart Sales';setMessage(UI.status,'Editing saved record: existing line-item prices and costs remain snapshotted.','success');updateTotals();UI.form.scrollIntoView({behavior:'smooth',block:'start'});
}
async function save(event){event.preventDefault();if(working)return;try{
 if(!UI.date.value)throw Error('Select the sales date.');const a=compute();if(!a.complete)throw Error('Enter soda costs in Unit Cost Settings before saving these sales.');
 const payload={sale_date:UI.date.value,cart:UI.entry.value,items:a.lines,employee_salary:a.salary,expenses:a.expenseRows,other_expenses:a.expenses,product_sales:a.sales,product_cost:a.productCost,gross_profit:a.grossProfit,total_cost:a.totalCost,net_profit:a.netProfit,notes:UI.notes.value.trim()||null,updated_at:new Date().toISOString()};
 const oldDate=legacy.find(r=>r.sale_date===UI.date.value);if(oldDate&&!editing&&!confirm('There is a LEGACY sales record for this same date. Adding V2 sales could double-count the combined total. Continue only if these are ADDITIONAL cart sales.'))return;
 working=true;UI.save.disabled=true;setMessage(UI.status,'Saving…');
 const id=UI.editId.value;
 const rows=await request(id?`jg_cart_daily_sales_v2?id=eq.${encodeURIComponent(id)}`:'jg_cart_daily_sales_v2',{method:id?'PATCH':'POST',headers:{Prefer:'return=representation'},body:payload});
 if(!Array.isArray(rows)||rows.length!==1)throw Error('Save was not acknowledged. Refresh records before retrying.');
 const month=UI.date.value.slice(0,7);
 try { await loadData();reset();UI.month.value=month;UI.filter.value=payload.cart;render();setMessage(UI.status,id?'Cart sales updated.':'Cart sales saved.','success'); }
 catch(refreshError){setMessage(UI.status,`SAVE SUCCEEDED, but refresh failed: ${refreshError.message}. Do not submit again. Refresh browser and verify the saved record.`,'error');}
 }catch(e){let msg=e.message;if(/unique|duplicate|jg_cart_sales_v2_one_per_day/i.test(msg))msg='This cart already has a record for this date. Edit that record instead.';setMessage(UI.status,msg,'error');}
 finally{working=false;UI.save.disabled=false;}}
async function removeRecord(record){if(record.cart==='legacy')return;if(!confirm(`Permanently delete ${labelCart(record.cart)} record for ${record.sale_date}?`))return;if(working)return;try{working=true;await request(`jg_cart_daily_sales_v2?id=eq.${encodeURIComponent(record.id)}`,{method:'DELETE',headers:{Prefer:'return=representation'}}).then(rows=>{if(!Array.isArray(rows)||rows.length!==1)throw Error('Deletion was not acknowledged.');});await loadData();render();setMessage(UI.status,'V2 daily record deleted.','success');}catch(e){setMessage(UI.status,e.message,'error');}finally{working=false;}}
async function loadData(){const [newRows,oldRows]=await Promise.all([fetchAll('jg_cart_daily_sales_v2'),fetchAll('daily_sales')]);v2=newRows;legacy=oldRows.map(r=>({...r,cart:'legacy'}));}
function visible(month){const filter=UI.filter.value;return v2.concat(legacy).filter(r=>r.sale_date.startsWith(month)&&(filter==='all'||r.cart===filter)).sort((a,b)=>b.sale_date.localeCompare(a.sale_date)||a.cart.localeCompare(b.cart));}
function summary(rows){return rows.reduce((a,r)=>{a.sales+=Number(r.product_sales)||0;a.cost+=Number(r.product_cost)||0;a.expenses+=(Number(r.other_expenses)||0)+(Number(r.employee_salary)||0);a.profit+=Number(r.net_profit)||0;return a;},{sales:0,cost:0,expenses:0,profit:0});}
function setAggregate(){const rows=visible(UI.month.value),s=summary(rows);UI.monthly.replaceChildren();for(const [label,value] of [['Sales',s.sales],['Product Cost',s.cost],['Operating Expenses',s.expenses],['Net Profit',s.profit]]){const card=el('div','monthly-summary-card'+(label==='Net Profit'?' profit':'')),key=el('span','',label),amount=el('strong','',money(value));if(label==='Net Profit'&&value<0)amount.classList.add('negative');card.append(key,amount);UI.monthly.append(card);}
 const legacyDates=new Set(legacy.map(x=>x.sale_date));const overlapping=v2.filter(r=>legacyDates.has(r.sale_date)&&r.sale_date.startsWith(UI.month.value));UI.legacyWarning.hidden=!(overlapping.length&&UI.filter.value==='all');if(overlapping.length)UI.legacyWarning.textContent=`Attention: ${new Set(overlapping.map(r=>r.sale_date)).size} date(s) have BOTH legacy and V2 entries. Combined totals may double-count if you recorded the same sales twice. Review dates before using the totals.`;
 drawChart(rows);drawTable(rows);
}
function drawChart(rows){UI.trend.replaceChildren();const byDay=new Map();for(const r of rows){const d=byDay.get(r.sale_date)||{date:r.sale_date,sales:0,profit:0};d.sales+=Number(r.product_sales)||0;d.profit+=Number(r.net_profit)||0;byDay.set(d.date,d);}const data=[...byDay.values()].sort((a,b)=>a.date.localeCompare(b.date));if(!data.length){UI.trend.append(el('p','owner-muted','No sales records in selected month.'));return;}
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 720 255');svg.setAttribute('role','img');svg.setAttribute('aria-label','Daily sales and profit trends');svg.classList.add('jg-v2-chart');const w=720,h=255,l=54,r=12,t=20,b=38;const values=data.flatMap(x=>[x.sales,x.profit,0]);let low=Math.min(...values),high=Math.max(...values);if(high===low)high=low+100;const x=i=>l+(data.length===1?(w-l-r)/2:i*(w-l-r)/(data.length-1));const y=v=>t+(high-v)*(h-t-b)/(high-low);const svgNode=(tag,attrs,text)=>{const node=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))node.setAttribute(k,String(v));if(text!==undefined)node.textContent=text;svg.append(node);return node;};
 for(let k=0;k<5;k++){const yy=t+k*(h-t-b)/4;svgNode('line',{x1:l,y1:yy,x2:w-r,y2:yy,stroke:'#eadbd6'});svgNode('text',{x:l-6,y:yy+4,'text-anchor':'end','font-size':11,fill:'#766666'},money(high-k*(high-low)/4).replace('.00',''));}
 for(const [key,color] of [['sales','#9c1726'],['profit','#d59e22']]){const points=data.map((d,i)=>`${x(i)},${y(d[key])}`).join(' ');svgNode('polyline',{points,fill:'none',stroke:color,'stroke-width':3,'stroke-linecap':'round','stroke-linejoin':'round'});if(data.length===1)svgNode('circle',{cx:x(0),cy:y(data[0][key]),r:4,fill:color});}
 if(data.length<=20)for(let i=0;i<data.length;i++)svgNode('text',{x:x(i),y:h-14,'text-anchor':'middle','font-size':10,fill:'#766666'},data[i].date.slice(-2));UI.trend.append(svg);
}
function drawTable(rows){const perPage=10;const pages=Math.max(1,Math.ceil(rows.length/perPage));reportPage=Math.min(reportPage,pages);const selected=rows.slice((reportPage-1)*perPage,reportPage*perPage);UI.records.replaceChildren();if(!rows.length)UI.records.append(el('p','owner-muted','No records in this month.'));
 for(const record of selected){const div=el('article','jg-v2-record'),head=el('div','jg-v2-record-head'),left=el('div'),right=el('div');left.append(el('strong','',record.sale_date),el('small','',labelCart(record.cart)));right.append(el('strong','',money(record.product_sales)),el('small','',`Net ${money(record.net_profit)} • Cost ${money(record.total_cost)}`));head.append(left,right);div.append(head);
 if(record.cart==='legacy')div.append(el('p','jg-v2-record-note','Historical record — read-only; cart not assigned.'));
 else {const quantities=Array.isArray(record.items)?record.items.filter(x=>x.qty>0).map(x=>`${x.name} ×${x.qty}`).join(' • '):'';div.append(el('p','jg-v2-record-note',quantities||'No products sold'));const actions=el('div','jg-v2-actions'),edit=el('button','btn owner-outline-btn','Edit'),del=el('button','btn owner-outline-btn','Delete');edit.type=del.type='button';edit.addEventListener('click',()=>editRow(record));del.addEventListener('click',()=>removeRecord(record));actions.append(edit,del);div.append(actions);}
 UI.records.append(div);}
 UI.pagination.replaceChildren();if(pages>1){const prev=el('button','btn owner-outline-btn','← Previous'),next=el('button','btn owner-outline-btn','Next →');prev.type=next.type='button';prev.disabled=reportPage===1;next.disabled=reportPage===pages;prev.addEventListener('click',()=>{reportPage--;render()});next.addEventListener('click',()=>{reportPage++;render()});UI.pagination.append(prev,el('span','',`Page ${reportPage} / ${pages} (${rows.length} records)`),next);}
}
function render(){if(!loaded)return;setAggregate();}
async function init(){if(loaded||!ownerToken())return;loaded=true;UI.month.value=monthNow();UI.date.value=today();UI.filter.value='all';reset();setMessage(UI.status,'Loading V2 sales tables…');try{await loadSettings();await loadData();render();setMessage(UI.status,'Sales Tracker V2 ready. Legacy history is preserved and read-only.','success');}catch(e){loaded=false;setMessage(UI.status,`Sales Tracker V2 unavailable: ${e.message}. Run the V2 SQL migration in main J&G Supabase first.`,'error');}}
UI.entry.addEventListener('change',()=>{snapshots={};drawItems();updateTotals()});UI.salary.addEventListener('input',updateTotals);UI.addExpense.addEventListener('click',()=>addExpense());UI.form.addEventListener('submit',save);UI.cancel.addEventListener('click',reset);UI.costSave.addEventListener('click',storeCosts);UI.filter.addEventListener('change',()=>{reportPage=1;render()});UI.month.addEventListener('change',()=>{reportPage=1;render()});
$('#jgV2New').addEventListener('click',()=>{reset();UI.form.scrollIntoView({behavior:'smooth',block:'start'})});
const dashboard=$('#dashboardPanel');if(dashboard){new MutationObserver(()=>{if(!dashboard.hidden&&ownerToken())init();if(dashboard.hidden){loaded=false;v2=[];legacy=[];}}).observe(dashboard,{attributes:true,attributeFilter:['hidden']});if(!dashboard.hidden&&ownerToken())init();}
})();
