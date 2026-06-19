import { Provider } from '@nestjs/common';
import * as admin from 'firebase-admin';

export const FIREBASE_APP = 'FIREBASE_APP';

export const FirebaseProvider: Provider = {
  provide: FIREBASE_APP,
  useFactory: () => {
    if (admin.apps.length > 0) return admin.apps[0];

    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
  },
};
