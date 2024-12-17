import React, { useState, ChangeEvent, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
} from '@mui/material';
import { Cluster } from '../types/types';

interface ClusterFormProps {
  open: boolean;
  cluster?: Cluster;
  onClose: () => void;
  onSubmit: (cluster: Partial<Cluster>) => Promise<void>;
}

const ClusterForm = ({ open, cluster, onClose, onSubmit }: ClusterFormProps) => {
  const [formData, setFormData] = useState<Partial<Cluster>>({
    name: '',
    owner: '',
    apiServer: '',
    businessName: '',
    token: '',
    notes: ''
  });

  // 当 cluster 或 open 改变时更新表单数据
  useEffect(() => {
    if (cluster && open) {
      setFormData({
        ...cluster,
        token: '' // 只清空 token，保留其他字段
      });
    } else if (!open) {
      // 关闭表单时重置数据
      setFormData({
        name: '',
        owner: '',
        apiServer: '',
        businessName: '',
        token: '',
        notes: ''
      });
    }
  }, [cluster, open]);

  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const isFormValid = () => {
    if (cluster) {
      // 编辑模式：如果没有修改token，不要求token必填
      return formData.name && 
             formData.owner && 
             formData.apiServer && 
             formData.businessName;
    }
    // 新建模式：所有必填字段都要填
    return formData.name && 
           formData.owner && 
           formData.apiServer && 
           formData.businessName && 
           formData.token;
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      // 如果是编辑模式且token为空，则不更新token
      if (cluster && !formData.token) {
        const { token, ...dataWithoutToken } = formData;
        await onSubmit(dataWithoutToken);
      } else {
        await onSubmit(formData);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {cluster ? '编辑集群' : '新建集群'}
      </DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          required
          name="name"
          label="集群名称"
          value={formData.name || ''}
          onChange={handleChange}
          margin="normal"
          error={!formData.name}
          helperText={!formData.name ? '请输入集群名称' : ''}
        />
        <TextField
          fullWidth
          required
          name="owner"
          label="集群负责人"
          value={formData.owner || ''}
          onChange={handleChange}
          margin="normal"
          error={!formData.owner}
          helperText={!formData.owner ? '请输入集群负责人' : ''}
        />
        <TextField
          fullWidth
          required
          name="apiServer"
          label="API服务器"
          value={formData.apiServer || ''}
          onChange={handleChange}
          margin="normal"
          error={!formData.apiServer}
          helperText={!formData.apiServer ? '请输入API服务器地址' : ''}
          placeholder="例如: https://kubernetes.default.svc:6443"
        />
        <TextField
          fullWidth
          required
          name="businessName"
          label="集群业务名称"
          value={formData.businessName || ''}
          onChange={handleChange}
          margin="normal"
          error={!formData.businessName}
          helperText={!formData.businessName ? '请输入集群业务名称' : ''}
        />
        <TextField
          fullWidth
          required={!cluster}
          name="token"
          label="访问令牌"
          value={formData.token || ''}
          onChange={handleChange}
          margin="normal"
          error={!cluster && !formData.token}
          helperText={cluster ? '如需更新访问令牌请输入新的令牌，否则保持为空' : '请输入访问令牌'}
          type="password"
        />
        <TextField
          fullWidth
          name="notes"
          label="备注"
          value={formData.notes || ''}
          onChange={handleChange}
          margin="normal"
          multiline
          rows={3}
        />
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          color="inherit"
          disabled={submitting}
        >
          取消
        </Button>
        <Button 
          onClick={handleSubmit} 
          color="primary"
          disabled={!isFormValid() || submitting}
        >
          {submitting ? '提交中...' : '确定'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClusterForm; 