FROM mysql:8.1.0

# Environment Variables

# MYSQL_ROOT_PASSWORD 必需。为 MySQL root超级用户帐户设置的密码。
# MYSQL_DATABASE 可选。指定要在映像启动时创建的数据库的名称。

COPY init.sql /docker-entrypoint-initdb.d
COPY init.sh /usr/local/bin/init.sh

RUN chmod +x /usr/local/bin/init.sh
EXPOSE 3306
