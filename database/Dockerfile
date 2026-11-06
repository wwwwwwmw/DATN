FROM postgis/postgis:16-3.4

LABEL maintainer="Le Tri Anh <1150080125>"
LABEL description="PostgreSQL 16 + PostGIS 3.4 + pgvector for MedTech AI Platform"

# Install pgvector extension
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    git \
    postgresql-server-dev-16 \
    ca-certificates \
    && git clone --branch v0.7.4 https://github.com/pgvector/pgvector.git /tmp/pgvector \
    && cd /tmp/pgvector \
    && make \
    && make install \
    && rm -rf /tmp/pgvector \
    && apt-get remove -y build-essential git postgresql-server-dev-16 \
    && apt-get autoremove -y \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy initialization scripts (run in alphabetical order)
COPY schemas/ /docker-entrypoint-initdb.d/schemas/
COPY seeds/ /docker-entrypoint-initdb.d/seeds/

EXPOSE 5432
