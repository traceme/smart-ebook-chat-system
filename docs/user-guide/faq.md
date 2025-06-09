# Frequently Asked Questions (FAQ)

## General Questions

### What is the Smart Ebook Chat System?

The Smart Ebook Chat System is an AI-powered platform that allows you to upload documents and have intelligent conversations with your content. You can ask questions, get summaries, find specific information, and gain insights from your documents using natural language.

### What file formats are supported?

We support the following formats:
- **PDF** (.pdf) - up to 50MB
- **Word Documents** (.docx) - up to 25MB  
- **EPUB** (.epub) - up to 25MB
- **Plain Text** (.txt) - up to 10MB

### How does the AI understand my documents?

Our system uses advanced natural language processing to:
1. Extract text from your documents
2. Break content into meaningful segments
3. Create semantic embeddings (vector representations)
4. Store these in a searchable database
5. Use AI models to understand context and answer questions

### Is my data secure?

Yes, we take security seriously:
- All data is encrypted in transit and at rest using AES-256
- API keys are securely encrypted and never stored in plaintext
- Role-based access controls protect your documents
- Regular security audits and monitoring
- GDPR compliant data handling

## Account and Subscription

### What are the different subscription plans?

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Monthly Document Uploads | 100MB | 1GB | Unlimited |
| Monthly Token Usage | 10,000 | 100,000 | Unlimited |
| Documents Storage | 10 docs | 1,000 docs | Unlimited |
| Team Members | 1 | 10 | Unlimited |
| API Access | Limited | Full | Full |
| Priority Support | ❌ | ✅ | ✅ |
| Custom Integrations | ❌ | ❌ | ✅ |

### How is usage calculated?

- **Document uploads** are measured by file size
- **Token usage** includes both input and output tokens for AI conversations
- **Storage** counts all uploaded documents regardless of size
- Usage resets monthly on your billing date

### Can I upgrade or downgrade my plan?

Yes, you can change your plan at any time:
- **Upgrades** take effect immediately with prorated billing
- **Downgrades** take effect at the next billing cycle
- You'll receive warnings if current usage exceeds new plan limits

### What happens if I exceed my quota?

- **Upload quota**: New uploads will be blocked until next billing cycle
- **Token quota**: Chat functionality will be limited
- **Temporary solution**: Upgrade your plan for immediate access
- **Free users**: Consider upgrading to Pro for higher limits

## Document Upload and Processing

### How long does document processing take?

Processing times vary by document size and complexity:
- **Small documents** (< 1MB): 1-2 minutes
- **Medium documents** (1-10MB): 3-5 minutes
- **Large documents** (> 10MB): 5-15 minutes
- **Scanned PDFs**: May take longer due to OCR processing

### Why is my document taking so long to process?

Several factors can affect processing time:
- **Document size**: Larger files take longer
- **Format complexity**: Heavily formatted documents require more processing
- **Scan quality**: Poor quality scans need additional OCR processing
- **System load**: High usage periods may cause delays
- **Document type**: Some formats are more complex to process

### Can I upload password-protected documents?

Currently, password-protected documents are not supported. Please:
1. Remove password protection before uploading
2. Re-save the document without password
3. Ensure you have rights to share the content

### What if my document upload fails?

Common solutions:
1. **Check file size** against plan limits
2. **Verify file format** is supported
3. **Try a stable internet connection**
4. **Refresh the page** and try again
5. **Contact support** if issues persist

### Can I edit or update uploaded documents?

Currently, documents cannot be edited after upload. To update:
1. Upload the new version of the document
2. The system will recognize it as a new document
3. Delete the old version if no longer needed
4. Future updates will include versioning features

## Chat and Search Features

### Which AI models are available?

We support multiple AI providers:
- **OpenAI**: GPT-4o (latest), GPT-4 Turbo
- **Anthropic**: Claude-3.5 Sonnet, Claude-3 Opus
- **Google**: Gemini-2.5-pro, Gemini-1.5-pro

### How do I choose the best AI model?

Different models have different strengths:
- **GPT-4o**: Best overall performance, fast responses
- **Claude-3.5 Sonnet**: Excellent for reasoning and analysis
- **Gemini-2.5-pro**: Good for creative tasks and conversations
- **Try different models** to see which works best for your use case

### Can I chat with multiple documents at once?

Yes! You can:
- Select multiple documents for cross-document queries
- Ask questions that span across your entire library
- Compare information between different documents
- Get synthesis responses from multiple sources

### How accurate are the AI responses?

Accuracy depends on several factors:
- **Document quality**: Clear, well-formatted documents provide better results
- **Question specificity**: More specific questions get more accurate answers
- **Context availability**: Better results when relevant context is found
- **Model selection**: Different models have different accuracy levels

We recommend:
- Verifying important information from source documents
- Using specific questions rather than broad queries
- Checking the provided citations and references

### Can I save or export my conversations?

Yes, you can export conversations in multiple formats:
- **PDF**: Formatted conversation with styling
- **Markdown**: Plain text with formatting
- **Plain text**: Simple text format
- **JSON**: Machine-readable format for integrations

## Technical Questions

### What browsers are supported?

We support modern browsers:
- **Chrome** 90+ (recommended)
- **Firefox** 88+
- **Safari** 14+
- **Edge** 90+

For the best experience, we recommend using the latest version of Chrome.

### Can I use the system on mobile devices?

Yes! Our interface is responsive and works on:
- **Smartphones**: iOS 14+, Android 10+
- **Tablets**: iPad, Android tablets
- **Mobile browsers**: Chrome, Safari, Firefox mobile

Some features may be optimized for desktop use.

### Is there an API available?

Yes, we provide a comprehensive REST API:
- **Free plan**: Limited API calls
- **Pro plan**: Full API access with higher limits
- **Enterprise plan**: Unlimited API access
- **Documentation**: Available at `/docs` endpoint
- **SDKs**: Python, JavaScript, and more

### Can I integrate with other tools?

We support integrations with:
- **Cloud storage**: Google Drive, Dropbox, OneDrive
- **Productivity tools**: Slack, Microsoft Teams
- **Document systems**: SharePoint, Confluence
- **Custom integrations**: Available for Enterprise plans

### What about data export and portability?

You can export:
- **Documents**: Download original files
- **Conversations**: Multiple export formats
- **Data**: JSON format for migrations
- **Analytics**: Usage reports and statistics

No vendor lock-in - your data is always yours.

## Troubleshooting

### Why can't I see my uploaded document?

Check these items:
1. **Processing status**: Document may still be processing
2. **Upload success**: Verify upload completed without errors
3. **Browser cache**: Try refreshing the page
4. **Account limits**: Ensure you haven't exceeded storage limits

### The chat isn't responding to my questions

Common causes:
1. **Document not ready**: Wait for processing to complete
2. **API key issues**: Check your AI provider settings
3. **Network problems**: Try refreshing the page
4. **Quota limits**: Verify you haven't exceeded usage limits

### Search results seem irrelevant

To improve search results:
1. **Use specific keywords** from your documents
2. **Try different phrasings** of your query
3. **Check filters** aren't too restrictive
4. **Verify document processing** completed successfully

### I'm getting error messages

Common error solutions:
- **Refresh the page** and try again
- **Check browser console** for technical details
- **Clear browser cache** and cookies
- **Try incognito mode** to rule out extensions
- **Contact support** with error details

## Billing and Payment

### How does billing work?

- **Monthly billing**: Charged on the same date each month
- **Annual billing**: 20% discount, charged yearly
- **Usage tracking**: Monitor current usage in settings
- **Prorated charges**: Upgrades are prorated immediately

### What payment methods are accepted?

We accept:
- **Credit cards**: Visa, MasterCard, American Express
- **Debit cards**: Most major debit cards
- **PayPal**: Available in supported regions
- **Enterprise**: Wire transfer and purchase orders

### Can I get a refund?

Refund policy:
- **First 30 days**: Full refund for any reason
- **Service issues**: Prorated refunds for significant downtime
- **Cancellation**: No refund for partial months, but service continues until end of billing period

### How do I cancel my subscription?

To cancel:
1. Go to **Settings > Subscription**
2. Click **Cancel Subscription**
3. Confirm cancellation
4. Your service continues until the end of the current billing period
5. You can reactivate anytime

## Privacy and Security

### Who can access my documents?

Access control:
- **Only you** can access your personal documents
- **Team members** can access shared workspace documents based on permissions
- **Our staff** cannot access your documents without explicit permission
- **AI providers** only receive anonymized content for processing

### Where is my data stored?

- **Primary storage**: Secure cloud infrastructure (AWS/GCP/Azure)
- **Encryption**: AES-256 encryption at rest and in transit
- **Backups**: Regular encrypted backups in multiple regions
- **Location**: Data residency options available for Enterprise

### Do you use my data to train AI models?

**No**, we do not:
- Use your documents to train our models
- Share your content with third parties
- Store your data for purposes other than providing service
- Access your documents for any reason other than support (with permission)

### Can I delete my data?

Yes, you have full control:
- **Delete individual documents** anytime
- **Export all data** before deletion
- **Account deletion** removes all associated data
- **GDPR compliance**: Right to erasure honored within 30 days

## Getting Help

### How can I contact support?

Support options:
- **Email**: [support@example.com](mailto:support@example.com)
- **In-app chat**: Available in the application
- **Knowledge base**: Comprehensive help articles
- **Community forum**: User discussions and tips

### What's the response time for support?

Response times by plan:
- **Free**: 72 hours
- **Pro**: 24 hours  
- **Enterprise**: 4 hours (business days)
- **Critical issues**: 1 hour (Enterprise only)

### Can I request new features?

Absolutely! We welcome feedback:
- **Feature requests**: Submit through support or community forum
- **Voting system**: Vote on proposed features
- **Beta testing**: Join our beta program for early access
- **Enterprise features**: Custom development available

### Is there a community or forum?

Yes, join our community:
- **User forum**: Share tips and get help from other users
- **Discord/Slack**: Real-time chat with community
- **Feature discussions**: Participate in product development
- **Best practices**: Learn from experienced users

## Still Have Questions?

If you can't find what you're looking for:

1. **Search our documentation** for more detailed information
2. **Check the troubleshooting guide** for technical issues
3. **Visit our knowledge base** for step-by-step guides
4. **Contact our support team** for personalized help
5. **Join our community** to connect with other users

We're here to help you get the most out of the Smart Ebook Chat System! 