FROM php:8.3-cli-alpine
WORKDIR /app
COPY public ./public
# Built-in server with a router script: every request goes through public/index.php.
# Fine for a stand-in; a real PHP monolith would sit behind php-fpm + nginx.
ENV LEGACY_STATE_DIR=/tmp/legacy-php-state
EXPOSE 8080
CMD ["php", "-S", "0.0.0.0:8080", "-t", "public", "public/index.php"]
