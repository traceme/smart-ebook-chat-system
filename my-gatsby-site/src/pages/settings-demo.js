import React from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import SettingsManager from '../components/SettingsManager';
import Layout from '../components/layout';

const SettingsDemo = () => {
  const handleSettingsChange = (newSettings) => {
    console.log('Settings changed:', newSettings);
    // In a real app, this would sync with your application state
  };

  return (
    <Layout>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            ⚙️ Settings & Preferences Demo
          </Typography>
          <Typography variant="h6" color="text.secondary" paragraph>
            Comprehensive settings interface for user preferences, model configuration, and application settings.
          </Typography>
          
          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              ✨ Key Features:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1 } }}>
              <li><strong>User Profile:</strong> Personal information, language, timezone, and date format preferences</li>
              <li><strong>Theme & Appearance:</strong> Light/dark mode, font size, and interface density settings</li>
              <li><strong>Notifications:</strong> Granular control over notification types and delivery methods</li>
              <li><strong>Keyboard Shortcuts:</strong> View and configure keyboard shortcuts for quick actions</li>
              <li><strong>AI Model Configuration:</strong> Default model selection, temperature, and token limits</li>
              <li><strong>API Key Management:</strong> Secure storage and management of provider API keys</li>
              <li><strong>Document Processing:</strong> Auto-processing, metadata extraction, OCR, and chunking settings</li>
              <li><strong>Search Configuration:</strong> Search provider, result limits, and behavior preferences</li>
              <li><strong>Sharing & Security:</strong> Public sharing permissions and expiration settings</li>
              <li><strong>Settings Persistence:</strong> Local storage with import/export capabilities</li>
              <li><strong>Reset & Recovery:</strong> Reset to defaults with confirmation dialogs</li>
              <li><strong>Real-time Updates:</strong> Immediate application of theme and preference changes</li>
            </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              🎯 How to Use:
            </Typography>
            <Box component="ol" sx={{ pl: 3, '& li': { mb: 1 } }}>
              <li>Navigate through the different settings tabs to explore all options</li>
              <li>Update your profile information in the Profile tab</li>
              <li>Choose your preferred theme and appearance settings</li>
              <li>Configure notification preferences for different events</li>
              <li>View available keyboard shortcuts in the Shortcuts tab</li>
              <li>Set up your preferred AI model and parameters</li>
              <li>Add your API keys for different AI providers (stored locally)</li>
              <li>Configure document processing and search preferences</li>
              <li>Set sharing permissions and default expiration times</li>
              <li>Click "Save Changes" to persist your settings</li>
              <li>Use "Reset" to restore all settings to defaults</li>
            </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              🔐 Security & Privacy:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1 } }}>
              <li>All settings are stored locally in your browser</li>
              <li>API keys are never transmitted to external servers</li>
              <li>Password fields are masked for security</li>
              <li>Settings can be exported for backup purposes</li>
              <li>Confirmation dialogs prevent accidental changes</li>
            </Box>
          </Box>

          <Box sx={{ mt: 3 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              💡 Technical Implementation:
            </Typography>
            <Box component="ul" sx={{ pl: 3, '& li': { mb: 1 } }}>
              <li>React state management with localStorage persistence</li>
              <li>Material-UI components with responsive design</li>
              <li>Tabbed interface for organized settings categories</li>
              <li>Form validation and error handling</li>
              <li>Real-time change detection and unsaved changes warnings</li>
              <li>Secure input handling for sensitive data</li>
            </Box>
          </Box>
        </Paper>

        <SettingsManager onSettingsChange={handleSettingsChange} />
      </Container>
    </Layout>
  );
};

export default SettingsDemo; 