# FROM python:3.12.11-slim
FROM python:3.12.11-alpine3.22

WORKDIR /app

COPY . .

# make a data directory for the app
RUN mkdir -p /app/data

# install python dependencies
RUN pip3 install -r requirements.txt

EXPOSE 8501
HEALTHCHECK CMD curl --fail http://localhost:8501/_stcore/health

ENTRYPOINT ["streamlit", "run", "streamlit_app.py"]