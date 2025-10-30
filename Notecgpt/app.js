// Variabili globali
let currentUser = null;
let editingNoteId = null;
let notes = [];

// Elementi DOM
const authSection = document.getElementById('auth-section');
const userInfo = document.getElementById('user-info');
const loginForm = document.getElementById('login-form');
const userEmail = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');
const loginBtn = document.getElementById('login-btn');
const signupBtn = document.getElementById('signup-btn');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');

const filterSection = document.getElementById('filter-section');
const searchFilter = document.getElementById('search-filter');
const noteFormSection = document.getElementById('note-form-section');
const notesList = document.getElementById('notes-list');
const noteForm = document.getElementById('note-form');
const noteTitle = document.getElementById('note-title');
const noteText = document.getElementById('note-text');
const noteImage = document.getElementById('note-image');
const imagePreview = document.getElementById('image-preview');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const editId = document.getElementById('edit-id');
const addNoteBtn = document.getElementById('add-note-btn');
const notesContainer = document.getElementById('notes-container');

// Inizializzazione App
document.addEventListener('DOMContentLoaded', initApp);

function initApp() {
    setupEventListeners();
    setupAuthStateListener();
}

function setupEventListeners() {
    // Autenticazione
    loginBtn.addEventListener('click', handleLogin);
    signupBtn.addEventListener('click', handleSignup);
    logoutBtn.addEventListener('click', handleLogout);

    // Note
    addNoteBtn.addEventListener('click', showNoteForm);
    cancelBtn.addEventListener('click', cancelEdit);
    noteForm.addEventListener('submit', saveNote);
    noteImage.addEventListener('change', handleImagePreview);
    searchFilter.addEventListener('input', filterNotes);
}

// === AUTENTICAZIONE ===
function setupAuthStateListener() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        if (user) {
            showApp();
            loadNotes();
        } else {
            hideApp();
        }
    });
}

async function handleLogin() {
    try {
        const email = emailInput.value;
        const password = passwordInput.value;
        await auth.signInWithEmailAndPassword(email, password);
        clearAuthForm();
    } catch (error) {
        showError('Errore login: ' + error.message);
    }
}

async function handleSignup() {
    try {
        const email = emailInput.value;
        const password = passwordInput.value;
        await auth.createUserWithEmailAndPassword(email, password);
        clearAuthForm();
    } catch (error) {
        showError('Errore registrazione: ' + error.message);
    }
}

async function handleLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        showError('Errore logout: ' + error.message);
    }
}

function clearAuthForm() {
    emailInput.value = '';
    passwordInput.value = '';
}

// === INTERFACCIA ===
function showApp() {
    userInfo.classList.remove('hidden');
    loginForm.classList.add('hidden');
    filterSection.classList.remove('hidden');
    notesList.classList.remove('hidden');
    userEmail.textContent = currentUser.email;
}

function hideApp() {
    userInfo.classList.add('hidden');
    loginForm.classList.remove('hidden');
    filterSection.classList.add('hidden');
    noteFormSection.classList.add('hidden');
    notesList.classList.add('hidden');
    notesContainer.innerHTML = '';
}

function showNoteForm() {
    editingNoteId = null;
    editId.value = '';
    noteForm.reset();
    imagePreview.innerHTML = '';
    noteFormSection.classList.remove('hidden');
    noteForm.scrollIntoView({ behavior: 'smooth' });
}

function cancelEdit() {
    noteFormSection.classList.add('hidden');
    editingNoteId = null;
    editId.value = '';
    noteForm.reset();
    imagePreview.innerHTML = '';
}

function handleImagePreview(event) {
    const file = event.target.files[0];
    if (file) {
        imagePreview.innerHTML = '';
        const img = document.createElement('img');
        img.src = URL.createObjectURL(file);
        imagePreview.appendChild(img);
    }
}

// === CRUD NOTE ===
async function loadNotes() {
    try {
        const snapshot = await db.collection('notes')
            .where('userId', '==', currentUser.uid)
            .orderBy('updatedAt', 'desc')
            .get();

        notes = [];
        snapshot.forEach(doc => {
            notes.push({
                id: doc.id,
                ...doc.data()
            });
        });

        displayNotes(notes);
    } catch (error) {
        showError('Errore caricamento note: ' + error.message);
    }
}

async function saveNote(e) {
    e.preventDefault();

    const title = noteTitle.value.trim();
    const text = noteText.value.trim();
    const imageFile = noteImage.files[0];

    if (!title || !text) {
        showError('Titolo e testo sono obbligatori');
        return;
    }

    try {
        let imageUrl = '';

        // Upload immagine se presente
        if (imageFile) {
            imageUrl = await uploadImage(imageFile);
        }

        const noteData = {
            title,
            text,
            imageUrl,
            userId: currentUser.uid,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (editingNoteId) {
            // Modifica nota esistente
            await db.collection('notes').doc(editingNoteId).update(noteData);
        } else {
            // Nuova nota
            noteData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('notes').add(noteData);
        }

        cancelEdit();
        loadNotes();
    } catch (error) {
        showError('Errore salvataggio: ' + error.message);
    }
}

async function uploadImage(file) {
    const storageRef = storage.ref();
    const imageRef = storageRef.child(`notes/${currentUser.uid}/${Date.now()}_${file.name}`);
    await imageRef.put(file);
    return await imageRef.getDownloadURL();
}

async function editNote(noteId) {
    const note = notes.find(n => n.id === noteId);
    if (note) {
        editingNoteId = noteId;
        editId.value = noteId;
        noteTitle.value = note.title;
        noteText.value = note.text;
        
        imagePreview.innerHTML = '';
        if (note.imageUrl) {
            const img = document.createElement('img');
            img.src = note.imageUrl;
            imagePreview.appendChild(img);
        }

        noteFormSection.classList.remove('hidden');
        noteForm.scrollIntoView({ behavior: 'smooth' });
    }
}

async function deleteNote(noteId) {
    if (confirm('Sei sicuro di voler eliminare questa nota?')) {
        try {
            await db.collection('notes').doc(noteId).delete();
            loadNotes();
        } catch (error) {
            showError('Errore eliminazione: ' + error.message);
        }
    }
}

// === VISUALIZZAZIONE E FILTRI ===
function displayNotes(notesToDisplay) {
    notesContainer.innerHTML = '';

    if (notesToDisplay.length === 0) {
        notesContainer.innerHTML = '<p class="no-notes">Nessuna nota trovata</p>';
        return;
    }

    notesToDisplay.forEach(note => {
        const noteElement = createNoteElement(note);
        notesContainer.appendChild(noteElement);
    });
}

function createNoteElement(note) {
    const div = document.createElement('div');
    div.className = 'note-card';

    const createdAt = note.createdAt ? note.createdAt.toDate().toLocaleString('it-IT') : 'N/A';
    const updatedAt = note.updatedAt ? note.updatedAt.toDate().toLocaleString('it-IT') : 'N/A';

    div.innerHTML = `
        <div class="note-header">
            <div>
                <div class="note-title">${escapeHtml(note.title)}</div>
                <div class="note-dates">
                    Creata: ${createdAt}<br>
                    Modificata: ${updatedAt}
                </div>
            </div>
            <div class="note-actions">
                <button class="edit-btn" onclick="editNote('${note.id}')">Modifica</button>
                <button class="delete-btn" onclick="deleteNote('${note.id}')">Elimina</button>
            </div>
        </div>
        <div class="note-text">${escapeHtml(note.text)}</div>
        ${note.imageUrl ? `<img src="${note.imageUrl}" class="note-image" alt="Miniatura">` : ''}
    `;

    return div;
}

function filterNotes() {
    const filter = searchFilter.value.toLowerCase().trim();
    
    if (!filter) {
        displayNotes(notes);
        return;
    }

    const filteredNotes = notes.filter(note => 
        note.title.toLowerCase().includes(filter) ||
        note.text.toLowerCase().includes(filter)
    );

    displayNotes(filteredNotes);
}

// === UTILITY ===
function showError(message) {
    // Rimuovi errori precedenti
    const existingError = document.querySelector('.error');
    if (existingError) {
        existingError.remove();
    }

    const errorDiv = document.createElement('div');
    errorDiv.className = 'error';
    errorDiv.textContent = message;
    document.body.insertBefore(errorDiv, document.querySelector('main'));

    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}