import { isValidCloudSave } from './saveStore.js';

export class CloudRequestError extends Error{
  constructor(status,code){super(code);this.name='CloudRequestError';this.status=status;this.code=code;}
}

function isObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}
function invalidResponse(){return new CloudRequestError(503,'invalid-response');}

export function createCloudSaveClient(auth){
  const leaderboardCache=new Map();
  const cacheLifetimeMs=5*60*1000;

  async function request(path,{method='GET',body,forceRefresh=false,retried=false}={}){
    let token;
    try{token=await auth.getAccessToken({forceRefresh});}
    catch(error){
      const code=String(error?.errorCode??error?.code??error?.message??'').toLowerCase();
      if(/network|timeout|fetch/.test(code))throw new CloudRequestError(0,'token-unavailable');
      throw error;
    }
    const headers={Authorization:`Bearer ${token}`};
    if(body!==undefined)headers['Content-Type']='application/json';
    let response;
    try{
      response=await fetch(`/api/${path}`,{
        method,
        credentials:'same-origin',
        cache:'no-store',
        headers,
        ...(body===undefined?{}:{body:JSON.stringify(body)})
      });
    }catch{throw new CloudRequestError(0,'network-unavailable');}
    if(response.status===401&&!retried){
      return request(path,{method,body,forceRefresh:true,retried:true});
    }
    if(!response.ok)throw new CloudRequestError(response.status,`http-${response.status}`);
    try{return await response.json();}catch{throw invalidResponse();}
  }

  return {
    async getAccount(){
      const value=await request('account');
      if(!isObject(value)||typeof value.userId!=='string'||typeof value.displayName!=='string')throw invalidResponse();
      return value;
    },

    async getSave(){
      const value=await request('save');
      if(!isObject(value)||typeof value.exists!=='boolean'||!Number.isSafeInteger(value.revision)||value.revision<0||
        value.exists&&!isValidCloudSave(value.save)||!value.exists&&value.save!==null)throw invalidResponse();
      return value;
    },

    async putSave(save){
      if(!isValidCloudSave(save))throw new TypeError('Invalid cloud save');
      const value=await request('save',{method:'PUT',body:{save:structuredClone(save)}});
      if(!isObject(value)||value.saved!==true||!Number.isSafeInteger(value.revision)||value.revision<1)throw invalidResponse();
      return value;
    },

    async getLeaderboard(challenge){
      const params=new URLSearchParams({mode:challenge.mode,stageId:challenge.stageId});
      if(challenge.mode==='easy')params.set('round',String(challenge.round));
      const key=params.toString(),now=Date.now(),cached=leaderboardCache.get(key);
      try{
        const value=await request(`leaderboards?${key}`);
        if(!isObject(value)||typeof value.boardId!=='string'||!Number.isSafeInteger(value.totalParticipants)||
          value.totalParticipants<0||!Array.isArray(value.entries)||!('me'in value))throw invalidResponse();
        const result={...value,stale:false};leaderboardCache.set(key,{value:result,expiresAt:now+cacheLifetimeMs});return result;
      }catch(error){
        const isOutage=error instanceof CloudRequestError&&(error.status===0||error.status===503);
        if(isOutage&&cached&&cached.expiresAt>now)return {...cached.value,stale:true};
        throw error;
      }
    }
  };
}
