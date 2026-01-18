
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

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const auth = firebase.auth();
export const db = firebase.firestore();

// Modular Shims
export const onAuthStateChanged = (authInstance: any, callback: any) => authInstance.onAuthStateChanged(callback);
export const signOut = (authInstance: any) => authInstance.signOut();
export const signInWithEmailAndPassword = (authInstance: any, email: any, pass: any) => authInstance.signInWithEmailAndPassword(email, pass);
export const createUserWithEmailAndPassword = (authInstance: any, email: any, pass: any) => authInstance.createUserWithEmailAndPassword(email, pass);

export const collection = (dbInstance: any, path: string) => dbInstance.collection(path);
export const doc = (dbOrColl: any, pathOrId: string, id?: string) => {
  if (id) return dbOrColl.collection(pathOrId).doc(id);
  return typeof dbOrColl.doc === 'function' ? dbOrColl.doc(pathOrId) : db.doc(pathOrId);
};

export const onSnapshot = (ref: any, onNext: any, onError?: any) => {
  return ref.onSnapshot((snap: any) => {
    if (snap.docs) {
      onNext({
        docs: snap.docs.map((d: any) => ({
          id: d.id,
          exists: () => true,
          data: () => d.data()
        })),
        size: snap.size,
        empty: snap.empty
      });
    } else {
      onNext({
        id: snap.id,
        exists: () => snap.exists,
        data: () => snap.data()
      });
    }
  }, onError);
};

export const addDoc = (ref: any, data: any) => ref.add(data);
export const updateDoc = (ref: any, data: any) => ref.update(data);
export const deleteDoc = (ref: any) => ref.delete();
export const setDoc = (ref: any, data: any, options?: any) => options ? ref.set(data, options) : ref.set(data);
export const getDocs = (ref: any) => ref.get();
export const query = (ref: any, ...constraints: any[]) => {
  let q = ref;
  constraints.forEach(c => { if (c?.type === 'where') q = q.where(c.field, c.op, c.value); });
  return q;
};
export const where = (field: string, op: any, value: any) => ({ type: 'where', field, op, value });
