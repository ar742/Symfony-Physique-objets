FROM composer:2 AS composer
FROM php:8.5-apache

RUN apt-get update \
    && apt-get install -y --no-install-recommends git unzip libicu-dev libzip-dev libonig-dev \
    && docker-php-ext-install -j"$(nproc)" intl pdo_mysql zip mbstring \
    && rm -rf /var/lib/apt/lists/*

COPY --from=composer /usr/bin/composer /usr/local/bin/composer
COPY apache.conf /etc/apache2/sites-available/000-default.conf
COPY installer /usr/local/bin/installer
COPY starter/ /opt/physique-starter/

RUN sed -i 's/\r$//' /usr/local/bin/installer \
    && chmod +x /usr/local/bin/installer

WORKDIR /var/www/html
