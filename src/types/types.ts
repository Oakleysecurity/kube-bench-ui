export interface Cluster {
  id: string;
  name: string;
  owner: string;
  apiServer: string;
  businessName: string;
  token: string;
  nodeCount: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface NodeTask {
  nodeTaskId: string;
  nodeName: string;
  nodeIp: string;
  nodeRole: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  progress: number;
  results: any[];
}

export interface TestResult {
  test_number: string;
  test_desc: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  test_info: string[];
  remediation?: string;
}

export interface ScanResult {
  clusterId: string;
  clusterName: string;
  nodeName: string;
  nodeIp: string;
  results: TestResult[];
  mainTaskId: string;
  nodeTaskId: string;
  insertedAt: string;
}

export interface NodeScanStatus {
  nodeTaskId: string;
  nodeName: string;
  nodeIp: string;
  nodeRole: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  progress: number;
  results?: any[];
}

export interface TaskGroup {
  mainTaskId: string;
  nodeTasks: NodeTask[];
  createdAt: string;
} 