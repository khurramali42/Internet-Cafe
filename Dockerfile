# Single image for both local cafe installation and isolated hosted deployments.
FROM node:22-alpine AS frontend
WORKDIR /work
COPY package*.json ./
RUN npm ci
COPY . .
ENV VITE_API_URL=/api.php
RUN npm run build

FROM php:8.3-apache
RUN docker-php-ext-install pdo_mysql && a2enmod headers rewrite
COPY --from=frontend /work/dist/ /var/www/html/
COPY public/api.php /var/www/html/api.php
COPY public/billing.php /var/www/html/billing.php
COPY scripts/bootstrap-admin.php /opt/speedy/scripts/bootstrap-admin.php
RUN chown -R www-data:www-data /var/www/html && chmod 750 /opt/speedy/scripts/bootstrap-admin.php
EXPOSE 80
