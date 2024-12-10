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
} from '@mui/material';
import { ExpandMore, Delete } from '@mui/icons-material';
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

const ScanProgress = ({ taskGroups, clusterId, onDelete }: ScanProgressProps) => {
  const [expandedTask, setExpandedTask] = useState<string | false>(false);
  const [resultDialog, setResultDialog] = useState<{
    open: boolean;
    nodeName: string;
    results: any[] | null;
    status: string;
  }>({
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
        results: result.result || [],
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

  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {taskGroups.map((group) => (
        <Accordion
          key={group.mainTaskId}
          expanded={expandedTask === group.mainTaskId}
          onChange={() => setExpandedTask(expandedTask === group.mainTaskId ? false : group.mainTaskId)}
        >
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box sx={{ width: '100%', display: 'flex', alignItems: 'center' }}>
              <Box flex={1}>
                <Typography variant="subtitle1">
                  主任务ID: {group.mainTaskId}
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={calculateMainTaskProgress(group.nodeTasks)}
                  sx={{ mt: 1 }}
                />
                <Typography variant="caption" color="textSecondary">
                  状态: {getMainTaskStatus(group.nodeTasks)}
                </Typography>
              </Box>
              <IconButton
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(group.mainTaskId);
                }}
                size="small"
              >
                <Delete />
              </IconButton>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <List>
              {group.nodeTasks.map((task) => (
                <ListItem 
                  key={task.nodeTaskId}
                  secondaryAction={
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleViewResults(task)}
                    >
                      查看扫描结果
                    </Button>
                  }
                >
                  <ListItemText
                    primary={`节点: ${task.nodeName}`}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          状态: {task.status}
                        </Typography>
                        <LinearProgress
                          variant="determinate"
                          value={task.progress}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
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