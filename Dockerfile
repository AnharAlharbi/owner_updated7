FROM php:8.2-apache
RUN apt-get update && apt-get install -y python3 python3-pip \
    && docker-php-ext-install mysqli pdo pdo_mysql
COPY . /var/www/html/
EXPOSE 80