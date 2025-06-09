import React, { useState } from 'react';
import { Box, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import { useStaticQuery, graphql } from 'gatsby';
import GmailNavigation from './GmailNavigation';
import SettingsDrawer from './SettingsDrawer';

// Gmail-inspired theme
const gmailTheme = createTheme({
  palette: {
    primary: {
      main: '#4285f4',
    },
    secondary: {
      main: '#ea4335',
    },
    background: {
      default: '#ffffff',
      paper: '#ffffff',
    },
    text: {
      primary: '#202124',
      secondary: '#5f6368',
    },
    divider: '#dadce0',
  },
  typography: {
    fontFamily: '"Google Sans", "Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 400,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '4px',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

const GmailLayout = ({ 
  children, 
  showSidebar = true, 
  sidebarContent = null,
  user = null,
  onSearch = () => {},
  searchValue = '',
  userSettings = {},
  onSettingsChange = () => {},
}) => {
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const data = useStaticQuery(graphql`
    query GmailSiteTitleQuery {
      site {
        siteMetadata {
          title
        }
      }
    }
  `);

  const handleMenuClick = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleMobileSearchToggle = () => {
    setMobileSearchOpen(!mobileSearchOpen);
  };

  const handleSearchChange = (value) => {
    onSearch(value);
  };

  const handleSettingsClick = () => {
    setSettingsOpen(true);
  };

  const handleSettingsClose = () => {
    setSettingsOpen(false);
  };

  return (
    <ThemeProvider theme={gmailTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
        {/* Navigation Bar */}
        <GmailNavigation
          onMenuClick={handleMenuClick}
          onSearchChange={handleSearchChange}
          searchValue={searchValue}
          user={user}
          showMobileSearch={mobileSearchOpen}
          onMobileSearchToggle={handleMobileSearchToggle}
          onSettingsClick={handleSettingsClick}
        />

        {/* Main Content Area */}
        <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Sidebar */}
          {showSidebar && (
            <Box
              sx={{
                width: { xs: '100%', md: sidebarOpen ? '280px' : '72px' },
                flexShrink: 0,
                backgroundColor: '#fafafa',
                borderRight: '1px solid #dadce0',
                transition: 'width 0.2s ease-in-out',
                overflow: 'hidden',
                display: { 
                  xs: sidebarOpen ? 'block' : 'none',
                  md: 'block' 
                },
                position: { xs: 'absolute', md: 'relative' },
                height: { xs: 'calc(100vh - 64px)', md: 'auto' },
                zIndex: { xs: 1200, md: 'auto' },
              }}
            >
              {sidebarContent}
            </Box>
          )}

          {/* Main Content */}
          <Box
            component="main"
            sx={{
              flex: 1,
              overflow: 'auto',
              backgroundColor: '#ffffff',
              position: 'relative',
            }}
          >
            {/* Mobile backdrop for sidebar */}
            {showSidebar && sidebarOpen && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 1100,
                  display: { xs: 'block', md: 'none' },
                }}
                onClick={() => setSidebarOpen(false)}
              />
            )}
            
            {/* Content Container */}
            <Box sx={{ height: '100%' }}>
              {children}
            </Box>
          </Box>
        </Box>

        {/* Settings Drawer */}
        <SettingsDrawer
          open={settingsOpen}
          onClose={handleSettingsClose}
          userSettings={userSettings}
          onSettingsChange={onSettingsChange}
        />
      </Box>
    </ThemeProvider>
  );
};

export default GmailLayout;
export { gmailTheme }; 