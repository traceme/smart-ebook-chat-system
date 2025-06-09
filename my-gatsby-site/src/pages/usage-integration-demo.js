import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  AppBar,
  Toolbar,
  Paper,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  TextField,
  Slider,
} from '@mui/material';
import { styled } from '@mui/material/styles';

import UsageProvider from '../components/UsageProvider';
import GlobalUsageIndicator from '../components/GlobalUsageIndicator';
import UploadUsageGuard from '../components/UploadUsageGuard';
import UsageIndicator from '../components/UsageIndicator';

// Icons using Unicode emojis
const DashboardIcon = () => <span style={{ fontSize: '16px' }}>📊</span>;
const UploadIcon = () => <span style={{ fontSize: '16px' }}>📁</span>;
const ChatIcon = () => <span style={{ fontSize: '16px' }}>💬</span>;
const SearchIcon = () => <span style={{ fontSize: '16px' }}>🔍</span>;
const SettingsIcon = () => <span style={{ fontSize: '16px' }}>⚙️</span>;

// Styled components
const DemoSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  border: '1px solid #dadce0',
}));

const MockInterface = styled(Box)(({ theme }) => ({
  border: '2px dashed #dadce0',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2),
  backgroundColor: '#fafafa',
  minHeight: '200px',
}));

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`demo-tabpanel-${index}`}
    aria-labelledby={`demo-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const UsageIntegrationDemo = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [simulatedTier, setSimulatedTier] = useState('pro');
  const [simulatedStorage, setSimulatedStorage] = useState(650);
  const [simulatedTokens, setSimulatedTokens] = useState(75000);
  const [simulatedDocs, setSimulatedDocs] = useState(320);
  const [uploadFileSize, setUploadFileSize] = useState(25);
  const [uploadFileCount, setUploadFileCount] = useState(1);
  const [showDetailedBreakdown, setShowDetailedBreakdown] = useState(true);

  const handleUpgrade = () => {
    alert('Upgrade flow would open here');
  };

  const handleManageUsage = () => {
    alert('Usage management page would open here');
  };

  const simulateUsageSpike = () => {
    const spikes = {
      storage: Math.random() * 200,
      tokens: Math.random() * 25000,
      documents: Math.floor(Math.random() * 50),
    };
    
    setSimulatedStorage(prev => Math.min(prev + spikes.storage, 1000));
    setSimulatedTokens(prev => Math.min(prev + spikes.tokens, 100000));
    setSimulatedDocs(prev => Math.min(prev + spikes.documents, 500));
    
    alert(`Simulated usage spike: +${spikes.storage.toFixed(1)}MB storage, +${spikes.tokens.toFixed(0)} tokens, +${spikes.documents} documents`);
  };

  const resetUsage = () => {
    setSimulatedStorage(450);
    setSimulatedTokens(65000);
    setSimulatedDocs(35);
  };

  const MockUploadComponent = ({ onUploadAttempt, uploadAllowed, ...props }) => (
    <MockInterface>
      <Typography variant="h6" gutterBottom sx={{ textAlign: 'center' }}>
        📁 Mock File Upload Interface
      </Typography>
      
      <Box sx={{ textAlign: 'center', my: 3 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Drag and drop files here or click to browse
        </Typography>
        
        <Button
          variant="contained"
          disabled={!uploadAllowed}
          onClick={() => {
            if (onUploadAttempt && onUploadAttempt()) {
              alert(`Successfully uploaded ${uploadFileCount} file(s) (${uploadFileSize}MB total)`);
            }
          }}
          sx={{ mb: 2 }}
        >
          {uploadAllowed ? 'Upload Files' : 'Upload Blocked'}
        </Button>
        
        <Typography variant="caption" color="text.secondary" display="block">
          Status: {uploadAllowed ? '✅ Ready to upload' : '🚫 Quota exceeded'}
        </Typography>
      </Box>
    </MockInterface>
  );

  return (
    <UsageProvider 
      initialTier={simulatedTier}
      initialUsage={{
        storage: simulatedStorage,
        tokens: simulatedTokens,
        documents: simulatedDocs,
        lastUpdated: new Date(),
      }}
    >
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header with Global Usage Indicator */}
        <Box sx={{ mb: 4 }}>
          <AppBar position="static" color="default" elevation={0} sx={{ borderRadius: 1 }}>
            <Toolbar>
              <Typography variant="h6" sx={{ flexGrow: 1 }}>
                📚 Smart eBook Chat - Usage Integration Demo
              </Typography>
              <GlobalUsageIndicator 
                onUpgrade={handleUpgrade}
                onManageUsage={handleManageUsage}
              />
              <Button color="inherit" sx={{ ml: 2 }}>
                Account
              </Button>
            </Toolbar>
          </AppBar>
        </Box>

        {/* Demo Description */}
        <Alert severity="info" sx={{ mb: 4 }}>
          <Typography variant="body2">
            This demo showcases how usage indicators and quota guards are integrated throughout the application. 
            Try changing tier settings and usage levels to see how the system responds.
          </Typography>
        </Alert>

        {/* Simulation Controls */}
        <DemoSection>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            🎛️ Simulation Controls
          </Typography>
          
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Subscription Tier</InputLabel>
                <Select
                  value={simulatedTier}
                  onChange={(e) => setSimulatedTier(e.target.value)}
                  label="Subscription Tier"
                >
                  <MenuItem value="free">Free (100MB, 10K tokens)</MenuItem>
                  <MenuItem value="pro">Pro (1GB, 100K tokens)</MenuItem>
                  <MenuItem value="enterprise">Enterprise (10GB+, 1M+ tokens)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                onClick={simulateUsageSpike}
                sx={{ height: '56px' }}
              >
                Simulate Usage Spike
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <Button
                variant="outlined"
                fullWidth
                onClick={resetUsage}
                sx={{ height: '56px' }}
              >
                Reset Usage
              </Button>
            </Grid>
            
            <Grid item xs={12} sm={6} md={3}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showDetailedBreakdown}
                    onChange={(e) => setShowDetailedBreakdown(e.target.checked)}
                  />
                }
                label="Detailed Breakdown"
                sx={{ justifyContent: 'center', height: '56px' }}
              />
            </Grid>
          </Grid>

          {/* Usage Sliders */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Storage Usage: {simulatedStorage.toFixed(1)} MB
              </Typography>
              <Slider
                value={simulatedStorage}
                onChange={(e, newValue) => setSimulatedStorage(newValue)}
                min={0}
                max={simulatedTier === 'free' ? 100 : simulatedTier === 'pro' ? 1000 : 2000}
                step={10}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}MB`}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Token Usage: {simulatedTokens.toLocaleString()}
              </Typography>
              <Slider
                value={simulatedTokens}
                onChange={(e, newValue) => setSimulatedTokens(newValue)}
                min={0}
                max={simulatedTier === 'free' ? 10000 : simulatedTier === 'pro' ? 100000 : 200000}
                step={1000}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => value.toLocaleString()}
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Typography variant="subtitle2" gutterBottom>
                Documents: {simulatedDocs}
              </Typography>
              <Slider
                value={simulatedDocs}
                onChange={(e, newValue) => setSimulatedDocs(newValue)}
                min={0}
                max={simulatedTier === 'free' ? 50 : simulatedTier === 'pro' ? 500 : 1000}
                step={5}
                valueLabelDisplay="auto"
              />
            </Grid>
          </Grid>
        </DemoSection>

        {/* Integration Examples */}
        <Box sx={{ width: '100%' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
              <Tab label="Global Navigation" />
              <Tab label="Upload Interface" />
              <Tab label="Chat Interface" />
              <Tab label="Dashboard Views" />
            </Tabs>
          </Box>

          {/* Global Navigation Tab */}
          <TabPanel value={activeTab} index={0}>
            <DemoSection>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                🧭 Global Navigation Integration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Usage indicators integrated into application navigation and headers.
              </Typography>
              
              {/* Mock App Navigation */}
              <MockInterface>
                <AppBar position="static" color="default" elevation={0}>
                  <Toolbar>
                    <DashboardIcon />
                    <Typography variant="h6" sx={{ ml: 1, flexGrow: 1 }}>
                      Smart eBook Chat
                    </Typography>
                    
                    {/* Compact Usage Indicator */}
                    <GlobalUsageIndicator 
                      compact
                      onUpgrade={handleUpgrade}
                      onManageUsage={handleManageUsage}
                    />
                    
                    <Button color="inherit" sx={{ ml: 2 }}>
                      <SettingsIcon />
                    </Button>
                  </Toolbar>
                </AppBar>
                
                <Box sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
                    Click the usage indicator above to see detailed quota information
                  </Typography>
                </Box>
              </MockInterface>

              {/* Different Usage Indicator Variants */}
              <Grid container spacing={2} sx={{ mt: 3 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Sidebar Widget
                      </Typography>
                      <UsageIndicator
                        userTier={simulatedTier}
                        currentUsage={{
                          uploadUsed: simulatedStorage,
                          tokensUsed: simulatedTokens,
                          lastUpdated: new Date(),
                        }}
                        variant="detailed"
                        onUpgrade={handleUpgrade}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Inline Mini
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Typography variant="body2">Current usage:</Typography>
                        <UsageIndicator
                          userTier={simulatedTier}
                          currentUsage={{
                            uploadUsed: simulatedStorage,
                            tokensUsed: simulatedTokens,
                            lastUpdated: new Date(),
                          }}
                          variant="mini"
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Perfect for inline contexts and status displays
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Toolbar Compact
                      </Typography>
                      <Box sx={{ border: '1px solid #dadce0', borderRadius: 1, p: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Document Tools</Typography>
                          <UsageIndicator
                            userTier={simulatedTier}
                            currentUsage={{
                              uploadUsed: simulatedStorage,
                              tokensUsed: simulatedTokens,
                              lastUpdated: new Date(),
                            }}
                            variant="compact"
                            onUpgrade={handleUpgrade}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </DemoSection>
          </TabPanel>

          {/* Upload Interface Tab */}
          <TabPanel value={activeTab} index={1}>
            <DemoSection>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                📁 Upload Interface Integration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Contextual usage guards that check quotas before allowing file uploads.
              </Typography>
              
              {/* Upload Controls */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Upload File Size (MB)"
                    type="number"
                    value={uploadFileSize}
                    onChange={(e) => setUploadFileSize(Number(e.target.value))}
                    inputProps={{ min: 1, max: 500 }}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Number of Files"
                    type="number"
                    value={uploadFileCount}
                    onChange={(e) => setUploadFileCount(Number(e.target.value))}
                    inputProps={{ min: 1, max: 50 }}
                    fullWidth
                  />
                </Grid>
              </Grid>
              
              {/* Upload Guard Demo */}
              <UploadUsageGuard
                fileSize={uploadFileSize}
                fileCount={uploadFileCount}
                onUpgrade={handleUpgrade}
                onManageUsage={handleManageUsage}
                showDetailedBreakdown={showDetailedBreakdown}
              >
                <MockUploadComponent />
              </UploadUsageGuard>
            </DemoSection>
          </TabPanel>

          {/* Chat Interface Tab */}
          <TabPanel value={activeTab} index={2}>
            <DemoSection>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                💬 Chat Interface Integration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Token usage tracking and warnings in AI chat interfaces.
              </Typography>
              
              <MockInterface>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">
                    <ChatIcon /> AI Chat Assistant
                  </Typography>
                  <UsageIndicator
                    userTier={simulatedTier}
                    currentUsage={{
                      uploadUsed: simulatedStorage,
                      tokensUsed: simulatedTokens,
                      lastUpdated: new Date(),
                    }}
                    variant="compact"
                    showTokensOnly
                  />
                </Box>
                
                <Box sx={{ border: '1px solid #dadce0', borderRadius: 1, p: 2, mb: 2, minHeight: '120px' }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Chat conversation would appear here...
                  </Typography>
                  
                  <Box sx={{ bgcolor: '#f5f5f5', p: 1, borderRadius: 1, mb: 1 }}>
                    <Typography variant="body2">
                      <strong>You:</strong> Summarize this document for me
                    </Typography>
                  </Box>
                  
                  <Box sx={{ bgcolor: '#e3f2fd', p: 1, borderRadius: 1 }}>
                    <Typography variant="body2">
                      <strong>AI:</strong> I'll analyze the document and provide a summary. This will use approximately 150 tokens.
                    </Typography>
                  </Box>
                </Box>
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <TextField 
                    placeholder="Type your message..." 
                    variant="outlined" 
                    size="small"
                    sx={{ flexGrow: 1 }}
                  />
                  <Button variant="contained" size="small">
                    Send
                  </Button>
                </Box>
                
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Estimated tokens for this message: ~50 tokens
                </Typography>
              </MockInterface>
            </DemoSection>
          </TabPanel>

          {/* Dashboard Views Tab */}
          <TabPanel value={activeTab} index={3}>
            <DemoSection>
              <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                📊 Dashboard Integration
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Usage displays integrated into dashboard and settings pages.
              </Typography>
              
              <Grid container spacing={3}>
                {/* Main Dashboard */}
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Main Dashboard
                      </Typography>
                      
                      <Box sx={{ border: '1px solid #dadce0', borderRadius: 1, p: 2, mb: 2 }}>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          Recent documents, search results, etc...
                        </Typography>
                        
                        <List dense>
                          <ListItem>
                            <ListItemIcon><SearchIcon /></ListItemIcon>
                            <ListItemText primary="Search Results" secondary="Updated 2 hours ago" />
                          </ListItem>
                          <ListItem>
                            <ListItemIcon><UploadIcon /></ListItemIcon>
                            <ListItemText primary="Recent Uploads" secondary="5 documents today" />
                          </ListItem>
                        </List>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
                
                {/* Usage Sidebar */}
                <Grid item xs={12} md={4}>
                  <UsageIndicator
                    userTier={simulatedTier}
                    currentUsage={{
                      uploadUsed: simulatedStorage,
                      tokensUsed: simulatedTokens,
                      lastUpdated: new Date(),
                    }}
                    variant="detailed"
                    onUpgrade={handleUpgrade}
                  />
                </Grid>
              </Grid>
            </DemoSection>
          </TabPanel>
        </Box>

        {/* Integration Features Summary */}
        <DemoSection>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            ✨ Integration Features
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🌐 Global Indicators
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Header integration" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Real-time updates" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Severity-based alerts" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Quick action buttons" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    🛡️ Contextual Guards
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Pre-action validation" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Usage predictions" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Upgrade prompts" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Graceful blocking" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    📢 Smart Notifications
                  </Typography>
                  <List dense>
                    <ListItem>
                      <ListItemText primary="Threshold-based alerts" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Progressive warnings" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Auto-dismissal" />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Action suggestions" />
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </DemoSection>

        {/* Back to Home */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Button 
            variant="outlined" 
            size="large"
            onClick={() => window.location.href = '/'}
          >
            ← Back to Component Demos
          </Button>
        </Box>
      </Container>
    </UsageProvider>
  );
};

export default UsageIntegrationDemo; 