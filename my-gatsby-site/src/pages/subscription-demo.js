import React, { useState } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Paper,
  Button,
  Card,
  CardContent,
  CardActions,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  AppBar,
  Toolbar,
  styled,
} from '@mui/material';
import {
  Check as CheckIcon,
  Star as StarIcon,
  TrendingUp as TrendingUpIcon,
  Security as SecurityIcon,
  Speed as SpeedIcon,
  Support as SupportIcon,
} from '@mui/icons-material';
import Layout from '../components/layout';
import SubscriptionDashboard from '../components/SubscriptionDashboard';
import SubscriptionUpgradeFlow from '../components/SubscriptionUpgradeFlow';
import SubscriptionPlans from '../components/SubscriptionPlans';
import UsageIndicator from '../components/UsageIndicator';

// Demo page styling
const DemoSection = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
  border: '1px solid #dadce0',
}));

const ComponentShowcase = styled(Box)(({ theme }) => ({
  border: '2px dashed #dadce0',
  borderRadius: theme.spacing(1),
  padding: theme.spacing(2),
  backgroundColor: '#fafafa',
}));

const TabPanel = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`simple-tabpanel-${index}`}
    aria-labelledby={`simple-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

const SubscriptionDemo = () => {
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [currentTier, setCurrentTier] = useState('pro');
  const [usageScenario, setUsageScenario] = useState('normal');
  const [annualBilling, setAnnualBilling] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [upgradeDialog, setUpgradeDialog] = useState(false);
  const [upgradeFlowOpen, setUpgradeFlowOpen] = useState(false);

  // Demo data scenarios
  const usageScenarios = {
    normal: {
      uploadUsed: 450,
      tokensUsed: 65000,
      lastUpdated: new Date(),
    },
    high: {
      uploadUsed: 850,
      tokensUsed: 92000,
      lastUpdated: new Date(),
    },
    critical: {
      uploadUsed: 980,
      tokensUsed: 98500,
      lastUpdated: new Date(),
    },
    low: {
      uploadUsed: 120,
      tokensUsed: 15000,
      lastUpdated: new Date(),
    },
  };

  const userScenarios = {
    free: {
      subscription: {
        tier: 'free',
        startDate: new Date('2024-01-15'),
        nextBillingDate: new Date('2024-02-15'),
        status: 'active',
      },
      usage: usageScenarios[usageScenario],
    },
    pro: {
      subscription: {
        tier: 'pro',
        startDate: new Date('2024-01-01'),
        nextBillingDate: new Date('2024-02-01'),
        status: 'active',
      },
      usage: usageScenarios[usageScenario],
    },
    enterprise: {
      subscription: {
        tier: 'enterprise',
        startDate: new Date('2023-12-01'),
        nextBillingDate: new Date('2024-01-01'),
        status: 'active',
      },
      usage: usageScenarios[usageScenario],
    },
  };

  const currentUser = userScenarios[currentTier];

  const handleUpgrade = () => {
    alert('Upgrade flow would be triggered here');
  };

  const handleManageBilling = () => {
    alert('Billing management would open here');
  };

  const handleDownloadInvoice = (invoiceId) => {
    alert(`Download invoice: ${invoiceId}`);
  };

  const handlePlanSelect = (plan) => {
    alert(`Selected plan: ${plan.name}`);
  };

  const handleContactSales = () => {
    alert('Contact sales form would open here');
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 600, color: '#202124' }}>
          💳 Subscription Management Demo
        </Typography>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          Interactive showcase of subscription management UI components
        </Typography>
        
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            This demo showcases the subscription management system with interactive controls. 
            Try different user tiers and usage scenarios to see how the components adapt.
          </Typography>
        </Alert>
      </Box>

      {/* Demo Controls */}
      <DemoSection>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          🎛️ Demo Controls
        </Typography>
        
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>User Tier</InputLabel>
              <Select
                value={currentTier}
                onChange={(e) => setCurrentTier(e.target.value)}
                label="User Tier"
              >
                <MenuItem value="free">Free Tier</MenuItem>
                <MenuItem value="pro">Pro Tier</MenuItem>
                <MenuItem value="enterprise">Enterprise Tier</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Usage Scenario</InputLabel>
              <Select
                value={usageScenario}
                onChange={(e) => setUsageScenario(e.target.value)}
                label="Usage Scenario"
              >
                <MenuItem value="low">Low Usage (20%)</MenuItem>
                <MenuItem value="normal">Normal Usage (65%)</MenuItem>
                <MenuItem value="high">High Usage (85%)</MenuItem>
                <MenuItem value="critical">Critical Usage (95%)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControlLabel
              control={
                <Switch
                  checked={annualBilling}
                  onChange={(e) => setAnnualBilling(e.target.checked)}
                />
              }
              label="Annual Billing"
            />
          </Grid>
        </Grid>

        {/* Current Scenario Display */}
        <Box sx={{ p: 2, bgcolor: '#f5f5f5', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Current Scenario:</strong> {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} user 
            with {usageScenario} usage ({usageScenarios[usageScenario].uploadUsed}MB storage, {usageScenarios[usageScenario].tokensUsed.toLocaleString()} tokens)
          </Typography>
        </Box>
      </DemoSection>

      {/* Component Showcase */}
      <Box sx={{ width: '100%' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
            <Tab label="Dashboard View" />
            <Tab label="Plans Comparison" />
            <Tab label="Upgrade Flows" />
            <Tab label="Usage Indicators" />
            <Tab label="Integration Examples" />
          </Tabs>
        </Box>

        {/* Dashboard Tab */}
        <TabPanel value={activeTab} index={0}>
          <DemoSection>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              📊 Subscription Dashboard
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Complete dashboard showing current plan, usage statistics, billing history, and recommendations.
            </Typography>
            
            <ComponentShowcase>
              <SubscriptionDashboard
                user={currentUser}
                onUpgrade={handleUpgrade}
                onManageBilling={handleManageBilling}
                onDownloadInvoice={handleDownloadInvoice}
              />
            </ComponentShowcase>
          </DemoSection>
        </TabPanel>

        {/* Plans Tab */}
        <TabPanel value={activeTab} index={1}>
          <DemoSection>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              💰 Subscription Plans
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Interactive plans comparison with upgrade/downgrade flows and annual billing toggle.
            </Typography>
            
            <ComponentShowcase>
              <SubscriptionPlans
                currentPlan={currentTier}
                onSelectPlan={handlePlanSelect}
                onContactSales={handleContactSales}
                annualBilling={annualBilling}
                onBillingToggle={setAnnualBilling}
                showComparison={true}
              />
            </ComponentShowcase>
          </DemoSection>
        </TabPanel>

        {/* Upgrade Flows Tab */}
        <TabPanel value={activeTab} index={2}>
          <DemoSection>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              🔄 Upgrade Flows
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Interactive upgrade flows for different user tiers.
            </Typography>
            
            <ComponentShowcase>
              <SubscriptionUpgradeFlow
                currentTier={currentTier}
                onUpgrade={handleUpgrade}
              />
            </ComponentShowcase>
          </DemoSection>
        </TabPanel>

        {/* Usage Indicators Tab */}
        <TabPanel value={activeTab} index={3}>
          <DemoSection>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              📈 Usage Indicators
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Various usage indicator variants for different application contexts.
            </Typography>
            
            <Grid container spacing={3}>
              {/* Compact Variant */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Compact Indicator
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      For headers and navigation bars
                    </Typography>
                    <ComponentShowcase>
                      <UsageIndicator
                        userTier={currentTier}
                        currentUsage={usageScenarios[usageScenario]}
                        variant="compact"
                        onUpgrade={handleUpgrade}
                      />
                    </ComponentShowcase>
                  </CardContent>
                </Card>
              </Grid>

              {/* Mini Variant */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Mini Indicator
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      For tight spaces and toolbars
                    </Typography>
                    <ComponentShowcase>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2">Usage:</Typography>
                        <UsageIndicator
                          userTier={currentTier}
                          currentUsage={usageScenarios[usageScenario]}
                          variant="mini"
                        />
                      </Box>
                    </ComponentShowcase>
                  </CardContent>
                </Card>
              </Grid>

              {/* Detailed Variant */}
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Detailed Indicator
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      For dedicated usage pages
                    </Typography>
                    <ComponentShowcase sx={{ p: 1 }}>
                      <UsageIndicator
                        userTier={currentTier}
                        currentUsage={usageScenarios[usageScenario]}
                        variant="detailed"
                        onUpgrade={handleUpgrade}
                      />
                    </ComponentShowcase>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </DemoSection>
        </TabPanel>

        {/* Integration Examples Tab */}
        <TabPanel value={activeTab} index={4}>
          <DemoSection>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
              🔧 Integration Examples
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Examples of how these components integrate into real application layouts.
            </Typography>

            {/* Mock App Header with Usage Indicator */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Application Header Integration
              </Typography>
              <ComponentShowcase>
                <AppBar position="static" color="default" elevation={0}>
                  <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                      📚 Smart eBook Chat
                    </Typography>
                    <UsageIndicator
                      userTier={currentTier}
                      currentUsage={usageScenarios[usageScenario]}
                      variant="compact"
                      onUpgrade={handleUpgrade}
                    />
                    <Button color="inherit" sx={{ ml: 2 }}>
                      Account
                    </Button>
                  </Toolbar>
                </AppBar>
              </ComponentShowcase>
            </Box>

            {/* Mock Settings Page */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Settings Page Integration
              </Typography>
              <ComponentShowcase>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={8}>
                    <Typography variant="h6" gutterBottom>
                      Account Settings
                    </Typography>
                    <Box sx={{ p: 2, border: '1px solid #dadce0', borderRadius: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Profile settings, notifications, security...
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={12} md={4}>
                    <UsageIndicator
                      userTier={currentTier}
                      currentUsage={usageScenarios[usageScenario]}
                      variant="detailed"
                      onUpgrade={handleUpgrade}
                    />
                  </Grid>
                </Grid>
              </ComponentShowcase>
            </Box>

            {/* Mock Upload Interface */}
            <Box>
              <Typography variant="h6" gutterBottom>
                Upload Interface Integration
              </Typography>
              <ComponentShowcase>
                <Box sx={{ p: 3, border: '2px dashed #dadce0', borderRadius: 1, textAlign: 'center' }}>
                  <Typography variant="h6" gutterBottom>
                    📁 Drop files here to upload
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Supported formats: PDF, DOCX, EPUB, TXT
                  </Typography>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                    <UsageIndicator
                      userTier={currentTier}
                      currentUsage={usageScenarios[usageScenario]}
                      variant="mini"
                    />
                  </Box>
                  
                  <Button variant="outlined">
                    Select Files
                  </Button>
                </Box>
              </ComponentShowcase>
            </Box>
          </DemoSection>
        </TabPanel>
      </Box>

      {/* Component Features Summary */}
      <DemoSection>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          ✨ Component Features
        </Typography>
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📊 Dashboard
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Current plan overview</li>
                  <li>Real-time usage metrics</li>
                  <li>Progress bars with severity colors</li>
                  <li>Billing history table</li>
                  <li>Usage recommendations</li>
                  <li>Responsive design</li>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  💰 Plans
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Feature comparison matrix</li>
                  <li>Annual/monthly billing toggle</li>
                  <li>Upgrade/downgrade flows</li>
                  <li>Current plan highlighting</li>
                  <li>Enterprise contact sales</li>
                  <li>Confirmation dialogs</li>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  📈 Indicators
                </Typography>
                <Box component="ul" sx={{ pl: 2, m: 0 }}>
                  <li>Multiple display variants</li>
                  <li>Color-coded severity levels</li>
                  <li>Contextual recommendations</li>
                  <li>Tooltip information</li>
                  <li>Drawer details view</li>
                  <li>Upgrade prompts</li>
                </Box>
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
  );
};

export default SubscriptionDemo; 