# Agent Workflow Testing Guide

## Overview

This document provides comprehensive testing procedures for the Agent Workflow system, covering unit tests, integration tests, edge cases, and regression testing.

## System Components

The Agent Workflow integrates four major components:
1. **Firecrawl MCP** - Deep competitor research
2. **Meta Ads Extractor** - Ad creative extraction
3. **Azure Video Indexer** - Video analysis
4. **LLM Synthesis Engine** - Insight generation

## Testing Levels

### 1. Unit Testing

#### Firecrawl MCP Tool Handler
```typescript
// Test cases:
- ✓ Valid query returns competitor data
- ✓ Empty query throws validation error
- ✓ Network timeout is handled gracefully
- ✓ Invalid API response is caught
- ✓ Rate limiting is handled
```

#### Meta Ads Fetcher
```typescript
// Test cases:
- ✓ Valid Meta ads URL returns creative data
- ✓ Invalid URL throws error
- ✓ No ads found returns empty array
- ✓ Video URL extraction works
- ✓ CTA text parsing is correct
```

#### Azure Video Indexer Client
```typescript
// Test cases:
- ✓ Video upload succeeds
- ✓ Processing status polling works
- ✓ Timeout after max wait time
- ✓ Invalid video URL is rejected
- ✓ Insights extraction is complete
```

#### LLM Synthesizer
```typescript
// Test cases:
- ✓ Valid input generates structured output
- ✓ Empty data is handled
- ✓ Token limits are respected
- ✓ API errors are caught and reported
- ✓ Prompt templates are correctly applied
```

### 2. Integration Testing

#### Full Workflow Execution
```typescript
// Test scenario: Complete workflow with valid inputs
Input: {
  brandName: "Test Brand",
  productCategory: "SaaS",
  targetAudience: "B2B Marketers",
  brandVoice: "Professional",
  keyMessages: ["Fast", "Reliable"],
  competitorQuery: "marketing automation SaaS competitors"
}

Expected outputs:
- ✓ Session created in agent_sessions table
- ✓ Execution logs created for each step
- ✓ Real-time updates broadcast via Supabase
- ✓ Final synthesis generated
- ✓ Session marked as completed
```

#### Error Recovery
```typescript
// Test scenario: Failure at each step
- ✓ Firecrawl failure - workflow stops, error logged
- ✓ Meta ads failure - workflow continues with empty ads
- ✓ Video analysis failure - workflow continues with empty insights
- ✓ LLM synthesis failure - workflow stops, error logged
```

#### Real-time Updates
```typescript
// Test scenario: UI receives updates
- ✓ Session state changes trigger UI updates
- ✓ Execution logs appear in console
- ✓ Progress bar updates correctly
- ✓ Preview panel shows synthesis output
```

### 3. Edge Case Testing

#### Input Validation
```typescript
// Edge cases:
- ✓ Empty brandName → Error
- ✓ Empty competitorQuery → Error
- ✓ Very long brandName (>500 chars) → Truncated
- ✓ Special characters in inputs → Sanitized
- ✓ Missing optional fields → Defaults applied
```

#### Network Conditions
```typescript
// Edge cases:
- ✓ Slow network → Timeout handling
- ✓ Intermittent connection → Retry logic
- ✓ Complete network failure → Error message
- ✓ API rate limits → Backoff and retry
```

#### Data Scenarios
```typescript
// Edge cases:
- ✓ No competitors found → Graceful message
- ✓ No Meta ads found → Continue with empty data
- ✓ No videos to analyze → Skip video step
- ✓ Large dataset (100+ ads) → Pagination
- ✓ Empty synthesis → Error handling
```

#### Concurrent Workflows
```typescript
// Edge cases:
- ✓ Multiple sessions from same user → Isolated
- ✓ Multiple sessions from different users → Independent
- ✓ Session cancellation → Cleanup resources
```

### 4. Performance Testing

#### Response Times
```typescript
// Expected timings:
- Deep Research: < 30s
- Meta Ads Extraction: < 20s (per competitor)
- Video Analysis: < 60s (per video)
- LLM Synthesis: < 30s
- Total Workflow: < 5 minutes
```

#### Resource Usage
```typescript
// Monitoring:
- Database connections: < 10 concurrent
- Memory usage: < 512MB per workflow
- API rate limits: Within provider limits
- Supabase real-time connections: Stable
```

### 5. Regression Testing

#### Existing Functionality
```typescript
// Verify no impact on:
- ✓ User authentication
- ✓ Project management
- ✓ Video generation (Omnihuman)
- ✓ Actor selection
- ✓ Landing page
- ✓ Settings page
- ✓ Admin dashboard
```

#### Database Integrity
```typescript
// Verify:
- ✓ No orphaned sessions
- ✓ No orphaned logs
- ✓ Proper foreign key relationships
- ✓ No data corruption
- ✓ Indexes functioning correctly
```

## Manual Testing Procedures

### Test Case 1: Happy Path
1. Navigate to `/app/agent-mode`
2. Enter valid brand information:
   - Brand Name: "Acme Corp"
   - Product Category: "SaaS"
   - Target Audience: "B2B Marketers"
   - Brand Voice: "Professional"
   - Key Messages: "Fast, Reliable, Secure"
   - Competitor Query: "marketing automation SaaS"
3. Click "Start Agent Workflow"
4. Observe:
   - Console shows step-by-step progress
   - Timeline tab displays execution history
   - Preview panel updates with synthesis
   - Success toast appears
5. Verify:
   - Session created in database
   - All logs present
   - Synthesis output complete

### Test Case 2: Minimal Input
1. Enter only required fields:
   - Brand Name: "Test"
   - Competitor Query: "SaaS"
2. Start workflow
3. Verify:
   - Defaults applied for optional fields
   - Workflow completes successfully

### Test Case 3: Invalid Input
1. Try to submit with:
   - Empty brand name → Error
   - Empty competitor query → Error
   - Very short query (1 char) → Error
2. Verify validation messages appear

### Test Case 4: Error Handling
1. Disconnect network
2. Start workflow
3. Verify:
   - Appropriate error message
   - Session marked as failed
   - UI shows error state

### Test Case 5: Workflow Cancellation
1. Start workflow
2. Immediately click "Stop"
3. Verify:
   - Session marked as cancelled
   - No further processing
   - Resources cleaned up

## Automated Test Scripts

### Setup
```bash
# Install dependencies
npm install --save-dev @testing-library/react vitest

# Run tests
npm run test
```

### Example Test Suite
```typescript
// tests/agent-workflow.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { AgentWorkflowOrchestrator } from '@/services/agent/orchestrator';

describe('Agent Workflow Orchestrator', () => {
  let orchestrator: AgentWorkflowOrchestrator;

  beforeEach(() => {
    orchestrator = new AgentWorkflowOrchestrator({
      firecrawlEndpoint: 'test-endpoint',
      // ... config
    });
  });

  it('should execute complete workflow', async () => {
    const result = await orchestrator.execute({
      brandName: 'Test Brand',
      productCategory: 'SaaS',
      targetAudience: 'B2B',
      brandVoice: 'Professional',
      keyMessages: ['Fast'],
      competitorQuery: 'test query',
    });

    expect(result.success).toBe(true);
    expect(result.synthesis).toBeDefined();
  });

  it('should handle missing competitor data', async () => {
    // Mock empty response
    const result = await orchestrator.execute({
      // ... input
    });

    expect(result.success).toBe(false);
    expect(result.error?.message).toContain('No competitors found');
  });
});
```

## Quality Assurance Checklist

### Pre-Release
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Edge cases handled
- [ ] Performance within acceptable limits
- [ ] No regression in existing features
- [ ] Error messages are user-friendly
- [ ] Logs are comprehensive
- [ ] Real-time updates work correctly
- [ ] Database migrations applied
- [ ] Documentation updated

### Post-Release Monitoring
- [ ] Monitor error rates
- [ ] Check workflow completion rates
- [ ] Review user feedback
- [ ] Monitor API usage/costs
- [ ] Check database performance
- [ ] Review real-time connection stability

## Known Limitations

1. **API Rate Limits**: Firecrawl, Azure, and LLM APIs have rate limits
2. **Video Size**: Large videos (>100MB) may timeout
3. **Concurrent Sessions**: Limited by Supabase real-time connections
4. **Processing Time**: Complex queries may take 5+ minutes

## Troubleshooting

### Issue: Workflow stuck at step
**Solution**: Check edge function logs, verify API connectivity

### Issue: Real-time updates not appearing
**Solution**: Verify Supabase real-time subscription, check network

### Issue: Synthesis fails
**Solution**: Check LLM API key, verify token limits, review prompt

### Issue: High latency
**Solution**: Check API response times, consider caching, optimize queries

## Continuous Improvement

- Collect user feedback
- Monitor error patterns
- Optimize slow steps
- Add new test cases
- Update documentation
- Enhance error messages
