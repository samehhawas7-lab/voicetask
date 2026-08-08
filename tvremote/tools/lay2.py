# -*- coding: utf-8 -*-
"""تخطيطُ الصفحة: أسطرٌ مضبوطةُ الطرفين، إلا آخرَ سطرٍ من كلّ سورة.

خمسةَ عشرَ سطراً في كلّ صفحة، يشغل عنوانُ السورة واحداً وبسملتُها
آخر. وما بقي للنصّ. وكلماتُ كل سورةٍ كتلةٌ على حدة: أسطرُها ممتلئة
إلا آخرَها، فقد ينتهي الكلامُ في نصف السطر. فيُبحث عن عرض السطر الذي
يجعل مجموعَ الأسطر مساوياً لما بقي — ثمّ يُتحقَّق أنّ الممتلئة منها
متساويةٌ فعلاً. فإن لم تتساوَ رُدّت الصفحة ولم يُعرض منها شيء.
"""
def fill(words, W):
    """يملأ سطراً سطراً حتى W، ويردّ مواضعَ القطع"""
    cuts=[0]; run=0
    for i,x in enumerate(words):
        if run and run + x > W:
            cuts.append(i); run = x
        else:
            run += x
    cuts.append(len(words))
    return cuts

def page_layout(blocks, T, lo=None, hi=None):
    """blocks: قائمةُ كتل، كلٌّ قائمةُ عروضِ كلماتها. T: عددُ الأسطر."""
    tot=sum(sum(b) for b in blocks)
    lo = lo or max(max(b) for b in blocks if b)
    hi = hi or tot
    def lines_at(W):
        return sum(len(fill(b,W))-1 for b in blocks)
    # كلّما اتّسع السطرُ قلّ العدد: نبحث عن أضيق عرضٍ يعطي T
    a,b=lo,hi
    while a<b:
        m=(a+b)//2
        if lines_at(m)<=T: b=m
        else: a=m+1
    W=a
    if lines_at(W)!=T: return None
    out=[]; full=[]
    for blk in blocks:
        c=fill(blk,W)
        for i in range(len(c)-1):
            wdt=sum(blk[c[i]:c[i+1]])
            out.append((c[i],c[i+1],wdt))
            if i < len(c)-2: full.append(wdt)
    if not full: full=[W]
    dev=max(abs(x-W) for x in full)/W
    return {"W":W,"lines":out,"dev":dev,"full":len(full)}
