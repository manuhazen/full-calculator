FROM golang:1.27-alpine AS development
RUN apk add --no-cache git gcc musl-dev && go install github.com/air-verse/air@v1.67.4
RUN addgroup -g 10001 app && adduser -D -u 10001 -G app app && mkdir -p /app /data /go/pkg/mod /home/app/.cache/go-build && chown -R app:app /app /data /go /home/app
WORKDIR /app
COPY --chown=app:app . .
USER app
EXPOSE 8080
CMD ["air", "-c", ".air.toml"]

FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/api ./cmd/api

FROM alpine:3.23 AS production
RUN addgroup -g 10001 app && adduser -D -u 10001 -G app app && mkdir /data && chown app:app /data
COPY --from=build /out/api /usr/local/bin/api
USER app
ENV API_ADDR=:8080 DATABASE_PATH=/data/calculator.db
EXPOSE 8080
CMD ["/usr/local/bin/api"]
