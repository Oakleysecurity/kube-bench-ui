from app.models.database import get_connection
from kubernetes import client, config
import uuid
import json
import time
from datetime import datetime
import xml.etree.ElementTree as ET

class KubernetesService:
    def __init__(self, kube_bench_image="aquasec/kube-bench:latest"):
        self.kube_bench_image = kube_bench_image
        self.monitor_threads = {}  # 存储监控线程
        self.stop_monitoring = {}  # 存储停止标志

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
            configuration.verify_ssl = False
            configuration.api_key = {"authorization": "Bearer " + cluster_config['access_token']}
            api_client = client.ApiClient(configuration)
            
            # 获取所有节点
            v1 = client.CoreV1Api(api_client)
            nodes = v1.list_node()

            # 为每个节点创建扫描任务
            batch_v1 = client.BatchV1Api(api_client)
            tasks = []
            successful_tasks = []

            for node in nodes.items:
                try:
                    node_name = node.metadata.name
                    node_ip = node.status.addresses[0].address
                    node_role = "master" if "node-role.kubernetes.io/master" in node.metadata.labels else "worker"

                    node_task_id = str(uuid.uuid4())
                    job_name = f'kube-bench-{node_name}-{node_task_id[:8]}'
                    
                    # 先创建 kube-bench Job
                    job = self.create_kube_bench_job(
                        batch_v1,
                        node_name,
                        job_name
                    )

                    # 等待并获取 Pod 名称
                    time.sleep(2)  # 给 Kubernetes 一些时间来创建 Pod
                    pod_name = self.get_pod_name_by_job(v1, job_name)
                    
                    if not pod_name:
                        raise Exception(f"Failed to get pod name for job {job_name}")

                    # Job 创建成功且获取到 Pod 名称后，创建数据库记录
                    self.create_node_task_record(
                        cluster_id,
                        cluster_config['cluster_name'],
                        node_name,
                        node_role,
                        node_ip,
                        main_task_id,
                        node_task_id,
                        pod_name,  # Pod 名称存储在 scanner 字段
                        job_name   # Job 名称存储在 kube_bench_job 字段
                    )

                    successful_tasks.append({
                        'node_name': node_name,
                        'node_task_id': node_task_id,
                        'node_ip': node_ip,
                        'node_role': node_role
                    })

                except Exception as e:
                    print(f"Failed to create task for node {node_name}: {str(e)}")
                    continue

            if not successful_tasks:
                raise Exception("Failed to create any scan tasks")

            if successful_tasks:
                # 初始化停止标志
                self.stop_monitoring[main_task_id] = False
                
                # 在新线程中启动监控
                import threading
                monitor_thread = threading.Thread(
                    target=self.monitor_scan_task,
                    args=(cluster_id, main_task_id),
                    daemon=True
                )
                monitor_thread.start()
                # 保存线程引用
                self.monitor_threads[main_task_id] = monitor_thread

            return {
                'main_task_id': main_task_id,
                'tasks': successful_tasks
            }

        except Exception as e:
            raise Exception(f"Failed to create scan task: {str(e)}")

    def create_node_task_record(self, cluster_id, cluster_name, node_name, 
                              node_role, node_ip, main_task_id, node_task_id, pod_name, job_name):
        with get_connection() as conn:
            cursor = conn.cursor()
            query = """
            INSERT INTO cluster_node_tasks (
                cluster_id, cluster_name, node_name, node_role, node_ip,
                scan_status, main_task_id, node_task_id, scanner, kube_bench_job
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """
            values = (
                cluster_id, cluster_name, node_name, node_role, node_ip,
                'pending', main_task_id, node_task_id, pod_name, job_name
            )
            cursor.execute(query, values)
            conn.commit()

    def create_kube_bench_job(self, batch_v1, node_name, job_name):
        job_manifest = {
            'apiVersion': 'batch/v1',
            'kind': 'Job',
            'metadata': {
                'name': job_name,
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
                },
                'ttlSecondsAfterFinished': 600
            }
        }
        return batch_v1.create_namespaced_job(
            body=job_manifest,
            namespace='default'
        )

    def get_scan_tasks(self, cluster_id, main_task_id=None):
        """获取扫描任务状态，如果指定了main_task_id则只返回该主任务的状态"""
        try:
            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                
                # 构建基础查询，使用 GROUP BY 确保每个主任务只出现一次
                base_query = """
                SELECT DISTINCT main_task_id, MIN(task_created_at) as task_created_at
                FROM cluster_node_tasks
                WHERE cluster_id = %s
                """
                params = [cluster_id]
                
                # 如果指定了main_task_id，只查询该任务
                if main_task_id:
                    base_query += " AND main_task_id = %s"
                    params.append(main_task_id)
                
                base_query += " GROUP BY main_task_id ORDER BY task_created_at DESC"
                cursor.execute(base_query, params)
                main_tasks = cursor.fetchall()
                
                task_groups = []
                for main_task in main_tasks:
                    current_main_task_id = main_task['main_task_id']
                    
                    # 获取节点任务状态
                    query = """
                    SELECT 
                        node_task_id,
                        node_name,
                        node_ip,
                        node_role,
                        scan_status,
                        COUNT(*) as total,
                        SUM(CASE WHEN scan_status IN ('done', 'failed') THEN 1 ELSE 0 END) as completed
                    FROM cluster_node_tasks
                    WHERE cluster_id = %s AND main_task_id = %s
                    GROUP BY node_task_id, node_name, node_ip, node_role, scan_status
                    """
                    cursor.execute(query, (cluster_id, current_main_task_id))
                    tasks = cursor.fetchall()
                    
                    if tasks:
                        node_tasks = [{
                            'nodeTaskId': task['node_task_id'],
                            'nodeName': task['node_name'],
                            'nodeIp': task['node_ip'],
                            'nodeRole': task['node_role'],
                            'status': task['scan_status'],
                            'progress': 100 if task['scan_status'] == 'done' else (
                                0 if task['scan_status'] == 'pending' else 50
                            )
                        } for task in tasks]
                        
                        task_groups.append({
                            'mainTaskId': current_main_task_id,
                            'completed': all(task['scan_status'] in ('done', 'failed') for task in tasks),
                            'nodeTasks': node_tasks,
                            'createdAt': main_task['task_created_at'].isoformat()
                        })
                
                return task_groups
                    
        except Exception as e:
            print(f"Error in get_scan_tasks: {str(e)}")
            raise Exception(f"Failed to get scan tasks: {str(e)}")

    def get_final_task_status(self, cluster_id, main_task_id):
        """获取已完成任务的最终状态"""
        with get_connection() as conn:
            cursor = conn.cursor(dictionary=True)
            query = """
            SELECT t.*, r.scan_result
            FROM cluster_node_tasks t
            LEFT JOIN cluster_scan_results r 
                ON t.node_task_id = r.node_task_id
            WHERE t.cluster_id = %s AND t.main_task_id = %s
            """
            cursor.execute(query, (cluster_id, main_task_id))
            tasks = cursor.fetchall()
            
            return [{
                'nodeTaskId': task['node_task_id'],
                'nodeName': task['node_name'],
                'nodeIp': task['node_ip'],
                'status': task['scan_status'],
                'progress': 100 if task['scan_status'] == 'done' else 0,
                'results': json.loads(task['scan_result']) if task['scan_result'] else []
            } for task in tasks]

    def get_node_scan_result(self, cluster_id, node_name):
        try:
            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                
                # 获取最新任务状态
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

    def get_pod_name_by_job(self, v1, job_name):
        """通过 Job 名称获取对应的 Pod 名称"""
        try:
            # 使用标签选择器查找 Pod
            pods = v1.list_namespaced_pod(
                namespace='default',
                label_selector=f'job-name={job_name}'
            )
            
            if pods.items:
                return pods.items[0].metadata.name
            return None
        except Exception as e:
            print(f"Error getting pod name for job {job_name}: {str(e)}")
            return None

    def update_scan_task_status(self, cluster_id, main_task_id):
        """更新指定主任务下所有节点的扫描状态"""
        try:
            # 获取群配置
            cluster_config = self.get_cluster_config(cluster_id)
            if not cluster_config:
                raise Exception("Cluster not found")

            # 配置 Kubernetes 客户端
            configuration = client.Configuration()
            configuration.host = cluster_config['api_server']
            configuration.verify_ssl = False
            configuration.api_key = {"authorization": "Bearer " + cluster_config['access_token']}
            api_client = client.ApiClient(configuration)
            v1 = client.CoreV1Api(api_client)

            # 获取该主任务下的所有节点任务
            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                query = """
                SELECT node_task_id, scanner, scan_status, task_created_at
                FROM cluster_node_tasks
                WHERE cluster_id = %s AND main_task_id = %s
                AND scan_status NOT IN ('done', 'failed')  # 只获取未完成��任务
                """
                cursor.execute(query, (cluster_id, main_task_id))
                tasks = cursor.fetchall()

                # 更新每个节点任务的状态
                for task in tasks:
                    try:
                        print(f"[INFO]正在获取节点任务{task['node_task_id']}的状态")
                        current_time = datetime.now()
                        pending_timeout = 300  # 5分钟超时（单位：秒）

                        # 检查 pending 状态是否超时
                        if (task['scan_status'] == 'pending' and 
                            (current_time - task['task_created_at']).total_seconds() > pending_timeout):
                            # 更新为失败状态
                            print(f"[WARN]节点任务{task['node_task_id']}已经pending超过5分钟,标记扫描失败")
                            update_query = """
                            UPDATE cluster_node_tasks
                            SET scan_status = 'failed'
                            WHERE node_task_id = %s
                            """
                            cursor.execute(update_query, (task['node_task_id'],))
                            conn.commit()
                            print(f"Task {task['node_task_id']} marked as failed due to pending timeout")
                            continue

                        # 获取 pod 状态
                        try:
                            pod = v1.read_namespaced_pod(
                                name=task['scanner'],
                                namespace='default'
                            )
                            
                            # 映射 pod 状态到任务状态
                            pod_phase = pod.status.phase
                            task_status = {
                                'Pending': 'pending',
                                'Running': 'running',
                                'Succeeded': 'done',
                                'Failed': 'failed',
                                'Unknown': 'failed'
                            }.get(pod_phase, 'failed')

                            # 更新数据库中的任务状态
                            update_query = """
                            UPDATE cluster_node_tasks
                            SET scan_status = %s
                            WHERE node_task_id = %s
                            """
                            cursor.execute(update_query, (task_status, task['node_task_id']))
                            conn.commit()

                            # 如果任务完成，获取并存储扫���结果
                            if task_status == 'done':
                                print(task['node_task_id'])
                                try:
                                    # 获取 pod 日志
                                    print('正在获取pod日志')
                                    pod_logs = v1.read_namespaced_pod_log(
                                        name=task['scanner'],
                                        namespace='default',
                                        _preload_content=False,
                                    )
                                    pod_logs = pod_logs.data.decode('utf-8')
                                    if pod_logs:
                                        self.store_scan_result(cluster_id, main_task_id, task['node_task_id'], pod_logs)
                                except Exception as e:
                                    print(f"Error getting pod logs: {str(e)}")

                        except Exception as e:
                            print(f"Error getting pod status: {str(e)}")
                            # 如果无法获取 pod 状态，将任务标记为失败
                            cursor.execute(update_query, ('failed', task['node_task_id']))
                            conn.commit()

                    except Exception as e:
                        print(f"Error updating task status: {str(e)}")
                        continue

        except Exception as e:
            print(f"Error in update_scan_task_status: {str(e)}")
            raise Exception(f"Failed to update scan task status: {str(e)}")

    def junit_to_json(self, junit_xml):
        """将 JUnit XML 转换为 JSON 格式"""
        try:
            root = ET.fromstring(junit_xml)
            result = {
                'tests': []
            }
            
            # 遍历所有测试用例
            for test_suite in root.findall('.//testcase'):
                test_case = {
                    'test_number': test_suite.get('classname', ''),
                    'test_desc': test_suite.get('name', ''),
                    'test_info': [],
                    'status': 'PASS'
                }
                
                # 检查失败和错误
                failure = test_suite.find('failure')
                error = test_suite.find('error')
                skipped = test_suite.find('skipped')
                
                if failure is not None:
                    test_case['status'] = 'FAIL'
                    test_case['test_info'].append(failure.text if failure.text else '')
                    test_case['remediation'] = failure.get('message', '')
                elif error is not None:
                    test_case['status'] = 'FAIL'
                    test_case['test_info'].append(error.text if error.text else '')
                elif skipped is not None:
                    test_case['status'] = 'WARN'
                    test_case['test_info'].append(skipped.text if skipped.text else '')
                
                result['tests'].append(test_case)
            
            return result
        except ET.ParseError as e:
            print(f"Error parsing JUnit XML: {str(e)}")
            return None

    def store_scan_result(self, cluster_id, main_task_id, node_task_id, pod_logs):
        """存储扫描结果到数据库"""
        try:
            # 验证并格式化 JSON
            try:
                print("Raw pod logs:")
                # print(pod_logs)
                json_logs = json.loads(pod_logs)
                formatted_logs = json.dumps(json_logs)
            except json.JSONDecodeError as e:
                print(f"Invalid JSON in pod logs: {str(e)}")
                formatted_logs = json.dumps({
                    "raw_output": pod_logs,
                    "error": "Invalid JSON format"
                })

            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                
                # 获取任务信息
                query = """
                SELECT cluster_name, node_name, node_ip
                FROM cluster_node_tasks
                WHERE node_task_id = %s
                """
                cursor.execute(query, (node_task_id,))
                task_info = cursor.fetchone()

                if task_info:
                    # 插入扫描结果
                    insert_query = """
                    INSERT INTO cluster_scan_results (
                        cluster_id, cluster_name, node_name, node_ip,
                        scan_result, main_task_id, node_task_id
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """
                    values = (
                        cluster_id,
                        task_info['cluster_name'],
                        task_info['node_name'],
                        task_info['node_ip'],
                        formatted_logs,
                        main_task_id,
                        node_task_id
                    )
                    cursor.execute(insert_query, values)
                    conn.commit()

        except Exception as e:
            print(f"Error storing scan result: {str(e)}")
            print(f"Raw pod logs: {pod_logs[:1000]}")  # 打印前1000个字符用于调试

    def monitor_scan_task(self, cluster_id, main_task_id, interval=10):
        """持续监控扫描任务状态"""
        try:
            while not self.stop_monitoring.get(main_task_id, True):  # 检查停止标志
                try:
                    # 更新任务状态
                    self.update_scan_task_status(cluster_id, main_task_id)
                    
                    # 检查是否所有任务都已完成
                    with get_connection() as conn:
                        cursor = conn.cursor(dictionary=True)
                        query = """
                        SELECT 
                            COUNT(*) as total,
                            SUM(CASE WHEN scan_status IN ('done', 'failed') THEN 1 ELSE 0 END) as completed
                        FROM cluster_node_tasks
                        WHERE cluster_id = %s AND main_task_id = %s
                        """
                        cursor.execute(query, (cluster_id, main_task_id))
                        result = cursor.fetchone()
                        
                        if result['total'] == result['completed']:
                            print(f"All tasks completed for main_task_id: {main_task_id}")
                            break
                        
                        # 获取当前态统计
                        status_query = """
                        SELECT scan_status, COUNT(*) as count
                        FROM cluster_node_tasks
                        WHERE cluster_id = %s AND main_task_id = %s
                        GROUP BY scan_status
                        """
                        cursor.execute(status_query, (cluster_id, main_task_id))
                        status_stats = cursor.fetchall()
                        
                        # 打印当前进度
                        print(f"Scan task progress for {main_task_id}:")
                        for stat in status_stats:
                            print(f"- {stat['scan_status']}: {stat['count']}")
                        
                    time.sleep(interval)
                    
                except Exception as e:
                    print(f"Error in monitoring iteration: {str(e)}")
                    time.sleep(interval)
                    
        except Exception as e:
            print(f"Error in monitor_scan_task: {str(e)}")
        finally:
            print(f"Monitoring ended for main_task_id: {main_task_id}")
            # 清理资源
            self.stop_monitoring.pop(main_task_id, None)
            self.monitor_threads.pop(main_task_id, None)

    def delete_scan_task(self, cluster_id, main_task_id):
        """删除扫描任务及相关资源"""
        try:
            # 停止监控线程
            self.stop_monitoring[main_task_id] = True
            
            # 等待线程结束
            monitor_thread = self.monitor_threads.get(main_task_id)
            if monitor_thread and monitor_thread.is_alive():
                monitor_thread.join(timeout=5)  # 等待最多5秒
            
            # 获取集群配置
            cluster_config = self.get_cluster_config(cluster_id)
            if not cluster_config:
                raise Exception("Cluster not found")

            # 配置 Kubernetes 客户端
            configuration = client.Configuration()
            configuration.host = cluster_config['api_server']
            configuration.verify_ssl = False
            configuration.api_key = {"authorization": "Bearer " + cluster_config['access_token']}
            api_client = client.ApiClient(configuration)
            batch_v1 = client.BatchV1Api(api_client)

            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                
                # 获取所有相关的 kube-bench jobs
                query = """
                SELECT kube_bench_job
                FROM cluster_node_tasks
                WHERE cluster_id = %s AND main_task_id = %s
                """
                cursor.execute(query, (cluster_id, main_task_id))
                tasks = cursor.fetchall()

                # 删除 Kubernetes jobs
                for task in tasks:
                    try:
                        batch_v1.delete_namespaced_job(
                            name=task['kube_bench_job'],
                            namespace='default',
                            body=client.V1DeleteOptions(
                                propagation_policy='Background'
                            )
                        )
                    except Exception as e:
                        print(f"Error deleting job {task['kube_bench_job']}: {str(e)}")

                # 删除扫描结果
                delete_results_query = """
                DELETE FROM cluster_scan_results
                WHERE cluster_id = %s AND main_task_id = %s
                """
                cursor.execute(delete_results_query, (cluster_id, main_task_id))

                # 删除任务记录
                delete_tasks_query = """
                DELETE FROM cluster_node_tasks
                WHERE cluster_id = %s AND main_task_id = %s
                """
                cursor.execute(delete_tasks_query, (cluster_id, main_task_id))

                conn.commit()

            # 清理线程相关资源
            self.stop_monitoring.pop(main_task_id, None)
            self.monitor_threads.pop(main_task_id, None)

        except Exception as e:
            raise Exception(f"Failed to delete scan task: {str(e)}")

    def get_task_watch_status(self, cluster_id, main_task_id):
        """获取主任务的监控状态"""
        try:
            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                
                # 获取所有节点任务的状态
                query = """
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN scan_status IN ('done', 'failed') THEN 1 ELSE 0 END) as completed,
                    GROUP_CONCAT(
                        CONCAT(
                            node_name, ':', scan_status
                        )
                    ) as node_statuses
                FROM cluster_node_tasks
                WHERE cluster_id = %s AND main_task_id = %s
                """
                cursor.execute(query, (cluster_id, main_task_id))
                result = cursor.fetchone()
                
                if not result or result['total'] == 0:
                    return {
                        'mainTaskId': main_task_id,
                        'allTasksCompleted': True,
                        'message': 'No tasks found',
                        'nodeStatuses': []
                    }
                
                # 解析节点状态
                node_statuses = []
                if result['node_statuses']:
                    for status_str in result['node_statuses'].split(','):
                        node_name, status = status_str.split(':')
                        node_statuses.append({
                            'nodeName': node_name,
                            'status': status
                        })
                
                return {
                    'mainTaskId': main_task_id,
                    'allTasksCompleted': result['total'] == result['completed'],
                    'message': (
                        'All tasks completed' if result['total'] == result['completed']
                        else f"Progress: {result['completed']}/{result['total']} tasks completed"
                    ),
                    'nodeStatuses': node_statuses
                }
                
        except Exception as e:
            print(f"Error in get_task_watch_status: {str(e)}")
            raise Exception(f"Failed to get task watch status: {str(e)}")