# 阶段 1：编译
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


# 阶段 2：运行
FROM nginx:1.27-alpine

# 反代网关地址（可覆盖）：逗号或空格分隔的 CIDR 列表。
ENV REAL_IP_FROM="127.0.0.1,172.16.0.0/12"

# 静态文件 — 可通过 volume 挂载覆盖
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx 模板 — 启动时自动 envsubst 替换环境变量
# 也可通过 volume 挂载覆盖：/etc/nginx/templates/default.conf.template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# 启动时把 REAL_IP_FROM 展开成多条 set_real_ip_from 指令（Nginx 不接受逗号列表）。
COPY docker-entrypoint.d/10-generate-realip.sh /docker-entrypoint.d/10-generate-realip.sh
RUN chmod +x /docker-entrypoint.d/10-generate-realip.sh

EXPOSE 80
