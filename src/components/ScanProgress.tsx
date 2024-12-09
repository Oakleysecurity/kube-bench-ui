import React from 'react';
import { Box, LinearProgress, Typography } from '@mui/material';
import { NodeScanStatus } from '../types/types';

interface ScanProgressProps {
  nodes: NodeScanStatus[];
}

const ScanProgress = ({ nodes }: ScanProgressProps) => {
  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {nodes.map((node) => (
        <Box key={node.nodeName} sx={{ mb: 2 }}>
          <Typography variant="subtitle1">
            {node.nodeName} - {node.status}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={node.progress}
            sx={{ mt: 1 }}
          />
        </Box>
      ))}
    </Box>
  );
};

export default ScanProgress; 