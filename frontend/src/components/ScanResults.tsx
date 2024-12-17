import React, { useState, useMemo } from 'react';
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
  styled,
  Button,
} from '@mui/material';
import { ExpandMore, GetApp } from '@mui/icons-material';

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

// 添加类型定义
interface TestResult {
  test_number: string;
  test_desc: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  test_info: string[];
  remediation?: string;
}

interface Test {
  desc: string;
  fail: number;
  pass: number;
  warn: number;
  results: TestResult[];
}

interface Control {
  text: string;
  version: string;
  tests: Test[];
}

interface ScanResultsProps {
  results: {
    Controls: Control[];
    Totals: {
      total_fail: number;
      total_pass: number;
      total_warn: number;
      total_info: number;
    };
  };
  nodeName: string;
  clusterId: string;
  mainTaskId: string;
  nodeTaskId: string;
}

const ScanResults = ({ results, nodeName, clusterId, mainTaskId, nodeTaskId }: ScanResultsProps) => {
  // const controls = results?.Controls || [];
  const controls = useMemo(() => results?.Controls || [], [results]);
  const totals = results?.Totals || { total_fail: 0, total_pass: 0, total_warn: 0, total_info: 0 };
  
  // 添加筛选状态
  const [statusFilter, setStatusFilter] = useState<'PASS' | 'FAIL' | 'WARN' | null>(null);

  // 使用 useMemo 处理筛选逻辑
  const filteredControls = useMemo(() => {
    if (!statusFilter) return controls;

    return controls.map((control: Control) => ({
      ...control,
      tests: control.tests.map((test: Test) => ({
        ...test,
        results: test.results.filter((result: TestResult) => result.status === statusFilter)
      })).filter((test: Test) => test.results.length > 0)
    })).filter((control: Control) => control.tests.length > 0);
  }, [controls, statusFilter]);

  // 处理筛选点击
  const handleFilterClick = (status: 'PASS' | 'FAIL' | 'WARN') => {
    setStatusFilter(currentStatus => currentStatus === status ? null : status);
  };

  const handleExportReport = async () => {
    try {
      const response = await fetch('/api/v1/exportreport', {
      // const response = await fetch('http://localhost:5002/api/v1/exportreport', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/pdf',
        },
        body: JSON.stringify({
          cluster_id: clusterId,
          main_task_id: mainTaskId,
          node_task_id: nodeTaskId
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `security_scan_report_${nodeName}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        console.error('Export failed:', await response.text());
        throw new Error('导出失败');
      }
    } catch (error) {
      console.error('Failed to export report:', error);
    }
  };

  return (
    <StyledPaper elevation={3}>
      {/* 标题和统计信息固定在顶部 */}
      <Box sx={{ position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1, pb: 2 }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2 
        }}>
          <Typography variant="h6">
            节点: {nodeName}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            onClick={handleExportReport}
            startIcon={<GetApp />}
          >
            导出报告
          </Button>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip 
            label={`通过: ${totals.total_pass}`} 
            color="success"
            onClick={() => handleFilterClick('PASS')}
            variant={statusFilter === 'PASS' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
          <Chip 
            label={`失败: ${totals.total_fail}`} 
            color="error"
            onClick={() => handleFilterClick('FAIL')}
            variant={statusFilter === 'FAIL' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
          <Chip 
            label={`警告: ${totals.total_warn}`} 
            color="warning"
            onClick={() => handleFilterClick('WARN')}
            variant={statusFilter === 'WARN' ? 'filled' : 'outlined'}
            sx={{ cursor: 'pointer' }}
          />
          <Chip 
            label={`信息: ${totals.total_info}`} 
            color="info"
            disabled
          />
        </Box>
        {statusFilter && (
          <Typography 
            variant="caption" 
            color="textSecondary" 
            sx={{ display: 'block', mt: 1 }}
          >
            当前显示: {
              statusFilter === 'PASS' ? '通过' :
              statusFilter === 'FAIL' ? '失败' :
              '警告'
            } 的检查项
          </Typography>
        )}
      </Box>

      {/* 详细结果内容 */}
      <Box sx={{ mt: 3 }}>
        {filteredControls.map((control: Control, index: number) => (
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
              {control.tests.map((test: Test, testIndex: number) => (
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
                      {test.results.map((result: TestResult, resultIndex: number) => (
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