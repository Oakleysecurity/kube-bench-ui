-- 初始化 MySQL 数据库
CREATE DATABASE IF NOT EXISTS kube_bench;

USE kube_bench;

-- 集群信息表
CREATE TABLE IF NOT EXISTS cluster_info (
    cluster_id CHAR(36) NOT NULL PRIMARY KEY COMMENT '集群ID，UUID',
    cluster_name VARCHAR(255) NOT NULL COMMENT '集群名称',
    cluster_owner VARCHAR(255) NOT NULL COMMENT '集群负责人',
    api_server VARCHAR(255) NOT NULL COMMENT 'API服务器地址',
    business_name VARCHAR(255) NOT NULL COMMENT '集群业务名称',
    access_token TEXT NOT NULL COMMENT '访问令牌',
    node_count INT NOT NULL COMMENT '集群节点数量',
    notes TEXT COMMENT '备注',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='存储集群信息';

-- 集群节点扫描任务管理表
CREATE TABLE IF NOT EXISTS cluster_node_tasks (
    cluster_id CHAR(36) NOT NULL COMMENT '集群ID，UUID，关联到集群信息表',
    cluster_name VARCHAR(255) NOT NULL COMMENT '集群名称',
    node_name VARCHAR(255) NOT NULL COMMENT '集群节点名称',
    node_role VARCHAR(255) NOT NULL COMMENT '集群节点角色',
    node_ip VARCHAR(45) NOT NULL COMMENT '集群节点IP地址',
    scanner VARCHAR(255) NOT NULL COMMENT 'kube-bench Pod名称',   
    kube_bench_job VARCHAR(255) NOT NULL COMMENT 'kube-bench job名称',
    scan_status ENUM('pending', 'running', 'done', 'failed') NOT NULL COMMENT '集群节点扫描状态',
    main_task_id CHAR(36) NOT NULL COMMENT '扫描主任务ID',
    node_task_id CHAR(36) NOT NULL PRIMARY KEY COMMENT '集群节点任务ID',
    task_created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '任务创建时间',
    FOREIGN KEY (cluster_id) REFERENCES cluster_info(cluster_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='管理集群节点的扫描任务';

-- 集群节点扫描结果表
CREATE TABLE IF NOT EXISTS cluster_scan_results (
    cluster_id CHAR(36) NOT NULL COMMENT '集群ID，UUID，关联到集群信息表',
    cluster_name VARCHAR(255) NOT NULL COMMENT '集群名称',
    node_name VARCHAR(255) NOT NULL COMMENT '集群节点名称',
    node_ip VARCHAR(45) NOT NULL COMMENT '集群节点IP地址',
    scan_result JSON NOT NULL COMMENT '集群节点扫描结果（JSON 格式）',
    main_task_id CHAR(36) NOT NULL COMMENT '扫描主任务ID',
    node_task_id CHAR(36) NOT NULL COMMENT '集群节点任务ID',
    inserted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '入库时间',
    PRIMARY KEY (node_task_id),
    FOREIGN KEY (cluster_id) REFERENCES cluster_info(cluster_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='存储集群节点的扫描结果';

-- 创建用户，并设置权限
CREATE USER IF NOT EXISTS '${MYSQL_USER}'@'%' IDENTIFIED BY '${MYSQL_PASSWORD}';

GRANT SELECT, INSERT, UPDATE, DELETE 
ON kube_bench.* 
TO '${MYSQL_USER}'@'%';

FLUSH PRIVILEGES;