const GUID='[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const GUID_PATTERN=new RegExp(`^${GUID}$`,'i');
const SCOPE_PATTERN=/^api:\/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/game\.access$/i;
let initialization;

function configFrom(environment){
  const tenantId=environment.VITE_ENTRA_TENANT_ID?.trim().toLowerCase();
  const clientId=environment.VITE_ENTRA_SPA_CLIENT_ID?.trim().toLowerCase();
  const scope=environment.VITE_ENTRA_API_SCOPE?.trim();
  if(!GUID_PATTERN.test(tenantId??'')||!GUID_PATTERN.test(clientId??'')||!SCOPE_PATTERN.test(scope??''))return null;
  return {tenantId,clientId,scope};
}

export function validateMemberAccount(account,tenantId){
  const claims=account?.idTokenClaims;
  if(!claims||typeof claims!=='object')return {ok:false,reason:'invalid-account'};
  const tid=typeof claims.tid==='string'?claims.tid.toLowerCase():'';
  const oid=typeof claims.oid==='string'?claims.oid.toLowerCase():'';
  if(!GUID_PATTERN.test(tid)||!GUID_PATTERN.test(oid))return {ok:false,reason:'invalid-account'};
  if(tid!==tenantId.toLowerCase())return {ok:false,reason:'wrong-tenant'};
  if(claims.acct===1||claims.acct==='1')return {ok:false,reason:'guest'};
  if(claims.acct!==0&&claims.acct!=='0')return {ok:false,reason:'invalid-account'};
  return {ok:true,tenantId:tid,objectId:oid,userId:`${tid}:${oid}`};
}

async function initialize(environment){
  const mode=environment.VITE_AUTH_MODE;
  if(mode==='local'&&environment.DEV)return {mode:'local'};
  if(mode!=='entra')return {mode:'blocked',reason:'configuration'};
  const config=configFrom(environment);
  if(!config)return {mode:'blocked',reason:'configuration'};

  const msal=await import('@azure/msal-browser');
  const redirectUri=`${window.location.origin}/`;
  const client=new msal.PublicClientApplication({
    auth:{clientId:config.clientId,authority:`https://login.microsoftonline.com/${config.tenantId}`,redirectUri,postLogoutRedirectUri:redirectUri},
    cache:{cacheLocation:msal.BrowserCacheLocation.SessionStorage}
  });
  await client.initialize();
  const redirectResponse=await client.handleRedirectPromise();
  const accounts=client.getAllAccounts();
  let account=redirectResponse?.account??client.getActiveAccount();
  if(redirectResponse?.account)client.setActiveAccount(redirectResponse.account);
  if(!account&&accounts.length===1){account=accounts[0];client.setActiveAccount(account);}
  if(!account&&accounts.length>1)return createAuthContext({client,config,redirectUri,accounts,account:null,InteractionRequiredAuthError:msal.InteractionRequiredAuthError});
  return createAuthContext({client,config,redirectUri,accounts,account,InteractionRequiredAuthError:msal.InteractionRequiredAuthError});
}

function createAuthContext({client,config,redirectUri,accounts,account,InteractionRequiredAuthError}){
  let activeAccount=account;
  const identity=()=>activeAccount?validateMemberAccount(activeAccount,config.tenantId):{ok:false,reason:'signed-out'};
  return {
    mode:'entra',
    account:activeAccount,
    accounts,
    identity:identity(),
    selectAccount(selected){
      if(!accounts.some(value=>value.homeAccountId===selected?.homeAccountId))return {ok:false,reason:'invalid-account'};
      activeAccount=selected;client.setActiveAccount(selected);this.account=selected;this.identity=identity();return this.identity;
    },
    async getAccessToken({forceRefresh=false}={}){
      const selected=activeAccount,member=identity();
      if(!member.ok||!selected)throw new Error('No authorized member account');
      const request={account:selected,scopes:[config.scope],forceRefresh};
      try{
        const result=await client.acquireTokenSilent(request);
        if(!result?.accessToken)throw new Error('No access token returned');
        return result.accessToken;
      }catch(error){
        if(error instanceof InteractionRequiredAuthError){
          await client.acquireTokenRedirect({account:selected,scopes:[config.scope]});
          return new Promise(()=>{});
        }
        throw error;
      }
    },
    async signIn(){
      await client.loginRedirect({scopes:[config.scope],prompt:'select_account'});
    },
    async signOut(){
      const selected=activeAccount;
      activeAccount=null;this.account=null;this.identity={ok:false,reason:'signed-out'};
      try{await client.logoutRedirect({account:selected,postLogoutRedirectUri:redirectUri});}
      catch(error){activeAccount=selected;this.account=selected;this.identity=identity();throw error;}
    }
  };
}

export function initializeEntraAuth({environment=import.meta.env}={}){
  initialization??=initialize(environment).catch(error=>{initialization=null;throw error;});
  return initialization;
}
