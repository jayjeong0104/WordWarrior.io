FROM node:12

WORKDIR /app

COPY ./Server/setup.js ./Server/
COPY ./Server/package*.json ./Server/
COPY ./Server/lib/package*.json ./Server/lib/
COPY ./Server/lib/ ./Server/lib/
COPY ./tools/ ./tools/

RUN cd Server && node setup

RUN cd Server/lib && npx grunt default pack

WORKDIR /kkutu
