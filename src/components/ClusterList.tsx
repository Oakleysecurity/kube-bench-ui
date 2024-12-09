import React, { useState, MouseEvent as ReactMouseEvent } from 'react';
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
  Tabs,
  Tab,
  Grid,
  Divider,
} from '@mui/material';
import { Edit, Delete, ExpandMore } from '@mui/icons-material';
import { Cluster, NodeScanStatus } from '../types/types';
import ScanProgress from './ScanProgress';
import ScanResults from './ScanResults';

interface ClusterListProps {
  clusters: Cluster[];
  loading?: boolean;
  scanStatus: Record<string, NodeScanStatus[]>;
  onEdit: (cluster: Cluster) => void;
  onDelete: (clusterId: string) => void;
  onScan: (clusterId: string, selectedNodes: string[]) => void;
}

const ClusterList = ({ clusters, loading, scanStatus, onEdit, onDelete, onScan }: ClusterListProps) => {
  const [expandedCluster, setExpandedCluster] = useState<string | false>(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleButtonClick = (e: ReactMouseEvent<HTMLButtonElement>, callback: () => void) => {
    e.stopPropagation();
    callback();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  return (
    <List>
      {clusters.map((cluster) => (
        <ListItem key={cluster.id} disablePadding>
          <Accordion
            expanded={expandedCluster === cluster.id}
            onChange={() => setExpandedCluster(expandedCluster === cluster.id ? false : cluster.id)}
            sx={{ width: '100%' }}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" width="100%">
                <Typography flex={1}>{cluster.name}</Typography>
                <IconButton 
                  onClick={(e) => handleButtonClick(e, () => onEdit(cluster))}
                  disabled={loading}
                >
                  <Edit />
                </IconButton>
                <IconButton 
                  onClick={(e) => handleButtonClick(e, () => onDelete(cluster.id))}
                  disabled={loading}
                >
                  <Delete />
                </IconButton>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={(e) => handleButtonClick(e, () => onScan(cluster.id, []))}
                  disabled={loading}
                >
                  开始扫描
                </Button>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box mb={2}>
                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      集群名称
                    </Typography>
                    <Typography>{cluster.name}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      API服务器地址
                    </Typography>
                    <Typography>{cluster.apiServer}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      集群负责人
                    </Typography>
                    <Typography>{cluster.owner}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      集群业务名称
                    </Typography>
                    <Typography>{cluster.businessName}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      节点数量
                    </Typography>
                    <Typography>{cluster.nodeCount}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      备注
                    </Typography>
                    <Typography>{cluster.notes || '-'}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      创建时间
                    </Typography>
                    <Typography>{formatDate(cluster.createdAt)}</Typography>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" color="textSecondary">
                      更新时间
                    </Typography>
                    <Typography>{formatDate(cluster.updatedAt)}</Typography>
                  </Grid>
                </Grid>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Tabs value={activeTab} onChange={(_e, value) => setActiveTab(value)}>
                <Tab label="扫描进度" />
                <Tab label="扫描结果" />
              </Tabs>
              {activeTab === 0 && <ScanProgress nodes={scanStatus[cluster.id] || []} />}
              {activeTab === 1 && scanStatus[cluster.id]?.map(node => (
                <ScanResults key={node.nodeName} results={node.results || []} nodeName={node.nodeName} />
              ))}
            </AccordionDetails>
          </Accordion>
        </ListItem>
      ))}
    </List>
  );
};

export default ClusterList; 