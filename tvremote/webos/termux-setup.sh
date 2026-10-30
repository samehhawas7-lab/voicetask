#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# يحوّل جهاز أندرويد (تابلت أو جوال) إلى خادم الريموت في البيت — بأمرٍ واحد.
#
# يُشغَّل من Termux هكذا (السطر كله، ومنه تُقرأ الأسئلة من الشاشة لا من الأنبوب):
#   pkg install -y curl && bash -c "$(curl -fsSL https://raw.githubusercontent.com/samehhawas7-lab/voicetask/main/tvremote/webos/termux-setup.sh)"
#
# ويُعاد تشغيله بأمان: يحدّث المستودع إن وُجد بدل أن يستنسخه من جديد.
# ============================================================
set -e
TV_IP="${TV_IP:-192.168.8.77}"
REPO="$HOME/voicetask"
say(){ printf '\n\033[1;36m== %s ==\033[0m\n' "$1"; }

say "١/٥ تحديث Termux وتنصيب node وgit"
# الإعدادات القديمة تُبقى كما هي بلا سؤال، فلا يتوقف التنصيب في منتصفه
yes | pkg upgrade -y -o Dpkg::Options::=--force-confold >/dev/null 2>&1 || true
pkg install -y nodejs git

say "٢/٥ جلب المشروع"
if [ -d "$REPO/.git" ]; then
  git -C "$REPO" pull --ff-only
else
  git clone --depth 1 https://github.com/samehhawas7-lab/voicetask "$REPO"
fi

say "٣/٥ تنصيب حزم الخادم"
# الحزم في tvremote/webos لا في tvremote: الخادم يحتاج tuyapi ولا تُنصَّب إلا من هنا
cd "$REPO/tvremote/webos"
npm install --no-audit --no-fund

say "٤/٥ التشغيل التلقائي عند إقلاع الجهاز"
mkdir -p "$HOME/.termux/boot"
cat > "$HOME/.termux/boot/tvremote" <<BOOT
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock
cd "$REPO/tvremote/webos"
TV_IP=$TV_IP node server.js >> "$HOME/tvremote.log" 2>&1
BOOT
chmod +x "$HOME/.termux/boot/tvremote"
# أمرٌ قصير لإعادة التشغيل يدوياً: اكتب remote فقط
cat > "$PREFIX/bin/remote" <<RUN
#!/data/data/com.termux/files/usr/bin/sh
termux-wake-lock 2>/dev/null
cd "$REPO/tvremote/webos"
TV_IP=$TV_IP exec node server.js
RUN
chmod +x "$PREFIX/bin/remote"

say "٥/٥ تشغيل الخادم"
IP=$(ip -4 addr show wlan0 2>/dev/null | sed -n 's/.*inet \([0-9.]*\).*/\1/p' | head -1)
echo "افتح من سفاري في الآيفون:  http://${IP:-<عنوان-التابلت>}:8099"
echo "اترك هذه النافذة مفتوحة. ولإعادة التشغيل لاحقاً اكتب:  remote"
termux-wake-lock 2>/dev/null || true
TV_IP=$TV_IP exec node server.js
