import React, { useState, MouseEvent as ReactMouseEvent, useMemo } from 'react';
import {
  List,
  ListItem,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Button,
  IconButton,
  Box,
  Grid,
  Divider,
  Paper,
  Chip,
  TextField,
  InputAdornment,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
} from '@mui/material';
import { 
  Edit, 
  Delete, 
  ExpandMore, 
  Schedule,
  Business,
  Person,
  Search,
} from '@mui/icons-material';
import { Cluster, TaskGroup } from '../types/types';
import ScanProgress from './ScanProgress';
import { scanApi } from '../services/api';

interface ClusterListProps {
  clusters: Cluster[];
  loading: boolean;
  scanning: boolean;
  deleting: boolean;
  scanStatus: Record<string, TaskGroup[]>;
  onEdit: (cluster: Cluster) => void;
  onDelete: (clusterId: string) => void;
  onScan: (clusterId: string, selectedNodes: string[]) => void;
  fetchScanStatus: (clusterId: string) => void;
}

const ClusterList = ({ 
  clusters, 
  loading, 
  scanStatus, 
  onEdit, 
  onDelete, 
  onScan,
  fetchScanStatus 
}: ClusterListProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [expandedCluster, setExpandedCluster] = useState<string | false>(false);
  const itemsPerPage = 10;
  const [scanningStates, setScanningStates] = useState<Record<string, boolean>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clusterToDelete, setClusterToDelete] = useState<Cluster | null>(null);

  const filteredClusters = useMemo(() => {
    if (!searchQuery.trim()) return clusters;

    const query = searchQuery.toLowerCase().trim();
    return clusters.filter(cluster => 
      cluster.name.toLowerCase().includes(query) ||
      cluster.owner.toLowerCase().includes(query) ||
      cluster.businessName.toLowerCase().includes(query) ||
      cluster.apiServer.toLowerCase().includes(query)
    );
  }, [clusters, searchQuery]);

  const currentClusters = useMemo(() => {
    const startIndex = (page - 1) * itemsPerPage;
    return filteredClusters.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredClusters, page]);

  const handleButtonClick = (e: ReactMouseEvent<HTMLButtonElement>, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getLatestScanTime = (tasks: TaskGroup[]) => {
    if (!tasks || tasks.length === 0) return null;
    return tasks.reduce((latest, task) => {
      const taskDate = new Date(task.createdAt);
      return !latest || taskDate > latest ? taskDate : latest;
    }, null as Date | null);
  };

  const handleDeleteScanTask = async (clusterId: string, mainTaskId: string) => {
    try {
      await scanApi.deleteScanTask(clusterId, mainTaskId);
      await fetchScanStatus(clusterId);
    } catch (error) {
      console.error('Failed to delete scan task:', error);
    }
  };

  const handleViewProgress = (e: ReactMouseEvent<HTMLButtonElement>, clusterId: string) => {
    e.stopPropagation();
    fetchScanStatus(clusterId);
    setExpandedCluster(clusterId);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleScan = async (clusterId: string) => {
    setScanningStates(prev => ({
      ...prev,
      [clusterId]: true
    }));
    
    try {
      await onScan(clusterId, []);
    } finally {
      setScanningStates(prev => ({
        ...prev,
        [clusterId]: false
      }));
    }
  };

  const handleDeleteClick = (e: ReactMouseEvent<HTMLButtonElement>, cluster: Cluster) => {
    e.stopPropagation();
    setClusterToDelete(cluster);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (clusterToDelete) {
      onDelete(clusterToDelete.id);
      setDeleteDialogOpen(false);
      setClusterToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setClusterToDelete(null);
  };

  return (
    <Box>
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 3, 
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
          borderRadius: 2
        }}
      >
        <TextField
          fullWidth
          variant="outlined"
          placeholder="搜索集群（支持集群名称、负责人、业务名称、API地址）"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search color="action" />
              </InputAdornment>
            ),
            sx: {
              backgroundColor: 'white',
              '& fieldset': {
                borderColor: 'rgba(0, 0, 0, 0.1)',
              },
              '&:hover fieldset': {
                borderColor: 'primary.main',
              },
            }
          }}
        />
        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {filteredClusters.length 
              ? `找到 ${filteredClusters.length} 个匹配的集群`
              : searchQuery 
                ? '没有找到匹配的集群'
                : `共 ${clusters.length} 个集群`
            }
          </Typography>
          {searchQuery && (
            <Button 
              size="small"
              onClick={() => setSearchQuery('')}
              sx={{ minWidth: 'auto' }}
            >
              清除搜索
            </Button>
          )}
        </Box>
      </Paper>

      <List sx={{ width: '100%' }}>
        {currentClusters.map((cluster) => {
          const latestScanTime = getLatestScanTime(scanStatus[cluster.id] || []);
          
          return (
            <ListItem key={cluster.id} disablePadding sx={{ mb: 2 }}>
              <Paper sx={{ width: '100%', overflow: 'hidden' }}>
                <Accordion
                  expanded={expandedCluster === cluster.id}
                  onChange={() => setExpandedCluster(expandedCluster === cluster.id ? false : cluster.id)}
                  sx={{ boxShadow: 'none' }}
                >
                  <AccordionSummary 
                    expandIcon={<ExpandMore />}
                    sx={{ 
                      backgroundColor: 'rgba(0, 0, 0, 0.03)',
                      '&:hover': { backgroundColor: 'rgba(0, 0, 0, 0.05)' }
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                            {cluster.name}
                          </Typography>
                          {latestScanTime && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Schedule fontSize="small" color="action" />
                              <Typography variant="body2" color="text.secondary">
                                上次扫描: {formatDate(latestScanTime.toISOString())}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Business fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              业务名称: {cluster.businessName}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Person fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              负责人: {cluster.owner}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Schedule fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              创建时间: {formatDate(cluster.createdAt)}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Schedule fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              更新时间: {formatDate(cluster.updatedAt)}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                        <IconButton
                          onClick={(e) => handleButtonClick(e, () => onEdit(cluster))}
                          disabled={loading}
                          size="small"
                        >
                          <Edit />
                        </IconButton>
                        <IconButton
                          onClick={(e) => handleDeleteClick(e, cluster)}
                          disabled={loading}
                          size="small"
                        >
                          <Delete />
                        </IconButton>
                        <Button
                          variant="contained"
                          color="primary"
                          onClick={(e) => handleButtonClick(e, () => handleScan(cluster.id))}
                          disabled={scanningStates[cluster.id] || false}
                          size="small"
                        >
                          开始扫描
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={(e) => handleViewProgress(e, cluster.id)}
                          disabled={loading}
                          size="small"
                        >
                          扫描进度
                        </Button>
                      </Grid>
                    </Grid>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ py: 2 }}>
                      <Paper elevation={0} sx={{ p: 3, backgroundColor: 'rgba(0, 0, 0, 0.02)' }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 3, color: 'primary.main' }}>
                          集群详细信息
                        </Typography>
                        <Grid container spacing={4}>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <Box>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                  集群名称
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                  {cluster.name}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                  API服务器地址
                                </Typography>
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    wordBreak: 'break-all',
                                    fontFamily: 'monospace',
                                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                                    p: 1,
                                    borderRadius: 1
                                  }}
                                >
                                  {cluster.apiServer}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                          <Grid item xs={12} md={6}>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                              <Box>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                  节点数量
                                </Typography>
                                <Chip 
                                  label={cluster.nodeCount} 
                                  color="primary" 
                                  size="medium"
                                  sx={{ minWidth: 80 }}
                                />
                              </Box>
                              <Box>
                                <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                                  备注
                                </Typography>
                                <Typography 
                                  variant="body1" 
                                  sx={{ 
                                    minHeight: '3em',
                                    bgcolor: cluster.notes ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                                    p: cluster.notes ? 1 : 0,
                                    borderRadius: 1
                                  }}
                                >
                                  {cluster.notes || '-'}
                                </Typography>
                              </Box>
                            </Box>
                          </Grid>
                        </Grid>
                      </Paper>
                    </Box>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="h6" gutterBottom sx={{ color: 'primary.main' }}>
                      扫描进度
                    </Typography>
                    <ScanProgress
                      taskGroups={scanStatus[cluster.id] || []}
                      clusterId={cluster.id}
                      onDelete={(mainTaskId) => handleDeleteScanTask(cluster.id, mainTaskId)}
                    />
                  </AccordionDetails>
                </Accordion>
              </Paper>
            </ListItem>
          );
        })}
      </List>

      {filteredClusters.length > itemsPerPage && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={Math.ceil(filteredClusters.length / itemsPerPage)}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {searchQuery && filteredClusters.length === 0 && (
        <Box 
          sx={{ 
            textAlign: 'center', 
            py: 8,
            backgroundColor: 'rgba(0, 0, 0, 0.02)',
            borderRadius: 2
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            未找到匹配的集群
          </Typography>
          <Typography variant="body2" color="text.secondary">
            尝试使用其他关键词搜索
          </Typography>
        </Box>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
        PaperProps={{
          sx: {
            borderRadius: 2,
            minWidth: '400px'
          }
        }}
      >
        <DialogTitle 
          id="delete-dialog-title"
          sx={{
            pb: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            color: 'error.main'
          }}
        >
          <Delete fontSize="small" color="error" />
          确认删除集群
        </DialogTitle>
        <DialogContent>
          <DialogContentText 
            id="delete-dialog-description"
            sx={{ 
              color: 'text.primary',
              mt: 1
            }}
          >
            {clusterToDelete && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Typography variant="body1">
                  您确定要删除以下集群吗？此操作无法撤销。
                </Typography>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2,
                    bgcolor: 'rgba(0, 0, 0, 0.02)',
                    borderRadius: 1
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        集群名称
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body1" fontWeight="medium">
                        {clusterToDelete.name}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        业务名称
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body1">
                        {clusterToDelete.businessName}
                      </Typography>
                    </Grid>
                    <Grid item xs={4}>
                      <Typography variant="body2" color="text.secondary">
                        负责人
                      </Typography>
                    </Grid>
                    <Grid item xs={8}>
                      <Typography variant="body1">
                        {clusterToDelete.owner}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>
              </Box>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button 
            onClick={handleDeleteCancel}
            variant="outlined"
            sx={{
              minWidth: '80px'
            }}
          >
            取消
          </Button>
          <Button 
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
            autoFocus
            startIcon={<Delete />}
            sx={{
              minWidth: '80px',
              '&:hover': {
                bgcolor: 'error.dark'
              }
            }}
          >
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ClusterList; 