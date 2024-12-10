CREATE DATABASE IF NOT EXISTS kube_bench;
USE kube_bench;

CREATE TABLE IF NOT EXISTS cluster_info (
    cluster_id VARCHAR(36) PRIMARY KEY,
    cluster_name VARCHAR(255) NOT NULL,
    cluster_owner VARCHAR(255) NOT NULL,
    api_server VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    node_count INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cluster_node_tasks (
    node_task_id VARCHAR(36) PRIMARY KEY,
    cluster_id VARCHAR(36) NOT NULL,
    cluster_name VARCHAR(255) NOT NULL,
    node_name VARCHAR(255) NOT NULL,
    node_role VARCHAR(50) NOT NULL,
    node_ip VARCHAR(50) NOT NULL,
    scan_status ENUM('pending', 'running', 'done', 'failed') NOT NULL,
    main_task_id VARCHAR(36) NOT NULL,
    scanner VARCHAR(255),
    kube_bench_job VARCHAR(255),
    task_created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cluster_id) REFERENCES cluster_info(cluster_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cluster_scan_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    cluster_id VARCHAR(36) NOT NULL,
    cluster_name VARCHAR(255) NOT NULL,
    node_name VARCHAR(255) NOT NULL,
    node_ip VARCHAR(50) NOT NULL,
    scan_result JSON NOT NULL,
    main_task_id VARCHAR(36) NOT NULL,
    node_task_id VARCHAR(36) NOT NULL,
    inserted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cluster_id) REFERENCES cluster_info(cluster_id) ON DELETE CASCADE,
    FOREIGN KEY (node_task_id) REFERENCES cluster_node_tasks(node_task_id) ON DELETE CASCADE
); 