#!/usr/bin/env bash
# ============================================================
# مصر VPN — تجهيز خادم WireGuard داخل مصر
# يُنفَّذ مرّةً واحدة على جهاز في مصر: خادم VPS في القاهرة،
# أو حاسوب صغير/راسبيري باي في بيت الأهل هناك.
#
#   sudo bash vpn-server-setup.sh
#
# يطبع في آخره المفتاحَ العامّ للخادم — انسخه إلى التطبيق.
# ============================================================
set -euo pipefail

CLIENT_PUBKEY="${CLIENT_PUBKEY:-__CLIENT_PUBLIC_KEY__}"
WG_PORT="${WG_PORT:-51820}"
WG_NET="${WG_NET:-10.7.0}"
WG_IF="${WG_IF:-wg0}"
CONF="/etc/wireguard/${WG_IF}.conf"

red()  { printf "\033[1;31m%s\033[0m\n" "$*"; }
grn()  { printf "\033[1;32m%s\033[0m\n" "$*"; }
info() { printf "\033[1;36m%s\033[0m\n" "$*"; }

[ "$(id -u)" -eq 0 ] || { red "شغّل السكربت بصلاحية الجذر: sudo bash $0"; exit 1; }

if [ "$CLIENT_PUBKEY" = "__CLIENT_PUBLIC_KEY__" ] || [ -z "$CLIENT_PUBKEY" ]; then
  red "ينقص المفتاح العامّ للجوال."
  echo "افتح التطبيق، اضغط «ولّد مفاتيح الجوال»، ثمّ نزّل هذا السكربت من هناك،"
  echo "أو مرّره يدوياً:  sudo CLIENT_PUBKEY='...' bash $0"
  exit 1
fi

case "$CLIENT_PUBKEY" in
  *[!A-Za-z0-9+/=]* | "") red "المفتاح العامّ غير صالح."; exit 1 ;;
esac
[ "${#CLIENT_PUBKEY}" -eq 44 ] || { red "طول المفتاح العامّ يجب أن يكون ٤٤ محرفاً (وجدتُ ${#CLIENT_PUBKEY})."; exit 1; }

# ---------- ١) التحقّق أنّ الخادم فعلاً في مصر ----------
info "== ١/٦ أين هذا الخادم؟ =="
CC="$(curl -fsS --max-time 8 https://ipwho.is/ 2>/dev/null | grep -o '"country_code":"[A-Z]*"' | cut -d'"' -f4 || true)"
PUBIP="$(curl -fsS --max-time 8 https://api.ipify.org 2>/dev/null || true)"
if [ "${CC:-}" = "EG" ]; then
  grn "   ✔ الخادم يظهر من مصر (${PUBIP:-؟})"
elif [ -n "${CC:-}" ]; then
  red "   ✘ الخادم يظهر من ${CC} لا من مصر (${PUBIP:-؟})."
  red "     المتابعة ستعطيك نفقاً يعمل، لكن بعنوانٍ غير مصري — فلا تُفتح مواقعُ مصر."
  printf "     أكمل رغم ذلك؟ [y/N] "
  read -r ans < /dev/tty || ans="n"
  case "$ans" in [yY]*) ;; *) exit 1 ;; esac
else
  red "   ؟ تعذّر التحقّق من الموقع (لا إنترنت خارجيّ؟) — سأكمل."
fi

# ---------- ٢) الحزم ----------
info "== ٢/٦ تثبيت WireGuard =="
export DEBIAN_FRONTEND=noninteractive
if command -v apt-get >/dev/null 2>&1; then
  apt-get update -qq
  apt-get install -y -qq wireguard wireguard-tools iptables curl qrencode >/dev/null
elif command -v dnf >/dev/null 2>&1; then
  dnf install -y -q wireguard-tools iptables curl qrencode
else
  red "لم أعرف مدير الحزم. ثبّت wireguard-tools يدوياً ثمّ أعد التشغيل."; exit 1
fi
grn "   ✔ جاهز"

# ---------- ٣) المفاتيح ----------
info "== ٣/٦ مفاتيح الخادم =="
umask 077
mkdir -p /etc/wireguard
if [ -f /etc/wireguard/server.key ]; then
  grn "   ✔ مفاتيح موجودة — لن أستبدلها"
else
  wg genkey > /etc/wireguard/server.key
  wg pubkey < /etc/wireguard/server.key > /etc/wireguard/server.pub
  grn "   ✔ وُلّدت"
fi
SERVER_PRIV="$(cat /etc/wireguard/server.key)"
SERVER_PUB="$(cat /etc/wireguard/server.pub)"

# ---------- ٤) الإعداد ----------
info "== ٤/٦ كتابة $CONF =="
NIC="$(ip -4 route ls default | grep -oP 'dev \K\S+' | head -1)"
[ -n "$NIC" ] || { red "لم أجد بطاقة الشبكة الافتراضية."; exit 1; }

if [ -f "$CONF" ]; then
  cp "$CONF" "${CONF}.bak.$(date +%s)"
  info "   نسخةٌ احتياطية من الإعداد القديم حُفظت"
fi

cat > "$CONF" <<EOF
# وُلّد بـ vpn-server-setup.sh
[Interface]
Address = ${WG_NET}.1/24
ListenPort = ${WG_PORT}
PrivateKey = ${SERVER_PRIV}
# تمرير الترافيك إلى الإنترنت المصري
PostUp   = iptables -A FORWARD -i %i -j ACCEPT; iptables -A FORWARD -o %i -j ACCEPT; iptables -t nat -A POSTROUTING -o ${NIC} -j MASQUERADE
PostDown = iptables -D FORWARD -i %i -j ACCEPT; iptables -D FORWARD -o %i -j ACCEPT; iptables -t nat -D POSTROUTING -o ${NIC} -j MASQUERADE

[Peer]
# الجوال
PublicKey = ${CLIENT_PUBKEY}
AllowedIPs = ${WG_NET}.2/32
EOF
chmod 600 "$CONF"
grn "   ✔ كُتب (بطاقة الخروج: ${NIC})"

# ---------- ٥) التمرير والجدار ----------
info "== ٥/٦ تفعيل التمرير =="
cat > /etc/sysctl.d/99-wireguard.conf <<EOF
net.ipv4.ip_forward = 1
net.ipv6.conf.all.forwarding = 1
EOF
sysctl -q --system
if command -v ufw >/dev/null 2>&1 && ufw status 2>/dev/null | grep -q "Status: active"; then
  ufw allow "${WG_PORT}"/udp >/dev/null && grn "   ✔ فُتح المنفذ في ufw"
fi
grn "   ✔ تمّ"

# ---------- ٦) التشغيل ----------
info "== ٦/٦ تشغيل الخدمة =="
systemctl enable "wg-quick@${WG_IF}" >/dev/null 2>&1 || true
systemctl restart "wg-quick@${WG_IF}"
sleep 1
if systemctl is-active --quiet "wg-quick@${WG_IF}"; then
  grn "   ✔ النفق يعمل، وسيعود وحده بعد إعادة التشغيل"
else
  red "   ✘ الخدمة لم تعمل. راجع: journalctl -u wg-quick@${WG_IF} -n 40"
  exit 1
fi

echo
grn "════════════════════════════════════════════"
grn "  تمّ. انقل هذين السطرين إلى التطبيق:"
echo
echo "  المفتاح العامّ للخادم : ${SERVER_PUB}"
echo "  العنوان (Endpoint)   : ${PUBIP:-<عنوان-الخادم>}:${WG_PORT}"
grn "════════════════════════════════════════════"
echo
echo "ملاحظات:"
echo "  • إن كان الجهاز في بيتٍ خلف راوتر: وجّه المنفذ ${WG_PORT}/UDP إليه من إعدادات الراوتر،"
echo "    واستعمل عنوان الراوتر العامّ (أو اسم DDNS) في خانة Endpoint."
echo "  • لإضافة جهاز آخر: أضف كتلة [Peer] جديدة بعنوان ${WG_NET}.3/32 ثمّ:"
echo "      systemctl restart wg-quick@${WG_IF}"
echo "  • لمتابعة الاتصال:  wg show"
