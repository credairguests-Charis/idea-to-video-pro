/**
 * Azure Video Indexer Client
 * 
 * Handles authentication and API communication with Azure Video Indexer
 */

import {
  AzureVideoIndexerConfig,
  AccessTokenResponse,
  VideoUploadRequest,
  VideoUploadResponse,
  VideoStatus,
  VideoInsights,
  VideoIndexerError,
  VideoIndexerErrorCode,
  VideoIndexerResult,
} from "./types";

export class AzureVideoIndexerClient {
  private config: AzureVideoIndexerConfig;
  private baseUrl: string;
  private accountAccessToken: string | null = null;
  private tokenExpiresAt: number | null = null;

  constructor(config: AzureVideoIndexerConfig) {
    this.config = config;
    this.baseUrl = "https://api.videoindexer.ai";
  }

  /**
   * Get account access token
   */
  private async getAccountAccessToken(): Promise<string> {
    console.log("[VideoIndexerClient] Getting account access token");

    // Return cached token if still valid
    if (this.accountAccessToken && this.tokenExpiresAt) {
      if (Date.now() < this.tokenExpiresAt - 60000) { // 1 minute buffer
        console.log("[VideoIndexerClient] Using cached access token");
        return this.accountAccessToken;
      }
    }

    try {
      const url = `${this.baseUrl}/auth/${this.config.location}/Accounts/${this.config.accountId}/AccessToken?allowEdit=true`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": this.config.apiKey,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new VideoIndexerError(
          VideoIndexerErrorCode.AUTHENTICATION_FAILED,
          `Failed to get access token: ${response.status} ${response.statusText}`,
          { status: response.status, error: errorText }
        );
      }

      const token = await response.text();
      // Remove quotes if present
      this.accountAccessToken = token.replace(/"/g, "");
      
      // Tokens typically expire in 1 hour
      this.tokenExpiresAt = Date.now() + 3600000;

      console.log("[VideoIndexerClient] Access token obtained successfully");
      return this.accountAccessToken;
    } catch (error) {
      console.error("[VideoIndexerClient] Authentication failed:", error);
      
      if (error instanceof VideoIndexerError) {
        throw error;
      }
      
      throw new VideoIndexerError(
        VideoIndexerErrorCode.AUTHENTICATION_FAILED,
        error instanceof Error ? error.message : "Unknown authentication error"
      );
    }
  }

  /**
   * Get video-specific access token
   */
  private async getVideoAccessToken(videoId: string): Promise<string> {
    console.log("[VideoIndexerClient] Getting video access token for:", videoId);

    try {
      const url = `${this.baseUrl}/auth/${this.config.location}/Accounts/${this.config.accountId}/Videos/${videoId}/AccessToken?allowEdit=true`;
      
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Ocp-Apim-Subscription-Key": this.config.apiKey,
        },
      });

      if (!response.ok) {
        throw new VideoIndexerError(
          VideoIndexerErrorCode.AUTHENTICATION_FAILED,
          `Failed to get video access token: ${response.status}`
        );
      }

      const token = await response.text();
      return token.replace(/"/g, "");
    } catch (error) {
      console.error("[VideoIndexerClient] Failed to get video access token:", error);
      throw error;
    }
  }

  /**
   * Upload video by URL
   */
  async uploadVideo(request: VideoUploadRequest): Promise<VideoIndexerResult<VideoUploadResponse>> {
    const startTime = Date.now();
    console.log("[VideoIndexerClient] Uploading video:", request.videoName);

    try {
      // Get access token
      const accessToken = await this.getAccountAccessToken();

      // Construct upload URL
      const params = new URLSearchParams({
        accessToken,
        name: request.videoName,
        privacy: request.privacy || "Private",
        priority: request.priority || "Normal",
        videoUrl: request.videoUrl,
      });

      if (request.description) {
        params.append("description", request.description);
      }
      
      if (request.language) {
        params.append("language", request.language);
      }
      
      if (request.indexingPreset) {
        params.append("indexingPreset", request.indexingPreset);
      }

      const url = `${this.baseUrl}/${this.config.location}/Accounts/${this.config.accountId}/Videos?${params.toString()}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new VideoIndexerError(
          VideoIndexerErrorCode.UPLOAD_FAILED,
          `Video upload failed: ${response.status}`,
          { status: response.status, error: errorText }
        );
      }

      const data: VideoUploadResponse = await response.json();
      
      console.log("[VideoIndexerClient] Video uploaded successfully:", data.id);

      return {
        success: true,
        data,
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error("[VideoIndexerClient] Upload failed:", error);

      if (error instanceof VideoIndexerError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
            details: error.details,
          },
          duration_ms: Date.now() - startTime,
        };
      }

      return {
        success: false,
        error: {
          code: VideoIndexerErrorCode.UPLOAD_FAILED,
          message: error instanceof Error ? error.message : "Unknown upload error",
        },
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Get video processing status
   */
  async getVideoStatus(videoId: string): Promise<VideoIndexerResult<VideoStatus>> {
    const startTime = Date.now();
    console.log("[VideoIndexerClient] Checking video status:", videoId);

    try {
      const accessToken = await this.getAccountAccessToken();
      const url = `${this.baseUrl}/${this.config.location}/Accounts/${this.config.accountId}/Videos/${videoId}/Index?accessToken=${accessToken}`;

      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        throw new VideoIndexerError(
          VideoIndexerErrorCode.VIDEO_NOT_FOUND,
          `Failed to get video status: ${response.status}`
        );
      }

      const data = await response.json();

      const status: VideoStatus = {
        videoId: data.id,
        state: data.state,
        processingProgress: data.processingProgress || "0%",
        errorType: data.failureCode,
        errorMessage: data.failureMessage,
      };

      return {
        success: true,
        data: status,
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error("[VideoIndexerClient] Failed to get video status:", error);

      if (error instanceof VideoIndexerError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          duration_ms: Date.now() - startTime,
        };
      }

      return {
        success: false,
        error: {
          code: VideoIndexerErrorCode.NETWORK_ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Get video insights (full data)
   */
  async getVideoInsights(videoId: string): Promise<VideoIndexerResult<VideoInsights>> {
    const startTime = Date.now();
    console.log("[VideoIndexerClient] Fetching video insights:", videoId);

    try {
      const accessToken = await this.getVideoAccessToken(videoId);
      const url = `${this.baseUrl}/${this.config.location}/Accounts/${this.config.accountId}/Videos/${videoId}/Index?accessToken=${accessToken}`;

      const response = await fetch(url, {
        method: "GET",
      });

      if (!response.ok) {
        throw new VideoIndexerError(
          VideoIndexerErrorCode.VIDEO_NOT_FOUND,
          `Failed to get video insights: ${response.status}`
        );
      }

      const data = await response.json();

      console.log("[VideoIndexerClient] Video insights retrieved successfully");

      return {
        success: true,
        data: data as VideoInsights,
        duration_ms: Date.now() - startTime,
      };
    } catch (error) {
      console.error("[VideoIndexerClient] Failed to get video insights:", error);

      if (error instanceof VideoIndexerError) {
        return {
          success: false,
          error: {
            code: error.code,
            message: error.message,
          },
          duration_ms: Date.now() - startTime,
        };
      }

      return {
        success: false,
        error: {
          code: VideoIndexerErrorCode.NETWORK_ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        },
        duration_ms: Date.now() - startTime,
      };
    }
  }

  /**
   * Poll video until processing is complete
   */
  async waitForProcessing(
    videoId: string,
    options: {
      maxWaitTime?: number; // milliseconds
      pollInterval?: number; // milliseconds
    } = {}
  ): Promise<VideoIndexerResult<VideoInsights>> {
    const maxWaitTime = options.maxWaitTime || 600000; // 10 minutes default
    const pollInterval = options.pollInterval || 10000; // 10 seconds default
    const startTime = Date.now();

    console.log("[VideoIndexerClient] Waiting for video processing:", videoId);

    while (Date.now() - startTime < maxWaitTime) {
      const statusResult = await this.getVideoStatus(videoId);

      if (!statusResult.success) {
        return {
          success: false,
          error: statusResult.error,
          duration_ms: Date.now() - startTime,
        };
      }

      const status = statusResult.data!;

      console.log(`[VideoIndexerClient] Status: ${status.state} - ${status.processingProgress}`);

      if (status.state === "Processed") {
        console.log("[VideoIndexerClient] Video processing complete");
        return await this.getVideoInsights(videoId);
      }

      if (status.state === "Failed") {
        return {
          success: false,
          error: {
            code: VideoIndexerErrorCode.PROCESSING_FAILED,
            message: status.errorMessage || "Video processing failed",
            details: { errorType: status.errorType },
          },
          duration_ms: Date.now() - startTime,
        };
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    // Timeout
    return {
      success: false,
      error: {
        code: VideoIndexerErrorCode.TIMEOUT,
        message: "Video processing timeout exceeded",
      },
      duration_ms: Date.now() - startTime,
    };
  }
}
