import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  FormControl,
  FormControlLabel,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Grid,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  Snackbar,
  RadioGroup,
  Radio,
  Slider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Person as PersonIcon,
  Palette as ThemeIcon,
  Notifications as NotificationIcon,
  Language as LanguageIcon,
  Keyboard as KeyboardIcon,
  Psychology as ModelIcon,
  Key as ApiKeyIcon,
  Description as DocumentIcon,
  Search as SearchIcon,
  Share as ShareIcon,
  Save as SaveIcon,
  Restore as RestoreIcon,
  Import as ImportIcon,
  Export as ExportIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Styled components
const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`settings-tabpanel-${index}`}
    {...other}
  >
    {value === index && (
      <Box sx={{ p: 3 }}>
        {children}
      </Box>
    )}
  </div>
);

const SettingsSection = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  '& .MuiCardHeader-root': {
    backgroundColor: theme.palette.grey[50],
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));

const ApiKeyField = styled(TextField)(({ theme }) => ({
  '& .MuiInputBase-input': {
    fontFamily: 'monospace',
    fontSize: '0.875rem',
  },
}));

// Default settings
const defaultSettings = {
  user: {
    name: 'John Doe',
    email: 'john.doe@example.com',
    language: 'en',
    timezone: 'UTC',
    dateFormat: 'MM/DD/YYYY',
  },
  theme: {
    mode: 'light',
    primaryColor: '#1976d2',
    fontSize: 'medium',
    density: 'comfortable',
  },
  notifications: {
    enabled: true,
    documentProcessed: true,
    documentFailed: true,
    newFeatures: true,
    usageAlerts: true,
    email: true,
    browser: true,
    sound: false,
  },
  keyboard: {
    enabled: true,
    shortcuts: {
      'ctrl+k': 'Search',
      'ctrl+u': 'Upload',
      'ctrl+n': 'New Chat',
      'ctrl+s': 'Save',
      'ctrl+/': 'Help',
    },
  },
  models: {
    default: 'gpt-4',
    temperature: 0.7,
    maxTokens: 2048,
    topP: 1.0,
    provider: 'openai',
  },
  apiKeys: {
    openai: '',
    anthropic: '',
    google: '',
    perplexity: '',
  },
  processing: {
    autoProcess: true,
    extractMetadata: true,
    generateSummary: true,
    enableOcr: true,
    maxFileSize: 50,
    chunkSize: 1000,
    chunkOverlap: 200,
  },
  search: {
    defaultProvider: 'vector',
    maxResults: 20,
    enableSuggestions: true,
    highlightResults: true,
    searchHistory: true,
    recentSearches: 10,
  },
  sharing: {
    allowPublicSharing: false,
    defaultExpiration: '7d',
    requireAuth: true,
    allowDownload: true,
  },
};

const AVAILABLE_MODELS = [
  { id: 'gpt-4', name: 'GPT-4', provider: 'openai', description: 'Most capable OpenAI model' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', description: 'Fast and efficient' },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'anthropic', description: 'Most powerful Claude model' },
  { id: 'claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'anthropic', description: 'Balanced performance' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'google', description: 'Google\'s advanced model' },
];

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
];

const SettingsManager = ({ onSettingsChange }) => {
  const [tabValue, setTabValue] = useState(0);
  const [settings, setSettings] = useState(defaultSettings);
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState({});
  const [notification, setNotification] = useState({ open: false, message: '', severity: 'info' });
  const [confirmDialog, setConfirmDialog] = useState({ open: false, title: '', message: '', action: null });

  // Load settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (error) {
        console.error('Failed to load settings:', error);
        showNotification('Failed to load settings, using defaults', 'warning');
      }
    }
  }, []);

  // Handle setting changes
  const handleSettingChange = useCallback((category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value,
      },
    }));
    setUnsavedChanges(true);
  }, []);

  // Save settings
  const saveSettings = useCallback(() => {
    try {
      localStorage.setItem('app-settings', JSON.stringify(settings));
      setUnsavedChanges(false);
      showNotification('Settings saved successfully', 'success');
      
      if (onSettingsChange) {
        onSettingsChange(settings);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
      showNotification('Failed to save settings', 'error');
    }
  }, [settings, onSettingsChange]);

  // Reset settings
  const resetSettings = () => {
    setConfirmDialog({
      open: true,
      title: 'Reset Settings',
      message: 'Are you sure you want to reset all settings to default values? This action cannot be undone.',
      action: () => {
        setSettings(defaultSettings);
        setUnsavedChanges(true);
        showNotification('Settings reset to defaults', 'info');
      },
    });
  };

  // Toggle API key visibility
  const toggleApiKeyVisibility = (provider) => {
    setShowApiKeys(prev => ({
      ...prev,
      [provider]: !prev[provider],
    }));
  };

  // Show notification
  const showNotification = (message, severity = 'info') => {
    setNotification({ open: true, message, severity });
  };

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
            ⚙️ Settings & Preferences
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Customize your experience and configure application settings
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            startIcon={<RestoreIcon />}
            onClick={resetSettings}
            variant="outlined"
            color="warning"
            size="small"
          >
            Reset
          </Button>
          
          <Button
            startIcon={<SaveIcon />}
            onClick={saveSettings}
            variant="contained"
            disabled={!unsavedChanges}
            size="small"
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      {/* Unsaved changes warning */}
      {unsavedChanges && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          You have unsaved changes. Don't forget to save your settings!
        </Alert>
      )}

      {/* Settings Tabs */}
      <Paper sx={{ width: '100%' }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab icon={<PersonIcon />} label="Profile" />
          <Tab icon={<ThemeIcon />} label="Appearance" />
          <Tab icon={<NotificationIcon />} label="Notifications" />
          <Tab icon={<KeyboardIcon />} label="Shortcuts" />
          <Tab icon={<ModelIcon />} label="AI Models" />
          <Tab icon={<ApiKeyIcon />} label="API Keys" />
          <Tab icon={<DocumentIcon />} label="Processing" />
          <Tab icon={<SearchIcon />} label="Search" />
          <Tab icon={<ShareIcon />} label="Sharing" />
        </Tabs>

        {/* Profile Settings */}
        <TabPanel value={tabValue} index={0}>
          <SettingsSection>
            <CardHeader
              avatar={<PersonIcon />}
              title="User Profile"
              subheader="Manage your personal information and preferences"
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Full Name"
                    value={settings.user.name}
                    onChange={(e) => handleSettingChange('user', 'name', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    value={settings.user.email}
                    onChange={(e) => handleSettingChange('user', 'email', e.target.value)}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={settings.user.language}
                      label="Language"
                      onChange={(e) => handleSettingChange('user', 'language', e.target.value)}
                    >
                      {LANGUAGES.map((lang) => (
                        <MenuItem key={lang.code} value={lang.code}>
                          {lang.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Date Format</InputLabel>
                    <Select
                      value={settings.user.dateFormat}
                      label="Date Format"
                      onChange={(e) => handleSettingChange('user', 'dateFormat', e.target.value)}
                    >
                      <MenuItem value="MM/DD/YYYY">MM/DD/YYYY</MenuItem>
                      <MenuItem value="DD/MM/YYYY">DD/MM/YYYY</MenuItem>
                      <MenuItem value="YYYY-MM-DD">YYYY-MM-DD</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </SettingsSection>
        </TabPanel>

        {/* Appearance Settings */}
        <TabPanel value={tabValue} index={1}>
          <SettingsSection>
            <CardHeader
              avatar={<ThemeIcon />}
              title="Theme & Appearance"
              subheader="Customize the look and feel of the application"
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <Typography variant="h6" gutterBottom>
                    Theme Mode
                  </Typography>
                  <RadioGroup
                    value={settings.theme.mode}
                    onChange={(e) => handleSettingChange('theme', 'mode', e.target.value)}
                    row
                  >
                    <FormControlLabel value="light" control={<Radio />} label="Light" />
                    <FormControlLabel value="dark" control={<Radio />} label="Dark" />
                    <FormControlLabel value="auto" control={<Radio />} label="Auto" />
                  </RadioGroup>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom>
                    Font Size
                  </Typography>
                  <RadioGroup
                    value={settings.theme.fontSize}
                    onChange={(e) => handleSettingChange('theme', 'fontSize', e.target.value)}
                  >
                    <FormControlLabel value="small" control={<Radio />} label="Small" />
                    <FormControlLabel value="medium" control={<Radio />} label="Medium" />
                    <FormControlLabel value="large" control={<Radio />} label="Large" />
                  </RadioGroup>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="body2" gutterBottom>
                    Interface Density
                  </Typography>
                  <RadioGroup
                    value={settings.theme.density}
                    onChange={(e) => handleSettingChange('theme', 'density', e.target.value)}
                  >
                    <FormControlLabel value="compact" control={<Radio />} label="Compact" />
                    <FormControlLabel value="comfortable" control={<Radio />} label="Comfortable" />
                    <FormControlLabel value="spacious" control={<Radio />} label="Spacious" />
                  </RadioGroup>
                </Grid>
              </Grid>
            </CardContent>
          </SettingsSection>
        </TabPanel>

        {/* Notifications Settings */}
        <TabPanel value={tabValue} index={2}>
          <SettingsSection>
            <CardHeader
              avatar={<NotificationIcon />}
              title="Notifications"
              subheader="Control when and how you receive notifications"
            />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.notifications.enabled}
                    onChange={(e) => handleSettingChange('notifications', 'enabled', e.target.checked)}
                  />
                }
                label="Enable notifications"
                sx={{ mb: 2 }}
              />
              
              {settings.notifications.enabled && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Notification Types
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText primary="Document processed successfully" />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.notifications.documentProcessed}
                          onChange={(e) => handleSettingChange('notifications', 'documentProcessed', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Document processing failed" />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.notifications.documentFailed}
                          onChange={(e) => handleSettingChange('notifications', 'documentFailed', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="New features and updates" />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.notifications.newFeatures}
                          onChange={(e) => handleSettingChange('notifications', 'newFeatures', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Usage limit alerts" />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.notifications.usageAlerts}
                          onChange={(e) => handleSettingChange('notifications', 'usageAlerts', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </Box>
              )}
            </CardContent>
          </SettingsSection>
        </TabPanel>

        {/* Keyboard Shortcuts */}
        <TabPanel value={tabValue} index={3}>
          <SettingsSection>
            <CardHeader
              avatar={<KeyboardIcon />}
              title="Keyboard Shortcuts"
              subheader="Configure keyboard shortcuts for quick actions"
            />
            <CardContent>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.keyboard.enabled}
                    onChange={(e) => handleSettingChange('keyboard', 'enabled', e.target.checked)}
                  />
                }
                label="Enable keyboard shortcuts"
                sx={{ mb: 2 }}
              />
              
              {settings.keyboard.enabled && (
                <List>
                  {Object.entries(settings.keyboard.shortcuts).map(([key, action]) => (
                    <ListItem key={key}>
                      <ListItemText
                        primary={action}
                        secondary={
                          <Box sx={{ 
                            display: 'inline-flex',
                            alignItems: 'center',
                            padding: '4px 8px',
                            backgroundColor: 'grey.100',
                            borderRadius: 1,
                            fontFamily: 'monospace',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                          }}>
                            {key.replace('ctrl', 'Ctrl').replace('shift', 'Shift')}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              )}
            </CardContent>
          </SettingsSection>
        </TabPanel>

        {/* AI Models Settings */}
        <TabPanel value={tabValue} index={4}>
          <SettingsSection>
            <CardHeader
              avatar={<ModelIcon />}
              title="AI Model Configuration"
              subheader="Configure default AI model and parameters"
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Default Model</InputLabel>
                    <Select
                      value={settings.models.default}
                      label="Default Model"
                      onChange={(e) => handleSettingChange('models', 'default', e.target.value)}
                    >
                      {AVAILABLE_MODELS.map((model) => (
                        <MenuItem key={model.id} value={model.id}>
                          <Box>
                            <Typography variant="body2">{model.name}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {model.description}
                            </Typography>
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Tokens"
                    type="number"
                    value={settings.models.maxTokens}
                    onChange={(e) => handleSettingChange('models', 'maxTokens', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 8192 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" gutterBottom>
                    Temperature: {settings.models.temperature}
                  </Typography>
                  <Slider
                    value={settings.models.temperature}
                    onChange={(e, value) => handleSettingChange('models', 'temperature', value)}
                    min={0}
                    max={2}
                    step={0.1}
                    marks={[
                      { value: 0, label: '0' },
                      { value: 1, label: '1' },
                      { value: 2, label: '2' },
                    ]}
                  />
                  <Typography variant="caption" color="text.secondary">
                    Controls randomness in responses
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </SettingsSection>
        </TabPanel>

        {/* API Keys */}
        <TabPanel value={tabValue} index={5}>
          <SettingsSection>
            <CardHeader
              avatar={<ApiKeyIcon />}
              title="API Key Management"
              subheader="Manage your API keys for different AI providers"
            />
            <CardContent>
              <Alert severity="info" sx={{ mb: 3 }}>
                API keys are stored locally in your browser and never sent to our servers.
              </Alert>
              
              <Grid container spacing={3}>
                {Object.entries(settings.apiKeys).map(([provider, key]) => (
                  <Grid item xs={12} key={provider}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ApiKeyField
                        fullWidth
                        label={`${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key`}
                        type={showApiKeys[provider] ? 'text' : 'password'}
                        value={key}
                        onChange={(e) => handleSettingChange('apiKeys', provider, e.target.value)}
                        placeholder="sk-..."
                        InputProps={{
                          endAdornment: (
                            <IconButton
                              onClick={() => toggleApiKeyVisibility(provider)}
                              edge="end"
                            >
                              {showApiKeys[provider] ? <VisibilityOffIcon /> : <VisibilityIcon />}
                            </IconButton>
                          ),
                        }}
                      />
                      <Chip
                        label={key ? 'Set' : 'Not Set'}
                        color={key ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </SettingsSection>
        </TabPanel>

        {/* Processing Settings */}
        <TabPanel value={tabValue} index={6}>
          <SettingsSection>
            <CardHeader
              avatar={<DocumentIcon />}
              title="Document Processing"
              subheader="Configure how documents are processed and indexed"
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Auto-process uploaded documents"
                        secondary="Automatically start processing when documents are uploaded"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.processing.autoProcess}
                          onChange={(e) => handleSettingChange('processing', 'autoProcess', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Extract metadata"
                        secondary="Extract author, title, and other metadata from documents"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.processing.extractMetadata}
                          onChange={(e) => handleSettingChange('processing', 'extractMetadata', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Generate summaries"
                        secondary="Create AI-generated summaries for processed documents"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.processing.generateSummary}
                          onChange={(e) => handleSettingChange('processing', 'generateSummary', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Enable OCR"
                        secondary="Extract text from images and scanned documents"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.processing.enableOcr}
                          onChange={(e) => handleSettingChange('processing', 'enableOcr', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max File Size (MB)"
                    type="number"
                    value={settings.processing.maxFileSize}
                    onChange={(e) => handleSettingChange('processing', 'maxFileSize', parseInt(e.target.value))}
                    inputProps={{ min: 1, max: 100 }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Chunk Size"
                    type="number"
                    value={settings.processing.chunkSize}
                    onChange={(e) => handleSettingChange('processing', 'chunkSize', parseInt(e.target.value))}
                    inputProps={{ min: 100, max: 4000 }}
                    helperText="Size of text chunks for vector indexing"
                  />
                </Grid>
              </Grid>
            </CardContent>
          </SettingsSection>
        </TabPanel>

        {/* Search Settings */}
        <TabPanel value={tabValue} index={7}>
          <SettingsSection>
            <CardHeader
              avatar={<SearchIcon />}
              title="Search Configuration"
              subheader="Configure search behavior and preferences"
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Default Search Provider</InputLabel>
                    <Select
                      value={settings.search.defaultProvider}
                      label="Default Search Provider"
                      onChange={(e) => handleSettingChange('search', 'defaultProvider', e.target.value)}
                    >
                      <MenuItem value="vector">Vector Search</MenuItem>
                      <MenuItem value="keyword">Keyword Search</MenuItem>
                      <MenuItem value="hybrid">Hybrid Search</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="Max Results"
                    type="number"
                    value={settings.search.maxResults}
                    onChange={(e) => handleSettingChange('search', 'maxResults', parseInt(e.target.value))}
                    inputProps={{ min: 5, max: 100 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Enable search suggestions"
                        secondary="Show search suggestions as you type"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.search.enableSuggestions}
                          onChange={(e) => handleSettingChange('search', 'enableSuggestions', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Highlight search results"
                        secondary="Highlight matching terms in search results"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.search.highlightResults}
                          onChange={(e) => handleSettingChange('search', 'highlightResults', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </CardContent>
          </SettingsSection>
        </TabPanel>

        {/* Sharing Settings */}
        <TabPanel value={tabValue} index={8}>
          <SettingsSection>
            <CardHeader
              avatar={<ShareIcon />}
              title="Sharing & Export"
              subheader="Configure sharing permissions and export options"
            />
            <CardContent>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <List>
                    <ListItem>
                      <ListItemText
                        primary="Allow public sharing"
                        secondary="Enable sharing documents with public links"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.sharing.allowPublicSharing}
                          onChange={(e) => handleSettingChange('sharing', 'allowPublicSharing', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Require authentication"
                        secondary="Require users to log in before accessing shared content"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.sharing.requireAuth}
                          onChange={(e) => handleSettingChange('sharing', 'requireAuth', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    <ListItem>
                      <ListItemText
                        primary="Allow downloads"
                        secondary="Allow users to download shared documents"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={settings.sharing.allowDownload}
                          onChange={(e) => handleSettingChange('sharing', 'allowDownload', e.target.checked)}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth>
                    <InputLabel>Default Expiration</InputLabel>
                    <Select
                      value={settings.sharing.defaultExpiration}
                      label="Default Expiration"
                      onChange={(e) => handleSettingChange('sharing', 'defaultExpiration', e.target.value)}
                    >
                      <MenuItem value="1d">1 day</MenuItem>
                      <MenuItem value="7d">7 days</MenuItem>
                      <MenuItem value="30d">30 days</MenuItem>
                      <MenuItem value="never">Never</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </SettingsSection>
        </TabPanel>
      </Paper>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
      >
        <DialogTitle>{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <Typography>{confirmDialog.message}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              confirmDialog.action?.();
              setConfirmDialog({ ...confirmDialog, open: false });
            }}
            color="warning"
            variant="contained"
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={4000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
          severity={notification.severity}
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default SettingsManager; 