// C16 transaction helpers. Every online purchase is queued before network submission.
// Server must independently enforce the unique client_event_id and employee authorization.
export async function submitVerifiedEvent({pending,event,award}){
 await pending.add(event); // If this fails, NEVER send network request.
 let receipt;
 try{receipt=await award(event)}catch(error){return {status:'pending',error}}
 // Only a definite server acknowledgment permits queue deletion.
 try{await pending.remove(event.eventId)}catch(error){return {status:'acknowledged-pending-cleanup',receipt,error}}
 return {status:'acknowledged',receipt};
}
export async function replayPendingEvent({pending,event,award}){
 const receipt=await award(event); // EXACT event ID from persistent queue
 await pending.remove(event.eventId); // Only after server acknowledgement
 return receipt;
}
export async function withExclusiveIssuanceLock(lockManager,work){
 // Web Locks prevents concurrent issuance and sync across tabs on supporting browsers.
 // Browsers without Web Locks still rely on persistent IDs and DB idempotency,
 // but cannot eliminate a separate newly submitted event from another tab/device.
 if(!lockManager||typeof lockManager.request!=='function')return {busy:false,result:await work()};
 return lockManager.request('jg-suki-purchase-mutation-v1',{mode:'exclusive',ifAvailable:true},
  lock=>lock?Promise.resolve(work()).then(result=>({busy:false,result})):({busy:true}));
}
