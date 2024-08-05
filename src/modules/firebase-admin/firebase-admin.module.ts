import * as admin from 'firebase-admin';

import { Module } from '@nestjs/common';

@Module({
  providers: [
    {
      provide: 'FIREBASE_ADMIN',
      useFactory: async () => {
        const serviceAccount = (await import(
          './service-account.json'
        )) as admin.ServiceAccount;
        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          storageBucket: 'messenger-1ed12.appspot.com',
        });
      },
    },
  ],
  exports: ['FIREBASE_ADMIN'],
})
export class FirebaseAdminModule {}
