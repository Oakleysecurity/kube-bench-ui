import axios from 'axios';
import { Cluster, TaskGroup } from '../types/types';

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 10000,
});

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export const clusterApi = {
  createCluster: async (clusterData: Partial<Cluster>) => {
    const response = await api.post<ApiResponse<{ cluster_id: string; node_count: number }>>(
      '/clustercreate',
      {
        cluster_name: clusterData.name,
        cluster_owner: clusterData.owner,
        api_server: clusterData.apiServer,
        business_name: clusterData.businessName,
        access_token: clusterData.token,
        notes: clusterData.notes
      }
    );
    return response.data;
  },

  updateCluster: async (clusterId: string, clusterData: Partial<Cluster>) => {
    const response = await api.post<ApiResponse<Cluster>>('/clusterupdate', {
      cluster_id: clusterId,
      cluster_name: clusterData.name,
      cluster_owner: clusterData.owner,
      api_server: clusterData.apiServer,
      business_name: clusterData.businessName,
      access_token: clusterData.token,
      notes: clusterData.notes
    });
    return response.data;
  },

  deleteCluster: async (clusterId: string) => {
    const response = await api.post<ApiResponse<void>>('/clusterdelete', {
      cluster_id: clusterId
    });
    return response.data;
  },

  getClusters: async () => {
    try {
      const response = await api.post<ApiResponse<any[]>>('/clusterview');
      console.log('API Response:', response.data);
      if (response.data.code === 200 && Array.isArray(response.data.data)) {
        return response.data.data.map((cluster: any) => ({
          id: cluster.id,
          name: cluster.name,
          owner: cluster.owner,
          apiServer: cluster.apiServer,
          businessName: cluster.businessName,
          token: '',
          nodeCount: cluster.nodeCount,
          notes: cluster.notes,
          createdAt: cluster.createdAt,
          updatedAt: cluster.updatedAt
        }));
      }
      throw new Error(response.data.message || '获取集群列表失败');
    } catch (error) {
      console.error('Get clusters error:', error);
      throw error;
    }
  }
};

interface CreateScanTaskResponse {
  main_task_id: string;
  tasks: Array<{
    node_task_id: string;
    node_name: string;
    node_ip: string;
    node_role: string;
  }>;
}

export const scanApi = {
  createScanTask: async (clusterId: string) => {
    const response = await api.post<ApiResponse<CreateScanTaskResponse>>('/scantaskcreate', {
      cluster_id: clusterId
    });
    return response.data;
  },

  getScanTasks: async (clusterId: string, mainTaskId?: string) => {
    const url = mainTaskId 
      ? `/scantaskview?cluster_id=${clusterId}&main_task_id=${mainTaskId}`
      : `/scantaskview?cluster_id=${clusterId}`;
    const response = await api.get<ApiResponse<TaskGroup[]>>(url);
    return response.data.data;
  },

  getNodeScanResult: async (clusterId: string, nodeName: string) => {
    const response = await api.post<ApiResponse<{
      status: string;
      result?: any;
      scan_time?: string;
    }>>('/nodescanresultsearch', {
      cluster_id: clusterId,
      node_name: nodeName
    });
    return response.data.data;
  },

  deleteScanTask: async (clusterId: string, mainTaskId: string) => {
    const response = await api.post<ApiResponse<void>>('/scantaskdelete', {
      cluster_id: clusterId,
      main_task_id: mainTaskId
    });
    return response.data;
  },

  watchScanTask: async (clusterId: string, mainTaskId: string) => {
    const response = await api.get<ApiResponse<{
      mainTaskId: string;
      allTasksCompleted: boolean;
      message: string;
      nodeStatuses: Array<{
        nodeName: string;
        status: string;
      }>;
    }>>(`/scantaskwatch?cluster_id=${clusterId}&main_task_id=${mainTaskId}`);
    return response.data.data;
  }
}; 