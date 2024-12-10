import React from 'react';
import {
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Box,
  List,
  ListItem,
  ListItemText,
  styled,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';

// 自定义样式组件
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  maxHeight: '80vh',  // 最大高度为视窗高度的80%
  overflowY: 'auto',  // 添加垂直滚动条
}));

const StyledAccordion = styled(Accordion)({
  '&:before': {
    display: 'none',  // 移除默认分隔线
  },
});

const StyledListItem = styled(ListItem)({
  flexDirection: 'column',
  alignItems: 'flex-start',
  padding: '16px',
});

interface ScanResultsProps {
  results: any;
  nodeName: string;
}

const ScanResults = ({ results, nodeName }: ScanResultsProps) => {
  const controls = results?.Controls || [];
  const totals = results?.Totals || { total_fail: 0, total_pass: 0, total_warn: 0, total_info: 0 };

  return (
    <StyledPaper elevation={3}>
      {/* 标题和统计信息固定在顶部 */}
      <Box sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, pb: 2 }}>
        <Typography variant="h6" gutterBottom>
          节点: {nodeName}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`通过: ${totals.total_pass}`} color="success" />
          <Chip label={`失败: ${totals.total_fail}`} color="error" />
          <Chip label={`警告: ${totals.total_warn}`} color="warning" />
          <Chip label={`信息: ${totals.total_info}`} color="info" />
        </Box>
      </Box>

      {/* 详细结果内容 */}
      <Box sx={{ mt: 3 }}>
        {controls.map((control: any, index: number) => (
          <StyledAccordion key={index}>
            <AccordionSummary 
              expandIcon={<ExpandMore />}
              sx={{ 
                backgroundColor: 'rgba(0, 0, 0, 0.03)',
                borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
              }}
            >
              <Typography sx={{ fontWeight: 'bold' }}>
                {control.text} (版本: {control.version})
              </Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              {control.tests.map((test: any, testIndex: number) => (
                <StyledAccordion key={testIndex}>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: 2,
                      flexWrap: 'wrap',
                      width: '100%'
                    }}>
                      <Typography sx={{ flex: 1, minWidth: '200px' }}>{test.desc}</Typography>
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <Chip size="small" label={`通过: ${test.pass}`} color="success" />
                        <Chip size="small" label={`失败: ${test.fail}`} color="error" />
                        <Chip size="small" label={`警告: ${test.warn}`} color="warning" />
                      </Box>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List sx={{ width: '100%', p: 0 }}>
                      {test.results.map((result: any, resultIndex: number) => (
                        <StyledListItem key={resultIndex} divider>
                          <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: 2,
                            width: '100%',
                            mb: 1,
                            flexWrap: 'wrap'
                          }}>
                            <Typography sx={{ fontWeight: 'medium' }}>
                              {result.test_number}. {result.test_desc}
                            </Typography>
                            <Chip
                              size="small"
                              label={result.status}
                              color={
                                result.status === 'PASS' ? 'success' :
                                result.status === 'FAIL' ? 'error' :
                                'warning'
                              }
                            />
                          </Box>
                          <Box sx={{ width: '100%' }}>
                            {result.test_info.map((info: string, infoIndex: number) => (
                              <Typography 
                                key={infoIndex} 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ 
                                  whiteSpace: 'pre-wrap',
                                  wordBreak: 'break-word',
                                  mb: 1 
                                }}
                              >
                                {info}
                              </Typography>
                            ))}
                            {result.remediation && (
                              <Box sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" color="primary">
                                  修复建议:
                                </Typography>
                                <Typography 
                                  variant="body2" 
                                  color="text.secondary"
                                  sx={{ 
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word' 
                                  }}
                                >
                                  {result.remediation}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </StyledListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </StyledAccordion>
              ))}
            </AccordionDetails>
          </StyledAccordion>
        ))}
      </Box>
    </StyledPaper>
  );
};

export default ScanResults; 