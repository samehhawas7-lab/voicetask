# -*- coding: utf-8 -*-
"""تخطيطُ صفحات المصحف من خطوط المجمّع نفسها.

الأسطر في المصحف المطبوع مضبوطةُ الطرفين: كلُّ سطرٍ يملأ عرض الصفحة
تماماً. وخطُّ كلّ صفحةٍ يحمل أشكال كلماتها بعروضها المطبوعة. فإذا
قسّمنا كلماتِ الصفحة إلى عددٍ من الأسطر ووجدنا مجاميعَها متساويةً
تساوياً شبهَ تامّ، فذلك هو التقسيمُ المطبوع لا غيره — وأيُّ عددٍ آخر
يعطي تفاوتاً بيّناً. فالقياسُ نفسه يكشف الجواب ويشهد له.
"""
from fontTools.ttLib import TTFont
import os

FONTS = os.path.join(os.path.dirname(os.path.abspath(__file__)), "repo/mushaf-woff2")

def page_words(rows, page):
    return [ch for (p, g) in rows if p == page for ch in g]

def advances(page, words):
    f = TTFont(os.path.join(FONTS, "QCF_P%03d.woff2" % page))
    cm = f.getBestCmap(); hm = f["hmtx"]
    out = []
    for c in words:
        gn = cm.get(ord(c))
        if gn is None: return None
        out.append(hm[gn][0])
    return out

def split(w, L):
    """يقسم إلى L سطراً بأقلّ عرضٍ أقصى — وهو التقسيم الأمثل، لا الجشع.

    والقطعُ الجشع كان يخطئ في نحوٍ من ثلاثين صفحة: يقتطع عند أقرب
    موضعٍ للمتوسّط فيُورث ما بعده ضيقاً لا يُدرَك.
    """
    n = len(w)
    if L > n or L < 1: return None
    lo, hi = max(w), sum(w)
    def fits(cap):
        cnt, run = 1, 0
        for x in w:
            if run + x <= cap: run += x
            else: cnt += 1; run = x
        return cnt <= L
    while lo < hi:
        mid = (lo + hi) // 2
        if fits(mid): hi = mid
        else: lo = mid + 1
    cap = lo
    cuts = [0]; run = 0
    for i, x in enumerate(w):
        if run + x <= cap: run += x
        else: cuts.append(i); run = x
    cuts.append(n)
    # قد يقلّ العدد عن المطلوب، فتُشطر أعرضُ الأسطر
    while len(cuts) - 1 < L:
        widths = [(sum(w[cuts[i]:cuts[i+1]]), i) for i in range(len(cuts)-1)
                  if cuts[i+1] - cuts[i] > 1]
        if not widths: break
        _, i = max(widths)
        a, b = cuts[i], cuts[i+1]
        half = sum(w[a:b]) / 2; run2 = 0; k = a
        while k < b - 1 and run2 + w[k] < half: run2 += w[k]; k += 1
        cuts.insert(i+1, k)
    if len(cuts) - 1 != L: return None
    pre = [0]*(n+1)
    for i, x in enumerate(w): pre[i+1] = pre[i] + x
    t = pre[n] / L
    widths = [pre[cuts[i+1]] - pre[cuts[i]] for i in range(L)]
    dev = max(abs(x - t) for x in widths) / t
    return {"cuts": cuts, "dev": dev, "widths": widths}

def best_split(w, lo=5, hi=15):
    res = []
    for L in range(lo, hi+1):
        s = split(w, L)
        if s: res.append((s["dev"], L, s))
    if not res: return None
    res.sort()
    top = res[0]
    second = res[1][0] if len(res) > 1 else 1.0
    return {"lines": top[1], "dev": top[0], "cuts": top[2]["cuts"], "runnerUp": second}
