FROM node:24-bookworm-slim AS builder
WORKDIR /scheduling
RUN apt-get update && apt-get install -y --no-install-recommends openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY . .
ARG NEXT_PUBLIC_WEBAPP_URL=http://localhost:3000
ARG NEXT_PUBLIC_WEBSITE_URL=http://localhost:3000
ARG NEXT_PUBLIC_WEBSITE_TERMS_URL=
ARG NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL=
ENV NEXT_PUBLIC_WEBAPP_URL=$NEXT_PUBLIC_WEBAPP_URL NEXT_PUBLIC_WEBSITE_URL=$NEXT_PUBLIC_WEBSITE_URL \
    NEXT_PUBLIC_WEBSITE_TERMS_URL=$NEXT_PUBLIC_WEBSITE_TERMS_URL NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL=$NEXT_PUBLIC_WEBSITE_PRIVACY_POLICY_URL \
    NEXTAUTH_URL=http://localhost:3000/api/auth NEXTAUTH_SECRET=build-only-session-placeholder \
    SCHEDULING_ENCRYPTION_KEY=00000000000000000000000000000000 \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build DATABASE_DIRECT_URL=postgresql://build:build@127.0.0.1:5432/build \
    NEXT_TELEMETRY_DISABLED=1 NODE_OPTIONS=--max-old-space-size=6144 HUSKY=0
RUN node .yarn/releases/yarn-4.12.0.cjs install --immutable
RUN node .yarn/releases/yarn-4.12.0.cjs prisma generate
RUN node .yarn/releases/yarn-4.12.0.cjs exec esbuild scripts/run-local.ts --bundle --platform=node --format=esm --outfile=scripts/generated/run-local.mjs
RUN cd apps/web && node scripts/copy-app-store-static.js
RUN node .yarn/releases/yarn-4.12.0.cjs workspace @scheduling/web build
RUN rm -rf apps/web/.next/cache .turbo .yarn/cache node_modules/.cache
FROM node:24-bookworm-slim
WORKDIR /scheduling
RUN apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
COPY --from=builder /scheduling ./
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1
EXPOSE 3000
CMD ["sh", "scripts/start.sh"]
