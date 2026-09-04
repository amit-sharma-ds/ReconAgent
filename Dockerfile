FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV DATABASE_URL=file:/app/data/dev.db
RUN mkdir -p /app/data && pnpm exec prisma generate && pnpm build

FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/app/data/dev.db
WORKDIR /app
RUN addgroup -S reconagent && adduser -S reconagent -G reconagent
COPY --from=builder --chown=reconagent:reconagent /app/.next/standalone ./
COPY --from=builder --chown=reconagent:reconagent /app/.next/static ./.next/static
COPY --from=builder --chown=reconagent:reconagent /app/public ./public
COPY --from=builder --chown=reconagent:reconagent /app/prisma ./prisma
COPY --from=builder --chown=reconagent:reconagent /app/node_modules ./node_modules
COPY --from=builder --chown=reconagent:reconagent /app/package.json ./package.json
RUN mkdir -p /app/data && chown reconagent:reconagent /app/data
USER reconagent
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma db push && node server.js"]