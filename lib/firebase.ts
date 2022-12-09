import { collection, getDocs } from 'firebase/firestore';
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC-wMd972uRZoRttnz1Nd-I_sTvwm14ots",
    authDomain: "multiland-a4985.firebaseapp.com",
    projectId: "multiland-a4985",
    storageBucket: "multiland-a4985.appspot.com",
    messagingSenderId: "1030943337756",
    appId: "1:1030943337756:web:f24faf7b749b5b35af9ed9",
    measurementId: "G-2NENBPNETH"
};
// Initialize Firebase

const app = initializeApp(firebaseConfig);
// Export firestore database
// It will be imported into your react app whenever it is needed
const db = getFirestore(app);

export const getCollectionFetcher = async (url: string) => {
    const querySnapshot = await getDocs(collection(db, url));
    const data: any[] = [];
    querySnapshot.forEach((doc) => {
        // doc.data() is never undefined for query doc snapshots
        data.push({ id: doc.id, ...doc.data() });
    });
    return data;
};

export default db;