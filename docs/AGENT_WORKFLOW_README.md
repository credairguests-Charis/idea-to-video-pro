# Agent Workflow System - Complete Documentation

## 📋 Quick Links

- **[Final Integration Guide](./agent-final-integration.md)** - Complete system overview and architecture
- **[Testing Guide](./agent-testing-guide.md)** - Comprehensive testing procedures
- **[Workflow Orchestrator](./agent-workflow-orchestrator.md)** - Orchestrator implementation details
- **[Workflow Sequence](./agent-workflow-sequence.md)** - Step-by-step execution flow
- **[UI Implementation](./agent-ui-implementation.md)** - Frontend components and real-time updates

## 🎯 System Overview

The Agent Workflow is an autonomous competitor ad analysis pipeline that:
1. **Researches competitors** using Firecrawl MCP deep web search
2. **Extracts Meta ads** from competitor Ad Libraries
3. **Analyzes videos** using Azure Video Indexer
4. **Synthesizes insights** using Lovable AI (Gemini 2.5 Flash)
5. **Generates UGC scripts** ready for production

## 🏗️ Architecture

### Component Structure
```
src/services/agent/
├── firecrawl-mcp/          # Deep competitor research
│   ├── client.ts
│   ├── tool-handler.ts
│   └── README.md
├── meta-ads/               # Meta Ads extraction
│   ├── fetcher.ts
│   ├── parser.ts
│   └── README.md
├── video-indexer/          # Azure video analysis
│   ├── client.ts
│   ├── extractors.ts
│   └── README.md
├── llm-synthesizer/        # LLM synthesis
│   ├── synthesizer.ts
│   ├── prompts.ts
│   └── README.md
└── orchestrator/           # Workflow coordination
    ├── orchestrator.ts
    ├── types.ts
    └── README.md
```

### Edge Functions
```
supabase/functions/
├── agent-workflow/         # Main orchestrator
├── mcp-firecrawl-tool/    # Firecrawl integration
├── meta-ads-extractor/    # Meta ads extraction
├── azure-video-analyzer/  # Video analysis
└── llm-synthesis-engine/  # LLM synthesis
```

### UI Components
```
src/components/agent/
├── AgentConsole.tsx        # Real-time console with logs
├── AgentInput.tsx          # Brand data input form
├── AgentPreview.tsx        # Results preview panel
├── AgentTimeline.tsx       # Execution timeline
└── WorkflowStepCard.tsx    # Individual step display
```

## 🚀 Quick Start

### 1. Configure Secrets
Required secrets in Supabase:
- `FIRECRAWL_API_KEY` - For deep research
- `AZURE_VIDEO_INDEXER_API_KEY` - For video analysis
- `AZURE_VIDEO_INDEXER_ACCOUNT_ID` - Azure account
- `LOVABLE_API_KEY` - Auto-configured for LLM

### 2. Access Agent Mode
Navigate to: `/app/agent-mode`

### 3. Start Workflow
1. Enter brand information
2. Provide competitor query
3. Click "Start Agent Workflow"
4. Monitor progress in Console tab
5. View results in Preview panel

## 📊 Workflow Steps

### Step 1: Deep Research (15% → 25%)
- Discovers 3-5 competitors
- Extracts Meta Ads Library URLs
- Gathers brand information

### Step 2: Meta Ads Extraction (25% → 50%)
- Fetches ad creatives
- Extracts video URLs, copy, CTAs
- Collects engagement data

### Step 3: Video Analysis (50% → 80%)
- Uploads videos to Azure
- Extracts transcripts and insights
- Analyzes visual elements

### Step 4: LLM Synthesis (80% → 100%)
- Merges all data sources
- Generates UGC scripts
- Provides recommendations

## 🎨 Features

### Real-time Updates
- Live progress tracking
- Step-by-step console logs
- Timeline visualization
- Instant preview updates

### Error Handling
- Automatic retries (max 2)
- Graceful degradation
- Detailed error messages
- Recovery mechanisms

### Data Output
- **UGC Scripts**: Complete video scripts with hooks, body, CTAs
- **Ad Analyses**: Detailed competitor ad breakdowns
- **Market Insights**: Trends and patterns
- **Recommendations**: Actionable next steps

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm run test:unit

# Integration tests  
npm run test:integration

# E2E tests
npm run test:e2e
```

### Manual Testing
See [Testing Guide](./agent-testing-guide.md) for detailed procedures.

## 📈 Performance

### Expected Timings
- Deep Research: < 30 seconds
- Meta Ads: < 20 seconds per competitor
- Video Analysis: < 60 seconds per video
- LLM Synthesis: < 30 seconds
- **Total**: 3-5 minutes typical

### Resource Usage
- Database connections: < 10 concurrent
- Memory: < 512MB per workflow
- API calls: ~10-20 per workflow

## 🔒 Security

### API Keys
- Stored securely in Supabase secrets
- Never exposed to client
- Rotated regularly

### Data Privacy
- User data isolated by user_id
- No PII in logs
- Competitor data anonymized

## 🐛 Troubleshooting

### Common Issues

**Workflow stuck at step**
→ Check edge function logs, verify API connectivity

**Real-time updates not showing**
→ Verify Supabase real-time enabled, check network

**Synthesis fails**
→ Check LOVABLE_API_KEY, verify token limits

**High latency**
→ Check API response times, optimize queries

See [Testing Guide](./agent-testing-guide.md) for detailed troubleshooting.

## 📚 Documentation

### Implementation Docs
- [Firecrawl MCP](./agent-firecrawl-implementation.md)
- [Meta Ads Extractor](./agent-meta-ads-implementation.md)
- [Video Indexer](./agent-video-indexer-implementation.md)
- [LLM Synthesizer](./agent-llm-synthesis-implementation.md)
- [Orchestrator](./agent-workflow-orchestrator.md)
- [UI Components](./agent-ui-implementation.md)

### Architecture Docs
- [Agent Architecture](./agent-architecture.md)
- [Competitor Architecture Analysis](./agent-competitor-architecture.md)
- [MCP Tools](./mcp-tools.md)
- [Memory Design](./memory-design.md)

### Testing & Deployment
- [Testing Guide](./agent-testing-guide.md)
- [Final Integration](./agent-final-integration.md)
- [API Design](./api-design.md)

## 🎯 Production Readiness

### ✅ Completed
- [x] All four integration layers
- [x] Complete orchestrator with retry logic
- [x] Real-time UI with console + timeline
- [x] Comprehensive error handling
- [x] Input validation
- [x] Database schema and migrations
- [x] Edge function deployment
- [x] Documentation complete
- [x] Testing guide
- [x] Performance optimization

### System Status
**Status**: ✅ Production Ready  
**Version**: 1.0.0  
**Last Updated**: 2025-11-24

## 🚀 Next Steps

### Phase 2 Enhancements
- Parallel processing for ads/videos
- Result caching layer
- PDF/CSV export
- Workflow templates
- Historical analysis

### Phase 3 Features
- Multi-brand comparison
- Trend analysis over time
- Automated recommendations
- Integration with video generation
- Scheduling and automation

## 🤝 Support

For issues or questions:
1. Check [Testing Guide](./agent-testing-guide.md) troubleshooting section
2. Review edge function logs in Supabase dashboard
3. Check [Final Integration](./agent-final-integration.md) for architecture details
4. Contact development team

## 📝 Version History

### v1.0.0 (2025-11-24)
- Initial production release
- Complete workflow integration
- Real-time UI implementation
- Comprehensive testing and documentation

---

**Built with**: React, TypeScript, Supabase, Lovable AI, Azure Video Indexer, Firecrawl
**Maintained by**: Development Team
