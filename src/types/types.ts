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
  clusterId: string;
  clusterName: string;
  nodeName: string;
  nodeRole: string;
  nodeIp: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  mainTaskId: string;
  nodeTaskId: string;
  createdAt: string;
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
  nodeName: string;
  nodeIp: string;
  status: 'pending' | 'running' | 'done' | 'failed';
  progress: number;
  results?: TestResult[];
} 