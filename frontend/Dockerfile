FROM node:23-alpine as builder
WORKDIR /app

# 复制 package.json 和 package-lock.json
COPY package*.json ./

# 使用 --legacy-peer-deps 安装依赖
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# 生产环境
FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]