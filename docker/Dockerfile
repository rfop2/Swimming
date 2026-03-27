FROM node:lts

ARG UID=1001
ARG GID=999

RUN groupmod -g $GID node && usermod -u $UID -g $GID node

RUN apt-get update \
  && apt-get install -y ffmpeg \
  && rm -rf /var/lib/apt/lists/*

USER node

EXPOSE 3000

WORKDIR /home/node/app

CMD ["node","--import", "server/sentry.server.config.mjs", "server/index.mjs"]
