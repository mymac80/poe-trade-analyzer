import { PoeOAuthClient } from './api/poe-oauth-client';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Test script for OAuth authentication flow
 *
 * Steps:
 * 1. Get CLIENT_ID and CLIENT_SECRET from environment
 * 2. Generate authorization URL
 * 3. User visits URL and authorizes
 * 4. User pastes the authorization code
 * 5. Exchange code for access token
 * 6. Test the token
 */
async function testOAuthFlow() {
  // Get OAuth credentials from environment
  const clientId = process.env.POE_CLIENT_ID;
  const clientSecret = process.env.POE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('❌ Missing OAuth credentials!');
    console.error('\nPlease add the following to your .env file:');
    console.error('POE_CLIENT_ID=your_client_id_here');
    console.error('POE_CLIENT_SECRET=your_client_secret_here');
    console.error('\nTo get these credentials:');
    console.error('1. Go to https://www.pathofexile.com/developer/apps');
    console.error('2. Create a new OAuth application');
    console.error('3. Set redirect URI to: http://localhost:3000/callback');
    console.error('4. Copy the Client ID and Client Secret to .env');
    process.exit(1);
  }

  console.log('=== POE OAuth Authentication Test ===\n');

  // Create a minimal config object (not used in OAuth flow, but needed for constructor)
  const dummyConfig = {
    accountName: process.env.POE_ACCOUNT_NAME || '',
    league: process.env.POE_LEAGUE || 'Standard',
    realm: process.env.POE_REALM || 'pc',
    poesessid: '',
    stashTabIndices: [],
    minValueChaos: 5
  };

  // Create OAuth client
  const oauthClient = new PoeOAuthClient(dummyConfig, clientId, clientSecret);

  // Step 1: Get authorization URL
  const authUrl = oauthClient.getAuthorizationUrl();
  console.log('Step 1: Authorization URL generated');
  console.log('\n📌 Please visit this URL in your browser:\n');
  console.log(authUrl);
  console.log('\n📌 After authorizing, you will be redirected to a localhost URL.');
  console.log('📌 The URL will contain a "code" parameter.');
  console.log('📌 Copy the entire URL and paste it below.\n');

  // Step 2: Get the authorization code from user
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const redirectUrl = await new Promise<string>((resolve) => {
    rl.question('Paste the redirect URL here: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  // Extract code from URL
  const urlParams = new URLSearchParams(redirectUrl.split('?')[1]);
  const code = urlParams.get('code');

  if (!code) {
    console.error('❌ No authorization code found in URL');
    console.error('Make sure you pasted the full redirect URL');
    process.exit(1);
  }

  console.log('\n✓ Authorization code extracted:', code.substring(0, 20) + '...');

  // Step 3: Exchange code for access token
  console.log('\nStep 2: Exchanging authorization code for access token...');
  await oauthClient.exchangeCodeForToken(code);

  // Step 4: Test the token
  console.log('\nStep 3: Testing access token...');
  await oauthClient.testAuthentication();

  console.log('\n✅ OAuth authentication flow completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Save your access token securely');
  console.log('2. Use it to fetch stash data');
}

// Run the test
testOAuthFlow().catch((error) => {
  console.error('\n❌ OAuth test failed:', error.message);
  process.exit(1);
});
