import { type NextRequest, NextResponse } from 'next/server';
import { 
    getOAuthAppByClientId, 
    getAuthorizationCode, 
    deleteAuthorizationCode,
    createRefreshToken,
    getRefreshToken,
} from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const getJwtSecretOrThrow = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not configured on the server.');
  }
  return secret;
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const grantType = formData.get('grant_type');
    const clientId = formData.get('client_id') as string;
    const clientSecret = formData.get('client_secret') as string;

    if (!clientId || !clientSecret) {
        return NextResponse.json({ error: 'invalid_client', error_description: 'Client credentials are required.' }, { status: 401 });
    }
    
    // Fetch app and verify secret
    const app = await getOAuthAppByClientId(clientId, true);
    if (!app) {
        return NextResponse.json({ error: 'invalid_client', error_description: 'Client not found.' }, { status: 401 });
    }
    const isSecretValid = await bcrypt.compare(clientSecret, app.clientSecretHashed!);
    if (!isSecretValid) {
        return NextResponse.json({ error: 'invalid_client', error_description: 'Invalid client secret.' }, { status: 401 });
    }


    if (grantType === 'authorization_code') {
      const code = formData.get('code') as string;
      const redirectUri = formData.get('redirect_uri') as string;
      
      if (!code || !redirectUri) {
          return NextResponse.json({ error: 'invalid_request', error_description: 'Missing code or redirect_uri.' }, { status: 400 });
      }

      const authCode = await getAuthorizationCode(code);
      if (!authCode || authCode.clientId !== clientId || authCode.redirectUri !== redirectUri || new Date(authCode.expiresAt) < new Date()) {
          if (authCode) await deleteAuthorizationCode(code); // Security measure
          return NextResponse.json({ error: 'invalid_grant', error_description: 'Invalid, expired, or mismatched authorization code.' }, { status: 400 });
      }

      // Code is valid, consume it
      await deleteAuthorizationCode(code);
      
      // Generate tokens
      const jwtSecret = getJwtSecretOrThrow();
      const accessToken = jwt.sign(
        { sub: authCode.userUuid, aud: clientId, scope: authCode.scope },
        jwtSecret,
        { expiresIn: '1h' }
      );
      
      const refreshToken = await createRefreshToken(authCode.userUuid, clientId, authCode.scope);

      return NextResponse.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: refreshToken.token,
        scope: authCode.scope,
      });

    } else if (grantType === 'refresh_token') {
        const refreshTokenValue = formData.get('refresh_token') as string;
        if (!refreshTokenValue) {
            return NextResponse.json({ error: 'invalid_request', error_description: 'Missing refresh_token.' }, { status: 400 });
        }
        
        const storedToken = await getRefreshToken(refreshTokenValue);
        if (!storedToken || storedToken.clientId !== clientId || storedToken.isRevoked || new Date(storedToken.expiresAt) < new Date()) {
             return NextResponse.json({ error: 'invalid_grant', error_description: 'Invalid, expired, or revoked refresh token.' }, { status: 400 });
        }
        
        // Generate a new access token
        const jwtSecret = getJwtSecretOrThrow();
        const newAccessToken = jwt.sign(
            { sub: storedToken.userUuid, aud: storedToken.clientId, scope: storedToken.scope },
            jwtSecret,
            { expiresIn: '1h' }
        );
        
        return NextResponse.json({
            access_token: newAccessToken,
            token_type: 'Bearer',
            expires_in: 3600,
            scope: storedToken.scope,
        });

    } else {
      return NextResponse.json({ error: 'unsupported_grant_type', error_description: 'Grant type not supported.' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[OAuth Token Endpoint Error]', error);
    return NextResponse.json({ error: 'server_error', error_description: error.message || 'An unexpected error occurred.' }, { status: 500 });
  }
}
