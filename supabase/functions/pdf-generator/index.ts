import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PdfGeneratorInput {
  auditData: any;
  brandName: string;
  sessionId: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const browserlessApiKey = Deno.env.get("BROWSERLESS_API_KEY");
  
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const body = await req.json();
    const input: PdfGeneratorInput = body;

    if (!input.auditData || !input.brandName) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing auditData or brandName" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[PDF-GENERATOR] Generating report for: ${input.brandName}`);

    // Generate HTML report
    const htmlContent = generateHtmlReport(input.auditData, input.brandName);

    let pdfUrl: string | null = null;

    // Method 1: Use Browserless.io to generate PDF
    if (browserlessApiKey) {
      try {
        const pdfResponse = await fetch(`https://chrome.browserless.io/pdf?token=${browserlessApiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html: htmlContent,
            options: {
              format: "A4",
              printBackground: true,
              margin: { top: "20mm", right: "20mm", bottom: "20mm", left: "20mm" },
            },
          }),
        });

        if (pdfResponse.ok) {
          const pdfBuffer = await pdfResponse.arrayBuffer();
          const pdfPath = `reports/${input.sessionId}/${input.brandName.replace(/[^a-zA-Z0-9]/g, "_")}_audit_${Date.now()}.pdf`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from("agent-uploads")
            .upload(pdfPath, new Uint8Array(pdfBuffer), {
              contentType: "application/pdf",
              upsert: true,
            });

          if (!uploadError) {
            const { data: publicUrl } = supabase.storage
              .from("agent-uploads")
              .getPublicUrl(pdfPath);
            pdfUrl = publicUrl.publicUrl;
          }
        }
      } catch (browserlessError) {
        console.error(`[PDF-GENERATOR] Browserless error:`, browserlessError);
      }
    }

    // Method 2: Store HTML report if PDF generation fails
    if (!pdfUrl) {
      console.log(`[PDF-GENERATOR] Storing HTML report as fallback`);
      const htmlPath = `reports/${input.sessionId}/${input.brandName.replace(/[^a-zA-Z0-9]/g, "_")}_audit_${Date.now()}.html`;
      
      const { error: uploadError } = await supabase.storage
        .from("agent-uploads")
        .upload(htmlPath, new TextEncoder().encode(htmlContent), {
          contentType: "text/html",
          upsert: true,
        });

      if (!uploadError) {
        const { data: publicUrl } = supabase.storage
          .from("agent-uploads")
          .getPublicUrl(htmlPath);
        pdfUrl = publicUrl.publicUrl;
      }
    }

    // Update the audit report record
    if (pdfUrl) {
      await supabase.from("ad_audit_reports")
        .update({ report_url: pdfUrl })
        .eq("session_id", input.sessionId);
    }

    console.log(`[PDF-GENERATOR] Report generated: ${pdfUrl}`);

    return new Response(
      JSON.stringify({
        success: true,
        reportUrl: pdfUrl,
        format: pdfUrl?.endsWith(".pdf") ? "pdf" : "html",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error(`[PDF-GENERATOR] Error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function generateHtmlReport(auditData: any, brandName: string): string {
  const audit = auditData.auditReport || auditData;
  const hookAnalysis = audit.hookAnalysis || {};
  const visualAnalysis = audit.visualAnalysis || {};
  const ctaAnalysis = audit.ctaAnalysis || {};
  const recommendations = audit.recommendations || [];
  const scriptBreakdown = audit.scriptBreakdown || [];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ad Audit Report - ${brandName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', system-ui, sans-serif; 
      line-height: 1.6; 
      color: #1a1a1a; 
      background: #f8f9fa;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 40px 20px; }
    .header { 
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 60px 40px;
      border-radius: 16px;
      margin-bottom: 32px;
    }
    .header h1 { font-size: 2.5rem; margin-bottom: 8px; }
    .header .subtitle { opacity: 0.9; font-size: 1.1rem; }
    .score-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(255,255,255,0.2);
      padding: 12px 24px;
      border-radius: 50px;
      margin-top: 20px;
      font-size: 1.5rem;
      font-weight: bold;
    }
    .section {
      background: white;
      border-radius: 12px;
      padding: 32px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    }
    .section h2 {
      font-size: 1.5rem;
      margin-bottom: 20px;
      padding-bottom: 12px;
      border-bottom: 2px solid #eee;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin: 20px 0;
    }
    .metric {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
    }
    .metric-value {
      font-size: 2rem;
      font-weight: bold;
      color: #667eea;
    }
    .metric-label {
      font-size: 0.875rem;
      color: #666;
      margin-top: 4px;
    }
    .recommendation {
      border-left: 4px solid #667eea;
      padding: 20px;
      margin: 16px 0;
      background: #f8f9fa;
      border-radius: 0 8px 8px 0;
    }
    .recommendation.performance { border-color: #10b981; }
    .recommendation.cost { border-color: #f59e0b; }
    .recommendation h4 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .tag {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .tag.high { background: #fee2e2; color: #dc2626; }
    .tag.medium { background: #fef3c7; color: #d97706; }
    .tag.low { background: #d1fae5; color: #059669; }
    .script-section {
      padding: 16px;
      margin: 12px 0;
      background: #f8f9fa;
      border-radius: 8px;
    }
    .script-section .label {
      font-weight: 600;
      color: #667eea;
      text-transform: uppercase;
      font-size: 0.75rem;
      margin-bottom: 8px;
    }
    .strengths-weaknesses {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }
    .list-item {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
    }
    .list-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 14px;
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .strength::before { background: #10b981; }
    .weakness::before { background: #ef4444; }
    .footer {
      text-align: center;
      padding: 32px;
      color: #666;
      font-size: 0.875rem;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Ad Creative Audit</h1>
      <p class="subtitle">${brandName} - Meta Ads Performance Analysis</p>
      <div class="score-badge">
        <span>Overall Score:</span>
        <span>${audit.overallScore || 'N/A'}/100</span>
      </div>
    </div>

    <div class="section">
      <h2>🎣 Hook Analysis</h2>
      <p><strong>Hook Type:</strong> ${hookAnalysis.hookType || 'Not identified'}</p>
      <p style="margin: 12px 0;">${hookAnalysis.hookText || 'No hook text available'}</p>
      <div class="metric-grid">
        <div class="metric">
          <div class="metric-value">${hookAnalysis.effectiveness || 'N/A'}</div>
          <div class="metric-label">Effectiveness</div>
        </div>
        <div class="metric">
          <div class="metric-value">${hookAnalysis.scrollStoppingScore || 'N/A'}</div>
          <div class="metric-label">Scroll-Stopping</div>
        </div>
      </div>
      <p><strong>Why it works:</strong> ${hookAnalysis.whyItWorks || 'Analysis not available'}</p>
    </div>

    <div class="section">
      <h2>👁️ Visual Analysis</h2>
      <div class="metric-grid">
        <div class="metric">
          <div class="metric-value">${visualAnalysis.quality || 'N/A'}</div>
          <div class="metric-label">Quality</div>
        </div>
        <div class="metric">
          <div class="metric-value">${visualAnalysis.brandConsistency || 'N/A'}</div>
          <div class="metric-label">Brand Consistency</div>
        </div>
        <div class="metric">
          <div class="metric-value">${visualAnalysis.attentionGrabbing || 'N/A'}</div>
          <div class="metric-label">Attention</div>
        </div>
      </div>
      ${visualAnalysis.keyVisualElements?.length ? `
      <p><strong>Key Visual Elements:</strong></p>
      <ul style="margin-left: 20px; margin-top: 8px;">
        ${visualAnalysis.keyVisualElements.map((el: string) => `<li>${el}</li>`).join('')}
      </ul>
      ` : ''}
    </div>

    <div class="section">
      <h2>📝 Script Breakdown</h2>
      ${scriptBreakdown.length ? scriptBreakdown.map((section: any) => `
      <div class="script-section">
        <div class="label">${section.section}</div>
        <p>${section.content}</p>
        <p style="margin-top: 8px; font-size: 0.875rem; color: #666;">
          Effectiveness: ${section.effectiveness}/10 ${section.notes ? `• ${section.notes}` : ''}
        </p>
      </div>
      `).join('') : '<p>No script breakdown available</p>'}
    </div>

    <div class="section">
      <h2>🎯 Call-to-Action Analysis</h2>
      <p><strong>CTA Text:</strong> "${ctaAnalysis.ctaText || 'Not identified'}"</p>
      <div class="metric-grid">
        <div class="metric">
          <div class="metric-value">${ctaAnalysis.clarity || 'N/A'}</div>
          <div class="metric-label">Clarity</div>
        </div>
        <div class="metric">
          <div class="metric-value">${ctaAnalysis.urgency || 'N/A'}</div>
          <div class="metric-label">Urgency</div>
        </div>
        <div class="metric">
          <div class="metric-value">${ctaAnalysis.actionability || 'N/A'}</div>
          <div class="metric-label">Actionability</div>
        </div>
      </div>
    </div>

    <div class="section">
      <h2>💡 Recommendations</h2>
      ${recommendations.length ? recommendations.map((rec: any) => `
      <div class="recommendation ${rec.type === 'performance_lift' ? 'performance' : 'cost'}">
        <h4>
          ${rec.type === 'performance_lift' ? '📈' : '💰'} ${rec.title}
          <span class="tag ${rec.priority}">${rec.priority}</span>
        </h4>
        <p>${rec.description}</p>
        <p style="margin-top: 8px; font-size: 0.875rem; color: #666;">
          <strong>Expected Impact:</strong> ${rec.expectedImpact}
        </p>
        ${rec.implementation ? `<p style="margin-top: 8px; font-size: 0.875rem;"><strong>How to implement:</strong> ${rec.implementation}</p>` : ''}
      </div>
      `).join('') : '<p>No recommendations available</p>'}
    </div>

    <div class="section">
      <h2>📊 Summary</h2>
      <p style="margin-bottom: 24px;">${audit.summary || 'No summary available'}</p>
      
      <div class="strengths-weaknesses">
        <div>
          <h4 style="color: #10b981; margin-bottom: 12px;">✅ Top Strengths</h4>
          ${audit.topStrengths?.length ? audit.topStrengths.map((s: string) => `
          <div class="list-item strength">${s}</div>
          `).join('') : '<p>None identified</p>'}
        </div>
        <div>
          <h4 style="color: #ef4444; margin-bottom: 12px;">⚠️ Critical Weaknesses</h4>
          ${audit.criticalWeaknesses?.length ? audit.criticalWeaknesses.map((w: string) => `
          <div class="list-item weakness">${w}</div>
          `).join('') : '<p>None identified</p>'}
        </div>
      </div>
    </div>

    <div class="footer">
      <p>Generated by Charis AI • ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
    </div>
  </div>
</body>
</html>`;
}
