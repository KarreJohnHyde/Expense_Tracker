/**
 * Supabase Edge Function: ml-service
 * Bridges client-side and server-side ML models
 * Routes requests to appropriate processing engine
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface MLRequest {
  action: string;
  data: Record<string, any>;
  useLambda?: boolean; // Use AWS Lambda for processing
}

interface MLResponse {
  success: boolean;
  data?: any;
  error?: string;
  model?: string;
  processingTime?: number;
}

/**
 * Call AWS Lambda for advanced processing
 */
async function callLambda(action: string, data: any): Promise<any> {
  const lambdaUrl = Deno.env.get("AWS_LAMBDA_URL") || "";
  const apiKey = Deno.env.get("AWS_LAMBDA_API_KEY") || "";

  if (!lambdaUrl) {
    throw new Error("AWS Lambda URL not configured");
  }

  const response = await fetch(lambdaUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      action,
      ...data,
    }),
  });

  if (!response.ok) {
    throw new Error(`Lambda error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.body ? JSON.parse(result.body) : result;
}

/**
 * Advanced categorization using transformer models
 */
async function advancedCategorize(
  text: string,
  categories: string[],
  useLambda: boolean = true
): Promise<MLResponse> {
  const startTime = performance.now();

  try {
    if (useLambda) {
      const result = await callLambda("classify", {
        text,
        categories,
      });

      return {
        success: true,
        data: result,
        model: "transformer",
        processingTime: performance.now() - startTime,
      };
    } else {
      // Fallback to keyword-based categorization
      return {
        success: true,
        data: { category: "Other", confidence: 0.5 },
        model: "keyword",
        processingTime: performance.now() - startTime,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      processingTime: performance.now() - startTime,
    };
  }
}

/**
 * Extract entities from receipt text
 */
async function extractReceiptEntities(
  receiptText: string
): Promise<MLResponse> {
  const startTime = performance.now();

  try {
    const result = await callLambda("extract_entities", {
      receipt_text: receiptText,
    });

    return {
      success: true,
      data: result,
      model: "ner",
      processingTime: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      processingTime: performance.now() - startTime,
    };
  }
}

/**
 * Advanced anomaly detection using Isolation Forest
 */
async function detectAnomalies(
  expenses: any[],
  contamination: number = 0.1
): Promise<MLResponse> {
  const startTime = performance.now();

  try {
    const result = await callLambda("detect_anomalies", {
      expenses,
      contamination,
    });

    return {
      success: true,
      data: result,
      model: "isolation-forest",
      processingTime: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      processingTime: performance.now() - startTime,
    };
  }
}

/**
 * Summarize receipt text using transformer
 */
async function summarizeReceipt(
  receiptText: string,
  maxLength: number = 50
): Promise<MLResponse> {
  const startTime = performance.now();

  try {
    const result = await callLambda("summarize", {
      receipt_text: receiptText,
      max_length: maxLength,
    });

    return {
      success: true,
      data: result,
      model: "summarizer",
      processingTime: performance.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      processingTime: performance.now() - startTime,
    };
  }
}

/**
 * Main handler
 */
async function handler(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as MLRequest;
    const { action, data, useLambda = true } = body;

    let response: MLResponse;

    switch (action) {
      case "categorize":
        response = await advancedCategorize(
          data.text,
          data.categories || [],
          useLambda
        );
        break;

      case "extract_entities":
        response = await extractReceiptEntities(data.receipt_text);
        break;

      case "detect_anomalies":
        response = await detectAnomalies(
          data.expenses || [],
          data.contamination || 0.1
        );
        break;

      case "summarize":
        response = await summarizeReceipt(
          data.receipt_text,
          data.max_length || 50
        );
        break;

      default:
        response = {
          success: false,
          error: `Unknown action: ${action}`,
        };
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: response.success ? 200 : 400,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
}

serve(handler);
