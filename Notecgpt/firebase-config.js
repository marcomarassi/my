// Configurazione Firebase - SOSTITUISCI con i tuoi dati
const firebaseConfig = {
  authDomain: "note-2f466.firebaseapp.com",
  projectId: "note-2f466",
  storageBucket: "note-2f466.firebasestorage.app",
  messagingSenderId: "315083877931",
  appId: "1:315083877931:web:ec14060015ff668473046e"
};

// Inizializza Firebase
firebase.initializeApp(firebaseConfig);

// Riferimenti ai servizi
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();