FROM node:16-alpine as builder
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json vite.config.ts ./
RUN npm install --legacy-peer-deps


RUN npm run build

# 使用 nginx 来服务静态文件
FROM nginx:alpine
COPY --from=0 /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf 