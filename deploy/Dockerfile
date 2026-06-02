# Prod Dockerfile: Multi-stage build
FROM node:20-alpine AS builder

WORKDIR /app

# Use a China-friendly npm mirror for faster installs.
RUN npm config set registry https://registry.npmmirror.com/

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine

RUN sed -i 's/dl-cdn.alpinelinux.org/mirrors.aliyun.com/g' /etc/apk/repositories
RUN apk add --no-cache bash

WORKDIR /usr/share/nginx/html
RUN rm -rf ./*

COPY --from=builder /app/dist .

COPY deploy/platform-console-nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/nginx.conf /etc/nginx/nginx.conf
COPY deploy/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
