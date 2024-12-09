import React from 'react';
import {
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Box,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
import { TestResult } from '../types/types';

interface ScanResultsProps {
  results: TestResult[];
  nodeName: string;
}

const ScanResults = ({ results, nodeName }: ScanResultsProps) => {
  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        节点: {nodeName}
      </Typography>
      {results.map((result) => (
        <Accordion key={result.test_number}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" gap={2}>
              <Typography>{result.test_number}</Typography>
              <Chip
                label={result.status}
                color={
                  result.status === 'PASS'
                    ? 'success'
                    : result.status === 'FAIL'
                    ? 'error'
                    : 'warning'
                }
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="subtitle1" gutterBottom>
              测试描述：{result.test_desc}
            </Typography>
            <Typography variant="subtitle2" gutterBottom>
              测试信息：
            </Typography>
            <Box component="div" sx={{ pl: 2 }}>
              {result.test_info.map((info: string, index: number) => (
                <Typography key={index} variant="body2" gutterBottom>
                  {info}
                </Typography>
              ))}
            </Box>
            {result.status !== 'PASS' && result.remediation && (
              <>
                <Typography variant="subtitle2" gutterBottom>
                  修复方案：
                </Typography>
                <Typography>{result.remediation}</Typography>
              </>
            )}
          </AccordionDetails>
        </Accordion>
      ))}
    </Paper>
  );
};

export default ScanResults; 