FROM node:24-bookworm-slim AS web-builder

WORKDIR /src

RUN npm install --global pnpm@10.33.4

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.json ./
COPY apps/demo/package.json apps/demo/package.json
COPY packages/app-core/package.json packages/app-core/package.json
COPY packages/ui/package.json packages/ui/package.json
COPY modules/address-book/web/package.json modules/address-book/web/package.json
COPY modules/agenda/web/package.json modules/agenda/web/package.json
COPY modules/appointments/web/package.json modules/appointments/web/package.json
COPY modules/payments/web/package.json modules/payments/web/package.json
COPY modules/personnel/web/package.json modules/personnel/web/package.json
COPY modules/quotes/web/package.json modules/quotes/web/package.json
COPY modules/work-items/web/package.json modules/work-items/web/package.json

RUN pnpm install --frozen-lockfile

COPY apps/demo apps/demo
COPY packages packages
COPY modules modules
COPY eslint.config.js ./

RUN pnpm --filter @crm/demo... build

FROM golang:1.27-bookworm AS server-builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY apps/demo/server apps/demo/server
COPY internal internal
COPY modules modules

RUN CGO_ENABLED=0 go build \
    -trimpath \
    -ldflags="-s -w" \
    -o /out/crm-demo \
    ./apps/demo/server

FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata \
    && addgroup -g 1000 -S crm \
    && adduser -u 1000 -S -D -H -G crm crm

WORKDIR /app

COPY --from=server-builder /out/crm-demo /app/crm-demo
COPY --from=web-builder /src/apps/demo/dist /app/pb_public

USER crm

EXPOSE 8090
VOLUME ["/data"]

ENTRYPOINT ["/app/crm-demo"]
CMD ["serve", "--http=0.0.0.0:8090", "--dir=/data", "--encryptionEnv=PB_ENCRYPTION_KEY"]
