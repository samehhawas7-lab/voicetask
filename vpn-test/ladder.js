const ROOT = require("path").join(__dirname, "..");
globalThis.btoa=(s)=>Buffer.from(s,"binary").toString("base64");
globalThis.atob=(s)=>Buffer.from(s,"base64").toString("binary");
const nc=require("crypto");
globalThis.crypto={getRandomValues:(a)=>{nc.randomFillSync(a);return a;}};
const src=require("fs").readFileSync(ROOT + "/vpn-wg.js","utf8");
const mod={exports:{}};
new Function("module","globalThis",src.replace("const api = { generate","globalThis.__f={scalarMult,gf,unpack25519,pack25519};\n  const api = { generate"))(mod,globalThis);
const F=globalThis.__f;
const hex=(h)=>new Uint8Array(Buffer.from(h,"hex"));
// RFC 7748 §5.2
const k=hex("a546e36bf0527c9d3b16154b82465edd62144c0ac1fc5a18506a2244ba449ac4");
const u=hex("e6db6867583030db3594c1a424b15f7c726624ec26b3353b10a903a6d0ab1c4c");
const want="c3da55379de9c6908e94ea4df28d084f32eccf03491c71f754b4075577a28552";
const got=Buffer.from(F.scalarMult(k,u)).toString("hex");
console.log(got===want?"✓ متّجه RFC 7748 صحيح":"✗ RFC: "+got+"\n  المنتظر: "+want);
// النقطة الأساس ٩
const base=new Uint8Array(32); base[0]=9;
const priv=hex("77076d0a7361d11d4d2f0a3c5b8f6c5d8c5d0e2b4a5f6c7d8e9f0a1b2c3d4e5f");
console.log("أساس:", Buffer.from(F.scalarMult(priv,base)).toString("hex"));
const der=Buffer.concat([Buffer.from("302e020100300506032b656e04220420","hex"),Buffer.from(priv)]);
const key=nc.createPrivateKey({key:der,format:"der",type:"pkcs8"});
const pub=nc.createPublicKey(key).export({format:"der",type:"spki"});
console.log("Node :", pub.subarray(pub.length-32).toString("hex"));
