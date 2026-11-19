#!/bin/sh
# 把 REAL_IP_FROM（逗号/空格分隔）展开为逐条 set_real_ip_from 指令。
# Nginx 的 set_real_ip_from 每次只接受一个地址/CIDR，逗号列表会导致
# "host not found" 并阻断容器启动。
set -eu

OUT="${REALIP_CONF:-/etc/nginx/realip.conf}"
LIST="${REAL_IP_FROM:-127.0.0.1,172.16.0.0/12}"

: > "$OUT"

for cidr in $(printf '%s' "$LIST" | tr ',' ' '); do
    case "$cidr" in
        *[!0-9A-Fa-f:./]*)
            echo "invalid REAL_IP_FROM entry: $cidr" >&2
            exit 1
            ;;
    esac
    printf 'set_real_ip_from %s;\n' "$cidr" >> "$OUT"
done

printf 'real_ip_header X-Forwarded-For;\n' >> "$OUT"
echo "generated $OUT from REAL_IP_FROM=$LIST"
