const ROOT = require("path").join(__dirname, "..");
globalThis.btoa=(s)=>Buffer.from(s,"binary").toString("base64");
globalThis.atob=(s)=>Buffer.from(s,"base64").toString("binary");
const nc=require("crypto");
globalThis.crypto={getRandomValues:(a)=>{nc.randomFillSync(a);return a;}};
const src=require("fs").readFileSync(ROOT + "/vpn-wg.js","utf8");
// نكشف الدوالّ الداخلية للاختبار
const mod={exports:{}};
new Function("module","globalThis", src.replace("const api = { generate","globalThis.__f={gf,car25519,pack25519,unpack25519,A,Z,M,S,inv25519,scalarMult};\n  const api = { generate"))(mod, globalThis);
const F=globalThis.__f;
const P=(1n<<255n)-19n;
const toBig=(u8)=>{let v=0n;for(let i=31;i>=0;i--)v=(v<<8n)|BigInt(u8[i]);return v;};
const fromBig=(v)=>{const u=new Uint8Array(32);let x=v;for(let i=0;i<32;i++){u[i]=Number(x&255n);x>>=8n;}return u;};
let bad=0;
for(let t=0;t<50;t++){
  const ab=nc.randomBytes(32), bb=nc.randomBytes(32);
  ab[31]&=127; bb[31]&=127;
  const ag=F.gf(),bg=F.gf(),og=F.gf();
  F.unpack25519(ag,ab); F.unpack25519(bg,bb);
  const av=toBig(ab)%P, bv=toBig(bb)%P;
  F.M(og,ag,bg); const out=new Uint8Array(32); F.pack25519(out,og);
  if(toBig(out)!==(av*bv)%P){ if(bad<2)console.log("✗ M خطأ"); bad++; }
  const sg=F.gf(); F.A(sg,ag,bg); const o2=new Uint8Array(32); F.pack25519(o2,sg);
  if(toBig(o2)!==(av+bv)%P){ if(bad<3)console.log("✗ A خطأ"); bad++; }
  const ig=F.gf(); F.inv25519(ig,ag); const o3=new Uint8Array(32); F.pack25519(o3,ig);
  const inv=toBig(o3);
  if((inv*av)%P!==1n%P){ if(bad<4)console.log("✗ inv خطأ"); bad++; }
  const rt=new Uint8Array(32); const rg=F.gf(); F.unpack25519(rg,ab); F.pack25519(rt,rg);
  if(toBig(rt)!==av){ if(bad<5)console.log("✗ pack/unpack خطأ"); bad++; }
}
console.log(bad?bad+" فشل في حساب الحقل":"✓ حساب الحقل سليم (ضرب، جمع، معكوس، حزم)");
