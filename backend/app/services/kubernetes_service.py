from app.models.database import get_connection
from kubernetes import client, config
import uuid
import json
import time
from datetime import datetime

class KubernetesService:
    def __init__(self):
        self.kube_bench_image = "aquasec/kube-bench:latest"

    def get_cluster_config(self, cluster_id):
        with get_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            query = """
            SELECT api_server, access_token, cluster_name
            FROM cluster_info
            WHERE cluster_id = %s
            """
            cursor.execute(query, (cluster_id,))
            return cursor.fetchone()

    def create_scan_task(self, cluster_id, main_task_id):
        try:
            # 获取集群配置
            cluster_config = self.get_cluster_config(cluster_id)
            if not cluster_config:
                raise Exception("Cluster not found")

            # 配置 Kubernetes 客户端
            configuration = client.Configuration()
            configuration.host = cluster_config['api_server']
            configuration.api_key['authorization'] = cluster_config['access_token']
            api_client = client.ApiClient(configuration)
            
            # 获取所有节点
            v1 = client.CoreV1Api(api_client)
            nodes = v1.list_node()

            # 为每个节点创建扫描任务
            batch_v1 = client.BatchV1Api(api_client)
            tasks = []

            for node in nodes.items:
                node_name = node.metadata.name
                node_ip = node.status.addresses[0].address
                node_role = "worker"
                if "node-role.kubernetes.io/master" in node.metadata.labels:
                    node_role = "master"

                # 创建节点任务记录
                node_task_id = str(uuid.uuid4())
                self.create_node_task_record(
                    cluster_id,
                    cluster_config['cluster_name'],
                    node_name,
                    node_role,
                    node_ip,
                    main_task_id,
                    node_task_id
                )

                # 创建 kube-bench Job
                job = self.create_kube_bench_job(
                    batch_v1,
                    node_name,
                    node_task_id
                )
                tasks.append({
                    'node_name': node_name,
                    'node_task_id': node_task_id
                })

            return {
                'main_task_id': main_task_id,
                'tasks': tasks
            }

        except Exception as e:
            raise Exception(f"Failed to create scan task: {str(e)}")

    def create_node_task_record(self, cluster_id, cluster_name, node_name, 
                              node_role, node_ip, main_task_id, node_task_id):
        with get_connection() as conn:
            cursor = conn.cursor()
            query = """
            INSERT INTO cluster_node_tasks (
                cluster_id, cluster_name, node_name, node_role, node_ip,
                scan_status, main_task_id, node_task_id
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                cluster_id, cluster_name, node_name, node_role, node_ip,
                'pending', main_task_id, node_task_id
            )
            cursor.execute(query, values)
            conn.commit()

    def create_kube_bench_job(self, batch_v1, node_name, node_task_id):
        job_manifest = {
            'apiVersion': 'batch/v1',
            'kind': 'Job',
            'metadata': {
                'name': f'kube-bench-{node_task_id}',
                'namespace': 'default'
            },
            'spec': {
                'template': {
                    'spec': {
                        'nodeSelector': {
                            'kubernetes.io/hostname': node_name
                        },
                        'containers': [{
                            'name': 'kube-bench',
                            'image': self.kube_bench_image,
                            'args': ['--json']
                        }],
                        'restartPolicy': 'Never'
                    }
                }
            }
        }
        return batch_v1.create_namespaced_job(
            body=job_manifest,
            namespace='default'
        )

    def get_scan_tasks(self, cluster_id):
        try:
            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                query = """
                SELECT *
                FROM cluster_node_tasks
                WHERE cluster_id = %s
                """
                cursor.execute(query, (cluster_id,))
                tasks = cursor.fetchall()
                
                for task in tasks:
                    task['task_created_at'] = task['task_created_at'].isoformat()
                
                return tasks
        except Exception as e:
            raise Exception(f"Failed to get scan tasks: {str(e)}")

    def get_node_scan_result(self, cluster_id, node_name):
        try:
            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                
                # 首先检查任务状态
                status_query = """
                SELECT scan_status
                FROM cluster_node_tasks
                WHERE cluster_id = %s AND node_name = %s
                ORDER BY task_created_at DESC
                LIMIT 1
                """
                cursor.execute(status_query, (cluster_id, node_name))
                task_status = cursor.fetchone()
                
                if not task_status:
                    return {"status": "not_found"}
                
                if task_status['scan_status'] != 'done':
                    return {"status": task_status['scan_status']}
                
                # 如果任务完成，获取扫描结果
                result_query = """
                SELECT scan_result, inserted_at
                FROM cluster_scan_results
                WHERE cluster_id = %s AND node_name = %s
                ORDER BY inserted_at DESC
                LIMIT 1
                """
                cursor.execute(result_query, (cluster_id, node_name))
                result = cursor.fetchone()
                
                if result:
                    return {
                        "status": "done",
                        "result": json.loads(result['scan_result']),
                        "scan_time": result['inserted_at'].isoformat()
                    }
                
                return {"status": "no_result"}
                
        except Exception as e:
            raise Exception(f"Failed to get scan result: {str(e)}") 