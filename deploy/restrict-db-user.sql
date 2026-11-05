-- Executed by the official MySQL entrypoint as root during FIRST initialization.
-- Official MYSQL_USER provisioning grants ALL privileges on MYSQL_DATABASE.
-- Revoke schema-administration rights from the application account.
REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'speedy_app'@'%';
GRANT SELECT, INSERT, UPDATE, DELETE ON speedy_cafe.* TO 'speedy_app'@'%';
FLUSH PRIVILEGES;
