
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

// Ultra-Stable Shims
export const onAuthStateChanged = (a: any, c: any) => a.onAuthStateChanged(c);
export const signOut = (a: any) => a.signOut();
export const signInWithEmailAndPassword = (a: any, e: string, p: string) => a.signInWithEmailAndPassword(e, p);
export const createUserWithEmailAndPassword = (a: any, e: string, p: string) => a.createUserWithEmailAndPassword(e, p);

export const collection = (d: any, p: string) => d.collection(p);
export const doc = (d: any, p: string, id?: string) => id ? d.collection(p).doc(id) : d.doc(p);

// Fix: Support error callback and normalize exists() as a function for both Document and Query snapshots
export const onSnapshot = (ref: any, callback: any, errorCallback?: any) => {
  return ref.onSnapshot((s: any) => {
    if (s.docs) {
      callback({
        docs: s.docs.map((d: any) => ({ id: d.id, exists: () => true, data: () => d.data() })),
        size: s.size,
        empty: s.empty
      });
    } else {
      callback({ id: s.id, exists: () => s.exists, data: () => s.data() });
    }
  }, errorCallback);
};

export const addDoc = (r: any, d: any) => r.add(d);
export const updateDoc = (r: any, d: any) => r.update(d);
export const deleteDoc = (r: any) => r.delete();
export const setDoc = (r: any, d: any, o?: any) => o ? r.set(d, o) : r.set(d);
export const getDocs = (r: any) => r.get();
export const query = (r: any, ...c: any[]) => {
  let q = r;
  c.forEach(x => { if (x?.t === 'w') q = q.where(x.f, x.o, x.v); });
  return q;
};
export const where = (f: string, o: any, v: any) => ({ t: 'w', f, o, v });
