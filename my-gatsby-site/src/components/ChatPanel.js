import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Divider,
  Button,
  Popover,
  Grid,
  Chip,
  Badge,
  Menu,
  MenuItem,
  Switch,
  FormControlLabel,
  Tooltip,
  Collapse,
  Alert,
  CircularProgress,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Icons using Unicode emojis
const SendIcon = () => <span style={{ fontSize: '18px' }}>📤</span>;
const EmojiIcon = () => <span style={{ fontSize: '18px' }}>😊</span>;
const AttachIcon = () => <span style={{ fontSize: '18px' }}>📎</span>;
const SettingsIcon = () => <span style={{ fontSize: '18px' }}>⚙️</span>;
const MarkdownIcon = () => <span style={{ fontSize: '16px' }}>📝</span>;
const PreviewIcon = () => <span style={{ fontSize: '16px' }}>👁️</span>;
const MinimizeIcon = () => <span style={{ fontSize: '16px' }}>−</span>;
const MaximizeIcon = () => <span style={{ fontSize: '16px' }}>□</span>;
const CloseIcon = () => <span style={{ fontSize: '16px' }}>✕</span>;

// Styled components
const ChatContainer = styled(Paper)(({ theme, isMinimized, width }) => ({
  position: 'fixed',
  bottom: 0,
  right: theme.spacing(2),
  width: width === 'small' ? '320px' : width === 'large' ? '480px' : '400px',
  maxHeight: isMinimized ? '56px' : '600px',
  borderRadius: '12px 12px 0 0',
  border: '1px solid #dadce0',
  borderBottom: 'none',
  backgroundColor: '#fff',
  boxShadow: '0 -2px 12px rgba(0,0,0,0.1)',
  zIndex: 1300,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
  transition: 'all 0.2s ease-in-out',
  [theme.breakpoints.down('sm')]: {
    width: '100vw',
    right: 0,
    maxHeight: isMinimized ? '56px' : '100vh',
    borderRadius: 0,
  },
}));

const ChatHeader = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: theme.spacing(1, 2),
  backgroundColor: '#f8f9fa',
  borderBottom: '1px solid #dadce0',
  minHeight: '56px',
}));

const ChatMessages = styled(Box)(({ theme }) => ({
  flex: 1,
  overflow: 'auto',
  padding: theme.spacing(1),
  maxHeight: '400px',
  '&::-webkit-scrollbar': {
    width: '6px',
  },
  '&::-webkit-scrollbar-track': {
    backgroundColor: '#f1f1f1',
  },
  '&::-webkit-scrollbar-thumb': {
    backgroundColor: '#c1c1c1',
    borderRadius: '3px',
    '&:hover': {
      backgroundColor: '#a8a8a8',
    },
  },
}));

const MessageBubble = styled(Box)(({ theme, isOwn, isSystem }) => ({
  display: 'flex',
  flexDirection: isOwn ? 'row-reverse' : 'row',
  marginBottom: theme.spacing(1),
  alignItems: 'flex-end',
  gap: theme.spacing(1),
  ...(isSystem && {
    justifyContent: 'center',
    marginBottom: theme.spacing(2),
  }),
}));

const MessageContent = styled(Paper)(({ theme, isOwn, isSystem }) => ({
  padding: theme.spacing(1, 1.5),
  maxWidth: '75%',
  backgroundColor: isSystem 
    ? alpha('#4285f4', 0.1)
    : isOwn 
      ? '#4285f4' 
      : '#f1f3f4',
  color: isOwn && !isSystem ? '#fff' : '#202124',
  borderRadius: isSystem 
    ? '16px'
    : isOwn
      ? '16px 16px 4px 16px'
      : '16px 16px 16px 4px',
  wordBreak: 'break-word',
  '& p': {
    margin: 0,
    '&:not(:last-child)': {
      marginBottom: theme.spacing(1),
    },
  },
  '& pre': {
    backgroundColor: alpha('#000', 0.05),
    padding: theme.spacing(1),
    borderRadius: '4px',
    overflow: 'auto',
    fontSize: '0.85em',
  },
  '& code': {
    backgroundColor: alpha('#000', 0.05),
    padding: '2px 4px',
    borderRadius: '3px',
    fontSize: '0.85em',
    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
  },
  '& blockquote': {
    borderLeft: `3px solid ${isOwn ? '#fff' : '#4285f4'}`,
    paddingLeft: theme.spacing(1),
    margin: 0,
    fontStyle: 'italic',
  },
  ...(isSystem && {
    maxWidth: '90%',
    textAlign: 'center',
    fontSize: '0.875em',
  }),
}));

const InputContainer = styled(Box)(({ theme }) => ({
  padding: theme.spacing(1),
  borderTop: '1px solid #dadce0',
  backgroundColor: '#fff',
}));

const EmojiGrid = styled(Grid)(({ theme }) => ({
  padding: theme.spacing(1),
  maxHeight: '200px',
  overflow: 'auto',
}));

// Sample emoji categories
const emojiCategories = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰'],
  'People': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕'],
  'Objects': ['💻', '📱', '📞', '📧', '📝', '📋', '📊', '📈', '📉', '🔍', '🔎', '🔒', '🔓', '🔑', '⚙️', '🛠️'],
  'Symbols': ['✅', '❌', '⭐', '💯', '🔥', '💡', '❤️', '💙', '💚', '💛', '🧡', '💜', '🖤', '🤍', '🤎', '❓'],
};

const ChatPanel = ({
  isOpen = false,
  onClose = () => {},
  isMinimized = false,
  onToggleMinimize = () => {},
  chatWidth = 'medium', // 'small', 'medium', 'large'
  messages = [],
  onSendMessage = () => {},
  isTyping = false,
  user = { name: 'User', avatar: null },
  bot = { name: 'AI Assistant', avatar: '🤖' },
  placeholder = "Type your message...",
  enableMarkdown = true,
  enableEmoji = true,
  enableAttachments = false,
  theme: chatTheme = 'light',
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [emojiAnchor, setEmojiAnchor] = useState(null);
  const [selectedEmojiCategory, setSelectedEmojiCategory] = useState('Smileys');
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const [localEnableMarkdown, setLocalEnableMarkdown] = useState(enableMarkdown);
  const [localEnableEmoji, setLocalEnableEmoji] = useState(enableEmoji);
  const [unreadCount, setUnreadCount] = useState(0);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle unread count
  useEffect(() => {
    if (isMinimized && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage.isOwn) {
        setUnreadCount(prev => prev + 1);
      }
    } else {
      setUnreadCount(0);
    }
  }, [messages, isMinimized]);

  // Handle input submission
  const handleSendMessage = () => {
    if (inputValue.trim()) {
      onSendMessage({
        id: Date.now(),
        text: inputValue.trim(),
        isOwn: true,
        timestamp: new Date(),
        type: 'text',
      });
      setInputValue('');
      setShowPreview(false);
    }
  };

  // Handle key press
  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  // Emoji picker handlers
  const handleEmojiClick = (event) => {
    setEmojiAnchor(event.currentTarget);
  };

  const handleEmojiClose = () => {
    setEmojiAnchor(null);
  };

  const handleEmojiSelect = (emoji) => {
    setInputValue(prev => prev + emoji);
    inputRef.current?.focus();
  };

  // Settings handlers
  const handleSettingsClick = (event) => {
    setSettingsAnchor(event.currentTarget);
  };

  const handleSettingsClose = () => {
    setSettingsAnchor(null);
  };

  // Markdown renderer components
  const markdownComponents = useMemo(() => ({
    code({node, inline, className, children, ...props}) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={chatTheme === 'dark' ? oneDark : oneLight}
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    },
  }), [chatTheme]);

  // If chat is not open, don't render
  if (!isOpen) return null;

  return (
    <ChatContainer 
      isMinimized={isMinimized} 
      width={chatWidth}
      elevation={8}
    >
      {/* Header */}
      <ChatHeader>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Avatar 
            sx={{ width: 32, height: 32, fontSize: '16px' }}
            src={bot.avatar?.startsWith('http') ? bot.avatar : undefined}
          >
            {bot.avatar?.startsWith('http') ? undefined : bot.avatar}
          </Avatar>
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {bot.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isTyping ? 'Typing...' : 'Online'}
            </Typography>
          </Box>
          {unreadCount > 0 && (
            <Badge badgeContent={unreadCount} color="primary" sx={{ ml: 'auto' }} />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={handleSettingsClick}>
            <SettingsIcon />
          </IconButton>
          <IconButton size="small" onClick={onToggleMinimize}>
            {isMinimized ? <MaximizeIcon /> : <MinimizeIcon />}
          </IconButton>
          <IconButton size="small" onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </ChatHeader>

      {/* Messages Area */}
      <Collapse in={!isMinimized} timeout={200}>
        <ChatMessages>
          {messages.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body2" color="text.secondary">
                👋 Start a conversation with {bot.name}
              </Typography>
            </Box>
          ) : (
            messages.map((message) => (
              <MessageBubble 
                key={message.id} 
                isOwn={message.isOwn} 
                isSystem={message.type === 'system'}
              >
                {!message.isOwn && !message.isSystem && (
                  <Avatar sx={{ width: 24, height: 24, fontSize: '12px' }}>
                    {bot.avatar}
                  </Avatar>
                )}
                
                <MessageContent 
                  isOwn={message.isOwn} 
                  isSystem={message.type === 'system'}
                  elevation={1}
                >
                  {localEnableMarkdown && !message.isSystem ? (
                    <ReactMarkdown components={markdownComponents}>
                      {message.text}
                    </ReactMarkdown>
                  ) : (
                    <Typography variant="body2" component="div">
                      {message.text}
                    </Typography>
                  )}
                  
                  {message.timestamp && !message.isSystem && (
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block', 
                        mt: 0.5, 
                        opacity: 0.7,
                        fontSize: '0.75em'
                      }}
                    >
                      {message.timestamp.toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </Typography>
                  )}
                </MessageContent>
                
                {message.isOwn && (
                  <Avatar sx={{ width: 24, height: 24, fontSize: '12px', backgroundColor: '#4285f4' }}>
                    {user.avatar || '👤'}
                  </Avatar>
                )}
              </MessageBubble>
            ))
          )}
          
          {isTyping && (
            <MessageBubble isOwn={false}>
              <Avatar sx={{ width: 24, height: 24, fontSize: '12px' }}>
                {bot.avatar}
              </Avatar>
              <MessageContent elevation={1}>
                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                  <CircularProgress size={12} />
                  <Typography variant="body2" color="text.secondary">
                    Typing...
                  </Typography>
                </Box>
              </MessageContent>
            </MessageBubble>
          )}
          
          <div ref={messagesEndRef} />
        </ChatMessages>

        {/* Preview Mode */}
        {showPreview && inputValue && (
          <Box sx={{ p: 2, borderTop: '1px solid #dadce0', backgroundColor: '#f8f9fa' }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
              📝 Markdown Preview:
            </Typography>
            <Paper sx={{ p: 1.5, maxHeight: 100, overflow: 'auto' }}>
              {localEnableMarkdown ? (
                <ReactMarkdown components={markdownComponents}>
                  {inputValue}
                </ReactMarkdown>
              ) : (
                <Typography variant="body2">{inputValue}</Typography>
              )}
            </Paper>
          </Box>
        )}

        {/* Input Area */}
        <InputContainer>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
            <TextField
              ref={inputRef}
              fullWidth
              multiline
              maxRows={4}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={placeholder}
              variant="outlined"
              size="small"
              InputProps={{
                sx: {
                  borderRadius: 2,
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#dadce0',
                  },
                },
              }}
            />
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {localEnableEmoji && (
                <IconButton 
                  size="small" 
                  onClick={handleEmojiClick}
                  color={Boolean(emojiAnchor) ? 'primary' : 'default'}
                >
                  <EmojiIcon />
                </IconButton>
              )}
              
              {localEnableMarkdown && (
                <IconButton
                  size="small"
                  onClick={() => setShowPreview(!showPreview)}
                  color={showPreview ? 'primary' : 'default'}
                >
                  {showPreview ? <PreviewIcon /> : <MarkdownIcon />}
                </IconButton>
              )}
              
              <IconButton
                size="small"
                onClick={handleSendMessage}
                disabled={!inputValue.trim()}
                color="primary"
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Box>
        </InputContainer>
      </Collapse>

      {/* Emoji Picker Popover */}
      <Popover
        open={Boolean(emojiAnchor)}
        anchorEl={emojiAnchor}
        onClose={handleEmojiClose}
        anchorOrigin={{
          vertical: 'top',
          horizontal: 'left',
        }}
        transformOrigin={{
          vertical: 'bottom',
          horizontal: 'left',
        }}
        PaperProps={{
          sx: { width: 300, maxHeight: 350 }
        }}
      >
        <Box sx={{ p: 1 }}>
          <Box sx={{ display: 'flex', gap: 0.5, mb: 1, flexWrap: 'wrap' }}>
            {Object.keys(emojiCategories).map((category) => (
              <Chip
                key={category}
                label={category}
                size="small"
                clickable
                onClick={() => setSelectedEmojiCategory(category)}
                color={selectedEmojiCategory === category ? 'primary' : 'default'}
                sx={{ fontSize: '0.75em' }}
              />
            ))}
          </Box>
          
          <EmojiGrid container spacing={0.5}>
            {emojiCategories[selectedEmojiCategory].map((emoji, index) => (
              <Grid item xs={1.5} key={index}>
                <Button
                  size="small"
                  onClick={() => handleEmojiSelect(emoji)}
                  sx={{ 
                    minWidth: 'auto', 
                    p: 0.5, 
                    fontSize: '16px',
                    '&:hover': { backgroundColor: alpha('#4285f4', 0.1) }
                  }}
                >
                  {emoji}
                </Button>
              </Grid>
            ))}
          </EmojiGrid>
        </Box>
      </Popover>

      {/* Settings Menu */}
      <Menu
        anchorEl={settingsAnchor}
        open={Boolean(settingsAnchor)}
        onClose={handleSettingsClose}
        PaperProps={{
          sx: { minWidth: 200 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            Chat Settings
          </Typography>
          
          <FormControlLabel
            control={
              <Switch
                checked={localEnableMarkdown}
                onChange={(e) => setLocalEnableMarkdown(e.target.checked)}
                size="small"
              />
            }
            label="Enable Markdown"
            sx={{ fontSize: '0.875em' }}
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={localEnableEmoji}
                onChange={(e) => setLocalEnableEmoji(e.target.checked)}
                size="small"
              />
            }
            label="Enable Emoji Picker"
            sx={{ fontSize: '0.875em' }}
          />
        </Box>
      </Menu>
    </ChatContainer>
  );
};

export default ChatPanel;