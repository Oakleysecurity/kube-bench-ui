from flask import Blueprint, request
from app.services.kubernetes_service import KubernetesService
from app.utils.response import success_response, error_response
import uuid

scan_bp = Blueprint('scan', __name__)
k8s_service = KubernetesService()

@scan_bp.route('/scantaskcreate', methods=['POST'])
def create_scan_task():
    try:
        data = request.get_json()
        if 'cluster_id' not in data:
            return error_response("Missing cluster_id")

        kube_bench_image = data.get('kube_bench_image', "registry.cn-zhangjiakou.aliyuncs.com/cloudnativesec/kube-bench:latest")
        k8s_service = KubernetesService(kube_bench_image=kube_bench_image)

        main_task_id = str(uuid.uuid4())
        result = k8s_service.create_scan_task(data['cluster_id'], main_task_id)
        return success_response(result, "Scan task created successfully")
    except Exception as e:
        return error_response(str(e))

@scan_bp.route('/scantaskview', methods=['GET'])
def view_scan_tasks():
    try:
        cluster_id = request.args.get('cluster_id')
        if not cluster_id:
            return error_response("Missing cluster_id")

        tasks = k8s_service.get_scan_tasks(cluster_id)
        return success_response(tasks)
    except Exception as e:
        print(f"Error in view_scan_tasks: {str(e)}")  # 添加错误日志
        return error_response(str(e))

@scan_bp.route('/nodescanresultsearch', methods=['POST'])
def search_node_scan_result():
    try:
        data = request.get_json()
        if not all(k in data for k in ['cluster_id', 'node_name']):
            return error_response("Missing required fields")

        result = k8s_service.get_node_scan_result(
            data['cluster_id'], 
            data['node_name']
        )
        return success_response(result)
    except Exception as e:
        return error_response(str(e))

@scan_bp.route('/scantaskdelete', methods=['POST'])
def delete_scan_task():
    try:
        data = request.get_json()
        if not all(k in data for k in ['cluster_id', 'main_task_id']):
            return error_response("Missing required fields")

        k8s_service.delete_scan_task(data['cluster_id'], data['main_task_id'])
        return success_response(message="Scan task deleted successfully")
    except Exception as e:
        return error_response(str(e)) 