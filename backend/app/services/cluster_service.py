from app.models.database import get_connection
from kubernetes import client
from datetime import datetime
import pytz
import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

class ClusterService:
    def create_cluster(self, cluster_id, data):
        try:
            # 配置 Kubernetes 客户端
            configuration = client.Configuration()
            configuration.host = data['api_server']
            # configuration.api_key['authorization'] = data['access_token']
            configuration.api_key = {"authorization": "Bearer " + data['access_token']}
            configuration.verify_ssl = False
            api_client = client.ApiClient(configuration)
            v1 = client.CoreV1Api(api_client)
            
            # 获取节点数量
            nodes = v1.list_node()
            node_count = len(nodes.items)
            
            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                
                query = """
                INSERT INTO cluster_info (
                    cluster_id, cluster_name, cluster_owner, api_server,
                    business_name, access_token, node_count, notes, created_at, updated_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """
                
                values = (
                    cluster_id,
                    data['cluster_name'],
                    data['cluster_owner'],
                    data['api_server'],
                    data['business_name'],
                    data['access_token'],
                    node_count,
                    data.get('notes', ''),
                    datetime.now(pytz.timezone('Asia/Shanghai')),
                    datetime.now(pytz.timezone('Asia/Shanghai'))
                )
                
                cursor.execute(query, values)
                conn.commit()
                
                return {
                    'cluster_id': cluster_id,
                    'node_count': node_count
                }
        except Exception as e:
            print(e)
            raise Exception(f"Failed to create cluster: {str(e)}")

    def update_cluster(self, data):
        try:
            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                
                update_fields = []
                values = []
                
                # 只更新提供的字段，并且只有当 access_token 不为空时才更新它
                field_mapping = {
                    'cluster_name': 'cluster_name',
                    'cluster_owner': 'cluster_owner',
                    'api_server': 'api_server',
                    'business_name': 'business_name',
                    'notes': 'notes'
                }
                
                # 处理基本字段
                for key, field in field_mapping.items():
                    if key in data and data[key] is not None:
                        update_fields.append(f"{field} = %s")
                        values.append(data[key])
                
                # 单独处理 access_token，只有当它存在且不为空时才更新
                if 'access_token' in data and data['access_token']:
                    update_fields.append("access_token = %s")
                    values.append(data['access_token'])
                
                if not update_fields:
                    return None
                
                update_fields.append("updated_at = %s")
                values.append(datetime.now(pytz.timezone('Asia/Shanghai')))
                values.append(data['cluster_id'])
                
                query = f"""
                UPDATE cluster_info 
                SET {', '.join(update_fields)}
                WHERE cluster_id = %s
                """
                
                cursor.execute(query, values)
                conn.commit()
                
                return self.get_cluster_by_id(data['cluster_id'])
        except Exception as e:
            raise Exception(f"Failed to update cluster: {str(e)}")

    def delete_cluster(self, cluster_id):
        try:
            with get_connection() as conn:
                cursor = conn.cursor()
                
                query = "DELETE FROM cluster_info WHERE cluster_id = %s"
                cursor.execute(query, (cluster_id,))
                conn.commit()
        except Exception as e:
            raise Exception(f"Failed to delete cluster: {str(e)}")

    def get_clusters(self):
        try:
            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                
                query = """
                SELECT cluster_id, cluster_name, cluster_owner, api_server,
                       business_name, node_count, notes, 
                       created_at, updated_at
                FROM cluster_info
                """
                
                cursor.execute(query)
                clusters = cursor.fetchall()
                
                print("Raw clusters data:", clusters)  # 添加日志
                
                formatted_clusters = []
                for cluster in clusters:
                    formatted_cluster = {
                        'id': cluster['cluster_id'],
                        'name': cluster['cluster_name'],
                        'owner': cluster['cluster_owner'],
                        'apiServer': cluster['api_server'],
                        'businessName': cluster['business_name'],
                        'nodeCount': cluster['node_count'],
                        'notes': cluster['notes'],
                        'createdAt': cluster['created_at'].isoformat() if cluster['created_at'] else None,
                        'updatedAt': cluster['updated_at'].isoformat() if cluster['updated_at'] else None
                    }
                    formatted_clusters.append(formatted_cluster)
                
                print("Formatted clusters:", formatted_clusters)  # 添加日志
                return formatted_clusters
        except Exception as e:
            print("Error in get_clusters:", str(e))  # 添加错误日志
            raise Exception(f"Failed to get clusters: {str(e)}")

    def get_cluster_by_id(self, cluster_id):
        try:
            with get_connection() as conn:
                cursor = conn.cursor(dictionary=True)
                
                query = """
                SELECT cluster_id, cluster_name, cluster_owner, api_server,
                       business_name, node_count, notes, 
                       created_at, updated_at
                FROM cluster_info
                WHERE cluster_id = %s
                """
                
                cursor.execute(query, (cluster_id,))
                cluster = cursor.fetchone()
                
                if cluster:
                    # 转换为前端期望的格式
                    return {
                        'id': cluster['cluster_id'],
                        'name': cluster['cluster_name'],
                        'owner': cluster['cluster_owner'],
                        'apiServer': cluster['api_server'],
                        'businessName': cluster['business_name'],
                        'nodeCount': cluster['node_count'],
                        'notes': cluster['notes'],
                        'createdAt': cluster['created_at'].isoformat(),
                        'updatedAt': cluster['updated_at'].isoformat()
                    }
                
                return None
        except Exception as e:
            raise Exception(f"Failed to get cluster: {str(e)}") 