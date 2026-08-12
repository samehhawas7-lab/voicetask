const ROOT = require("path").join(__dirname, "..");
const nc=require("crypto"),fs=require("fs");
// جذر مزيّف: لا يملك subtle — كمتصفّح قديم
const fake={ crypto:{ getRandomValues:(a)=>{nc.randomFillSync(a);return a;} },
  btoa:(s)=>Buffer.from(s,"binary").toString("base64"),
  atob:(s)=>Buffer.from(s,"base64").toString("binary") };
const src=fs.readFileSync(ROOT + "/vpn-wg.js","utf8");
const mod={exports:{}};
new Function("module","globalThis","btoa","atob",src)(mod,fake,fake.btoa,fake.atob);
const WG=mod.exports;
function refPublic(p){const raw=Buffer.from(p,"base64");const der=Buffer.concat([Buffer.from("302e020100300506032b656e04220420","hex"),raw]);const k=nc.createPrivateKey({key:der,format:"der",type:"pkcs8"});const pub=nc.createPublicKey(k).export({format:"der",type:"spki"});return pub.subarray(pub.length-32).toString("base64");}
(async()=>{let bad=0;
for(let i=0;i<8;i++){const g=await WG.generate();
 if(g.via!=="js"){console.log("✗ لم يسلك المسار الاحتياطيّ:",g.via);bad++;}
 if(refPublic(g.privateKey)!==g.publicKey){console.log("✗ مفتاح خاطئ");bad++;}
 if(!WG.isValidKey(g.publicKey)||!WG.isValidKey(g.privateKey)){console.log("✗ صيغة");bad++;}}
console.log(bad?bad+" فشل":"✓ ٨ مفاتيح بالتنفيذ الداخليّ (متصفّح بلا WebCrypto) كلّها صحيحة ومطابقة لـ Node");
process.exit(bad?1:0);})();
