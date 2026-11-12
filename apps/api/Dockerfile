FROM golang:1.27-alpine AS development
RUN apk add --no-cache git gcc musl-dev && go install github.com/air-verse/air@v1.61.7
RUN addgroup -g 10001 app && adduser -D -u 10001 -G app app && mkdir -p /app /data /go/pkg/mod /home/app/.cache/go-build && chown -R app:app /app /data /go /home/app
WORKDIR /app
COPY --chown=app:app . .
USER app
EXPOSE 8080
CMD ["air", "-c", ".air.toml"]
