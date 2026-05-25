FROM node:22-alpine AS web-build

WORKDIR /web
COPY web/package*.json ./
RUN npm install
COPY web ./
RUN npm run build

FROM python:3.12.13-alpine3.23

WORKDIR /app
COPY . .
COPY --from=web-build /web/dist /app/web/dist

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
RUN pip3 install --no-cache-dir -r requirements.txt

# Clean up build tools to save space
RUN apk del .build-deps

# Update repositories and install curl
RUN apk add --no-cache curl

RUN chmod +x /app/start.sh

EXPOSE 8000
HEALTHCHECK CMD curl --fail http://localhost:8000/health && curl --fail http://localhost:8000/

ENTRYPOINT ["/app/start.sh"]