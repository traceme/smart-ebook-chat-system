import React, { useState } from 'react';
import {
  Box,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Button,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Switch,
  FormControlLabel,
  Divider,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Alert,
  Paper,
  Grid,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Icons using Unicode emojis
const ModelIcon = () => <span style={{ fontSize: '16px' }}>🧠</span>;
const TempIcon = () => <span style={{ fontSize: '16px' }}>🌡️</span>;
const SaveIcon = () => <span style={{ fontSize: '16px' }}>💾</span>;
const LoadIcon = () => <span style={{ fontSize: '16px' }}>📂</span>;
const ExportIcon = () => <span style={{ fontSize: '16px' }}>📄</span>;
const ShareIcon = () => <span style={{ fontSize: '16px' }}>🔗</span>;
const DeleteIcon = () => <span style={{ fontSize: '16px' }}>🗑️</span>;
const SettingsIcon = () => <span style={{ fontSize: '16px' }}>⚙️</span>;
const HistoryIcon = () => <span style={{ fontSize: '16px' }}>📜</span>;
const CopyIcon = () => <span style={{ fontSize: '16px' }}>📋</span>;
const DownloadIcon = () => <span style={{ fontSize: '16px' }}>⬇️</span>;
const EditIcon = () => <span style={{ fontSize: '16px' }}>✏️</span>;
const CheckIcon = () => <span style={{ fontSize: '16px' }}>✅</span>;

// Styled components
const ControlCard = styled(Card)(({ theme }) => ({
  marginBottom: theme.spacing(2),
  border: '1px solid #dadce0',
  boxShadow: '0 1px 3px rgba(60,64,67,0.3)',
}));

const ControlSection = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2),
}));

// Available AI models with detailed information
const AI_MODELS = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
    description: 'Most capable model with excellent reasoning',
    maxTokens: 8192,
    cost: 'High',
    speed: 'Slow',
    capabilities: ['Reasoning', 'Code', 'Math', 'Analysis']
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
    description: 'Fast and efficient for most tasks',
    maxTokens: 4096,
    cost: 'Low',
    speed: 'Fast',
    capabilities: ['General', 'Code', 'Writing']
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet',
    provider: 'Anthropic',
    description: 'Balanced performance with strong safety',
    maxTokens: 200000,
    cost: 'Medium',
    speed: 'Medium',
    capabilities: ['Reasoning', 'Analysis', 'Safety', 'Long Context']
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
    description: 'Quick responses for simple tasks',
    maxTokens: 200000,
    cost: 'Low',
    speed: 'Very Fast',
    capabilities: ['Speed', 'Efficiency', 'Long Context']
  },
  {
    id: 'local-model',
    name: 'Local Model',
    provider: 'Local',
    description: 'Privacy-focused local processing',
    maxTokens: 2048,
    cost: 'Free',
    speed: 'Variable',
    capabilities: ['Privacy', 'Offline']
  }
];

// Export formats
const EXPORT_FORMATS = [
  { id: 'markdown', name: 'Markdown (.md)', description: 'Formatted text with references' },
  { id: 'pdf', name: 'PDF Document', description: 'Professional document format' },
  { id: 'json', name: 'JSON Data', description: 'Machine-readable conversation data' },
  { id: 'txt', name: 'Plain Text', description: 'Simple text file' },
  { id: 'html', name: 'HTML Page', description: 'Web page with styling' },
];

const ChatControls = ({
  selectedModel = 'gpt-4',
  onModelChange = () => {},
  temperature = 0.7,
  onTemperatureChange = () => {},
  maxTokens = 2000,
  onMaxTokensChange = () => {},
  conversations = [],
  onSaveConversation = () => {},
  onLoadConversation = () => {},
  onDeleteConversation = () => {},
  onExportConversation = () => {},
  onShareConversation = () => {},
  onClearConversation = () => {},
  systemPrompt = '',
  onSystemPromptChange = () => {},
  autoSave = true,
  onAutoSaveChange = () => {},
  streamingEnabled = true,
  onStreamingEnabledChange = () => {},
  className,
}) => {
  // State for dialogs and controls
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [conversationName, setConversationName] = useState('');
  const [selectedExportFormat, setSelectedExportFormat] = useState('markdown');
  const [shareUrl, setShareUrl] = useState('');
  const [shareCode, setShareCode] = useState('');
  const [editingSystemPrompt, setEditingSystemPrompt] = useState(false);

  // Get current model details
  const currentModel = AI_MODELS.find(model => model.id === selectedModel) || AI_MODELS[0];

  // Handle model selection
  const handleModelChange = (modelId) => {
    onModelChange(modelId);
    const model = AI_MODELS.find(m => m.id === modelId);
    if (model && maxTokens > model.maxTokens) {
      onMaxTokensChange(model.maxTokens);
    }
  };

  // Handle saving conversation
  const handleSaveConversation = () => {
    if (conversationName.trim()) {
      onSaveConversation({
        id: Date.now().toString(),
        name: conversationName.trim(),
        timestamp: new Date(),
        model: selectedModel,
        temperature,
        systemPrompt,
      });
      setConversationName('');
      setSaveDialogOpen(false);
    }
  };

  // Handle exporting conversation
  const handleExportConversation = () => {
    const format = EXPORT_FORMATS.find(f => f.id === selectedExportFormat);
    onExportConversation(selectedExportFormat);
    setExportDialogOpen(false);
  };

  // Handle sharing conversation
  const handleShareConversation = () => {
    // Generate share URL and code
    const shareId = Math.random().toString(36).substring(2, 15);
    const url = `${window.location.origin}/chat/shared/${shareId}`;
    setShareUrl(url);
    setShareCode(shareId);
    onShareConversation(shareId);
  };

  // Copy to clipboard
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  // Temperature marks for slider
  const temperatureMarks = [
    { value: 0, label: 'Focused' },
    { value: 0.3, label: 'Balanced' },
    { value: 0.7, label: 'Creative' },
    { value: 1, label: 'Random' },
  ];

  return (
    <Box className={className}>
      {/* Model Selection */}
      <ControlCard>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ModelIcon />
            <Typography variant="h6" sx={{ ml: 1 }}>
              AI Model Selection
            </Typography>
          </Box>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Model</InputLabel>
            <Select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              label="Model"
            >
              {AI_MODELS.map(model => (
                <MenuItem key={model.id} value={model.id}>
                  <Box sx={{ width: '100%' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="body2" fontWeight={500}>
                        {model.name}
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Chip label={model.cost} size="small" color={
                          model.cost === 'Free' ? 'success' : 
                          model.cost === 'Low' ? 'primary' : 
                          model.cost === 'Medium' ? 'warning' : 'error'
                        } />
                        <Chip label={model.speed} size="small" variant="outlined" />
                      </Box>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {model.description}
                    </Typography>
                    <Box sx={{ mt: 0.5 }}>
                      {model.capabilities.map(cap => (
                        <Chip 
                          key={cap} 
                          label={cap} 
                          size="small" 
                          variant="outlined" 
                          sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem', height: 20 }}
                        />
                      ))}
                    </Box>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Current model info */}
          <Paper sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Provider</Typography>
                <Typography variant="body2">{currentModel.provider}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Max Tokens</Typography>
                <Typography variant="body2">{currentModel.maxTokens.toLocaleString()}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Cost</Typography>
                <Typography variant="body2">{currentModel.cost}</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">Speed</Typography>
                <Typography variant="body2">{currentModel.speed}</Typography>
              </Grid>
            </Grid>
          </Paper>
        </CardContent>
      </ControlCard>

      {/* Generation Parameters */}
      <ControlCard>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <TempIcon />
            <Typography variant="h6" sx={{ ml: 1 }}>
              Generation Parameters
            </Typography>
          </Box>

          {/* Temperature Control */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              Temperature: {temperature}
            </Typography>
            <Slider
              value={temperature}
              onChange={(e, value) => onTemperatureChange(value)}
              min={0}
              max={1}
              step={0.1}
              marks={temperatureMarks}
              valueLabelDisplay="auto"
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              Lower values make output more focused and deterministic. Higher values increase creativity and randomness.
            </Typography>
          </Box>

          {/* Max Tokens Control */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              Max Response Tokens: {maxTokens}
            </Typography>
            <Slider
              value={maxTokens}
              onChange={(e, value) => onMaxTokensChange(value)}
              min={100}
              max={currentModel.maxTokens}
              step={50}
              valueLabelDisplay="auto"
              sx={{ mb: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              Maximum number of tokens in the AI response. Higher values allow longer responses but may increase cost.
            </Typography>
          </Box>

          {/* Additional Settings */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={streamingEnabled}
                  onChange={(e) => onStreamingEnabledChange(e.target.checked)}
                />
              }
              label="Streaming Responses"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={autoSave}
                  onChange={(e) => onAutoSaveChange(e.target.checked)}
                />
              }
              label="Auto-save Conversations"
            />
          </Box>
        </CardContent>
      </ControlCard>

      {/* System Prompt */}
      <ControlCard>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <SettingsIcon />
              <Typography variant="h6" sx={{ ml: 1 }}>
                System Prompt
              </Typography>
            </Box>
            <IconButton 
              size="small" 
              onClick={() => setEditingSystemPrompt(!editingSystemPrompt)}
            >
              {editingSystemPrompt ? <CheckIcon /> : <EditIcon />}
            </IconButton>
          </Box>

          {editingSystemPrompt ? (
            <TextField
              multiline
              rows={4}
              fullWidth
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="Enter system prompt to guide the AI's behavior..."
              variant="outlined"
            />
          ) : (
            <Paper sx={{ p: 2, backgroundColor: '#f9f9f9', minHeight: 80 }}>
              <Typography variant="body2" color="text.secondary">
                {systemPrompt || 'No custom system prompt set. Click edit to add one.'}
              </Typography>
            </Paper>
          )}
        </CardContent>
      </ControlCard>

      {/* Conversation Management */}
      <ControlCard>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <HistoryIcon />
            <Typography variant="h6" sx={{ ml: 1 }}>
              Conversation Management
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
            <Button
              variant="outlined"
              startIcon={<SaveIcon />}
              onClick={() => setSaveDialogOpen(true)}
            >
              Save
            </Button>
            <Button
              variant="outlined"
              startIcon={<LoadIcon />}
              onClick={() => setLoadDialogOpen(true)}
            >
              Load
            </Button>
            <Button
              variant="outlined"
              startIcon={<ExportIcon />}
              onClick={() => setExportDialogOpen(true)}
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShareIcon />}
              onClick={() => setShareDialogOpen(true)}
            >
              Share
            </Button>
          </Box>

          {conversations.length > 0 && (
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Recent Conversations ({conversations.length})
              </Typography>
              <List dense>
                {conversations.slice(0, 3).map((conversation) => (
                  <ListItem
                    key={conversation.id}
                    button
                    onClick={() => onLoadConversation(conversation.id)}
                  >
                    <ListItemIcon>
                      <HistoryIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={conversation.name}
                      secondary={`${conversation.timestamp.toLocaleDateString()} • ${conversation.model}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        edge="end"
                        onClick={() => onDeleteConversation(conversation.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Box>
          )}
        </CardContent>
      </ControlCard>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)}>
        <DialogTitle>Save Conversation</DialogTitle>
        <DialogContent sx={{ width: 400 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Conversation Name"
            fullWidth
            variant="outlined"
            value={conversationName}
            onChange={(e) => setConversationName(e.target.value)}
            placeholder="e.g., Document Analysis Session"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleSaveConversation}
            disabled={!conversationName.trim()}
            variant="contained"
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Dialog */}
      <Dialog open={loadDialogOpen} onClose={() => setLoadDialogOpen(false)}>
        <DialogTitle>Load Conversation</DialogTitle>
        <DialogContent sx={{ width: 500, height: 400 }}>
          {conversations.length === 0 ? (
            <Typography color="text.secondary">
              No saved conversations found.
            </Typography>
          ) : (
            <List>
              {conversations.map((conversation) => (
                <ListItem
                  key={conversation.id}
                  button
                  onClick={() => {
                    onLoadConversation(conversation.id);
                    setLoadDialogOpen(false);
                  }}
                >
                  <ListItemText
                    primary={conversation.name}
                    secondary={
                      <Box>
                        <Typography variant="caption">
                          {conversation.timestamp.toLocaleString()}
                        </Typography>
                        <br />
                        <Chip label={conversation.model} size="small" />
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conversation.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLoadDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={exportDialogOpen} onClose={() => setExportDialogOpen(false)}>
        <DialogTitle>Export Conversation</DialogTitle>
        <DialogContent sx={{ width: 400 }}>
          <FormControl fullWidth margin="dense">
            <InputLabel>Export Format</InputLabel>
            <Select
              value={selectedExportFormat}
              onChange={(e) => setSelectedExportFormat(e.target.value)}
              label="Export Format"
            >
              {EXPORT_FORMATS.map(format => (
                <MenuItem key={format.id} value={format.id}>
                  <Box>
                    <Typography variant="body2">{format.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {format.description}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setExportDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleExportConversation} variant="contained">
            Export
          </Button>
        </DialogActions>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onClose={() => setShareDialogOpen(false)}>
        <DialogTitle>Share Conversation</DialogTitle>
        <DialogContent sx={{ width: 500 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Share a read-only link to this conversation. The link will be valid for 7 days.
          </Alert>
          
          <Button
            fullWidth
            variant="outlined"
            onClick={handleShareConversation}
            sx={{ mb: 2 }}
          >
            Generate Share Link
          </Button>

          {shareUrl && (
            <Box>
              <TextField
                label="Share URL"
                value={shareUrl}
                fullWidth
                margin="dense"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton onClick={() => copyToClipboard(shareUrl)}>
                      <CopyIcon />
                    </IconButton>
                  ),
                }}
              />
              <TextField
                label="Share Code"
                value={shareCode}
                fullWidth
                margin="dense"
                InputProps={{
                  readOnly: true,
                  endAdornment: (
                    <IconButton onClick={() => copyToClipboard(shareCode)}>
                      <CopyIcon />
                    </IconButton>
                  ),
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChatControls; 