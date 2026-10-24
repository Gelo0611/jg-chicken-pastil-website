// Supabase REST implementation without external CDNs/dependencies.
// Only the PUBLIC project URL and anon/publishable key are used in this browser.
const SESSION_KEY='jg_suki_session_v1';
const PROFILE_KEY='jg_suki_verified_profile_v1';
const CARD_CACHE='jg_suki_card_v1';
export class JGApi {
 constructor(config){this.url=String(config.supabaseUrl||'').replace(/\/$/,'');this.key=String(config.supabaseAnonKey||'');this.session=this.loadSession();}
 get enabled(){return this.url.startsWith('https://')&&Boolean(this.key)}
 loadSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch{return null}}
 saveSession(s){this.session=s;if(s)localStorage.setItem(SESSION_KEY,JSON.stringify(s));else{localStorage.removeItem(SESSION_KEY);localStorage.removeItem(CARD_CACHE);localStorage.removeItem(PROFILE_KEY)}}
 async request(path,{method='GET',body,auth=true,retry=true}={}){
  if(!this.enabled)throw new Error('Supabase is not configured.');
  if(!navigator.onLine)throw new Error('You are offline. Only cached card and pending transactions are available.');
  let headers={'apikey':this.key,'Content-Type':'application/json'};
  if(auth&&this.session?.access_token)headers.Authorization=`Bearer ${this.session.access_token}`;

  let response;
  try{response=await fetch(this.url+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:'no-store'});}catch{throw new Error('Could not connect. Check your internet connection.');}
  if(response.status===401&&auth&&retry&&this.session?.refresh_token){await this.refresh();return this.request(path,{method,body,auth,retry:false});}
  const data=await response.json().catch(()=>null);
  if(!response.ok)throw new Error(data?.msg||data?.error_description||data?.message||data?.error||`Request failed (${response.status})`);
  return data;
 }
 async signup(name,email,password){return this.request(`/auth/v1/signup?redirect_to=${encodeURIComponent(this.redirectUrl())}`,{method:'POST',auth:false,body:{email,password,data:{full_name:name.trim()}}});}
 async login(email,password){let response=await this.request('/auth/v1/token?grant_type=password',{method:'POST',auth:false,body:{email,password}});this.saveSession(response);return response;}
 async refresh(){if(!this.session?.refresh_token)throw new Error('Please sign in again.');const session=await this.request('/auth/v1/token?grant_type=refresh_token',{method:'POST',auth:false,body:{refresh_token:this.session.refresh_token},retry:false});this.saveSession(session);return session;}
 async whoami(){if(!this.session?.access_token)return null;try{const user=await this.request('/auth/v1/user');const p=await this.request(`/rest/v1/jg_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=role,full_name,active`);const profile=p?.[0];
  if(!profile){
    if(!user.email_confirmed_at)throw new Error('Confirm your email address before joining J&G Suki Rewards.');
    // A verified Auth session is not, by itself, a loyalty membership.
    // Never cache or expose a prior customer's card when unenrolled.
    localStorage.removeItem(PROFILE_KEY);
    localStorage.removeItem(CARD_CACHE);
    return {id:user.id,email:user.email,role:null,name:String(user.user_metadata?.full_name||'').trim()||'Suki Member',enrolled:false};
  }
  if(!profile.active)throw new Error('Account disabled.');
  const verified={id:user.id,email:user.email,role:profile.role,name:profile.full_name,enrolled:true,verifiedAt:new Date().toISOString()};
  localStorage.setItem(PROFILE_KEY,JSON.stringify(verified));return verified;}catch(err){if(navigator.onLine)throw err;return null;}}
 lastProfile(){try{const p=JSON.parse(localStorage.getItem(PROFILE_KEY)||'null');return p&&Date.now()-new Date(p.verifiedAt).getTime()<12*60*60*1000?p:null}catch{return null}}
 async logout(){try{if(this.session?.access_token&&navigator.onLine)await this.request('/auth/v1/logout',{method:'POST'});}catch{}this.saveSession(null);}
 redirectUrl(){return new URL('./',window.location.href).href;}
 // Default Supabase email confirmation/recovery redirects return short-lived tokens in
 // the URL fragment. Consume immediately and remove them from browser history.
 acceptRedirectSession(){
  const raw=window.location.hash.slice(1);
  if(!raw||!/(?:^|&)(?:access_token|error)=/.test(raw))return {handled:false};
  const values=new URLSearchParams(raw);
  const accessToken=values.get('access_token'),refreshToken=values.get('refresh_token');
  const kind=values.get('type')||'';
  const error=values.get('error_description')||values.get('error');
  window.history.replaceState(null,'',window.location.pathname+window.location.search);
  if(error)return {handled:true,error};
  if(!accessToken||!refreshToken)return {handled:true,error:'The email link is incomplete or expired. Request a new link.'};
  const expiresIn=Number(values.get('expires_in')||3600);
  this.saveSession({access_token:accessToken,refresh_token:refreshToken,token_type:values.get('token_type')||'bearer',expires_in:expiresIn,expires_at:Math.floor(Date.now()/1000)+expiresIn});
  return {handled:true,kind};
 }
 async recover(email){return this.request(`/auth/v1/recover?redirect_to=${encodeURIComponent(this.redirectUrl())}`,{method:'POST',auth:false,body:{email}})}
 async updatePassword(password){if(!this.session?.access_token)throw new Error('Open a valid password reset link first.');return this.request('/auth/v1/user',{method:'PUT',body:{password}})}
 // P1H-A12-ACCOUNT-SETTINGS-20261024: signed-in account settings. Supabase Auth only, no loyalty database modifications.
 accountIdentity(){if(!this.session?.access_token)throw new Error('Sign in first.');return this.request('/auth/v1/user');}
 requestAccountEmailChange(email){if(!this.session?.access_token)throw new Error('Sign in first.');return this.request(`/auth/v1/user?redirect_to=${encodeURIComponent(this.redirectUrl())}`,{method:'PUT',body:{email}});}
 rpc(name,payload={}){return this.request(`/rest/v1/rpc/${name}`,{method:'POST',body:payload});}
 enrollMe(){return this.rpc('jg_enroll_me');}
 async myCard(){const data=await this.rpc('jg_my_card');localStorage.setItem(CARD_CACHE,JSON.stringify({at:new Date().toISOString(),data}));return data;}
 cachedCard(){try{return JSON.parse(localStorage.getItem(CARD_CACHE)||'null')}catch{return null}}
 staffLookup(tokenOrCode){const isUUID=/^[\da-f]{8}-([\da-f]{4}-){3}[\da-f]{12}$/i.test(tokenOrCode.trim());return this.rpc('jg_staff_lookup',isUUID?{p_token:tokenOrCode.trim().toLowerCase()}:{p_code:tokenOrCode.trim()});}
 award(memberToken,item,event,branch){return this.rpc('jg_verify_purchase',{p_token:memberToken,p_item:item,p_event:event,p_branch:branch})}
 claim(voucherId,event){return this.rpc('jg_claim_reward',{p_voucher:voucherId,p_event:event})}
 owner(){return this.rpc('jg_owner_overview')}
 markNotification(id){return this.rpc('jg_mark_notification_read',{p_id:id})}
 ownerFindAccount(email){return this.rpc('jg_owner_find_account',{p_email:email})}
 ownerStaffDirectory(){return this.rpc('jg_owner_staff_directory')}
 setEmployee(userId,enabled){return this.rpc('jg_set_employee',{p_user_id:userId,p_enabled:enabled})}
}

// P1H-A15-EMAIL-VERIFIED-PASSWORD-20261024: direct signed-in password mutation removed. Use verified recovery link only.

// P1I-A15-SELECTIVE-ENROLLMENT-20261024: enrolled state is explicit; enrollment is RPC-only.
