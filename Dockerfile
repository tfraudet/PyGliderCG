FROM node:24-alpine AS web-build

WORKDIR /app
COPY package.json ./package.json

WORKDIR /app/web
COPY web/package*.json ./
RUN npm ci
COPY web/index.html ./
COPY web/tsconfig*.json ./
COPY web/vite.config.ts ./
COPY web/components.json ./
COPY web/public ./public
COPY web/src ./src
RUN npm run build

FROM python:3.12.13-alpine3.23

WORKDIR /app

# make a data directory for the app
RUN mkdir -p /app/data

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
	build-base \
	cairo-dev \
	pkgconfig \
	python3-dev \
	&& apk add --no-cache cairo

# install python dependencies for backend
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt

# Clean up build tools to save space
RUN apk del .build-deps

# Update repositories and install curl
RUN apk add --no-cache curl

COPY backend ./backend
COPY start.sh ./start.sh
COPY --from=web-build /app/web/dist ./web/dist

RUN chmod +x /app/start.sh

EXPOSE 8000
# HEALTHCHECK CMD curl --fail http://localhost:8000/health && curl --fail http://localhost:8000/

ENTRYPOINT ["/app/start.sh"]