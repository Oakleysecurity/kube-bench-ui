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
} from '@mui/material';
import { ExpandMore, Delete } from '@mui/icons-material';
import { NodeScanStatus } from '../types/types';

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
                <ListItem key={task.nodeTaskId}>
                  <ListItemText
                    primary={`节点任务ID: ${task.nodeTaskId}`}
                    secondary={
                      <Box>
                        <Typography variant="body2">
                          节点: {task.nodeName}
                        </Typography>
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
    </Box>
  );
};

export default ScanProgress; 