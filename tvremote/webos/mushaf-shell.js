"use strict";
/* تطبيقُ المصحف: صفحةٌ واحدة، وتطبيقان.

   طلب مصحفاً مستقلّاً عن الريموت. وهو مستقلٌّ فيما يراه: أيقونتُه
   واسمُه وبدايتُه ومحتواه — لا شاشةَ جهازٍ فيه. وأمّا المحرّك فواحد،
   وذلك مقصود: نسختان من شيفرةٍ واحدة تفترقان بعد شهر، فتُصلح علّةً
   في إحداهما وتبقى في الأخرى. */
const MUSHAF_SCREENS = new Set([
  "dev-islam", "islam-quran", "islam-azkar", "islam-times", "islam-qibla",
]);

function mushafShell(html) {
  // تُنزع شاشاتُ الأجهزة من الصفحة نفسها، فلا تصل الجوّال أصلاً
  html = html.replace(
    /<section class="screen[^"]*" id="([a-z0-9-]+)"[\s\S]*?\n<\/section>/g,
    (m, id) => (MUSHAF_SCREENS.has(id) ? m : "")
  );
  // «إسلامي» تصير أولى الشاشات وبيتَ التطبيق
  html = html.replace('<section class="screen" id="dev-islam" data-title="إسلامي"',
                      '<section class="screen on" id="dev-islam" data-title="المصحف"');
  return html;
}

module.exports = { MUSHAF_SCREENS, mushafShell };
