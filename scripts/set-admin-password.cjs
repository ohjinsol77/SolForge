// Generates credentials outside the repository. Never prints secret values.
const crypto=require('crypto'),fs=require('fs'),path=require('path'),os=require('os');
const dir=path.join(os.homedir(),'.codex','private');fs.mkdirSync(dir,{recursive:true,mode:0o700});
const password=crypto.randomBytes(24).toString('base64url'),salt=crypto.randomBytes(16).toString('hex');
const hash=crypto.pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
const existingPath=path.join(dir,'solforge-admin-secrets.json');
if(process.argv.includes('--rotate'))throw Error('Use the admin page to change your password. This helper only initializes credentials.');
const rotating=false;
const previous=rotating&&fs.existsSync(existingPath)?JSON.parse(fs.readFileSync(existingPath,'utf8')):null;
if(rotating&&!previous)throw Error('No existing secrets to rotate.');
const secrets={ADMIN_PASSWORD_HASH:`pbkdf2$100000$${salt}$${hash}`,ANALYTICS_SALT:previous?.ANALYTICS_SALT||crypto.randomBytes(32).toString('hex')};
const secretsPath=path.join(dir,'solforge-admin-secrets.json'),passwordPath=path.join(dir,'solforge-admin-password.txt');
if(!rotating&&(fs.existsSync(passwordPath)||fs.existsSync(secretsPath)))throw Error('Credentials already exist; preserve existing analytics salt when rotating.');
fs.writeFileSync(secretsPath,JSON.stringify(secrets),{mode:0o600,flag:rotating?'w':'wx'});
fs.writeFileSync(passwordPath,`https://solforge.cloud/admin/ko\n\n${password}\n`,{mode:0o600,flag:rotating?'w':'wx'});
console.log('Credentials generated in the private directory. No secrets were printed.');
