import React, { useState, useEffect } from 'react';
import { Container, Box, Button, Snackbar, Alert, AlertProps, Typography } from '@mui/material';
import ClusterList from './components/ClusterList';
import ClusterForm from './components/ClusterForm';
import { Cluster, TaskGroup } from './types/types';
import { clusterApi, scanApi } from './services/api';
import { Add } from '@mui/icons-material';

interface SnackbarMessage {
  message: string;
  severity: AlertProps['severity'];
}

function App() {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCluster, setEditingCluster] = useState<Cluster | undefined>();
  const [loadingStates, setLoadingStates] = useState({
    addCluster: false,
    scanning: false,
    deleting: false,
    fetching: false
  });
  const [scanStatus, setScanStatus] = useState<Record<string, TaskGroup[]>>({});
  const [snackbar, setSnackbar] = useState<SnackbarMessage | null>(null);

  const showMessage = (message: string, severity: SnackbarMessage['severity']) => {
    setSnackbar({ message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar(null);
  };

  const fetchClusters = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, fetching: true }));
      const data = await clusterApi.getClusters();
      setClusters(data);
    } catch (error) {
      console.error('Failed to fetch clusters:', error);
      showMessage('获取集群列表失败', 'error');
    } finally {
      setLoadingStates(prev => ({ ...prev, fetching: false }));
    }
  };

  useEffect(() => {
    fetchClusters();
  }, []);

  const handleSubmit = async (clusterData: Partial<Cluster>) => {
    try {
      setLoadingStates(prev => ({ ...prev, addCluster: true }));
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
      setLoadingStates(prev => ({ ...prev, addCluster: false }));
    }
  };

  const handleDelete = async (clusterId: string) => {
    try {
      setLoadingStates(prev => ({ ...prev, deleting: true }));
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
      setLoadingStates(prev => ({ ...prev, deleting: false }));
    }
  };

  // 获取扫描任务列表（不包含状态监控）
  const fetchScanTasks = async (clusterId: string) => {
    try {
      const response = await scanApi.getScanTasks(clusterId);
      setScanStatus(prev => ({
        ...prev,
        [clusterId]: response
      }));
    } catch (error) {
      console.error('Failed to fetch scan tasks:', error);
    }
  };

  // 监控特定任务的状态
  const watchTaskStatus = async (clusterId: string, mainTaskId: string) => {
    try {
      const status = await scanApi.watchScanTask(clusterId, mainTaskId);
      
      if (status.allTasksCompleted) {
        // 如果任务完成，更新任务列表
        await fetchScanTasks(clusterId);
        return true; // 返回 true 表示任务已完成
      }

      // 更新节点状态
      setScanStatus(prev => ({
        ...prev,
        [clusterId]: prev[clusterId].map(group => {
          if (group.mainTaskId !== mainTaskId) return group;
          
          return {
            ...group,
            nodeTasks: group.nodeTasks.map(task => {
              const nodeStatus = status.nodeStatuses.find(s => s.nodeName === task.nodeName);
              if (!nodeStatus) return task;

              // 将状态字符串转换为正确的类型
              let newStatus: 'pending' | 'running' | 'done' | 'failed' = 'pending';
              switch (nodeStatus.status) {
                case 'done':
                  newStatus = 'done';
                  break;
                case 'failed':
                  newStatus = 'failed';
                  break;
                case 'running':
                  newStatus = 'running';
                  break;
                default:
                  newStatus = 'pending';
              }

              return {
                ...task,
                status: newStatus,
                progress: newStatus === 'done' ? 100 : 
                         newStatus === 'failed' ? 0 : 
                         newStatus === 'running' ? 50 : 0
              };
            })
          };
        })
      }));

      return false; // 返回 false 表示任务未完成
    } catch (error) {
      console.error('Failed to watch task status:', error);
      return true; // 发生错误时停止监控
    }
  };

  // 创建扫描任务后启动监控
  const handleScan = async (clusterId: string, selectedNodes: string[]) => {
    try {
      setLoadingStates(prev => ({ ...prev, scanning: true }));
      const response = await scanApi.createScanTask(clusterId);
      if (response.code === 200) {
        showMessage('扫描任务已创建', 'success');
        
        // 创建任务记录
        setScanStatus(prev => ({
          ...prev,
          [clusterId]: [
            ...(prev[clusterId] || []),
            {
              mainTaskId: response.data.main_task_id,
              nodeTasks: response.data.tasks.map(task => ({
                nodeTaskId: task.node_task_id,
                nodeName: task.node_name,
                nodeIp: task.node_ip || '',
                nodeRole: task.node_role || 'worker',
                status: 'pending' as const,
                progress: 0,
                results: []
              })),
              createdAt: new Date().toISOString()
            }
          ]
        }));

        // 启动任务监控
        const mainTaskId = response.data.main_task_id;
        const watchInterval = setInterval(async () => {
          const isCompleted = await watchTaskStatus(clusterId, mainTaskId);
          if (isCompleted) {
            clearInterval(watchInterval);
          }
        }, 5000);

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
      setLoadingStates(prev => ({ ...prev, scanning: false }));
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ 
        mt: 2,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: '100%'
      }}>
        {/* 标题区域 */}
        <Box sx={{ 
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          mb: 4,
          width: '100%'
        }}>
          <Typography 
            variant="h3" 
            component="h1" 
            gutterBottom
            sx={{ 
              color: 'primary.main',
              fontWeight: 'bold',
              textAlign: 'center',
              mb: 2
            }}
          >
            Kubernetes 基线扫描任务管理系统
          </Typography>
          <Typography 
            variant="h5" 
            color="text.secondary"
            sx={{ 
              textAlign: 'center',
              mb: 3
            }}
          >
            KUBE-BENCH-UI
          </Typography>
        </Box>

        {/* 内容区域 - 使用新的容器来限制内容宽度 */}
        <Container maxWidth="lg">
          {/* 操作按钮 */}
          <Box sx={{ 
            width: '100%', 
            display: 'flex', 
            justifyContent: 'flex-end', 
            mb: 2
          }}>
            <Button 
              variant="contained" 
              onClick={() => setFormOpen(true)}
              disabled={loadingStates.addCluster}
              size="large"
              startIcon={<Add />}
              sx={{ 
                minWidth: '150px',
                borderRadius: 2
              }}
            >
              添加集群
            </Button>
          </Box>

          {/* 集群列表 */}
          <Box sx={{ width: '100%' }}>
            <ClusterList
              clusters={clusters}
              loading={loadingStates.fetching}
              scanning={loadingStates.scanning}
              deleting={loadingStates.deleting}
              scanStatus={scanStatus}
              onEdit={(cluster) => {
                setEditingCluster(cluster);
                setFormOpen(true);
              }}
              onDelete={handleDelete}
              onScan={handleScan}
              fetchScanStatus={fetchScanTasks}
            />
          </Box>
        </Container>

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