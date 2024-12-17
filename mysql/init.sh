#!/bin/bash

set -e

(
  echo 'Waiting for MySQL to be available'
  maxTries=10
  while [ "$maxTries" -gt 0 ]; do
    if mysqladmin ping -h "localhost" --silent; then
      echo "MySQL is up and running"
      break
    else
      echo "MySQL is not available yet"
      sleep 1
      maxTries=$((maxTries - 1))
    fi
  done

  if [ "$maxTries" -eq 0 ]; then
    echo "MySQL failed to start"
    exit 1
  fi

  # 执行 mysql 命令，将 init.sql 文件中的 SQL 脚本执行到 MySQL 数据库中
  echo "Executing SQL scripts..."
  mysql -h "localhost" -u "root" -p"${MYSQL_ROOT_PASSWORD}" </docker-entrypoint-initdb.d/init.sql
) &

exec docker-entrypoint.sh mysqld