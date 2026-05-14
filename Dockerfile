# FROM python:3.12.11-slim
FROM python:3.12.13-alpine3.23

WORKDIR /app

COPY . .

# make a data directory for the app
RUN mkdir -p /app/data

# Install build dependencies
RUN apk add --no-cache --virtual .build-deps \
	build-base \
	cairo-dev \
	pkgconfig \
	python3-dev \
	&& apk add --no-cache cairo

# install python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt

# Clean up build tools to save space
RUN apk del .build-deps

EXPOSE 8501
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

ENTRYPOINT ["streamlit", "run", "streamlit_app.py"]