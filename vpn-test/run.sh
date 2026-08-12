#!/usr/bin/env bash
# ============================================================
# اختبارات مصر VPN
#   ./run.sh          الأساسية — بلا أيّ حزم خارجية
#   ./run.sh all      ومعها اختبارات QR والمفاتيح والواجهة (تحتاج npm i)
# ============================================================
set -u
cd "$(dirname "$0")"

green() { printf "\033[1;32m%s\033[0m\n" "$*"; }
red()   { printf "\033[1;31m%s\033[0m\n" "$*"; }
head2() { printf "\n\033[1;36m═══ %s ═══\033[0m\n" "$*"; }

FAILED=0
note() { [ "$1" -eq 0 ] || FAILED=1; }

# موقعٌ وهميّ يشير إلى هذا الجهاز — لأنّ البوّابة ترفض العناوين الداخلية عمداً
if ! grep -q "test.masr.local" /etc/hosts 2>/dev/null; then
  if [ "$(id -u)" -eq 0 ]; then
    echo "127.0.0.1 test.masr.local" >> /etc/hosts
  else
    red "أضف هذا السطر إلى /etc/hosts ثمّ أعد المحاولة:"
    echo "    127.0.0.1 test.masr.local"
    exit 1
  fi
fi

# شهادة محلّية لتجربة HTTPS داخل النفق
if [ ! -f cert.pem ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -keyout key.pem -out cert.pem -days 365 \
    -subj "/CN=test.masr.local" -addext "subjectAltName=DNS:test.masr.local" >/dev/null 2>&1
fi

# منافذ الاختبار يجب أن تكون خالية، وإلّا أجاب خادمٌ قديم عن أسئلتنا فظننّاه الجديد
for port in 7788 8081 8082 8083 8084 8443; do
  if (exec 3<>/dev/tcp/127.0.0.1/$port) 2>/dev/null; then
    exec 3<&- 2>/dev/null
    red "المنفذ $port مشغول — أغلق ما يستعمله ثمّ أعد المحاولة."
    exit 1
  fi
done

LAB_PID=""; DEV_PID=""
cleanup() {
  [ -n "$DEV_PID" ] && kill "$DEV_PID" 2>/dev/null
  [ -n "$LAB_PID" ] && kill "$LAB_PID" 2>/dev/null
  return 0
}
trap cleanup EXIT

node lab.js > lab.log 2>&1 &
LAB_PID=$!
sleep 1

serve() {  # serve <بوّابة> — نتتبّع رقم العملية، فقتلٌ بالاسم قد يخطئ الهدف
  if [ -n "$DEV_PID" ]; then kill "$DEV_PID" 2>/dev/null; wait "$DEV_PID" 2>/dev/null; fi
  EGYPT_PROXY="$1" NODE_EXTRA_CA_CERTS="$PWD/cert.pem" node dev.js > dev.log 2>&1 &
  DEV_PID=$!
  sleep 1.2
}

head2 "البوّابة عبر نفق CONNECT"
serve "http://127.0.0.1:8082"; TEST_MODE=connect node test.js; note $?

head2 "البوّابة عبر نفق SOCKS5"
serve "socks5://127.0.0.1:8083"; TEST_MODE=socks node test.js; note $?

head2 "بوّابة معطّلة: لا تسرّب اتصالٍ مباشر"
serve "http://127.0.0.1:9999"; TEST_MODE=dead node test.js; note $?

if [ "${1:-}" = "all" ]; then
  if [ ! -d node_modules ]; then
    red "تحتاج الحزم أوّلاً:  npm install"
    exit 1
  fi
  head2 "حساب منحنى ٢٥٥١٩"
  node fieldtest.js; note $?
  node ladder.js;    note $?

  head2 "مفاتيح WireGuard مقابل مكتبة Node"
  node wgtest.js;  note $?
  node wgtest3.js; note $?

  head2 "رمز QR: يُفكّ بقارئ مستقلّ"
  node qrdecode.js; note $?

  head2 "الواجهة في متصفّح حقيقيّ"
  serve "http://127.0.0.1:8082"
  node ui.js; note $?
fi

echo
if [ "$FAILED" -eq 0 ]; then green "كلّ الاختبارات نجحت"; else red "بعض الاختبارات فشلت"; fi
exit "$FAILED"
