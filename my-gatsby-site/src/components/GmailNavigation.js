import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  InputBase,
  Avatar,
  Menu,
  MenuItem,
  useTheme,
  useMediaQuery,
  Fade,
  Divider,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import { Link } from 'gatsby';

// Icons (using simple Unicode since @mui/icons-material might not be installed)
const MenuIcon = () => <span style={{ fontSize: '20px' }}>☰</span>;
const SearchIcon = () => <span style={{ fontSize: '18px' }}>🔍</span>;
const NotificationsIcon = () => <span style={{ fontSize: '18px' }}>🔔</span>;
const SettingsIcon = () => <span style={{ fontSize: '18px' }}>⚙️</span>;
const AccountIcon = () => <span style={{ fontSize: '18px' }}>👤</span>;

// Styled components for Gmail-like appearance
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  backgroundColor: '#fff',
  color: '#5f6368',
  boxShadow: 'inset 0 -1px 0 0 #dadce0',
  borderBottom: '1px solid #dadce0',
}));

const SearchContainer = styled('div')(({ theme }) => ({
  position: 'relative',
  borderRadius: '8px',
  backgroundColor: alpha('#f1f3f4', 0.8),
  '&:hover': {
    backgroundColor: alpha('#f1f3f4', 1),
  },
  '&:focus-within': {
    backgroundColor: '#fff',
    boxShadow: '0 2px 5px 1px rgba(64,60,67,.16)',
    borderColor: 'transparent',
  },
  marginLeft: 0,
  width: '100%',
  maxWidth: '720px',
  transition: 'all 0.2s ease-in-out',
  border: '1px solid transparent',
}));

const SearchIconWrapper = styled('div')(({ theme }) => ({
  padding: theme.spacing(0, 2),
  height: '100%',
  position: 'absolute',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#5f6368',
}));

const StyledInputBase = styled(InputBase)(({ theme }) => ({
  color: '#202124',
  fontSize: '16px',
  width: '100%',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5, 1, 1.5, 0),
    paddingLeft: `calc(1em + ${theme.spacing(4)})`,
    transition: theme.transitions.create('width'),
    width: '100%',
    '&::placeholder': {
      color: '#5f6368',
      opacity: 1,
    },
  },
}));

const LogoContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  textDecoration: 'none',
  color: 'inherit',
  '&:hover': {
    textDecoration: 'none',
  },
}));

const GmailNavigation = ({ 
  onMenuClick, 
  onSearchChange, 
  searchValue = '', 
  user = null,
  showMobileSearch = false,
  onMobileSearchToggle,
  onSettingsClick = () => {}
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Keyboard shortcut for search focus
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === '/' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        const searchInput = document.getElementById('gmail-search-input');
        if (searchInput) {
          searchInput.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleUserMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleUserMenuClose = () => {
    setAnchorEl(null);
  };

  const handleSearchChange = (event) => {
    if (onSearchChange) {
      onSearchChange(event.target.value);
    }
  };

  return (
    <StyledAppBar position="sticky" elevation={0}>
      <Toolbar sx={{ gap: 2, minHeight: '64px !important' }}>
        {/* Left Section - Menu & Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={onMenuClick}
            sx={{ 
              color: '#5f6368',
              '&:hover': { backgroundColor: alpha('#5f6368', 0.04) }
            }}
          >
            <MenuIcon />
          </IconButton>
          
          <LogoContainer 
            component={Link} 
            to="/"
            sx={{ ml: 1 }}
          >
            <Box 
              sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: 1, 
                backgroundColor: '#4285f4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mr: 2,
                color: 'white',
                fontWeight: 'bold',
                fontSize: '14px'
              }}
            >
              📚
            </Box>
            <Typography
              variant="h6"
              sx={{
                color: '#5f6368',
                fontWeight: 400,
                fontSize: '22px',
                letterSpacing: '-0.5px',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              Smart eBook Chat
            </Typography>
          </LogoContainer>
        </Box>

        {/* Center Section - Search Bar */}
        <Box 
          sx={{ 
            flex: 1, 
            display: 'flex', 
            justifyContent: 'center',
            maxWidth: '720px',
            mx: 'auto'
          }}
        >
          {(!isMobile || showMobileSearch) && (
            <Fade in={!isMobile || showMobileSearch} timeout={200}>
              <SearchContainer>
                <SearchIconWrapper>
                  <SearchIcon />
                </SearchIconWrapper>
                <StyledInputBase
                  id="gmail-search-input"
                  placeholder="Search documents, conversations, and more..."
                  inputProps={{ 'aria-label': 'search' }}
                  value={searchValue}
                  onChange={handleSearchChange}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  sx={{
                    width: '100%',
                  }}
                />
              </SearchContainer>
            </Fade>
          )}
        </Box>

        {/* Right Section - Actions & User Menu */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Mobile Search Toggle */}
          {isMobile && !showMobileSearch && (
            <IconButton
              color="inherit"
              aria-label="search"
              onClick={onMobileSearchToggle}
              sx={{ 
                color: '#5f6368',
                '&:hover': { backgroundColor: alpha('#5f6368', 0.04) }
              }}
            >
              <SearchIcon />
            </IconButton>
          )}

          {/* Notifications */}
          <IconButton
            color="inherit"
            aria-label="notifications"
            sx={{ 
              color: '#5f6368',
              '&:hover': { backgroundColor: alpha('#5f6368', 0.04) }
            }}
          >
            <NotificationsIcon />
          </IconButton>

          {/* Settings */}
          <IconButton
            color="inherit"
            aria-label="settings"
            onClick={onSettingsClick}
            sx={{ 
              color: '#5f6368',
              '&:hover': { backgroundColor: alpha('#5f6368', 0.04) }
            }}
          >
            <SettingsIcon />
          </IconButton>

          {/* User Menu */}
          <IconButton
            color="inherit"
            aria-label="user menu"
            onClick={handleUserMenuOpen}
            sx={{ 
              color: '#5f6368',
              '&:hover': { backgroundColor: alpha('#5f6368', 0.04) }
            }}
          >
            {user?.avatar ? (
              <Avatar 
                src={user.avatar} 
                alt={user.name || 'User'}
                sx={{ width: 32, height: 32 }}
              />
            ) : (
              <Avatar sx={{ width: 32, height: 32, backgroundColor: '#4285f4' }}>
                <AccountIcon />
              </Avatar>
            )}
          </IconButton>

          {/* User Menu Dropdown */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleUserMenuClose}
            onClick={handleUserMenuClose}
            PaperProps={{
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                minWidth: 280,
                borderRadius: 2,
                '&:before': {
                  content: '""',
                  display: 'block',
                  position: 'absolute',
                  top: 0,
                  right: 14,
                  width: 10,
                  height: 10,
                  backgroundColor: 'background.paper',
                  transform: 'translateY(-50%) rotate(45deg)',
                  zIndex: 0,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            {user ? (
              <>
                <Box sx={{ px: 2, py: 1.5 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {user.name || 'User'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {user.email || 'user@example.com'}
                  </Typography>
                </Box>
                <Divider />
                <MenuItem component={Link} to="/profile">Profile</MenuItem>
                <MenuItem component={Link} to="/settings">Settings</MenuItem>
                <MenuItem component={Link} to="/usage">Usage & Billing</MenuItem>
                <Divider />
                <MenuItem>Sign Out</MenuItem>
              </>
            ) : (
              <>
                <MenuItem component={Link} to="/login">Sign In</MenuItem>
                <MenuItem component={Link} to="/register">Create Account</MenuItem>
              </>
            )}
          </Menu>
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
};

export default GmailNavigation; 