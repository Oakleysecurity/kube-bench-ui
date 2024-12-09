import React, { useState, useEffect } from 'react';
import { Container, Box, Button, Snackbar, Alert, AlertProps } from '@mui/material';
import ClusterList from './components/ClusterList';
import ClusterForm from './components/ClusterForm';
import { Cluster, NodeScanStatus } from './types/types';
import { clusterApi, scanApi } from './services/api';

interface SnackbarMessage {
  message: string;
  severity: AlertProps['severity'];
}

function App() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | undefined>();
  const [loading, setLoading] = useState(false);
  const [scanStatus, setScanStatus] = useState<Record<string, NodeScanStatus[]>>({});
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);

  const showMessage = (message: string, severity: SnackbarMessage['severity']) => {
    setSnackbar({ message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(null);
  };

  const fetchClusters = async () => {
    try {
      setLoading(true);
      const data = await clusterApi.getClusters();
      setClusters(data);
    } catch (error) {
      console.error('Failed to fetch clusters:', error);
      showMessage('获取集群列表失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  const handleSubmit = async (clusterData: Partial<Cluster>) => {
    try {
      setLoading(true);
      if (editingCluster) {
        const response = await clusterApi.updateCluster(editingCluster.id, clusterData);
        if (response.code === 200) {
          showMessage('集群更新成功', 'success');
          await fetchClusters();
          setFormOpen(false);
          setEditingCluster(undefined);
        } else {
          showMessage(response.message || '集群更新失败', 'error');
        }
      } else {
        const response = await clusterApi.createCluster(clusterData);
        if (response.code === 200) {
          showMessage('集群创建成功', 'success');
          await fetchClusters();
          setFormOpen(false);
        } else {
          showMessage(response.message || '集群创建失败', 'error');
        }
      }
    } catch (error: any) {
      console.error('Failed to save cluster:', error);
      showMessage(
        error.response?.data?.message || '操作失败，请检查网络连接',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (clusterId: string) => {
    try {
      setLoading(true);
      const response = await clusterApi.deleteCluster(clusterId);
      if (response.code === 200) {
        showMessage('集群删除成功', 'success');
        await fetchClusters();
      } else {
        showMessage(response.message || '集群删除失败', 'error');
      }
    } catch (error: any) {
      console.error('Failed to delete cluster:', error);
      showMessage(
        error.response?.data?.message || '删除失败，请检查网络连接',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async (clusterId: string, selectedNodes: string[]) => {
    try {
      setLoading(true);
      const response = await scanApi.createScanTask(clusterId);
      if (response.code === 200) {
        showMessage('扫描任务已创建', 'success');
        setScanStatus((prev: Record<string, NodeScanStatus[]>) => ({
          ...prev,
          [clusterId]: response.data.tasks.map(task => ({
            nodeName: task.node_name,
            nodeIp: '',
            status: 'pending',
            progress: 0,
            results: []
          }))
        }));
      } else {
        showMessage(response.message || '创建扫描任务失败', 'error');
      }
    } catch (error: any) {
      console.error('Failed to start scan:', error);
      showMessage(
        error.response?.data?.message || '创建扫描任务失败，请检查网络连接',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ my: 4 }}>
        <Button 
          variant="contained" 
          onClick={() => setFormOpen(true)}
          sx={{ mb: 2 }}
          disabled={loading}
        >
          添加集群
        </Button>
        <ClusterList
          clusters={clusters}
          loading={loading}
          scanStatus={scanStatus}
          onEdit={(cluster) => {
            setEditingCluster(cluster);
            setFormOpen(true);
          }}
          onDelete={handleDelete}
          onScan={handleScan}
        />
        <ClusterForm
          open={formOpen}
          cluster={editingCluster}
          onClose={() => {
            setFormOpen(false);
            setEditingCluster(undefined);
          }}
          onSubmit={handleSubmit}
        />
        <Snackbar
          open={!!snackbar}
          autoHideDuration={3000}
          onClose={handleCloseSnackbar}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        >
          <Alert 
            onClose={handleCloseSnackbar} 
            severity={snackbar?.severity}
            variant="filled"
            sx={{ width: '100%' }}
          >
            {snackbar?.message}
          </Alert>
        </Snackbar>
      </Box>
    </Container>
  );
}

export default App; 