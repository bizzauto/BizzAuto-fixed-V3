/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID: string;
  readonly VITE_APPLE_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Apple Sign-In JS SDK types
declare interface AppleIDAuth {
  init(config: {
    clientId: string;
    scope: string;
    redirectURI: string;
    usePopup: boolean;
  }): void;
  signIn(): Promise<{
    authorization: { id_token: string; code: string };
    user?: {
      name: { firstName: string; lastName: string };
      email: string;
    };
  }>;
}

interface Window {
  AppleID?: { auth: AppleIDAuth };
}
