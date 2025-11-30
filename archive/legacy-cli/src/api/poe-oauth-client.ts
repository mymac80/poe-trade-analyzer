import axios from 'axios';
import { PoeConfig } from '../models/types';

/**
 * OAuth 2.1 client for Path of Exile API
 * Uses official OAuth flow instead of session cookies
 */
export class PoeOAuthClient {
  private config: PoeConfig;
  private clientId: string;
  private clientSecret: string;
  private accessToken: string | null = null;
  private redirectUri: string = 'http://localhost:3000/callback';

  constructor(config: PoeConfig, clientId: string, clientSecret: string) {
    this.config = config;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Step 1: Generate the authorization URL
   * User needs to visit this URL in their browser to authorize the app
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      scope: 'account:stashes account:characters',
      state: Math.random().toString(36).substring(7), // Random state for security
      redirect_uri: this.redirectUri
    });

    const authUrl = `https://www.pathofexile.com/oauth/authorize?${params}`;
    return authUrl;
  }

  /**
   * Step 2: Exchange authorization code for access token
   * Call this after user authorizes and you get the code from the redirect
   */
  async exchangeCodeForToken(code: string): Promise<void> {
    try {
      const response = await axios.post(
        'https://www.pathofexile.com/oauth/token',
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: this.redirectUri
        },
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      console.log('✓ Successfully obtained access token');
      console.log('Token:', this.accessToken);
    } catch (error: any) {
      console.error('Failed to exchange code for token:', error.response?.data || error.message);
      throw new Error('OAuth token exchange failed');
    }
  }

  /**
   * Step 3: Test the access token by fetching user profile
   */
  async testAuthentication(): Promise<void> {
    if (!this.accessToken) {
      throw new Error('No access token available. Call exchangeCodeForToken first.');
    }

    try {
      const response = await axios.get('https://api.pathofexile.com/profile', {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`
        }
      });

      console.log('✓ Authentication successful!');
      console.log('Profile data:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
      console.error('Authentication test failed:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with access token');
    }
  }

  /**
   * Get the current access token
   */
  getAccessToken(): string | null {
    return this.accessToken;
  }
}
