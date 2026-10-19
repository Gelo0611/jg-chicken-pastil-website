/* J&G Sales Tracker V2 — deterministic pricing, BOM, and money arithmetic. */
(function(root,factory){const model=factory(); if(typeof module==='object'&&module.exports)module.exports=model; if(root)root.JG_SALES_MODEL_V2=model;})(typeof window==='object'?window:null,function(){
'use strict';
const FLAVORS=['Watermelon','Grape','Green Apple','Lychee','Blueberries','Strawberry'];
const DEFAULT_COSTS=Object.freeze({pastil:15,gulaman:3,egg:8,rice:3,tusok:10,jar:100,soda12:null,soda16:null});
const COST_LABELS={pastil:'Chicken pastil serving',gulaman:'Gulaman serving',egg:'Boiled egg',rice:'Extra rice',tusok:'Tusok-tusok (7pcs)',jar:'Pastil in a Jar',soda12:'Fruit Soda 12oz (all ingredients)',soda16:'Fruit Soda 16oz (all ingredients)'};
const base=[
 {sku:'value',name:'Value Meal',group:'Regular Meals',price:45,recipe:{pastil:1,gulaman:1}},
 {sku:'busog',name:'Busog Meal',group:'Regular Meals',price:50,recipe:{pastil:1,egg:1}},
 {sku:'premium',name:'Premium Meal',group:'Regular Meals',price:60,recipe:{pastil:1,egg:1,gulaman:1}},
 {sku:'extra_busog',name:'Extra Busog',group:'Regular Meals',price:50,recipe:{pastil:1,rice:1}},
 {sku:'solo_pastil',name:'Chicken Pastil Solo',group:'Solo & Sides',price:35,recipe:{pastil:1}},
 {sku:'solo_gulaman',name:'Gulaman',group:'Solo & Sides',price:10,recipe:{gulaman:1}},
 {sku:'solo_egg',name:'Boiled Egg',group:'Solo & Sides',price:15,recipe:{egg:1}},
 {sku:'solo_rice',name:'Extra Rice',group:'Solo & Sides',price:15,recipe:{rice:1}},
 {sku:'solo_tusok',name:'Tusok-tusok (7 pcs)',group:'Solo & Sides',price:20,recipe:{tusok:1}},
 {sku:'jar',name:'Pastil in a Jar',group:'Jar',price:195,recipe:{jar:1}},
];
const food=[
 {sku:'student',name:'Student Combo',group:'Sulit Combos',price:60,recipe:{pastil:1,soda12:1}},
 {sku:'sulit',name:'J&G Sulit Combo',group:'Sulit Combos',price:75,recipe:{pastil:1,egg:1,soda12:1}},
 {sku:'tusok_combo',name:'Tusok Combo',group:'Sulit Combos',price:49,recipe:{tusok:1,soda12:1}},
 {sku:'bff',name:'BFF Duo',group:'Sulit Combos',price:125,recipe:{pastil:2,soda12:2}},
 {sku:'barkada',name:'Barkada Meal',group:'Sulit Combos',price:249,recipe:{pastil:4,soda12:4}}
];
for(const flavor of FLAVORS){
 const sku=flavor.toLowerCase().replace(/ /g,'_');
 food.push({sku:`soda12_${sku}`,name:`${flavor} — 12oz`,group:'Fruit Soda · 12oz',price:29,recipe:{soda12:1}});
 food.push({sku:`soda16_${sku}`,name:`${flavor} — 16oz`,group:'Fruit Soda · 16oz',price:39,recipe:{soda16:1}});
}
const MENUS=Object.freeze({bike:base,food:base.concat(food)});
function cents(n,label='Amount'){
 if(n===null||n===undefined||String(n).trim()==='')throw new Error(`${label} is missing.`);
 const v=Number(n);
 if(!Number.isFinite(v)||v<0||v>10000000||Math.round(v*100)/100!==v)throw new Error(`${label} must be a valid nonnegative amount with up to 2 decimals.`);
 return Math.round(v*100);
}
function qty(n){if(n===undefined||n===null||n==='')return 0;const v=Number(n);if(!Number.isSafeInteger(v)||v<0||v>100000)return null;return v;}
function round2(n){return Math.round((n+Number.EPSILON)*100)/100;}
function calculate(cart,quantities,unitCosts,expenses=[],salary=0,snapshots={}){
 if(!MENUS[cart])throw new Error('Select Bike Cart or Food Cart.');
 const lines=[];const missing=new Set();let sales=0,cost=0;
 for(const item of MENUS[cart]){
  const amount=qty(quantities[item.sku]??0);
  if(amount===null)throw new Error(`Invalid quantity: ${item.name}.`);
  if(!amount)continue;
  const locked=snapshots[item.sku];
  const priceCents=locked?cents(locked.price,`${item.name} saved price`):cents(item.price,`${item.name} price`);
  let costCents=0;
  if(locked){ costCents=cents(locked.cost,`${item.name} saved cost`); }
  else {
   for(const [ingredient, count] of Object.entries(item.recipe)){
    const raw=unitCosts[ingredient];
    if(raw===null||raw===undefined||String(raw).trim()===''){missing.add(COST_LABELS[ingredient]||ingredient);continue;}
    costCents+=cents(raw,COST_LABELS[ingredient])*count;
   }
  }
  const itemPrice=priceCents/100,itemCost=costCents/100;
  lines.push({sku:item.sku,name:item.name,qty:amount,price:itemPrice,cost:itemCost});
  sales+=priceCents*amount;cost+=costCents*amount;
 }
 let expenseCents=0;const cleanExpenses=[];
 for(const row of expenses){const label=String(row.label||'').trim().slice(0,80);const amount=cents(row.amount??0,'Expense');if(amount&&!label)throw new Error('Expense needs a description.');if(label||amount){expenseCents+=amount;cleanExpenses.push({label,amount:amount/100});}}
 const salaryCents=cents(salary,'Salary');
 const complete=missing.size===0;
 return {lines,missing:[...missing],complete,sales:sales/100,productCost:complete?cost/100:null,expenses:expenseCents/100,salary:salaryCents/100,grossProfit:complete?(sales-cost)/100:null,totalCost:complete?(cost+expenseCents+salaryCents)/100:null,netProfit:complete?(sales-cost-expenseCents-salaryCents)/100:null,expenseRows:cleanExpenses};
}
return {MENUS,FLAVORS,DEFAULT_COSTS,COST_LABELS,cents,qty,round2,calculate};
});
