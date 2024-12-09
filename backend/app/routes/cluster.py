from flask import Blueprint, request
from app.services.cluster_service import ClusterService
from app.utils.response import success_response, error_response
import uuid

cluster_bp = Blueprint('cluster', __name__)
cluster_service = ClusterService()

@cluster_bp.route('/clustercreate', methods=['POST'])
def create_cluster():
    try:
        data = request.get_json()
        required_fields = ['cluster_name', 'cluster_owner', 'api_server', 
                         'business_name', 'access_token']
        
        if not all(field in data for field in required_fields):
            return error_response("Missing required fields")

        cluster_id = str(uuid.uuid4())
        result = cluster_service.create_cluster(cluster_id, data)
        
        return success_response(result, "Cluster created successfully")
    except Exception as e:
        return error_response(str(e))

@cluster_bp.route('/clusterupdate', methods=['POST'])
def update_cluster():
    try:
        data = request.get_json()
        if 'cluster_id' not in data:
            return error_response("Missing cluster_id")

        update_data = {
            'cluster_id': data['cluster_id'],
            'cluster_name': data.get('name'),
            'cluster_owner': data.get('owner'),
            'api_server': data.get('apiServer'),
            'business_name': data.get('businessName'),
            'access_token': data.get('token'),
            'notes': data.get('notes')
        }

        result = cluster_service.update_cluster(update_data)
        if result:
            return success_response(result, "Cluster updated successfully")
        return error_response("Failed to update cluster")
    except Exception as e:
        return error_response(str(e))

@cluster_bp.route('/clusterdelete', methods=['POST'])
def delete_cluster():
    try:
        data = request.get_json()
        if 'cluster_id' not in data:
            return error_response("Missing cluster_id")

        cluster_service.delete_cluster(data['cluster_id'])
        return success_response(message="Cluster deleted successfully")
    except Exception as e:
        return error_response(str(e))

@cluster_bp.route('/clusterview', methods=['POST'])
def view_clusters():
    try:
        clusters = cluster_service.get_clusters()
        # print("Clusters data:", clusters)
        return success_response(clusters)
    except Exception as e:
        print("Error in view_clusters:", str(e))
        return error_response(str(e)) 