import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

let app;
let db: any = null;
let auth: any = null;
let isFirebaseAvailable = false;

if (firebaseConfig && firebaseConfig.apiKey) {
  try {
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp();
    }
    db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
    isFirebaseAvailable = true;
    console.log("Firebase successfully initialized with applet configuration.");
  } catch (e) {
    console.warn("Error initializing Firebase:", e);
  }
} else {
  console.warn("Firebase configuration not found or invalid. Initializing in sandbox offline mode.");
}

export { db, auth, isFirebaseAvailable };
