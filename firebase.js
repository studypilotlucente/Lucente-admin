import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAlK07YBdEMF6CD7gCX2PPbqpuxprzl_n8",
  authDomain: "lucente-work-hub.firebaseapp.com",
  projectId: "lucente-work-hub",
  storageBucket: "lucente-work-hub.firebasestorage.app",
  messagingSenderId: "456942687136",
  appId: "1:456942687136:web:f6b613cf48212ff5eacac5"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);