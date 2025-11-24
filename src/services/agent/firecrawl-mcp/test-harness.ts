/**
 * Firecrawl MCP Integration - Test Harness
 * 
 * Minimal test suite for MCP client and tool handler
 * Run this to validate the integration
 */

import { FirecrawlMCPClient } from "./client";
import { FirecrawlMCPToolHandler } from "./tool-handler";
import { FirecrawlDeepResearchQuery } from "./types";

// ============= Test Configuration =============

const TEST_CONFIG = {
  // These should match your Supabase secrets
  endpoint: "https://strata.klavis.ai/mcp/",
  bearerToken: "YOUR_BEARER_TOKEN_HERE", // Replace in actual test
  testQueries: [
    {
      query: "top 3 DTC skincare brands on Meta Ads",
      max_results: 3,
      include_video_urls: true,
    },
    {
      query: "fitness supplement video ads on Facebook",
      max_results: 2,
      include_video_urls: true,
    },
  ],
};

// ============= Test Functions =============

/**
 * Test 1: MCP Client Connection
 */
async function testConnection(client: FirecrawlMCPClient): Promise<boolean> {
  console.log("\n=== Test 1: MCP Client Connection ===");
  
  try {
    const isConnected = await client.testConnection();
    console.log(`✅ Connection test: ${isConnected ? "PASSED" : "FAILED"}`);
    return isConnected;
  } catch (error) {
    console.error("❌ Connection test FAILED:", error);
    return false;
  }
}

/**
 * Test 2: List Available Tools
 */
async function testListTools(client: FirecrawlMCPClient): Promise<boolean> {
  console.log("\n=== Test 2: List Available MCP Tools ===");
  
  try {
    const tools = await client.listTools();
    console.log("✅ Tools retrieved:", JSON.stringify(tools, null, 2));
    return true;
  } catch (error) {
    console.error("❌ List tools FAILED:", error);
    return false;
  }
}

/**
 * Test 3: Deep Research Query
 */
async function testDeepResearch(
  client: FirecrawlMCPClient,
  query: FirecrawlDeepResearchQuery
): Promise<boolean> {
  console.log("\n=== Test 3: Deep Research Query ===");
  console.log("Query:", query);
  
  try {
    const result = await client.deepResearch(query);
    
    console.log("✅ Deep research SUCCESS");
    console.log(`   Competitors found: ${result.competitors.length}`);
    console.log(`   Total video ads: ${result.competitors.reduce((sum, c) => sum + c.video_ads.length, 0)}`);
    
    // Display competitor details
    result.competitors.forEach((comp, idx) => {
      console.log(`\n   Competitor ${idx + 1}: ${comp.brand_name}`);
      console.log(`   - Meta Ads URL: ${comp.meta_ads_library_url}`);
      console.log(`   - Video Ads: ${comp.video_ads.length}`);
      
      comp.video_ads.forEach((ad, adIdx) => {
        console.log(`     Ad ${adIdx + 1}:`);
        console.log(`     - Video URL: ${ad.video_url}`);
        console.log(`     - Copy: ${ad.ad_copy?.substring(0, 50)}...`);
        console.log(`     - CTA: ${ad.cta_button}`);
      });
    });
    
    return true;
  } catch (error) {
    console.error("❌ Deep research FAILED:", error);
    return false;
  }
}

/**
 * Test 4: Tool Handler Integration
 */
async function testToolHandler(
  handler: FirecrawlMCPToolHandler,
  query: FirecrawlDeepResearchQuery
): Promise<boolean> {
  console.log("\n=== Test 4: Tool Handler Integration ===");
  
  try {
    const result = await handler.executeDeepResearch(query);
    
    if (result.success) {
      console.log("✅ Tool handler SUCCESS");
      console.log(`   Duration: ${result.duration_ms}ms`);
      console.log(`   Competitors: ${result.data?.competitors.length}`);
      return true;
    } else {
      console.error("❌ Tool handler returned error:", result.error);
      console.log(`   Fallback action: ${handler.getFallbackAction(result.error?.code || "UNKNOWN_ERROR")}`);
      return false;
    }
  } catch (error) {
    console.error("❌ Tool handler FAILED:", error);
    return false;
  }
}

/**
 * Test 5: Error Handling
 */
async function testErrorHandling(client: FirecrawlMCPClient): Promise<boolean> {
  console.log("\n=== Test 5: Error Handling ===");
  
  try {
    // Test with invalid query (empty)
    await client.deepResearch({ query: "" });
    console.log("⚠️  Expected error but got success (check validation)");
    return false;
  } catch (error) {
    console.log("✅ Error handling works:", error instanceof Error ? error.message : error);
    return true;
  }
}

// ============= Main Test Runner =============

export async function runAllTests(
  endpoint?: string,
  bearerToken?: string
): Promise<void> {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║   Firecrawl MCP Integration - Test Harness                ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  
  const actualEndpoint = endpoint || TEST_CONFIG.endpoint;
  const actualToken = bearerToken || TEST_CONFIG.bearerToken;
  
  if (actualToken === "YOUR_BEARER_TOKEN_HERE") {
    console.error("\n❌ ERROR: Please set bearerToken in test configuration");
    return;
  }
  
  // Initialize client and handler
  const client = new FirecrawlMCPClient({
    endpoint: actualEndpoint,
    bearerToken: actualToken,
    timeout: 60000,
    maxRetries: 2,
  });
  
  const handler = new FirecrawlMCPToolHandler(actualEndpoint, actualToken);
  
  // Run tests
  const results = {
    connection: await testConnection(client),
    listTools: await testListTools(client),
    deepResearch: await testDeepResearch(client, TEST_CONFIG.testQueries[0]),
    toolHandler: await testToolHandler(handler, TEST_CONFIG.testQueries[1]),
    errorHandling: await testErrorHandling(client),
  };
  
  // Summary
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║   Test Summary                                             ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([name, result]) => {
    const status = result ? "✅ PASS" : "❌ FAIL";
    console.log(`${status}  ${name}`);
  });
  
  console.log(`\n${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log("\n🎉 All tests passed! MCP integration is working correctly.");
  } else {
    console.log("\n⚠️  Some tests failed. Check logs above for details.");
  }
}

/**
 * Quick test - runs one deep research query
 */
export async function quickTest(
  query: string,
  endpoint?: string,
  bearerToken?: string
): Promise<void> {
  const actualEndpoint = endpoint || TEST_CONFIG.endpoint;
  const actualToken = bearerToken || TEST_CONFIG.bearerToken;
  
  if (actualToken === "YOUR_BEARER_TOKEN_HERE") {
    console.error("❌ ERROR: Please provide bearerToken");
    return;
  }
  
  const client = new FirecrawlMCPClient({
    endpoint: actualEndpoint,
    bearerToken: actualToken,
  });
  
  console.log("🔍 Running quick test with query:", query);
  await testDeepResearch(client, { query });
}
