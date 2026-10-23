// Persistent, per-browser pending purchase records. NEVER treat these as verified stamps.
// Existing database/store names and version are preserved; no data migration or queue clearing.
const DB='jg_suki_offline_v1',STORE='pending_issuance';
const UUID=/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
function openDB(){return new Promise((resolve,reject)=>{
 const req=indexedDB.open(DB,1);
 req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'eventId'})};
 req.onsuccess=()=>resolve(req.result);
 req.onerror=()=>reject(req.error||new Error('Offline storage unavailable'));
 req.onblocked=()=>reject(new Error('Offline storage is blocked by another tab'));
})}
function transact(mode,fn){return openDB().then(db=>new Promise((resolve,reject)=>{
 const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);let request;
 try{request=fn(store)}catch(err){db.close();reject(err);return}
 tx.oncomplete=()=>{db.close();resolve(request?.result)};
 tx.onerror=()=>{db.close();reject(tx.error||new Error('Offline storage transaction failed'))};
 tx.onabort=()=>{db.close();reject(tx.error||new Error('Offline storage transaction aborted'))};
}))}
export const Pending={
 async add(event){
  if(!event||!UUID.test(String(event.eventId||''))||!UUID.test(String(event.memberToken||''))||
     typeof event.employeeId!=='string'||!event.employeeId.trim()||
     !['regular','bff','barkada','jar'].includes(event.item)||
     !['Tamaraw','BB Marulas','Main Stall'].includes(event.branch)||
     !Number.isFinite(Date.parse(event.createdAt))||typeof event.demo!=='boolean'){
   throw new Error('Invalid offline purchase request. Nothing was queued.');
  }
  // add(), not put(): duplicate event IDs must never silently overwrite a record.
  return transact('readwrite',store=>store.add(event));
 },
 async all(){const db=await openDB();return new Promise((resolve,reject)=>{
  const tx=db.transaction(STORE,'readonly');let records=[];
  const r=tx.objectStore(STORE).getAll();
  r.onsuccess=()=>{records=r.result||[]};
  tx.oncomplete=()=>{db.close();resolve(records.sort((a,b)=>String(a.createdAt||'').localeCompare(String(b.createdAt||''))))};
  tx.onerror=()=>{db.close();reject(tx.error||new Error('Offline queue read failed'))};
  tx.onabort=()=>{db.close();reject(tx.error||new Error('Offline queue read aborted'))};
 })},
 async remove(eventId){return transact('readwrite',store=>store.delete(eventId))},
 async count(){return (await this.all()).length}
};
