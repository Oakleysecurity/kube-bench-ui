import React, { useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Grid,
  Paper,
} from '@mui/material';
import { ExpandMore, Delete, Schedule, Computer, Storage, NetworkCheck } from '@mui/icons-material';
import { NodeScanStatus } from '../types/types';
import { scanApi } from '../services/api';
import ScanResults from './ScanResults';

interface TaskGroup {
  mainTaskId: string;
  nodeTasks: NodeScanStatus[];
  createdAt: string;
}

interface ScanProgressProps {
  taskGroups: TaskGroup[];
  clusterId: string;
  onDelete: (mainTaskId: string) => void;
}

interface ScanResultData {
  Controls: Array<{
    text: string;
    version: string;
    tests: Array<{
      desc: string;
      fail: number;
      pass: number;
      warn: number;
      results: Array<{
        test_number: string;
        test_desc: string;
        status: 'PASS' | 'FAIL' | 'WARN';
        test_info: string[];
        remediation?: string;
      }>;
    }>;
  }>;
  Totals: {
    total_fail: number;
    total_pass: number;
    total_warn: number;
    total_info: number;
  };
}

interface DialogState {
  open: boolean;
  nodeName: string;
  results: ScanResultData | null;
  status: string;
}

const ScanProgress = ({ taskGroups, clusterId, onDelete }: ScanProgressProps) => {
  const [expandedTask, setExpandedTask] = useState<string | false>(false);
  const [resultDialog, setResultDialog] = useState<DialogState>({
    open: false,
    nodeName: '',
    results: null,
    status: ''
  });

  const handleViewResults = async (nodeTask: NodeScanStatus) => {
    if (nodeTask.status === 'running' || nodeTask.status === 'pending') {
      setResultDialog({
        open: true,
        nodeName: nodeTask.nodeName,
        results: null,
        status: 'running'
      });
      return;
    }

    if (nodeTask.status === 'failed') {
      setResultDialog({
        open: true,
        nodeName: nodeTask.nodeName,
        results: null,
        status: 'failed'
      });
      return;
    }

    try {
      const result = await scanApi.getNodeScanResult(clusterId, nodeTask.nodeName);
      setResultDialog({
        open: true,
        nodeName: nodeTask.nodeName,
        results: result.result,
        status: result.status
      });
    } catch (error) {
      console.error('Failed to fetch scan results:', error);
      setResultDialog({
        open: true,
        nodeName: nodeTask.nodeName,
        results: null,
        status: 'error'
      });
    }
  };

  const handleCloseDialog = () => {
    setResultDialog({
      open: false,
      nodeName: '',
      results: null,
      status: ''
    });
  };

  const calculateMainTaskProgress = (tasks: NodeScanStatus[]) => {
    if (!tasks.length) return 0;
    const totalProgress = tasks.reduce((sum, task) => sum + task.progress, 0);
    return Math.round(totalProgress / tasks.length);
  };

  const getMainTaskStatus = (tasks: NodeScanStatus[]) => {
    if (!tasks.length) return 'pending';
    if (tasks.every(task => task.status === 'done')) return 'done';
    if (tasks.some(task => task.status === 'failed')) return 'failed';
    if (tasks.some(task => task.status === 'running')) return 'running';
    return 'pending';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done': return 'success';
      case 'failed': return 'error';
      case 'running': return 'info';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {taskGroups.map((group) => (
        <Paper 
          key={group.mainTaskId} 
          elevation={2} 
          sx={{ mb: 2, overflow: 'hidden' }}
        >
          <Accordion
            expanded={expandedTask === group.mainTaskId}
            onChange={() => setExpandedTask(expandedTask === group.mainTaskId ? false : group.mainTaskId)}
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
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                      主任务ID: {group.mainTaskId}
                    </Typography>
                    <Chip
                      size="small"
                      label={getMainTaskStatus(group.nodeTasks)}
                      color={getStatusColor(getMainTaskStatus(group.nodeTasks))}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                    <Schedule fontSize="small" color="action" />
                    <Typography variant="body2" color="text.secondary">
                      创建时间: {formatDate(group.createdAt)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={5}>
                  <Box sx={{ width: '100%' }}>
                    <LinearProgress
                      variant="determinate"
                      value={calculateMainTaskProgress(group.nodeTasks)}
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: 'rgba(0, 0, 0, 0.1)',
                      }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      完成进度: {calculateMainTaskProgress(group.nodeTasks)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={1} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(group.mainTaskId);
                    }}
                    size="small"
                  >
                    <Delete />
                  </IconButton>
                </Grid>
              </Grid>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <List>
                {group.nodeTasks.map((task) => (
                  <ListItem 
                    key={task.nodeTaskId}
                    sx={{ 
                      borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                      '&:last-child': { borderBottom: 'none' }
                    }}
                  >
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={4}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Computer fontSize="small" color="action" />
                            <Typography variant="subtitle2">
                              {task.nodeName}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Storage fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              角色: {task.nodeRole}
                            </Typography>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <NetworkCheck fontSize="small" color="action" />
                            <Typography variant="body2" color="text.secondary">
                              IP: {task.nodeIp}
                            </Typography>
                          </Box>
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={5}>
                        <Box sx={{ width: '100%' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <Typography variant="body2">状态:</Typography>
                            <Chip
                              size="small"
                              label={task.status}
                              color={getStatusColor(task.status)}
                            />
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={task.progress}
                            sx={{ 
                              height: 6, 
                              borderRadius: 3,
                              backgroundColor: 'rgba(0, 0, 0, 0.1)',
                            }}
                          />
                        </Box>
                      </Grid>
                      <Grid item xs={12} md={3} sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => handleViewResults(task)}
                          startIcon={<ExpandMore />}
                        >
                          查看扫描结果
                        </Button>
                      </Grid>
                    </Grid>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        </Paper>
      ))}

      <Dialog
        open={resultDialog.open}
        onClose={handleCloseDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          节点扫描结果: {resultDialog.nodeName}
        </DialogTitle>
        <DialogContent>
          {resultDialog.status === 'running' && (
            <Typography>正在扫描中，请稍后查询</Typography>
          )}
          {resultDialog.status === 'failed' && (
            <Typography>扫描失败，请检查该节点任务调度状态，并稍后重试</Typography>
          )}
          {resultDialog.status === 'done' && resultDialog.results && (
            <ScanResults
              results={resultDialog.results}
              nodeName={resultDialog.nodeName}
            />
          )}
          {resultDialog.status === 'error' && (
            <Typography color="error">获取扫描结果失败，请稍后重试</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ScanProgress; 