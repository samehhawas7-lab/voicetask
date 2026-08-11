"use strict";
// ============================================================
// categories.js — قوائم البذرة المدمجة مع التطبيق.
//
// هذي قائمة أولية تكفي لتشتغل الفلترة من أول لحظة بلا إنترنت.
// للتغطية الواسعة: زر «تحديث القوائم» في الإعدادات يجلب قوائم
// عامة كبيرة (مئات الآلاف من النطاقات) ويخزنها في data/lists.
// ============================================================

const CATEGORIES = {
  adult: {
    label: "مواقع إباحية",
    danger: true,           // تنبيه فوري لولي الأمر عند المحاولة
    domains: [
      "pornhub.com", "xvideos.com", "xnxx.com", "xhamster.com", "redtube.com",
      "youporn.com", "spankbang.com", "eporner.com", "tube8.com", "porntrex.com",
      "chaturbate.com", "stripchat.com", "bongacams.com", "livejasmin.com", "cam4.com",
      "onlyfans.com", "fansly.com", "brazzers.com", "naughtyamerica.com", "bangbros.com",
      "realitykings.com", "adultfriendfinder.com", "rule34.xxx", "e-hentai.org", "nhentai.net",
      "hanime.tv", "hentaihaven.xxx", "motherless.com", "thumbzilla.com", "pornhd.com",
      "txxx.com", "hqporner.com", "porn.com", "sex.com", "xxx.com",
      "beeg.com", "tnaflix.com", "empflix.com", "drtuber.com", "nuvid.com",
      "porntube.com", "4tube.com", "pornone.com", "sexvid.xxx", "javhd.com",
      "erome.com", "camsoda.com", "myfreecams.com", "imagefap.com", "literotica.com",
    ],
  },
  gambling: {
    label: "ميسر ومراهنات",
    danger: true,
    domains: [
      "bet365.com", "1xbet.com", "betway.com", "888casino.com", "pokerstars.com",
      "williamhill.com", "unibet.com", "bwin.com", "melbet.com", "22bet.com",
      "stake.com", "roobet.com", "casino.com", "betfair.com", "draftkings.com",
      "fanduel.com", "parimatch.com", "1win.com", "betwinner.com", "ggpoker.com",
    ],
  },
  dating: {
    label: "تعارف ومواعدة",
    danger: true,
    domains: [
      "tinder.com", "badoo.com", "grindr.com", "bumble.com", "okcupid.com",
      "match.com", "hinge.co", "plentyoffish.com", "zoosk.com", "meetme.com",
      "azar.live", "hago.com", "omegle.com", "chatroulette.com", "holla.world",
    ],
  },
  social: {
    label: "تواصل اجتماعي",
    domains: [
      "facebook.com", "fbcdn.net", "instagram.com", "cdninstagram.com",
      "twitter.com", "x.com", "twimg.com", "tiktok.com", "tiktokcdn.com", "byteoversea.com",
      "snapchat.com", "sc-cdn.net", "snapkit.com", "reddit.com", "redd.it",
      "discord.com", "discordapp.com", "discord.gg", "tumblr.com", "pinterest.com",
      "threads.net", "kwai.com", "likee.video", "vk.com",
    ],
  },
  video: {
    label: "فيديو وترفيه",
    domains: [
      "youtube.com", "youtu.be", "ytimg.com", "googlevideo.com", "youtubei.googleapis.com",
      "netflix.com", "nflxvideo.net", "shahid.net", "primevideo.com", "twitch.tv",
      "ttvnw.net", "dailymotion.com", "vimeo.com", "hulu.com", "disneyplus.com",
      "starzplay.com", "osn.com", "watchit.com",
    ],
  },
  games: {
    label: "ألعاب",
    domains: [
      "roblox.com", "rbxcdn.com", "epicgames.com", "fortnite.com", "steampowered.com",
      "steamcommunity.com", "minecraft.net", "mojang.com", "supercell.com", "clashofclans.com",
      "pubgmobile.com", "garena.com", "freefiremobile.com", "riotgames.com", "leagueoflegends.com",
      "battle.net", "blizzard.com", "ea.com", "origin.com", "playstation.net",
      "xboxlive.com", "crazygames.com", "poki.com", "y8.com", "friv.com",
      "miniclip.com", "addictinggames.com", "roblox.cn",
    ],
  },
  bypass: {
    label: "تجاوز الفلترة (VPN و DNS مشفّر)",
    danger: true,
    domains: [
      // خوادم DNS-over-HTTPS: حجبها يرجّع الأجهزة لخادمنا
      "dns.google", "cloudflare-dns.com", "mozilla.cloudflare-dns.com", "one.one.one.one",
      "dns.quad9.net", "doh.opendns.com", "dns.nextdns.io", "doh.cleanbrowsing.org",
      "dns.adguard.com", "dns.adguard-dns.com", "doh.dnslify.com", "dns.controld.com",
      "use-application-dns.net",           // نطاق فايرفوكس القياسي لتعطيل DoH تلقائياً
      "mask.icloud.com", "mask-h2.icloud.com", "mask-api.icloud.com", // ترحيل آبل الخاص
      // شبكات VPN وبروكسي مشهورة
      "nordvpn.com", "expressvpn.com", "surfshark.com", "protonvpn.com", "cyberghostvpn.com",
      "windscribe.com", "tunnelbear.com", "hotspotshield.com", "hola.org", "psiphon3.com",
      "opera-api.com", "torproject.org", "hide.me", "vpnbook.com", "urban-vpn.com",
      "1.1.1.1.cdn.cloudflare.net", "cloudflareclient.com", "warp.plus",
      "proxysite.com", "croxyproxy.com", "hidemyass.com", "kproxy.com", "4everproxy.com",
    ],
  },
  ads: {
    label: "إعلانات وتتبّع",
    domains: [
      "doubleclick.net", "googlesyndication.com", "googleadservices.com", "google-analytics.com",
      "adservice.google.com", "adnxs.com", "criteo.com", "taboola.com", "outbrain.com",
      "scorecardresearch.com", "quantserve.com", "moatads.com", "adcolony.com", "applovin.com",
      "unityads.unity3d.com", "chartboost.com", "inmobi.com", "mopub.com", "pubmatic.com",
      "rubiconproject.com", "smaato.net", "startappservice.com", "propellerads.com",
    ],
  },
};

// إعادة توجيه محركات البحث لنسخها الآمنة (يمنع نتائج الصور الإباحية)
const SAFE_SEARCH = {
  "google.com": "forcesafesearch.google.com",
  "www.google.com": "forcesafesearch.google.com",
  "google.com.sa": "forcesafesearch.google.com",
  "www.google.com.sa": "forcesafesearch.google.com",
  "google.ae": "forcesafesearch.google.com",
  "www.google.ae": "forcesafesearch.google.com",
  "google.co.uk": "forcesafesearch.google.com",
  "www.google.co.uk": "forcesafesearch.google.com",
  "youtube.com": "restrictmoderate.youtube.com",
  "www.youtube.com": "restrictmoderate.youtube.com",
  "m.youtube.com": "restrictmoderate.youtube.com",
  "youtubei.googleapis.com": "restrictmoderate.youtube.com",
  "youtube.googleapis.com": "restrictmoderate.youtube.com",
  "www.youtube-nocookie.com": "restrictmoderate.youtube.com",
  "bing.com": "strict.bing.com",
  "www.bing.com": "strict.bing.com",
  "duckduckgo.com": "safe.duckduckgo.com",
  "www.duckduckgo.com": "safe.duckduckgo.com",
  "yandex.com": "familysearch.yandex.ru",
  "www.yandex.com": "familysearch.yandex.ru",
};

// مصادر عامة لتحديث القوائم الكبيرة (صيغة hosts أو نطاق في كل سطر)
const REMOTE_LISTS = {
  adult: [
    "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/porn-only/hosts",
  ],
  gambling: [
    "https://raw.githubusercontent.com/StevenBlack/hosts/master/alternates/gambling-only/hosts",
  ],
  ads: [
    "https://raw.githubusercontent.com/StevenBlack/hosts/master/hosts",
  ],
};

// تخمين نوع الجهاز من النطاقات التي يسألها — يساعد في تسمية الأجهزة
const DEVICE_HINTS = [
  [/(^|\.)push\.apple\.com$|(^|\.)captive\.apple\.com$|(^|\.)icloud\.com$/, "جهاز آبل (آيفون/آيباد/ماك)"],
  [/(^|\.)clients\d?\.google\.com$|(^|\.)android\.googleapis\.com$|connectivitycheck\.gstatic\.com$/, "جهاز أندرويد"],
  [/(^|\.)msftconnecttest\.com$|(^|\.)windowsupdate\.com$|(^|\.)msftncsi\.com$/, "كمبيوتر ويندوز"],
  [/(^|\.)playstation\.net$|(^|\.)sonyentertainmentnetwork\.com$/, "بلايستيشن"],
  [/(^|\.)xboxlive\.com$/, "إكس بوكس"],
  [/(^|\.)samsungcloudsolution\.com$|(^|\.)samsungqbe\.com$|(^|\.)samsungotn\.net$/, "جهاز سامسونج (جوال/تلفزيون)"],
  [/(^|\.)roku\.com$|(^|\.)tvos\.apple\.com$|(^|\.)netflix\.com$/, "تلفزيون / جهاز بث"],
];

module.exports = { CATEGORIES, SAFE_SEARCH, REMOTE_LISTS, DEVICE_HINTS };
