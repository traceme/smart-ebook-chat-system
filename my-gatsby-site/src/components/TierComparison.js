import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Card,
  CardContent,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Collapse,
  IconButton,
  Alert,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';

// Icons using Unicode emojis
const CheckIcon = () => <span style={{ fontSize: '16px', color: '#34a853' }}>✅</span>;
const CloseIcon = () => <span style={{ fontSize: '16px', color: '#ea4335' }}>❌</span>;
const StarIcon = () => <span style={{ fontSize: '16px' }}>⭐</span>;
const CrownIcon = () => <span style={{ fontSize: '16px' }}>👑</span>;
const ExpandIcon = () => <span style={{ fontSize: '16px' }}>⬇️</span>;
const CollapseIcon = () => <span style={{ fontSize: '16px' }}>⬆️</span>;
const InfoIcon = () => <span style={{ fontSize: '16px' }}>ℹ️</span>;

// Styled components
const ComparisonTable = styled(TableContainer)(({ theme }) => ({
  borderRadius: theme.spacing(1),
  border: '1px solid #dadce0',
  '& .MuiTableHead-root': {
    backgroundColor: '#f8f9fa',
  },
  '& .current-plan': {
    backgroundColor: alpha('#4285f4', 0.05),
    border: `2px solid #4285f4`,
  },
  '& .featured-plan': {
    backgroundColor: alpha('#34a853', 0.05),
    border: `2px solid #34a853`,
  },
}));

const FeatureRow = styled(TableRow)(({ theme, highlighted }) => ({
  '&:hover': {
    backgroundColor: alpha('#4285f4', 0.02),
  },
  ...(highlighted && {
    backgroundColor: alpha('#fbbc04', 0.1),
    '& .MuiTableCell-root': {
      fontWeight: 600,
    },
  }),
}));

const PlanHeader = styled(TableCell)(({ theme, current, featured }) => ({
  textAlign: 'center',
  padding: theme.spacing(2),
  position: 'relative',
  ...(current && {
    backgroundColor: alpha('#4285f4', 0.1),
    border: `2px solid #4285f4`,
  }),
  ...(featured && {
    backgroundColor: alpha('#34a853', 0.1),
    border: `2px solid #34a853`,
  }),
}));

// Comprehensive feature comparison data
const tierFeatures = {
  categories: [
    {
      name: 'Storage & Processing',
      features: [
        {
          name: 'Monthly Storage',
          free: '100 MB',
          pro: '1 GB',
          enterprise: '10+ GB',
          description: 'Total storage for uploaded documents',
        },
        {
          name: 'AI Tokens per Month',
          free: '10,000',
          pro: '100,000',
          enterprise: '1,000,000+',
          description: 'Tokens for AI processing and chat features',
        },
        {
          name: 'Document Uploads',
          free: '50 docs',
          pro: '500 docs',
          enterprise: 'Unlimited',
          description: 'Number of documents you can upload monthly',
        },
        {
          name: 'Processing Speed',
          free: 'Standard',
          pro: 'Priority',
          enterprise: 'Fastest',
          description: 'Document processing and conversion speed',
        },
        {
          name: 'File Formats',
          free: 'PDF, TXT',
          pro: 'PDF, DOCX, EPUB, TXT',
          enterprise: 'All formats + Custom',
          description: 'Supported document formats for upload',
        },
      ],
    },
    {
      name: 'AI Features',
      features: [
        {
          name: 'Semantic Search',
          free: true,
          pro: true,
          enterprise: true,
          description: 'Advanced semantic search across documents',
        },
        {
          name: 'Chat with Documents',
          free: true,
          pro: true,
          enterprise: true,
          description: 'Interactive chat interface with document content',
        },
        {
          name: 'Advanced AI Models',
          free: false,
          pro: true,
          enterprise: true,
          description: 'Access to latest GPT-4 and Claude models',
        },
        {
          name: 'Custom AI Prompts',
          free: false,
          pro: true,
          enterprise: true,
          description: 'Create and save custom AI prompt templates',
        },
        {
          name: 'Batch Processing',
          free: false,
          pro: 'Limited',
          enterprise: 'Unlimited',
          description: 'Process multiple documents simultaneously',
        },
        {
          name: 'AI Summary Generation',
          free: 'Basic',
          pro: 'Advanced',
          enterprise: 'Custom',
          description: 'Automatic document summarization',
        },
      ],
    },
    {
      name: 'Collaboration & Sharing',
      features: [
        {
          name: 'Document Sharing',
          free: false,
          pro: true,
          enterprise: true,
          description: 'Share documents and chat sessions',
        },
        {
          name: 'Team Workspaces',
          free: false,
          pro: 'Up to 5 users',
          enterprise: 'Unlimited',
          description: 'Collaborative workspaces for teams',
        },
        {
          name: 'Access Controls',
          free: false,
          pro: 'Basic',
          enterprise: 'Advanced',
          description: 'User permissions and access management',
        },
        {
          name: 'Export Options',
          free: 'PDF only',
          pro: 'PDF, DOCX, MD',
          enterprise: 'All formats + Custom',
          description: 'Export processed documents and summaries',
        },
      ],
    },
    {
      name: 'Integration & API',
      features: [
        {
          name: 'REST API Access',
          free: false,
          pro: false,
          enterprise: true,
          description: 'Full REST API for custom integrations',
        },
        {
          name: 'Webhook Support',
          free: false,
          pro: false,
          enterprise: true,
          description: 'Real-time notifications via webhooks',
        },
        {
          name: 'SSO Integration',
          free: false,
          pro: false,
          enterprise: true,
          description: 'Single Sign-On with SAML, OAuth, LDAP',
        },
        {
          name: 'White-label Options',
          free: false,
          pro: false,
          enterprise: true,
          description: 'Custom branding and white-label deployment',
        },
        {
          name: 'Custom Integrations',
          free: false,
          pro: false,
          enterprise: true,
          description: 'Custom integration development support',
        },
      ],
    },
    {
      name: 'Support & SLA',
      features: [
        {
          name: 'Support Channel',
          free: 'Community',
          pro: 'Email',
          enterprise: 'Dedicated',
          description: 'Primary support channel',
        },
        {
          name: 'Response Time',
          free: 'Best effort',
          pro: '24 hours',
          enterprise: '4 hours',
          description: 'Guaranteed support response time',
        },
        {
          name: 'Uptime SLA',
          free: 'No SLA',
          pro: '99.5%',
          enterprise: '99.9%',
          description: 'Service uptime guarantee',
        },
        {
          name: 'Training & Onboarding',
          free: 'Self-service',
          pro: 'Documentation',
          enterprise: 'Personalized',
          description: 'Getting started and training resources',
        },
        {
          name: 'Account Manager',
          free: false,
          pro: false,
          enterprise: true,
          description: 'Dedicated customer success manager',
        },
      ],
    },
  ],
};

const TierComparison = ({
  currentPlan = 'free',
  onSelectPlan = () => {},
  showPricing = true,
  compact = false,
  highlightDifferences = false,
}) => {
  const [expandedCategories, setExpandedCategories] = useState({});
  const [showAnnualPricing, setShowAnnualPricing] = useState(false);

  const plans = {
    free: {
      name: 'Free',
      price: 0,
      yearlyPrice: 0,
      popular: false,
      color: '#5f6368',
      description: 'Perfect for getting started',
    },
    pro: {
      name: 'Pro',
      price: 29,
      yearlyPrice: 279, // 20% discount
      popular: true,
      color: '#4285f4',
      description: 'Best for professionals',
    },
    enterprise: {
      name: 'Enterprise',
      price: 99,
      yearlyPrice: 950, // 20% discount
      popular: false,
      color: '#34a853',
      description: 'For teams and organizations',
    },
  };

  const toggleCategory = (categoryName) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryName]: !prev[categoryName]
    }));
  };

  const renderFeatureValue = (value, planType) => {
    if (typeof value === 'boolean') {
      return value ? <CheckIcon /> : <CloseIcon />;
    }
    
    if (typeof value === 'string') {
      return (
        <Typography variant="body2" sx={{ textAlign: 'center' }}>
          {value}
        </Typography>
      );
    }
    
    return <Typography variant="body2">{value}</Typography>;
  };

  const isFeatureDifferent = (feature) => {
    const values = [feature.free, feature.pro, feature.enterprise];
    return new Set(values).size > 1;
  };

  if (compact) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
            📊 Quick Plan Comparison
          </Typography>
          
          <Grid container spacing={2}>
            {Object.entries(plans).map(([planId, plan]) => (
              <Grid item xs={4} key={planId}>
                <Box 
                  sx={{ 
                    textAlign: 'center', 
                    p: 2, 
                    border: '1px solid #dadce0',
                    borderRadius: 1,
                    ...(currentPlan === planId && {
                      borderColor: '#4285f4',
                      backgroundColor: alpha('#4285f4', 0.05),
                    }),
                  }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    {plan.name}
                    {currentPlan === planId && (
                      <Chip label="Current" size="small" sx={{ ml: 1 }} />
                    )}
                  </Typography>
                  {showPricing && (
                    <Typography variant="h6" color={plan.color}>
                      ${showAnnualPricing ? plan.yearlyPrice : plan.price}
                      <Typography component="span" variant="caption">
                        /{showAnnualPricing ? 'year' : 'month'}
                      </Typography>
                    </Typography>
                  )}
                </Box>
              </Grid>
            ))}
          </Grid>
          
          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => window.location.href = '/subscription-demo'}
            >
              View Full Comparison
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 600, color: '#202124' }}>
          📊 Detailed Plan Comparison
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Compare features and limits across all subscription tiers
        </Typography>
        
        {showPricing && (
          <FormControlLabel
            control={
              <Switch
                checked={showAnnualPricing}
                onChange={(e) => setShowAnnualPricing(e.target.checked)}
                color="primary"
              />
            }
            label="Show annual pricing"
          />
        )}
      </Box>

      {highlightDifferences && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <InfoIcon /> Features with differences between plans are highlighted. 
            Click category headers to expand/collapse sections.
          </Typography>
        </Alert>
      )}

      {/* Pricing Header */}
      {showPricing && (
        <ComparisonTable component={Paper} sx={{ mb: 3 }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, width: '25%' }}>
                  Plan Details
                </TableCell>
                {Object.entries(plans).map(([planId, plan]) => (
                  <PlanHeader 
                    key={planId}
                    current={currentPlan === planId}
                    featured={plan.popular}
                  >
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {plan.name}
                        {plan.popular && <StarIcon />}
                        {planId === 'enterprise' && <CrownIcon />}
                      </Typography>
                      
                      <Typography variant="h4" sx={{ fontWeight: 700, color: plan.color, my: 1 }}>
                        ${showAnnualPricing ? plan.yearlyPrice : plan.price}
                        <Typography component="span" variant="body2" color="text.secondary">
                          /{showAnnualPricing ? 'year' : 'month'}
                        </Typography>
                      </Typography>
                      
                      {showAnnualPricing && plan.price > 0 && (
                        <Typography variant="caption" color="success.main">
                          Save ${(plan.price * 12) - plan.yearlyPrice} annually
                        </Typography>
                      )}
                      
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        {plan.description}
                      </Typography>
                      
                      {currentPlan === planId ? (
                        <Chip label="Current Plan" color="primary" sx={{ mt: 1 }} />
                      ) : (
                        <Button
                          variant={plan.popular ? 'contained' : 'outlined'}
                          size="small"
                          onClick={() => onSelectPlan({ id: planId, ...plan })}
                          sx={{ mt: 1 }}
                        >
                          {planId === 'enterprise' ? 'Contact Sales' : 'Select Plan'}
                        </Button>
                      )}
                    </Box>
                  </PlanHeader>
                ))}
              </TableRow>
            </TableHead>
          </Table>
        </ComparisonTable>
      )}

      {/* Feature Comparison by Category */}
      {tierFeatures.categories.map((category) => (
        <Box key={category.name} sx={{ mb: 2 }}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              {/* Category Header */}
              <Box
                sx={{
                  p: 2,
                  backgroundColor: '#f8f9fa',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderBottom: '1px solid #dadce0',
                }}
                onClick={() => toggleCategory(category.name)}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {category.name}
                </Typography>
                <IconButton size="small">
                  {expandedCategories[category.name] ? <CollapseIcon /> : <ExpandIcon />}
                </IconButton>
              </Box>

              {/* Category Features */}
              <Collapse in={expandedCategories[category.name]} timeout="auto" unmountOnExit>
                <ComparisonTable>
                  <Table size="small">
                    <TableBody>
                      {category.features.map((feature, index) => (
                        <FeatureRow 
                          key={index}
                          highlighted={highlightDifferences && isFeatureDifferent(feature)}
                        >
                          <TableCell sx={{ fontWeight: 500, width: '25%' }}>
                            <Box>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {feature.name}
                              </Typography>
                              {feature.description && (
                                <Typography variant="caption" color="text.secondary">
                                  {feature.description}
                                </Typography>
                              )}
                            </Box>
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', width: '25%' }}>
                            {renderFeatureValue(feature.free)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', width: '25%' }}>
                            {renderFeatureValue(feature.pro)}
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center', width: '25%' }}>
                            {renderFeatureValue(feature.enterprise)}
                          </TableCell>
                        </FeatureRow>
                      ))}
                    </TableBody>
                  </Table>
                </ComparisonTable>
              </Collapse>
            </CardContent>
          </Card>
        </Box>
      ))}

      {/* Call to Action */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Need help deciding?</strong> All paid plans include a 14-day free trial. 
            You can upgrade or downgrade at any time without losing your data.
          </Typography>
        </Alert>
        
        <Typography variant="body2" color="text.secondary">
          Have questions about features or need a custom plan? 
          <Button variant="text" size="small" sx={{ ml: 1 }}>
            Contact our sales team
          </Button>
        </Typography>
      </Box>
    </Box>
  );
};

export default TierComparison; 