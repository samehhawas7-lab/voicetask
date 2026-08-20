#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""مولّد صفحات المصحف المصوَّر.

خطوطُ مجمّع الملك فهد تحمل أشكالَ كلماتِ كلّ صفحةٍ كما طُبعت — فالحرفُ
هنا هو الطباعةُ نفسُها لا محاكاتُها. وأمّا تقسيمُ الأسطر فيُستخرج من
الخطوط أنفسِها: أسطرُ المصحف مضبوطةُ الطرفين، فالتقسيمُ الصحيح هو الذي
تتساوى فيه مجاميعُ عروض الكلمات تساوياً شبهَ تامّ.

نموذجان: صفحةٌ لا تبدأ فيها سورةٌ تُقسَم سلسلةً واحدة؛ وصفحةٌ تبدأ
فيها سورٌ تُقسَم كتلاً — لكلّ سورةٍ كتلتُها، وآخرُ سطرٍ من الكتلة
يجوز قِصَرُه كما في الورق. **وما لم يجتز القياسَ لا يُشحن مصوَّراً**:
يُعلَّم نصّياً وتبقى قراءتُه بالنصّ المعاد رصُّه — فمصحفٌ أسطرُه
خاطئة ليس كزرٍّ لا يعمل.

الاستعمال:
  qcf-pages-gen.py <mushaf.txt> <مجلد الخطوط woff2> <quran.json> <الناتج.json>
"""
import sys, json, os
from fontTools.ttLib import TTFont

TOL = 0.015          # استواءٌ بهذا الإحكام لا يقع إلا للتقسيم الحقّ
LINES_PER_PAGE = 15

def fill(w, cap):
    cuts=[0]; run=0
    for i,x in enumerate(w):
        if run and run + x > cap: cuts.append(i); run = x
        else: run += x
    cuts.append(len(w)); return cuts

def split_equal(w, L):
    """تقسيمٌ متساوٍ إلى L: قطعٌ عند أقرب موضعٍ لكلّ مضاعفٍ للمتوسّط"""
    n=len(w)
    if L>n or L<1: return None
    pre=[0]
    for x in w: pre.append(pre[-1]+x)
    t=pre[n]/L; cuts=[0]
    for k in range(1,L):
        want=k*t; lo=cuts[-1]+1
        best=None; bi=lo
        for i in range(lo, n-(L-k)+1):
            d=abs(pre[i]-want)
            if best is None or d<best: best,bi=d,i
        cuts.append(bi)
    cuts.append(n)
    widths=[pre[cuts[i+1]]-pre[cuts[i]] for i in range(L)]
    dev=max(abs(x-t) for x in widths)/t
    return {"cuts":cuts,"dev":dev}

def split_blocks(blocks, T):
    """كتلاً بعرضٍ مشترك: أضيقُ سقفٍ يعطي T سطراً؛ آخرُ كلّ كتلةٍ يقصر"""
    tot=sum(sum(b) for b in blocks)
    lo=max(max(b) for b in blocks if b); hi=tot
    n_at=lambda W: sum(len(fill(b,W))-1 for b in blocks)
    if n_at(hi)>T: return None
    a,b=lo,hi
    while a<b:
        m=(a+b)//2
        if n_at(m)<=T: b=m
        else: a=m+1
    W=a
    if n_at(W)!=T: return None
    out=[]; full=[]
    for blk in blocks:
        c=fill(blk,W); out.append(c)
        for i in range(len(c)-2):          # الممتلئة: كلُّها إلا الأخير
            full.append(sum(blk[c[i]:c[i+1]]))
    if not full: return {"cuts":out,"dev":0.0,"W":W}
    dev=(max(full)-min(full))/W
    return {"cuts":out,"dev":dev,"W":W}

def split_tail(w, L):
    """L-1 سطراً متساوياً وذيلٌ أخير يجوز قِصَرُه — للصفحة تنتهي فيها سورة"""
    n=len(w)
    if L<2 or L>n: return None
    pre=[0]
    for x in w: pre.append(pre[-1]+x)
    best=None
    for k in range(L-1, n):
        body=split_equal(w[:k], L-1)
        if not body: continue
        t=pre[k]/(L-1); tail=pre[n]-pre[k]
        if tail > t*1.02: continue
        if best is None or body["dev"]<best["dev"]:
            best={"cuts":body["cuts"][:-1]+[k,n],"dev":body["dev"]}
    return best

def scan_cap(blocks, T):
    """سقفُ سطرٍ مشترك يُمسح مسحاً: لكلّ كتلةٍ ملؤها، وآخرُ كلٍّ يقصر.
       للصفحات المزدحمة بالسور القصار."""
    tot=sum(sum(b) for b in blocks)
    avg=tot/max(T,1)
    best=None
    for m in range(80, 146):
        W=avg*m/100.0
        cuts=[fill(b,W) for b in blocks]
        if sum(len(c)-1 for c in cuts)!=T: continue
        full=[]
        for b,c in zip(blocks,cuts):
            for i in range(len(c)-2): full.append(sum(b[c[i]:c[i+1]]))
        dev=0.0 if not full else (max(full)-min(full))/W
        if best is None or dev<best["dev"]:
            best={"cuts":cuts,"dev":dev,"W":W}
    return best

def main():
    mushaf_txt, fonts_dir, quran_json, out_json = sys.argv[1:5]
    quran = json.load(open(quran_json, encoding="utf8"))["quran"]
    rows=[]
    with open(mushaf_txt, encoding="utf8") as f:
        for ln in f:
            ln=ln.rstrip("\n")
            if ln: rows.append(ln.split(",",1))
    assert len(rows)==len(quran)==6236, (len(rows), len(quran))

    last={}
    for a in quran: last[a["chapter"]]=max(last.get(a["chapter"],0), a["verse"])

    bypage={}
    for (pg,g),a in zip(rows,quran):
        bypage.setdefault(int(pg),[]).append((a["chapter"],a["verse"],g))

    pages=[]; ok_pages=0; text_pages=[]
    for p in range(1,605):
        items=bypage[p]
        fpath=os.path.join(fonts_dir,"QCF_P%03d.woff2"%p)
        font=TTFont(fpath); cm=font.getBestCmap(); hm=font["hmtx"]
        upem=font["head"].unitsPerEm
        adv=lambda ch: hm[cm[ord(ch)]][0]

        # كتلُ السور، ومواضعُ العناوين
        blocks=[]; cur=[]; curmeta=[]; heads=[]
        lastch=None; T=LINES_PER_PAGE
        for ch,v,g in items:
            if ch!=lastch:
                if cur: blocks.append((cur,curmeta)); cur=[];curmeta=[]
                lastch=ch
                if v==1:
                    heads.append({"block":len(blocks),"sura":ch,
                                  "bsml":ch not in (1,9)})
                    T-=1
                    if ch not in (1,9): T-=1
            for k,c in enumerate(g):
                cur.append(adv(c)); curmeta.append((ch,v,c))
        if cur: blocks.append((cur,curmeta))

        entry={"p":p,"font":"QCF_P%03d.woff2"%p,"u":upem}
        result=None; mode="text"
        if p not in (1,2):     # المزخرفتان تبقيان نصّاً
            ws=[b for b,_ in blocks]
            tries=[]
            # عددُ أسطر النصّ لا يُفترض بل يُمسح: القياسُ أرانا صفحاتٍ
            # نصُّها ١٤ سطراً، وصفحاتِ عناوينَ يشغل عنوانُها وبسملتُها
            # سطراً واحداً لا سطرين. والاستواءُ شبهُ التامّ (≤ ١٫٥٪)
            # لا يقع مصادفةً على عددٍ خاطئ — جرّبنا فوجدنا الخاطئ
            # يتنافر خمسةً في المئة فصاعداً
            for Lx in range(max(3, T-2), 16):
                if len(blocks)==1:
                    r=split_equal(ws[0], Lx)
                    if r: tries.append({"cuts":[r["cuts"]],"dev":r["dev"]})
                    r=split_tail(ws[0], Lx)
                    if r: tries.append({"cuts":[r["cuts"]],"dev":r["dev"]})
                else:
                    r=split_blocks(ws, Lx)
                    if r: tries.append(r)
                r=scan_cap(ws, Lx)
                if r: tries.append(r)
            tries=[t for t in tries if t and t["dev"]<=TOL]
            if tries:
                bestr=min(tries, key=lambda t:t["dev"])
                result=bestr["cuts"]; mode="qcf"; entry["dev"]=round(bestr["dev"],4)
        entry["mode"]=mode
        if mode=="qcf":
            lines=[]; maxw=0
            for bi,((w,meta),cuts) in enumerate(zip(blocks,result)):
                head=[h for h in heads if h["block"]==bi]
                if head:
                    lines.append({"h":head[0]["sura"],
                                  "b":1 if head[0]["bsml"] else 0})
                for i in range(len(cuts)-1):
                    seg=[]; width=0
                    for k in range(cuts[i],cuts[i+1]):
                        ch,v,c=meta[k]; width+=w[k]
                        if seg and seg[-1]["s"]==ch and seg[-1]["a"]==v:
                            seg[-1]["t"]+=c
                        else: seg.append({"s":ch,"a":v,"t":c})
                    maxw=max(maxw,width)
                    lines.append({"g":seg,"w":width})
            entry["lines"]=lines; entry["mw"]=maxw
            ok_pages+=1
        else:
            text_pages.append(p)
        pages.append(entry)

    out={"note":"صفحاتُ مصحف المدينة بخطوط المجمّع — الأسطرُ مستخرَجةٌ من عروض الخطوط ومقيسة",
         "tol":TOL,"pages":pages}
    json.dump(out, open(out_json,"w",encoding="utf8"), ensure_ascii=False,
              separators=(",",":"))
    print("مصوَّرة: %d من ٦٠٤ · نصّية: %d" % (ok_pages, len(text_pages)))
    print("النصّية:", text_pages)
    print("الحجم:", os.path.getsize(out_json)//1024, "ك.ب")

if __name__=="__main__": main()
