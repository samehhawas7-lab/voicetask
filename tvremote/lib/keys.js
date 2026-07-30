"use strict";
// ============================================================
// خريطة الأزرار: اسم مختصر نستخدمه في الواجهة -> اسم Android keycode
// ============================================================

const KEY_MAP = {
  // التنقل
  up: "KEYCODE_DPAD_UP",
  down: "KEYCODE_DPAD_DOWN",
  left: "KEYCODE_DPAD_LEFT",
  right: "KEYCODE_DPAD_RIGHT",
  ok: "KEYCODE_DPAD_CENTER",
  back: "KEYCODE_BACK",
  home: "KEYCODE_HOME",
  menu: "KEYCODE_MENU",
  settings: "KEYCODE_SETTINGS",
  search: "KEYCODE_SEARCH",
  info: "KEYCODE_INFO",
  guide: "KEYCODE_GUIDE",
  tv: "KEYCODE_TV",
  captions: "KEYCODE_CAPTIONS",

  // الصوت
  volume_up: "KEYCODE_VOLUME_UP",
  volume_down: "KEYCODE_VOLUME_DOWN",
  mute: "KEYCODE_VOLUME_MUTE",

  // القنوات
  channel_up: "KEYCODE_CHANNEL_UP",
  channel_down: "KEYCODE_CHANNEL_DOWN",

  // التشغيل
  play: "KEYCODE_MEDIA_PLAY",
  pause: "KEYCODE_MEDIA_PAUSE",
  play_pause: "KEYCODE_MEDIA_PLAY_PAUSE",
  stop: "KEYCODE_MEDIA_STOP",
  next: "KEYCODE_MEDIA_NEXT",
  previous: "KEYCODE_MEDIA_PREVIOUS",
  rewind: "KEYCODE_MEDIA_REWIND",
  forward: "KEYCODE_MEDIA_FAST_FORWARD",

  // الإدخال
  del: "KEYCODE_DEL",
  enter: "KEYCODE_ENTER",
  space: "KEYCODE_SPACE",

  // الأرقام
  "0": "KEYCODE_0",
  "1": "KEYCODE_1",
  "2": "KEYCODE_2",
  "3": "KEYCODE_3",
  "4": "KEYCODE_4",
  "5": "KEYCODE_5",
  "6": "KEYCODE_6",
  "7": "KEYCODE_7",
  "8": "KEYCODE_8",
  "9": "KEYCODE_9",
};

// روابط التطبيقات الشائعة (deep links) — تُفتح عبر sendAppLink
const APP_LINKS = {
  youtube: "https://www.youtube.com",
  netflix: "https://www.netflix.com/title",
  primevideo: "https://app.primevideo.com",
  shahid: "https://shahid.mbc.net",
  spotify: "spotify://",
  browser: "https://www.google.com",
};

// تحويل نص عادي إلى سلسلة keycodes (حروف إنجليزية وأرقام ومسافة فقط)
function textToKeyNames(text) {
  const out = [];
  for (const ch of String(text)) {
    if (ch === " ") {
      out.push("KEYCODE_SPACE");
    } else if (ch >= "0" && ch <= "9") {
      out.push("KEYCODE_" + ch);
    } else {
      const lower = ch.toLowerCase();
      if (lower >= "a" && lower <= "z") out.push("KEYCODE_" + lower.toUpperCase());
      // أي حرف آخر (عربي/رموز) يُتجاهل — البروتوكول ما يدعم إرسال نص خام
    }
  }
  return out;
}

module.exports = { KEY_MAP, APP_LINKS, textToKeyNames };
