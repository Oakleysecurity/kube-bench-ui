FROM python:3.9-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
    && pip install --no-cache-dir uwsgi

COPY . .

RUN echo "\
[uwsgi]\n\
http = :5002\n\
module = run:app\n\
master = true\n\
processes = 4\n\
threads = 2\n\
buffer-size = 65535\n\
vacuum = true\n\
die-on-term = true\n\
enable-threads = true\n\
lazy-apps = true\n\
" > uwsgi.ini

EXPOSE 5002

CMD ["uwsgi", "--ini", "uwsgi.ini"] 