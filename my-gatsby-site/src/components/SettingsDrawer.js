import React, { useState } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Switch,
  FormControl,
  FormControlLabel,
  FormGroup,
  TextField,
  Button,
  Divider,
  Card,
  CardContent,
  Select,
  MenuItem,
  InputLabel,
  Slider,
  Alert,
  Chip,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Icons
const CloseIcon = () => <span style={{ fontSize: '18px' }}>✕</span>;
const SettingsIcon = () => <span style={{ fontSize: '18px' }}>⚙️</span>;
const UserIcon = () => <span style={{ fontSize: '18px' }}>👤</span>;
const NotificationIcon = () => <span style={{ fontSize: '18px' }}>🔔</span>;
const DisplayIcon = () => <span style={{ fontSize: '18px' }}>🎨</span>;
const SecurityIcon = () => <span style={{ fontSize: '18px' }}>🔒</span>;

// Styled components
const DrawerHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(2),
  borderBottom: '1px solid #dadce0',
  backgroundColor: '#f8f9fa',
}));

const TabPanel = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const SettingsSection = ({ title, children }) => (
  <Card sx={{ mb: 2 }}>
    <CardContent>
      <Typography variant="h6" sx={{ mb: 2, fontSize: '16px', fontWeight: 500 }}>
        {title}
      </Typography>
      {children}
    </CardContent>
  </Card>
);

const SettingsDrawer = ({
  open = false,
  onClose = () => {},
  anchor = 'right',
  userSettings = {},
  onSettingsChange = () => {},
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [activeTab, setActiveTab] = useState(0);
  const [localSettings, setLocalSettings] = useState({
    displayName: userSettings.displayName || 'John Doe',
    email: userSettings.email || 'john.doe@example.com',
    bio: userSettings.bio || '',
    emailNotifications: userSettings.emailNotifications ?? true,
    pushNotifications: userSettings.pushNotifications ?? true,
    theme: userSettings.theme || 'light',
    compactView: userSettings.compactView ?? false,
    sidebarWidth: userSettings.sidebarWidth || 280,
  });

  const drawerWidth = isMobile ? '100%' : 400;

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSettingChange = (setting, value) => {
    setLocalSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    onClose();
  };

  return (
    <Drawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      variant="temporary"
      sx={{
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          maxWidth: '100vw',
        },
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <DrawerHeader>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            <Typography variant="h6" sx={{ fontSize: '18px', fontWeight: 500 }}>
              Settings
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </DrawerHeader>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs 
            value={activeTab} 
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ minHeight: '48px' }}
          >
            <Tab 
              icon={<UserIcon />} 
              label="Profile" 
              sx={{ minHeight: '48px', fontSize: '12px' }}
            />
            <Tab 
              icon={<NotificationIcon />} 
              label="Notifications" 
              sx={{ minHeight: '48px', fontSize: '12px' }}
            />
            <Tab 
              icon={<DisplayIcon />} 
              label="Display" 
              sx={{ minHeight: '48px', fontSize: '12px' }}
            />
            <Tab 
              icon={<SecurityIcon />} 
              label="Security" 
              sx={{ minHeight: '48px', fontSize: '12px' }}
            />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          {/* Profile Tab */}
          <TabPanel value={activeTab} index={0}>
            <SettingsSection title="👤 Profile Information">
              <FormGroup>
                <TextField
                  label="Display Name"
                  value={localSettings.displayName}
                  onChange={(e) => handleSettingChange('displayName', e.target.value)}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={localSettings.email}
                  onChange={(e) => handleSettingChange('email', e.target.value)}
                  size="small"
                  sx={{ mb: 2 }}
                />
                <TextField
                  label="Bio"
                  multiline
                  rows={3}
                  value={localSettings.bio}
                  onChange={(e) => handleSettingChange('bio', e.target.value)}
                  placeholder="Tell us about yourself..."
                  size="small"
                />
              </FormGroup>
            </SettingsSection>

            <SettingsSection title="📊 Usage Statistics">
              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#1a73e8' }}>47</Typography>
                  <Typography variant="caption" color="text.secondary">Documents</Typography>
                </Box>
                <Box sx={{ textAlign: 'center', p: 2, backgroundColor: '#f8f9fa', borderRadius: 1 }}>
                  <Typography variant="h4" sx={{ fontWeight: 600, color: '#0f9d58' }}>23</Typography>
                  <Typography variant="caption" color="text.secondary">Conversations</Typography>
                </Box>
              </Box>
            </SettingsSection>
          </TabPanel>

          {/* Notifications Tab */}
          <TabPanel value={activeTab} index={1}>
            <SettingsSection title="📧 Email Notifications">
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.emailNotifications}
                      onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                    />
                  }
                  label="Email notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={localSettings.pushNotifications}
                      onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                    />
                  }
                  label="Push notifications"
                />
              </FormGroup>
            </SettingsSection>
          </TabPanel>

          {/* Display Tab */}
          <TabPanel value={activeTab} index={2}>
            <SettingsSection title="🎨 Appearance">
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                <InputLabel>Theme</InputLabel>
                <Select
                  value={localSettings.theme}
                  onChange={(e) => handleSettingChange('theme', e.target.value)}
                  label="Theme"
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="auto">Auto (System)</MenuItem>
                </Select>
              </FormControl>

              <FormControlLabel
                control={
                  <Switch
                    checked={localSettings.compactView}
                    onChange={(e) => handleSettingChange('compactView', e.target.checked)}
                  />
                }
                label="Compact view"
              />
            </SettingsSection>

            <SettingsSection title="📐 Layout">
              <Typography variant="body2" sx={{ mb: 2 }}>
                Sidebar Width: {localSettings.sidebarWidth}px
              </Typography>
              <Slider
                value={localSettings.sidebarWidth}
                onChange={(e, value) => handleSettingChange('sidebarWidth', value)}
                min={200}
                max={400}
                step={20}
                marks={[
                  { value: 200, label: '200px' },
                  { value: 280, label: '280px' },
                  { value: 400, label: '400px' },
                ]}
              />
            </SettingsSection>
          </TabPanel>

          {/* Security Tab */}
          <TabPanel value={activeTab} index={3}>
            <SettingsSection title="🔒 Security">
              <Alert severity="info" sx={{ mb: 2 }}>
                Your data is protected with end-to-end encryption.
              </Alert>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip label="🔄 Auto-backup enabled" size="small" color="success" />
                <Chip label="🔐 2FA Available" size="small" />
              </Box>
            </SettingsSection>
          </TabPanel>
        </Box>

        {/* Footer */}
        <Box sx={{ p: 2, borderTop: '1px solid #dadce0', backgroundColor: '#f8f9fa' }}>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={onClose} size="small">
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSave} size="small">
              Save Changes
            </Button>
          </Box>
        </Box>
      </Box>
    </Drawer>
  );
};

export default SettingsDrawer; 