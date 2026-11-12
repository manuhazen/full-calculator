FROM node:24-alpine
RUN apk add --no-cache git
WORKDIR /opt/formatter
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
ENV PATH="/opt/formatter/node_modules/.bin:${PATH}"
ENV PRETTIER_BIN="/opt/formatter/node_modules/.bin/prettier"
RUN git config --global --add safe.directory /workspace
WORKDIR /workspace
CMD ["npm", "run", "format:check"]
