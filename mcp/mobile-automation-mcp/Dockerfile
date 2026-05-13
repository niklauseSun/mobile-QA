FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build
RUN npm prune --omit=dev

FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
ENV MOBILE_MCP_TRANSPORT=http
ENV MOBILE_MCP_HOST=0.0.0.0
ENV MOBILE_MCP_PORT=3000

COPY --from=build /app/package.json ./package.json
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist

RUN mkdir -p artifacts

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/health').then((r)=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
