# Kubernetes 基线扫描任务管理系统 (KUBE-BENCH-UI)

一个基于 [kube-bench](https://github.com/Oakleysecurity/kube-bench-zh)的 Kubernetes 集群安全基线扫描管理系统，提供友好的 Web 界面来管理多个集群的安全扫描任务。
本项目对kube-bench做了汉化，汉化详情可以参考[这个项目](https://github.com/Oakleysecurity/kube-bench-zh)。

## 功能特点

- 多集群管理：支持添加、编辑和删除多个 Kubernetes 集群
- 安全扫描：基于 kube-bench 进行集群节点的安全基线扫描
- 实时进度：实时监控扫描任务的执行进度
- 结果导出：支持导出扫描结果为 PDF 报告
- 搜索过滤：支持按集群名称、负责人、业务名称等进行搜索
- 分页展示：大量数据分页展示，提升用户体验

## 页面展示
![image](https://github.com/user-attachments/assets/f386354c-16b2-4900-bb13-a45ea5bc7379)
![image](https://github.com/user-attachments/assets/0adecbc9-da64-40d7-8daa-01e0f73ca01b)

报告截图：
![image](https://github.com/user-attachments/assets/4df02c90-d697-454f-8726-76d5654a0719)
![image](https://github.com/user-attachments/assets/f2f053c5-92f4-47f2-8403-24f0c79ea170)


## 技术栈

### 前端
- React 18
- TypeScript
- Material-UI (MUI)
- React Router
- Axios

### 后端
- Python
- Flask
- MySQL
- Kubernetes Python Client
- ReportLab (PDF 生成)

## 系统要求

- Node.js 16+
- Python 3.8+
- MySQL 5.7+
- Kubernetes 集群访问权限

## 快速开始

### 1. 克隆项目 
