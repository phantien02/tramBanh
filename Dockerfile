FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production TZ=Asia/Ho_Chi_Minh DATA_DIR=/app/data
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/drizzle ./drizzle
# Next standalone tracing bỏ sót thư viện native libvips của sharp (@img/sharp-libvips-*)
# → upload ảnh lỗi 500 (ERR_DLOPEN_FAILED). Copy trọn sharp + @img để có đủ .node lẫn .so.
COPY --from=builder /app/node_modules/sharp ./node_modules/sharp
COPY --from=builder /app/node_modules/@img ./node_modules/@img
EXPOSE 3000
CMD ["node", "server.js"]
