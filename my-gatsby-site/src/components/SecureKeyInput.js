import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  IconButton,
  Typography,
  Alert,
  Chip,
  Tooltip,
  LinearProgress,
  Collapse,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Icons using Unicode emojis
const ViewIcon = () => <span style={{ fontSize: '16px' }}>👁️</span>;
const HideIcon = () => <span style={{ fontSize: '16px' }}>🙈</span>;
const ValidIcon = () => <span style={{ fontSize: '16px' }}>✅</span>;
const InvalidIcon = () => <span style={{ fontSize: '16px' }}>❌</span>;
const WarningIcon = () => <span style={{ fontSize: '16px' }}>⚠️</span>;
const SecurityIcon = () => <span style={{ fontSize: '16px' }}>🔒</span>;
const CopyIcon = () => <span style={{ fontSize: '16px' }}>📋</span>;
const GenerateIcon = () => <span style={{ fontSize: '16px' }}>🎲</span>;

// Styled components
const SecureContainer = styled(Box)(({ theme }) => ({
  position: 'relative',
  '& .MuiTextField-root': {
    '& .MuiOutlinedInput-root': {
      fontFamily: 'monospace',
      '&:hover fieldset': {
        borderColor: '#4285f4',
      },
      '&.Mui-focused fieldset': {
        borderColor: '#4285f4',
      },
      '&.Mui-error fieldset': {
        borderColor: '#ea4335',
      },
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: '#4285f4',
    },
    '& .MuiInputLabel-root.Mui-error': {
      color: '#ea4335',
    },
  },
}));

const SecurityIndicator = styled(Box)(({ theme, level }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1),
  marginTop: theme.spacing(1),
  padding: theme.spacing(1),
  borderRadius: theme.spacing(1),
  backgroundColor: 
    level === 'high' ? '#e8f5e8' :
    level === 'medium' ? '#fff3cd' :
    level === 'low' ? '#f8d7da' :
    '#f8f9fa',
  border: `1px solid ${
    level === 'high' ? '#34a853' :
    level === 'medium' ? '#fbbc04' :
    level === 'low' ? '#ea4335' :
    '#dadce0'
  }`,
}));

const StrengthBar = styled(LinearProgress)(({ theme, strength }) => ({
  height: 4,
  borderRadius: 2,
  backgroundColor: '#e0e0e0',
  '& .MuiLinearProgress-bar': {
    backgroundColor: 
      strength >= 80 ? '#34a853' :
      strength >= 60 ? '#fbbc04' :
      strength >= 40 ? '#ff9800' :
      '#ea4335',
  },
}));

// Key validation patterns
const KEY_PATTERNS = {
  openai: {
    pattern: /^sk-[A-Za-z0-9]{20,}$/,
    minLength: 20,
    maxLength: 100,
    description: 'Should start with "sk-" followed by alphanumeric characters',
  },
  anthropic: {
    pattern: /^sk-ant-[A-Za-z0-9_-]{95,}$/,
    minLength: 100,
    maxLength: 120,
    description: 'Should start with "sk-ant-" followed by base64-like characters',
  },
  google: {
    pattern: /^AIza[A-Za-z0-9_-]{35}$/,
    minLength: 39,
    maxLength: 39,
    description: 'Should start with "AIza" followed by 35 characters',
  },
  azure: {
    pattern: /^[A-Za-z0-9]{32}$/,
    minLength: 32,
    maxLength: 64,
    description: 'Typically 32-64 alphanumeric characters',
  },
  cohere: {
    pattern: /^[A-Za-z0-9]{40}$/,
    minLength: 40,
    maxLength: 40,
    description: '40 character alphanumeric string',
  },
  huggingface: {
    pattern: /^hf_[A-Za-z0-9]{34}$/,
    minLength: 37,
    maxLength: 37,
    description: 'Should start with "hf_" followed by 34 characters',
  },
};

const SecureKeyInput = ({
  value = '',
  onChange = () => {},
  onValidationChange = () => {},
  provider = 'openai',
  label = 'API Key',
  placeholder = '',
  required = false,
  disabled = false,
  autoValidate = true,
  showStrength = true,
  showSecurity = true,
  allowCopy = false,
  allowGenerate = false,
  className,
  ...textFieldProps
}) => {
  // State management
  const [showKey, setShowKey] = useState(false);
  const [validation, setValidation] = useState({
    isValid: false,
    strength: 0,
    issues: [],
    security: 'low',
  });
  const [focused, setFocused] = useState(false);
  const [hasBeenFocused, setHasBeenFocused] = useState(false);

  // Get provider configuration
  const getProviderConfig = useCallback(() => {
    return KEY_PATTERNS[provider] || KEY_PATTERNS.openai;
  }, [provider]);

  // Validate key format and strength
  const validateKey = useCallback((key) => {
    const config = getProviderConfig();
    const issues = [];
    let strength = 0;
    let isValid = false;
    let security = 'low';

    if (!key) {
      return {
        isValid: false,
        strength: 0,
        issues: required ? ['API key is required'] : [],
        security: 'low',
      };
    }

    // Length validation
    if (key.length < config.minLength) {
      issues.push(`Key too short (minimum ${config.minLength} characters)`);
    } else if (key.length > config.maxLength) {
      issues.push(`Key too long (maximum ${config.maxLength} characters)`);
    } else {
      strength += 25;
    }

    // Pattern validation
    if (config.pattern.test(key)) {
      strength += 35;
      isValid = true;
    } else {
      issues.push(config.description);
    }

    // Character variety check
    const hasUpperCase = /[A-Z]/.test(key);
    const hasLowerCase = /[a-z]/.test(key);
    const hasNumbers = /[0-9]/.test(key);
    const hasSpecialChars = /[_-]/.test(key);

    let varietyCount = 0;
    if (hasUpperCase) varietyCount++;
    if (hasLowerCase) varietyCount++;
    if (hasNumbers) varietyCount++;
    if (hasSpecialChars) varietyCount++;

    strength += varietyCount * 10;

    // Security assessment
    if (strength >= 80) {
      security = 'high';
    } else if (strength >= 60) {
      security = 'medium';
    } else {
      security = 'low';
    }

    // Additional security checks
    if (key.includes('test') || key.includes('demo') || key.includes('example')) {
      issues.push('Key appears to be a test/demo key');
      security = 'low';
    }

    // Common patterns that indicate weak keys
    if (/(.)\1{3,}/.test(key)) {
      issues.push('Key contains repeated characters');
      strength = Math.max(0, strength - 20);
    }

    return {
      isValid: isValid && issues.length === 0,
      strength: Math.min(100, strength),
      issues,
      security,
    };
  }, [provider, required, getProviderConfig]);

  // Update validation when value changes
  useEffect(() => {
    if (autoValidate) {
      const newValidation = validateKey(value);
      setValidation(newValidation);
      onValidationChange(newValidation);
    }
  }, [value, autoValidate, validateKey, onValidationChange]);

  // Handle focus events
  const handleFocus = useCallback((e) => {
    setFocused(true);
    setHasBeenFocused(true);
    textFieldProps.onFocus?.(e);
  }, [textFieldProps]);

  const handleBlur = useCallback((e) => {
    setFocused(false);
    textFieldProps.onBlur?.(e);
  }, [textFieldProps]);

  // Toggle key visibility
  const toggleVisibility = useCallback(() => {
    setShowKey(prev => !prev);
  }, []);

  // Copy key to clipboard
  const copyToClipboard = useCallback(async () => {
    if (value) {
      try {
        await navigator.clipboard.writeText(value);
        // You could add a toast notification here
      } catch (error) {
        console.error('Failed to copy to clipboard:', error);
      }
    }
  }, [value]);

  // Generate random key (for testing purposes)
  const generateTestKey = useCallback(() => {
    const config = getProviderConfig();
    let testKey = '';
    
    switch (provider) {
      case 'openai':
        testKey = 'sk-' + generateRandomString(48);
        break;
      case 'anthropic':
        testKey = 'sk-ant-' + generateRandomString(95);
        break;
      case 'google':
        testKey = 'AIza' + generateRandomString(35);
        break;
      case 'azure':
        testKey = generateRandomString(32);
        break;
      default:
        testKey = generateRandomString(40);
    }
    
    onChange({ target: { value: testKey } });
  }, [provider, onChange, getProviderConfig]);

  // Generate random string
  const generateRandomString = useCallback((length) => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }, []);

  // Get error message
  const getErrorMessage = useCallback(() => {
    if (!hasBeenFocused || focused) return '';
    return validation.issues.length > 0 ? validation.issues[0] : '';
  }, [validation.issues, hasBeenFocused, focused]);

  // Get helper text
  const getHelperText = useCallback(() => {
    if (getErrorMessage()) return getErrorMessage();
    if (textFieldProps.helperText) return textFieldProps.helperText;
    return getProviderConfig().description;
  }, [getErrorMessage, textFieldProps.helperText, getProviderConfig]);

  // Get security level text
  const getSecurityText = useCallback(() => {
    switch (validation.security) {
      case 'high':
        return 'High security - Key format is valid and secure';
      case 'medium':
        return 'Medium security - Key format is mostly correct';
      case 'low':
        return 'Low security - Key format may be incorrect';
      default:
        return 'Security level unknown';
    }
  }, [validation.security]);

  return (
    <SecureContainer className={className}>
      <TextField
        {...textFieldProps}
        label={label}
        value={value}
        onChange={onChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        type={showKey ? 'text' : 'password'}
        placeholder={placeholder || getProviderConfig().description}
        required={required}
        disabled={disabled}
        error={hasBeenFocused && !focused && validation.issues.length > 0}
        helperText={getHelperText()}
        fullWidth
        InputProps={{
          ...textFieldProps.InputProps,
          endAdornment: (
            <InputAdornment position="end">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                {allowCopy && value && (
                  <Tooltip title="Copy to clipboard">
                    <IconButton
                      size="small"
                      onClick={copyToClipboard}
                      edge="end"
                    >
                      <CopyIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                {allowGenerate && (
                  <Tooltip title="Generate test key">
                    <IconButton
                      size="small"
                      onClick={generateTestKey}
                      edge="end"
                    >
                      <GenerateIcon />
                    </IconButton>
                  </Tooltip>
                )}
                
                <Tooltip title={showKey ? "Hide key" : "Show key"}>
                  <IconButton
                    size="small"
                    onClick={toggleVisibility}
                    edge="end"
                  >
                    {showKey ? <HideIcon /> : <ViewIcon />}
                  </IconButton>
                </Tooltip>
                
                {validation.isValid && (
                  <Tooltip title="Valid key format">
                    <ValidIcon />
                  </Tooltip>
                )}
              </Box>
            </InputAdornment>
          ),
        }}
      />

      {/* Strength Indicator */}
      <Collapse in={showStrength && value.length > 0}>
        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
            <Typography variant="caption" color="text.secondary">
              Key Strength
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {validation.strength}%
            </Typography>
          </Box>
          <StrengthBar
            variant="determinate"
            value={validation.strength}
            strength={validation.strength}
          />
        </Box>
      </Collapse>

      {/* Security Indicator */}
      <Collapse in={showSecurity && hasBeenFocused && value.length > 0}>
        <SecurityIndicator level={validation.security}>
          <SecurityIcon />
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight={500}>
              {getSecurityText()}
            </Typography>
            {validation.issues.length > 0 && (
              <Box sx={{ mt: 0.5 }}>
                {validation.issues.map((issue, index) => (
                  <Chip
                    key={index}
                    label={issue}
                    size="small"
                    variant="outlined"
                    icon={<WarningIcon />}
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </SecurityIndicator>
      </Collapse>

      {/* Security Warning */}
      {value && hasBeenFocused && (
        <Collapse in={true}>
          <Alert 
            severity="info" 
            sx={{ mt: 1 }}
            icon={<SecurityIcon />}
          >
            <Typography variant="body2">
              Your API key will be encrypted using AES-256 encryption before storage. 
              Never share your key or commit it to version control.
            </Typography>
          </Alert>
        </Collapse>
      )}
    </SecureContainer>
  );
};

export default SecureKeyInput; 