import os

class Config:
    MYSQL_HOST = os.getenv('MYSQL_HOST', 'localhost')
    MYSQL_PORT = int(os.getenv('MYSQL_PORT', 3306))
    MYSQL_USER = os.getenv('MYSQL_USER', 'root')
    MYSQL_PASSWORD = os.getenv('MYSQL_PASSWORD', '7q6K!LkLB!cGJqU#')
    MYSQL_DB = os.getenv('MYSQL_DB', 'kube_bench') 