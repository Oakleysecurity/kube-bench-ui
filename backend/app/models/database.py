import mysql.connector
from mysql.connector import pooling
from config import Config

db_config = {
    'host': Config.MYSQL_HOST,
    'port': Config.MYSQL_PORT,
    'user': Config.MYSQL_USER,
    'password': Config.MYSQL_PASSWORD,
    'database': Config.MYSQL_DB,
    'pool_name': 'mypool',
    'pool_size': 5
}

connection_pool = mysql.connector.pooling.MySQLConnectionPool(**db_config)

def get_connection():
    return connection_pool.get_connection() 