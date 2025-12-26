
// Use namespaced imports to ensure compatibility with various environment configurations
// and resolve "no exported member" errors in the Firebase SDK.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBPrWYr0JsnVqvxXsR-WwSBzvd9o691Few",
  authDomain: "perangkat-pembelajaran-23ae8.firebaseapp.com",
  projectId: "perangkat-pembelajaran-23ae8",
  storageBucket: "perangkat-pembelajaran-23ae8.firebasestorage.app",
  messagingSenderId: "64147390542",
  appId: "1:64147390542:web:2783b65777e1f2ad64c31f",
  measurementId: "G-3J779MMSM5"
};

// Initialize Firebase App
const app = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();

// Initialize and export Auth and Firestore instances
export const auth = firebase.auth();
export const db = firebase.firestore();

// Shims for v9 modular Auth functions
export const onAuthStateChanged = (authInstance: any, callback: any) => authInstance.onAuthStateChanged(callback);
export const signOut = (authInstance: any) => authInstance.signOut();
export const signInWithEmailAndPassword = (authInstance: any, email: any, pass: any) => authInstance.signInWithEmailAndPassword(email, pass);
export const createUserWithEmailAndPassword = (authInstance: any, email: any, pass: any) => authInstance.createUserWithEmailAndPassword(email, pass);

/**
 * Helper to wrap Firestore snapshots to support v9 methods like .exists() and .data()
 */
const wrapSnapshot = (snap: any) => {
  if (!snap) return snap;
  
  // Jika ini sudah memiliki exists sebagai fungsi (v9), kembalikan langsung
  if (typeof snap.exists === 'function') return snap;

  // Bungkus snap v8 agar memiliki interface v9
  const existsVal = !!snap.exists;
  return {
    id: snap.id,
    ref: snap.ref,
    metadata: snap.metadata,
    exists: () => existsVal,
    data: () => snap.data ? snap.data() : undefined,
    get: (field: string) => snap.get ? snap.get(field) : undefined,
    // Simpan referensi asli jika dibutuhkan
    _raw: snap
  };
};

// Shims for v9 modular Firestore functions
export const collection = (dbInstance: any, path: string) => dbInstance.collection(path);

export const onSnapshot = (ref: any, onNext: any, onError?: any) => {
  return ref.onSnapshot((snap: any) => {
    if (snap.docs) {
      // It's a QuerySnapshot. Wrap each document.
      const wrappedDocs = snap.docs.map((d: any) => wrapSnapshot(d));
      // Reconstruct a pseudo QuerySnapshot for v9 compatibility
      onNext({
        docs: wrappedDocs,
        size: snap.size,
        empty: snap.empty,
        forEach: (callback: any) => wrappedDocs.forEach((d: any) => callback(d)),
        docChanges: () => snap.docChanges(),
        metadata: snap.metadata
      });
    } else {
      // It's a single DocumentSnapshot
      onNext(wrapSnapshot(snap));
    }
  }, onError);
};

export const addDoc = (ref: any, data: any) => ref.add(data);
export const updateDoc = (ref: any, data: any) => ref.update(data);
export const deleteDoc = (ref: any) => ref.delete();

export const doc = (dbOrColl: any, pathOrId: string, id?: string) => {
  if (id) return dbOrColl.collection(pathOrId).doc(id);
  if (typeof dbOrColl.doc === 'function') return dbOrColl.doc(pathOrId);
  return db.doc(pathOrId);
};

export const getDoc = async (ref: any) => {
  const snap = await ref.get();
  return wrapSnapshot(snap);
};

export const query = (ref: any, ...constraints: any[]) => {
  let q = ref;
  constraints.forEach(c => {
    if (c && c.type === 'where') q = q.where(c.field, c.op, c.value);
  });
  return q;
};

export const where = (field: string, op: any, value: any) => ({ type: 'where', field, op, value });
export const getDocs = (ref: any) => ref.get();

// FIX: Update setDoc to support optional 3rd argument (options) for v9 modular style compatibility shims
export const setDoc = (ref: any, data: any, options?: any) => ref.set(data, options);
