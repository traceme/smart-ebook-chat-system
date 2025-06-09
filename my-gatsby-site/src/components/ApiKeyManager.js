import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  TextField,
  Button,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Paper,
  Grid,
  Tabs,
  Tab,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Avatar,
  LinearProgress,
  Divider,
  Link,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';

// Icons using Unicode emojis
const KeyIcon = () => <span style={{ fontSize: '16px' }}>🔑</span>;
const SecurityIcon = () => <span style={{ fontSize: '16px' }}>🔒</span>;
const ProviderIcon = () => <span style={{ fontSize: '16px' }}>🏢</span>;
const AddIcon = () => <span style={{ fontSize: '16px' }}>➕</span>;
const EditIcon = () => <span style={{ fontSize: '16px' }}>✏️</span>;
const DeleteIcon = () => <span style={{ fontSize: '16px' }}>🗑️</span>;
const ValidIcon = () => <span style={{ fontSize: '16px' }}>✅</span>;
const InvalidIcon = () => <span style={{ fontSize: '16px' }}>❌</span>;
const TestIcon = () => <span style={{ fontSize: '16px' }}>🧪</span>;
const CopyIcon = () => <span style={{ fontSize: '16px' }}>📋</span>;
const ViewIcon = () => <span style={{ fontSize: '16px' }}>👁️</span>;
const HideIcon = () => <span style={{ fontSize: '16px' }}>🙈</span>;
const InfoIcon = () => <span style={{ fontSize: '16px' }}>ℹ️</span>;
const WarningIcon = () => <span style={{ fontSize: '16px' }}>⚠️</span>;
const UsageIcon = () => <span style={{ fontSize: '16px' }}>📊</span>;
const ExpandIcon = () => <span style={{ fontSize: '16px' }}>🔽</span>;
const RefreshIcon = () => <span style={{ fontSize: '16px' }}>🔄</span>;

// Styled components
const ApiKeyContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#fafafa',
  minHeight: '100vh',
}));

const KeyCard = styled(Card)(({ theme, isValid, isActive }) => ({
  marginBottom: theme.spacing(2),
  border: isValid === false ? '2px solid #ea4335' : 
          isValid === true ? '2px solid #34a853' : '1px solid #dadce0',
  backgroundColor: isActive ? '#e8f0fe' : '#fff',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: '0 2px 8px rgba(60,64,67,0.3)',
    transform: 'translateY(-1px)',
  },
}));

const ProviderLogo = styled(Avatar)(({ theme, provider }) => ({
  width: 40,
  height: 40,
  backgroundColor: 
    provider === 'openai' ? '#00a67e' :
    provider === 'anthropic' ? '#d97706' :
    provider === 'google' ? '#4285f4' :
    provider === 'azure' ? '#0078d4' :
    '#6b7280',
  color: '#fff',
  fontSize: '14px',
  fontWeight: 'bold',
}));

const SecureTextField = styled(TextField)(({ theme }) => ({
  '& .MuiOutlinedInput-root': {
    '&:hover fieldset': {
      borderColor: '#4285f4',
    },
    '&.Mui-focused fieldset': {
      borderColor: '#4285f4',
    },
  },
  '& .MuiInputLabel-root.Mui-focused': {
    color: '#4285f4',
  },
}));

const UsageChart = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: '#f8f9fa',
  borderRadius: theme.spacing(1),
  border: '1px solid #dadce0',
}));

// Provider configurations
const API_PROVIDERS = {
  openai: {
    name: 'OpenAI',
    icon: 'O',
    description: 'GPT-4, GPT-3.5, DALL-E, Whisper',
    website: 'https://platform.openai.com/api-keys',
    keyFormat: 'sk-...',
    keyLength: [51, 64],
    models: ['gpt-4', 'gpt-3.5-turbo', 'gpt-4-turbo', 'dall-e-3'],
    instructions: [
      'Go to OpenAI Platform (platform.openai.com)',
      'Navigate to API Keys section',
      'Click "Create new secret key"',
      'Copy the key starting with "sk-"',
      'Keep your key secure and never share it'
    ],
    testEndpoint: '/api/test-openai-key',
  },
  anthropic: {
    name: 'Anthropic',
    icon: 'A',
    description: 'Claude 3 Opus, Sonnet, Haiku',
    website: 'https://console.anthropic.com/settings/keys',
    keyFormat: 'sk-ant-...',
    keyLength: [100, 120],
    models: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    instructions: [
      'Visit Anthropic Console (console.anthropic.com)',
      'Go to Settings > API Keys',
      'Click "Create Key"',
      'Copy the key starting with "sk-ant-"',
      'Store securely and never expose publicly'
    ],
    testEndpoint: '/api/test-anthropic-key',
  },
  google: {
    name: 'Google AI',
    icon: 'G',
    description: 'Gemini Pro, Palm, Bard',
    website: 'https://makersuite.google.com/app/apikey',
    keyFormat: 'AI...',
    keyLength: [39, 45],
    models: ['gemini-pro', 'gemini-pro-vision', 'palm-2'],
    instructions: [
      'Go to Google AI Studio (makersuite.google.com)',
      'Click "Get API Key"',
      'Create or select a project',
      'Copy the generated API key',
      'Secure your key properly'
    ],
    testEndpoint: '/api/test-google-key',
  },
  azure: {
    name: 'Azure OpenAI',
    icon: 'Az',
    description: 'Azure-hosted OpenAI models',
    website: 'https://portal.azure.com',
    keyFormat: 'Various formats',
    keyLength: [32, 64],
    models: ['gpt-4', 'gpt-35-turbo', 'dall-e-3'],
    instructions: [
      'Go to Azure Portal (portal.azure.com)',
      'Navigate to your OpenAI resource',
      'Go to Keys and Endpoint',
      'Copy Key 1 or Key 2',
      'Also note your endpoint URL'
    ],
    testEndpoint: '/api/test-azure-key',
  },
};

const TabPanel = ({ children, value, index, ...other }) => (
  <Box
    role="tabpanel"
    hidden={value !== index}
    id={`apikey-tabpanel-${index}`}
    aria-labelledby={`apikey-tab-${index}`}
    {...other}
  >
    {value === index && children}
  </Box>
);

const ApiKeyManager = ({
  apiKeys = [],
  onAddKey = () => {},
  onUpdateKey = () => {},
  onDeleteKey = () => {},
  onTestKey = () => {},
  onSetActiveKey = () => {},
  loading = false,
  className,
}) => {
  // State management
  const [activeTab, setActiveTab] = useState(0);
  const [addKeyOpen, setAddKeyOpen] = useState(false);
  const [editKeyOpen, setEditKeyOpen] = useState(false);
  const [deleteKeyOpen, setDeleteKeyOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [keyName, setKeyName] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [showKey, setShowKey] = useState({});
  const [editingKey, setEditingKey] = useState(null);
  const [deletingKey, setDeletingKey] = useState(null);
  const [testingKey, setTestingKey] = useState(null);
  const [keyValidation, setKeyValidation] = useState({});
  const [usageData, setUsageData] = useState({});

  // Validate key format
  const validateKeyFormat = useCallback((provider, key) => {
    const config = API_PROVIDERS[provider];
    if (!config) return false;

    if (config.keyFormat === 'Various formats') return key.length >= 20;
    
    const formatCheck = key.startsWith(config.keyFormat.split('...')[0]);
    const lengthCheck = key.length >= config.keyLength[0] && key.length <= config.keyLength[1];
    
    return formatCheck && lengthCheck;
  }, []);

  // Handle adding new key
  const handleAddKey = useCallback(async () => {
    if (!keyName.trim() || !apiKey.trim()) return;

    const isValidFormat = validateKeyFormat(selectedProvider, apiKey);
    if (!isValidFormat) {
      setKeyValidation(prev => ({
        ...prev,
        [apiKey]: { valid: false, message: 'Invalid key format' }
      }));
      return;
    }

    const newKey = {
      id: Date.now().toString(),
      name: keyName.trim(),
      provider: selectedProvider,
      key: apiKey.trim(),
      endpoint: endpoint.trim() || null,
      createdAt: new Date(),
      lastUsed: null,
      isActive: apiKeys.length === 0, // First key becomes active
      usage: {
        requests: 0,
        tokens: 0,
        cost: 0,
      },
    };

    try {
      await onAddKey(newKey);
      setKeyName('');
      setApiKey('');
      setEndpoint('');
      setAddKeyOpen(false);
    } catch (error) {
      console.error('Failed to add API key:', error);
    }
  }, [keyName, apiKey, selectedProvider, endpoint, apiKeys.length, validateKeyFormat, onAddKey]);

  // Handle editing key
  const handleEditKey = useCallback(async () => {
    if (!editingKey || !keyName.trim()) return;

    const updatedKey = {
      ...editingKey,
      name: keyName.trim(),
      endpoint: endpoint.trim() || null,
    };

    try {
      await onUpdateKey(updatedKey);
      setEditKeyOpen(false);
      setEditingKey(null);
      setKeyName('');
      setEndpoint('');
    } catch (error) {
      console.error('Failed to update API key:', error);
    }
  }, [editingKey, keyName, endpoint, onUpdateKey]);

  // Handle deleting key
  const handleDeleteKey = useCallback(async () => {
    if (!deletingKey) return;

    try {
      await onDeleteKey(deletingKey.id);
      setDeleteKeyOpen(false);
      setDeletingKey(null);
    } catch (error) {
      console.error('Failed to delete API key:', error);
    }
  }, [deletingKey, onDeleteKey]);

  // Handle testing key
  const handleTestKey = useCallback(async (key) => {
    setTestingKey(key.id);
    try {
      const result = await onTestKey(key);
      setKeyValidation(prev => ({
        ...prev,
        [key.id]: result
      }));
    } catch (error) {
      setKeyValidation(prev => ({
        ...prev,
        [key.id]: { valid: false, message: error.message }
      }));
    } finally {
      setTestingKey(null);
    }
  }, [onTestKey]);

  // Open edit dialog
  const openEditDialog = useCallback((key) => {
    setEditingKey(key);
    setKeyName(key.name);
    setEndpoint(key.endpoint || '');
    setEditKeyOpen(true);
  }, []);

  // Open delete dialog
  const openDeleteDialog = useCallback((key) => {
    setDeletingKey(key);
    setDeleteKeyOpen(true);
  }, []);

  // Toggle key visibility
  const toggleKeyVisibility = useCallback((keyId) => {
    setShowKey(prev => ({
      ...prev,
      [keyId]: !prev[keyId]
    }));
  }, []);

  // Mask API key
  const maskKey = useCallback((key) => {
    if (key.length <= 8) return '***';
    return key.substring(0, 4) + '***' + key.substring(key.length - 4);
  }, []);

  // Get provider config
  const getProviderConfig = useCallback((provider) => {
    return API_PROVIDERS[provider] || API_PROVIDERS.openai;
  }, []);

  // Calculate usage stats
  const getUsageStats = useCallback(() => {
    const totalRequests = apiKeys.reduce((sum, key) => sum + (key.usage?.requests || 0), 0);
    const totalTokens = apiKeys.reduce((sum, key) => sum + (key.usage?.tokens || 0), 0);
    const totalCost = apiKeys.reduce((sum, key) => sum + (key.usage?.cost || 0), 0);
    
    return { totalRequests, totalTokens, totalCost };
  }, [apiKeys]);

  const usageStats = getUsageStats();

  return (
    <ApiKeyContainer className={className}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <KeyIcon />
          <Typography variant="h4" sx={{ ml: 1, fontWeight: 500 }}>
            API Key Management
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddKeyOpen(true)}
          sx={{ borderRadius: 3 }}
        >
          Add API Key
        </Button>
      </Box>

      {/* Usage Overview */}
      <UsageChart sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Usage Overview
        </Typography>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary">
                {usageStats.totalRequests.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Requests
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="success.main">
                {usageStats.totalTokens.toLocaleString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Tokens
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={12} md={4}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                ${usageStats.totalCost.toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Cost
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </UsageChart>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <KeyIcon />
                API Keys ({apiKeys.length})
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <UsageIcon />
                Usage Analytics
              </Box>
            } 
          />
          <Tab 
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InfoIcon />
                Provider Guide
              </Box>
            } 
          />
        </Tabs>
      </Box>

      {/* API Keys Tab */}
      <TabPanel value={activeTab} index={0}>
        {apiKeys.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <KeyIcon />
            <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
              No API Keys Configured
            </Typography>
            <Typography variant="body2" sx={{ mb: 3 }}>
              Add your first API key to start using AI models. We securely encrypt and store your keys.
            </Typography>
            <Button 
              variant="contained" 
              startIcon={<AddIcon />}
              onClick={() => setAddKeyOpen(true)}
            >
              Add Your First API Key
            </Button>
          </Paper>
        ) : (
          <Box>
            {apiKeys.map((key) => {
              const config = getProviderConfig(key.provider);
              const validation = keyValidation[key.id];
              const isVisible = showKey[key.id];
              const isTesting = testingKey === key.id;
              
              return (
                <KeyCard 
                  key={key.id} 
                  isValid={validation?.valid}
                  isActive={key.isActive}
                >
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <ProviderLogo provider={key.provider}>
                          {config.icon}
                        </ProviderLogo>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" fontWeight={500}>
                              {key.name}
                            </Typography>
                            {key.isActive && (
                              <Chip label="Active" size="small" color="primary" />
                            )}
                            {validation?.valid === true && (
                              <Tooltip title="Key validated successfully">
                                <ValidIcon />
                              </Tooltip>
                            )}
                            {validation?.valid === false && (
                              <Tooltip title={validation.message}>
                                <InvalidIcon />
                              </Tooltip>
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {config.name} • {config.description}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Tooltip title={isTesting ? "Testing..." : "Test API Key"}>
                          <IconButton 
                            size="small" 
                            onClick={() => handleTestKey(key)}
                            disabled={isTesting}
                          >
                            {isTesting ? <RefreshIcon /> : <TestIcon />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit Key">
                          <IconButton size="small" onClick={() => openEditDialog(key)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Key">
                          <IconButton size="small" onClick={() => openDeleteDialog(key)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* API Key Display */}
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          API Key:
                        </Typography>
                        <Tooltip title={isVisible ? "Hide key" : "Show key"}>
                          <IconButton 
                            size="small" 
                            onClick={() => toggleKeyVisibility(key.id)}
                          >
                            {isVisible ? <HideIcon /> : <ViewIcon />}
                          </IconButton>
                        </Tooltip>
                      </Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontFamily: 'monospace', 
                          backgroundColor: '#f5f5f5', 
                          p: 1, 
                          borderRadius: 1,
                          border: '1px solid #dadce0'
                        }}
                      >
                        {isVisible ? key.key : maskKey(key.key)}
                      </Typography>
                      {key.endpoint && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Endpoint: {key.endpoint}
                          </Typography>
                        </Box>
                      )}
                    </Box>

                    {/* Usage Stats */}
                    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Requests
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {(key.usage?.requests || 0).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Tokens
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {(key.usage?.tokens || 0).toLocaleString()}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Cost
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          ${(key.usage?.cost || 0).toFixed(2)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Last Used
                        </Typography>
                        <Typography variant="body2" fontWeight={500}>
                          {key.lastUsed ? new Date(key.lastUsed).toLocaleDateString() : 'Never'}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Validation Message */}
                    {validation && !validation.valid && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        {validation.message}
                      </Alert>
                    )}
                  </CardContent>
                  
                  <CardActions>
                    <Button
                      size="small"
                      variant={key.isActive ? "outlined" : "contained"}
                      onClick={() => onSetActiveKey(key.id)}
                      disabled={key.isActive}
                    >
                      {key.isActive ? "Current Active Key" : "Set as Active"}
                    </Button>
                  </CardActions>
                </KeyCard>
              );
            })}
          </Box>
        )}
      </TabPanel>

      {/* Usage Analytics Tab */}
      <TabPanel value={activeTab} index={1}>
        <Grid container spacing={3}>
          {apiKeys.map((key) => {
            const config = getProviderConfig(key.provider);
            return (
              <Grid item xs={12} md={6} key={key.id}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <ProviderLogo provider={key.provider}>
                        {config.icon}
                      </ProviderLogo>
                      <Box>
                        <Typography variant="h6">{key.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          {config.name}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="h4" color="primary">
                          {(key.usage?.requests || 0).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Requests
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="h4" color="success.main">
                          {(key.usage?.tokens || 0).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Tokens
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="h5" color="warning.main">
                          ${(key.usage?.cost || 0).toFixed(2)}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Total Cost
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </TabPanel>

      {/* Provider Guide Tab */}
      <TabPanel value={activeTab} index={2}>
        <Grid container spacing={3}>
          {Object.entries(API_PROVIDERS).map(([providerId, config]) => (
            <Grid item xs={12} md={6} key={providerId}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <ProviderLogo provider={providerId}>
                      {config.icon}
                    </ProviderLogo>
                    <Box>
                      <Typography variant="h6">{config.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {config.description}
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    How to get your API key:
                  </Typography>
                  <List dense>
                    {config.instructions.map((instruction, index) => (
                      <ListItem key={index} sx={{ py: 0.5 }}>
                        <ListItemText
                          primary={`${index + 1}. ${instruction}`}
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Key format: {config.keyFormat}
                    </Typography>
                    <Link 
                      href={config.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      sx={{ color: '#4285f4' }}
                    >
                      Get API Key →
                    </Link>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </TabPanel>

      {/* Add Key Dialog */}
      <Dialog open={addKeyOpen} onClose={() => setAddKeyOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New API Key</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Provider</InputLabel>
                <Select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  label="Provider"
                >
                  {Object.entries(API_PROVIDERS).map(([providerId, config]) => (
                    <MenuItem key={providerId} value={providerId}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ProviderLogo provider={providerId} sx={{ width: 24, height: 24 }}>
                          {config.icon}
                        </ProviderLogo>
                        {config.name}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <SecureTextField
                fullWidth
                label="Key Name"
                value={keyName}
                onChange={(e) => setKeyName(e.target.value)}
                placeholder="e.g., My OpenAI Key"
                helperText="Give your key a memorable name"
              />
            </Grid>
            
            <Grid item xs={12}>
              <SecureTextField
                fullWidth
                label="API Key"
                type={showKey.new ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={getProviderConfig(selectedProvider).keyFormat}
                helperText={`Expected format: ${getProviderConfig(selectedProvider).keyFormat}`}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowKey(prev => ({ ...prev, new: !prev.new }))}
                        edge="end"
                      >
                        {showKey.new ? <HideIcon /> : <ViewIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            
            {selectedProvider === 'azure' && (
              <Grid item xs={12}>
                <SecureTextField
                  fullWidth
                  label="Endpoint URL"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://your-resource.openai.azure.com/"
                  helperText="Your Azure OpenAI endpoint URL"
                />
              </Grid>
            )}
          </Grid>
          
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              <SecurityIcon /> Your API key will be encrypted using AES-256 encryption before storage. 
              We never store keys in plaintext.
            </Typography>
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddKeyOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddKey}
            variant="contained"
            disabled={!keyName.trim() || !apiKey.trim() || loading}
          >
            {loading ? 'Adding...' : 'Add Key'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Key Dialog */}
      <Dialog open={editKeyOpen} onClose={() => setEditKeyOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit API Key</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1 }}>
            <SecureTextField
              fullWidth
              label="Key Name"
              value={keyName}
              onChange={(e) => setKeyName(e.target.value)}
              sx={{ mb: 2 }}
            />
            
            {editingKey?.provider === 'azure' && (
              <SecureTextField
                fullWidth
                label="Endpoint URL"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://your-resource.openai.azure.com/"
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditKeyOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleEditKey}
            variant="contained"
            disabled={!keyName.trim() || loading}
          >
            {loading ? 'Updating...' : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Key Dialog */}
      <Dialog open={deleteKeyOpen} onClose={() => setDeleteKeyOpen(false)}>
        <DialogTitle>Delete API Key</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the API key "{deletingKey?.name}"? 
            This action cannot be undone.
          </Typography>
          {deletingKey?.isActive && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              This is your active API key. Deleting it will disable AI functionality 
              until you set another key as active.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteKeyOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleDeleteKey}
            color="error"
            variant="contained"
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </ApiKeyContainer>
  );
};

export default ApiKeyManager; 