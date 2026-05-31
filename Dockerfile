# 阶段 1：编译
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build


# 阶段 2：运行
FROM nginx:1.27-alpine

# 静态文件 — 可通过 volume 挂载覆盖
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx 模板 — 启动时自动 envsubst 替换环境变量
# 也可通过 volume 挂载覆盖：/etc/nginx/templates/default.conf.template
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

EXPOSE 80
