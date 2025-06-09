import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Container,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  Alert,
  Chip,
  AppBar,
  Toolbar,
  Switch,
  FormControlLabel,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import ApiKeyManager from '../components/ApiKeyManager';
import SecureKeyInput from '../components/SecureKeyInput';

// Icons using Unicode emojis
const KeyIcon = () => <span style={{ fontSize: '20px' }}>🔑</span>;
const SecurityIcon = () => <span style={{ fontSize: '16px' }}>🔒</span>;
const DemoIcon = () => <span style={{ fontSize: '16px' }}>🎭</span>;
const ProviderIcon = () => <span style={{ fontSize: '16px' }}>🏢</span>;
const ValidIcon = () => <span style={{ fontSize: '16px' }}>✅</span>;
const TestIcon = () => <span style={{ fontSize: '16px' }}>🧪</span>;
const EncryptIcon = () => <span style={{ fontSize: '16px' }}>🛡️</span>;
const UsageIcon = () => <span style={{ fontSize: '16px' }}>📊</span>;

// Styled components
const DemoContainer = styled(Box)(({ theme }) => ({
  backgroundColor: '#f5f5f5',
  minHeight: '100vh',
}));

const DemoHeader = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#fff',
  color: '#202124',
  boxShadow: '0 1px 3px rgba(60,64,67,0.3)',
}));

const FeatureCard = styled(Card)(({ theme }) => ({
  height: '100%',
  border: '1px solid #dadce0',
  transition: 'all 0.2s ease',
  '&:hover': {
    boxShadow: '0 4px 12px rgba(60,64,67,0.3)',
    transform: 'translateY(-2px)',
  },
}));

const DemoControls = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  border: '1px solid #dadce0',
}));

// Sample API keys for demo
const sampleApiKeys = [
  {
    id: '1',
    name: 'Production OpenAI Key',
    provider: 'openai',
    key: 'sk-1234567890abcdef1234567890abcdef1234567890abcdef',
    endpoint: null,
    createdAt: new Date('2024-01-15'),
    lastUsed: new Date('2024-02-10'),
    isActive: true,
    usage: {
      requests: 1250,
      tokens: 45000,
      cost: 23.75,
    },
  },
  {
    id: '2',
    name: 'Claude Development Key',
    provider: 'anthropic',
    key: 'sk-ant-api03-1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456',
    endpoint: null,
    createdAt: new Date('2024-01-20'),
    lastUsed: new Date('2024-02-08'),
    isActive: false,
    usage: {
      requests: 850,
      tokens: 32000,
      cost: 16.40,
    },
  },
  {
    id: '3',
    name: 'Google AI Studio Key',
    provider: 'google',
    key: 'AIzaSyA1234567890abcdef1234567890abcdef12',
    endpoint: null,
    createdAt: new Date('2024-02-01'),
    lastUsed: new Date('2024-02-09'),
    isActive: false,
    usage: {
      requests: 420,
      tokens: 15000,
      cost: 5.25,
    },
  },
  {
    id: '4',
    name: 'Azure OpenAI Enterprise',
    provider: 'azure',
    key: 'abc123def456ghi789jkl012mno345pqr678',
    endpoint: 'https://mycompany-openai.openai.azure.com/',
    createdAt: new Date('2024-02-05'),
    lastUsed: null,
    isActive: false,
    usage: {
      requests: 0,
      tokens: 0,
      cost: 0,
    },
  },
];

const ApiKeyDemo = () => {
  // State management
  const [demoMode, setDemoMode] = useState(true);
  const [apiKeys, setApiKeys] = useState(sampleApiKeys);
  const [loading, setLoading] = useState(false);
  const [testKeyValue, setTestKeyValue] = useState('');
  const [testKeyValidation, setTestKeyValidation] = useState({});

  // Demo configuration
  const [showFullDemo, setShowFullDemo] = useState(true);
  const [interactiveMode, setInteractiveMode] = useState(true);

  // Handlers for API key management
  const handleAddKey = useCallback(async (keyData) => {
    setLoading(true);
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    setApiKeys(prev => [...prev, keyData]);
    setLoading(false);
  }, []);

  const handleUpdateKey = useCallback(async (updatedKey) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setApiKeys(prev => prev.map(key => 
      key.id === updatedKey.id ? updatedKey : key
    ));
    setLoading(false);
  }, []);

  const handleDeleteKey = useCallback(async (keyId) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    
    setApiKeys(prev => prev.filter(key => key.id !== keyId));
    setLoading(false);
  }, []);

  const handleTestKey = useCallback(async (key) => {
    // Simulate key testing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Mock validation result based on key format
    const isValidFormat = key.provider === 'openai' && key.key.startsWith('sk-') ||
                         key.provider === 'anthropic' && key.key.startsWith('sk-ant-') ||
                         key.provider === 'google' && key.key.startsWith('AIza') ||
                         key.provider === 'azure';
    
    return {
      valid: isValidFormat,
      message: isValidFormat 
        ? 'API key validated successfully' 
        : 'Invalid key format or expired key',
      details: {
        provider: key.provider,
        modelsAvailable: isValidFormat ? ['model-1', 'model-2'] : [],
        quotaRemaining: isValidFormat ? 85 : 0,
      },
    };
  }, []);

  const handleSetActiveKey = useCallback(async (keyId) => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 300));
    
    setApiKeys(prev => prev.map(key => ({
      ...key,
      isActive: key.id === keyId,
    })));
    setLoading(false);
  }, []);

  // Calculate demo statistics
  const demoStats = {
    totalKeys: apiKeys.length,
    activeProviders: new Set(apiKeys.map(key => key.provider)).size,
    totalRequests: apiKeys.reduce((sum, key) => sum + key.usage.requests, 0),
    totalCost: apiKeys.reduce((sum, key) => sum + key.usage.cost, 0),
  };

  return (
    <DemoContainer>
      {/* Header */}
      <DemoHeader position="static" elevation={1}>
        <Toolbar>
          <KeyIcon />
          <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
            API Key Management - Security Demo
          </Typography>
          <FormControlLabel
            control={
              <Switch
                checked={demoMode}
                onChange={(e) => setDemoMode(e.target.checked)}
                size="small"
              />
            }
            label="Demo Mode"
          />
        </Toolbar>
      </DemoHeader>

      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Demo Controls */}
        {demoMode && (
          <DemoControls>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <DemoIcon />
              <Typography variant="h6" sx={{ ml: 1 }}>
                Demo Configuration
              </Typography>
            </Box>
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={showFullDemo}
                        onChange={(e) => setShowFullDemo(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Show Full Demo"
                  />
                  <FormControlLabel
                    control={
                      <Switch
                        checked={interactiveMode}
                        onChange={(e) => setInteractiveMode(e.target.checked)}
                        size="small"
                      />
                    }
                    label="Interactive Mode"
                  />
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                  <Chip 
                    label={`${demoStats.totalKeys} Keys`} 
                    size="small" 
                    color="primary" 
                  />
                  <Chip 
                    label={`${demoStats.activeProviders} Providers`} 
                    size="small" 
                    color="secondary" 
                  />
                  <Chip 
                    label={`${demoStats.totalRequests} Requests`} 
                    size="small" 
                    variant="outlined" 
                  />
                  <Chip 
                    label={`$${demoStats.totalCost.toFixed(2)} Cost`} 
                    size="small" 
                    variant="outlined" 
                  />
                </Box>
              </Grid>
            </Grid>
            
            {interactiveMode && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Interactive Demo:</strong> Try adding, editing, and testing API keys. 
                  All operations are simulated and no real API calls are made.
                </Typography>
              </Alert>
            )}
          </DemoControls>
        )}

        {/* Security Features Overview */}
        {showFullDemo && (
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12}>
              <Typography variant="h5" gutterBottom>
                🔒 Security Features
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FeatureCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <EncryptIcon />
                  <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>
                    AES-256 Encryption
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    All API keys are encrypted using industry-standard AES-256 
                    encryption before storage.
                  </Typography>
                </CardContent>
              </FeatureCard>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FeatureCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <SecurityIcon />
                  <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>
                    PBKDF2 Key Derivation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Uses PBKDF2 with salt for secure key derivation, 
                    protecting against rainbow table attacks.
                  </Typography>
                </CardContent>
              </FeatureCard>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FeatureCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <ValidIcon />
                  <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>
                    Format Validation
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Validates API key formats for each provider 
                    before storage and usage.
                  </Typography>
                </CardContent>
              </FeatureCard>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <FeatureCard>
                <CardContent sx={{ textAlign: 'center' }}>
                  <TestIcon />
                  <Typography variant="h6" sx={{ mt: 1, mb: 1 }}>
                    Live Testing
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Test API keys against provider endpoints 
                    to verify validity and permissions.
                  </Typography>
                </CardContent>
              </FeatureCard>
            </Grid>
          </Grid>
        )}

        {/* Secure Input Component Demo */}
        {showFullDemo && (
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              🔑 Secure Key Input Component
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Try entering different API key formats to see real-time validation and security assessment.
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <SecureKeyInput
                  value={testKeyValue}
                  onChange={(e) => setTestKeyValue(e.target.value)}
                  onValidationChange={setTestKeyValidation}
                  provider="openai"
                  label="Test OpenAI API Key"
                  placeholder="sk-..."
                  showStrength={true}
                  showSecurity={true}
                  allowCopy={true}
                  allowGenerate={true}
                />
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ p: 2, backgroundColor: '#f9f9f9', borderRadius: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Validation Results:
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemIcon>
                        {testKeyValidation.isValid ? <ValidIcon /> : '❌'}
                      </ListItemIcon>
                      <ListItemText 
                        primary="Format Valid"
                        secondary={testKeyValidation.isValid ? 'Yes' : 'No'}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>📊</ListItemIcon>
                      <ListItemText 
                        primary="Strength"
                        secondary={`${testKeyValidation.strength || 0}%`}
                      />
                    </ListItem>
                    <ListItem>
                      <ListItemIcon>🛡️</ListItemIcon>
                      <ListItemText 
                        primary="Security Level"
                        secondary={testKeyValidation.security || 'Unknown'}
                      />
                    </ListItem>
                  </List>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Supported Providers */}
        {showFullDemo && (
          <Paper sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              🏢 Supported AI Providers
            </Typography>
            <Grid container spacing={2}>
              {[
                { provider: 'openai', name: 'OpenAI', models: 'GPT-4, GPT-3.5, DALL-E' },
                { provider: 'anthropic', name: 'Anthropic', models: 'Claude 3 Opus, Sonnet, Haiku' },
                { provider: 'google', name: 'Google AI', models: 'Gemini Pro, Palm' },
                { provider: 'azure', name: 'Azure OpenAI', models: 'Enterprise GPT-4' },
              ].map((item) => (
                <Grid item xs={12} sm={6} md={3} key={item.provider}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 2 }}>
                      <Avatar sx={{ 
                        mx: 'auto', 
                        mb: 1, 
                        bgcolor: '#4285f4',
                        width: 40,
                        height: 40,
                      }}>
                        {item.name.charAt(0)}
                      </Avatar>
                      <Typography variant="subtitle2" fontWeight={500}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.models}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        )}

        {/* Main API Key Manager */}
        <Paper sx={{ overflow: 'hidden' }}>
          <ApiKeyManager
            apiKeys={apiKeys}
            onAddKey={handleAddKey}
            onUpdateKey={handleUpdateKey}
            onDeleteKey={handleDeleteKey}
            onTestKey={handleTestKey}
            onSetActiveKey={handleSetActiveKey}
            loading={loading}
          />
        </Paper>

        {/* Implementation Notes */}
        {showFullDemo && (
          <Paper sx={{ p: 3, mt: 4 }}>
            <Typography variant="h6" gutterBottom>
              🛠️ Implementation Highlights
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  Security Features
                </Typography>
                <List dense>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary="• AES-256 encryption for all stored keys"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary="• PBKDF2 key derivation with unique salts"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary="• No plaintext storage in database or logs"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary="• Real-time format validation and testing"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                </List>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" color="primary" gutterBottom>
                  User Experience
                </Typography>
                <List dense>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary="• Provider-specific validation and instructions"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary="• Usage analytics and cost tracking"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary="• Multiple provider support with unified interface"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                  <ListItem sx={{ py: 0.5 }}>
                    <ListItemText 
                      primary="• Responsive design with mobile support"
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                </List>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Container>
    </DemoContainer>
  );
};

export default ApiKeyDemo; 