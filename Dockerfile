FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
	build-essential \
	curl \
	software-properties-common \
	git \
	&& rm -rf /var/lib/apt/lists/*

COPY . .

# make a data directory for the app
RUN mkdir -p /app/data

# install python dependencies
RUN pip3 install -r requirements.txt

EXPOSE 8501

ENV DB_NAME='./data/gliders.db'
ENV APP_DEBUG_MODE='false'
ENV COOKIE_KEY='glider-cg-acph'

HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

ENTRYPOINT ["streamlit", "run", "streamlit_app.py"]