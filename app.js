// app.js - Full integration: CRUD, image upload, admin auth, realtime sync
import { db, storage, auth } from './firebase.js';
import {
  collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, getDocs, setDoc, query, orderBy
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";
import {
  ref as storageRef, uploadBytesResumable, getDownloadURL
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js";
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";

console.log('app.js loaded - full Firebase features');

/*
  What this file does (simple):
  - Syncs existing localStorage arrays (destinations, offers, hotels, cruises, safaris, bookings)
    into Firestore once (so you won't lose current data).
  - Sets realtime listeners so UI updates when Firestore changes.
  - Overrides admin panel to use Firebase Auth (email/password). Keeps old local fallback for now.
  - Adds image upload helper to store images in Firebase Storage and return secure URLs.
  - Exposes functions to create/update/delete items directly in Firestore from admin panel.
*/

// --- Utilities ------------------------------------------------------------------
function safeJSON(name) {
  try { return JSON.parse(localStorage.getItem(name)) || []; } catch(e){ return []; }
}

async function syncLocalToFirestoreOnce() {
  try {
    const collections = ['destinations','offers','hotels','cruises','safaris','bookings'];
    for (const name of collections) {
      const local = safeJSON(name);
      const colRef = collection(db, name);
      // Add documents for items that don't have a '_firestoreId' flag
      for (const item of local) {
        if (item._firestoreId) continue;
        // create doc
        const payload = Object.assign({}, item);
        // remove potential circular or function properties
        delete payload._syncedWithFirestore;
        const docRef = await addDoc(colRef, payload);
        item._firestoreId = docRef.id;
      }
      localStorage.setItem(name, JSON.stringify(local));
    }
    console.log('Local data synced to Firestore (one-time).');
  } catch(err) {
    console.error('sync error', err);
  }
}

// --- Realtime listeners ---------------------------------------------------------
function setupRealtimeListeners() {
  const mapping = [
    { col: 'destinations', loader: window.loadDestinations },
    { col: 'offers', loader: window.loadOffers },
    { col: 'hotels', loader: window.loadHotels },
    { col: 'cruises', loader: window.loadCruises },
    { col: 'safaris', loader: window.loadSafaris },
    { col: 'bookings', loader: window.loadBookingsTable }
  ];
  mapping.forEach(m => {
    const q = collection(db, m.col);
    onSnapshot(q, snapshot => {
      const arr = [];
      snapshot.forEach(snap => {
        const d = snap.data();
        d._id = snap.id;
        arr.push(d);
      });
      localStorage.setItem(m.col, JSON.stringify(arr));
      console.log('Synced', m.col, 'count=', arr.length);
      if (typeof m.loader === 'function') {
        try { m.loader(); } catch(e){ console.warn('loader error', e); }
      }
    }, err => {
      console.error('onSnapshot', m.col, err);
    });
  });
}

// --- Image upload helper -------------------------------------------------------
export async function uploadImageFile(file, folder='images') {
  if (!file) throw new Error('No file provided');
  const name = Date.now() + '_' + (file.name || 'img');
  const ref = storageRef(storage, `${folder}/${name}`);
  const task = uploadBytesResumable(ref, file);
  return new Promise((resolve, reject) => {
    task.on('state_changed',
      (snapshot) => { /* progress can be handled if UI added */ },
      (err) => reject(err),
      async () => {
        const url = await getDownloadURL(task.snapshot.ref);
        resolve(url);
      }
    );
  });
}

// --- Firestore CRUD helpers ----------------------------------------------------
export async function addItem(collectionName, item) {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, item);
  return docRef.id;
}

export async function updateItem(collectionName, id, updates) {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, updates);
}

export async function deleteItemFirestore(collectionName, id) {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}

// --- Admin Auth functions ------------------------------------------------------
export async function adminRegister(email, password) {
  // Use this only once from Firebase Console or temporarily here to create an admin account
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function adminLogin(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function adminLogout() {
  await signOut(auth);
}

// Show/hide admin panel based on auth state
onAuthStateChanged(auth, user => {
  const panel = document.getElementById('adminPanel');
  if (!panel) return;
  if (user) {
    panel.classList.add('active');
    console.log('Admin logged in:', user.email);
    if (typeof window.loadAdminData === 'function') window.loadAdminData();
  } else {
    panel.classList.remove('active');
    console.log('Admin logged out');
  }
});

// Override admin form submit to use Firebase Auth (and create fallback)
function overrideAdminLogin() {
  const form = document.getElementById('adminLoginForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value.trim();
    // if username looks like email -> try firebase auth
    if (username.includes('@')) {
      try {
        await adminLogin(username, password);
        document.getElementById('adminLoginModal').classList.remove('active');
        return;
      } catch(err) {
        console.warn('firebase login failed', err);
        alert('Login failed via Firebase. تأكد من البريد وكلمة المرور.');
        return;
      }
    }
    // fallback legacy check
    if (username === 'abdowagdy' && password === '1866') {
      document.getElementById('adminLoginModal').classList.remove('active');
      document.getElementById('adminPanel').classList.add('active');
      if (typeof window.loadAdminData === 'function') window.loadAdminData();
    } else {
      alert('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
  });
}

// --- Booking form override to save in Firestore --------------------------------
function overrideBookingForm() {
  const form = document.getElementById('bookingForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const booking = {
        name: document.getElementById('bookingName').value,
        email: document.getElementById('bookingEmail').value,
        phone: document.getElementById('bookingPhone').value,
        date: document.getElementById('bookingDate') ? document.getElementById('bookingDate').value : '',
        travelers: parseInt(document.getElementById('bookingTravelers') ? document.getElementById('bookingTravelers').value : 1),
        type: document.getElementById('bookingType') ? document.getElementById('bookingType').value : window.currentBookingType || '',
        price: document.getElementById('bookingPrice') ? document.getElementById('bookingPrice').value : window.currentBookingPrice || '',
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      const id = await addItem('bookings', booking);
      // update local copy
      const bookings = safeJSON('bookings');
      booking._id = id;
      bookings.push(booking);
      localStorage.setItem('bookings', JSON.stringify(bookings));
      // show payment modal
      if (document.getElementById('bookingModal')) document.getElementById('bookingModal').classList.remove('active');
      if (document.getElementById('paymentModal')) document.getElementById('paymentModal').classList.add('active');
      alert('تم حفظ الحجز. اكمل الدفع لتأكيد الحجز.');
      form.reset();
      if (typeof window.loadBookingsTable === 'function') window.loadBookingsTable();
    } catch(err) {
      console.error('booking save error', err);
      alert('حدث خطأ أثناء حفظ الحجز.');
    }
  });
}

// --- Wire admin panel add/edit/delete actions to Firestore ---------------------
function setupAdminActions() {
  // Add generic "add" button handler which uses existing addNewItem prompts but writes to Firestore
  window.addNewItem = async function(type) {
    try {
      if (type === 'hotel') {
        const name = prompt('أدخل اسم الفندق:');
        if (!name) return;
        const location = prompt('أدخل موقع الفندق:');
        if (!location) return;
        const description = prompt('أدخل وصف الفندق:');
        if (!description) return;
        const price = prompt('أدخل سعر الفندق:');
        if (!price) return;
        // image upload support: ask for file input via hidden input
        const imageUrl = prompt('أدخل رابط صورة الفندق أو اكتب "upload" لرفع صورة من الجهاز:');
        let finalImage = imageUrl;
        if (imageUrl === 'upload') {
          const file = await promptFileAndGet(); // will open file picker if implemented
          if (file) finalImage = await uploadImageFile(file, 'hotels');
        }
        const payload = { name, location, description, price: parseInt(price), image: finalImage };
        const id = await addItem('hotels', payload);
        alert('تمت إضافة الفندق بنجاح');
      } else {
        // fallback behavior for other types: reuse existing prompts
        const name = prompt('أدخل الاسم:');
        if (!name) return;
        const description = prompt('أدخل وصف:');
        if (!description) return;
        const price = prompt('أدخل السعر:');
        if (!price) return;
        const image = prompt('أدخل رابط صورة:');
        const payload = { name, description, price: parseInt(price), image };
        await addItem(type === 'cruise' ? 'cruises' : type === 'safari' ? 'safaris' : 'offers', payload);
        alert('تمت الإضافة بنجاح');
      }
    } catch(err) {
      console.error('addNewItem error', err);
      alert('حدث خطأ أثناء الإضافة.');
    }
  };

  // deleteItem: tries Firestore deletion first then fallback to local
  window.deleteItem = async function(type, id) {
    try {
      // Try to delete Firestore doc by id if id looks like firestore id (string length > 10)
      if (String(id).length > 10) {
        await deleteItemFirestore(type, id);
      } else {
        // fallback: id likely numeric -> find doc with localId or local index and delete by matching field
        const docs = await getDocs(collection(db, type));
        let removed = false;
        docs.forEach(d => {
          const data = d.data();
          if (data.localId == id || data.id == id || d.id == id) {
            deleteItemFirestore(type, d.id);
            removed = true;
          }
        });
        if (!removed) {
          // remove from localStorage array
          const arr = safeJSON(type).filter(x => x.id !== id);
          localStorage.setItem(type, JSON.stringify(arr));
        }
      }
      alert('تم الحذف');
    } catch(err) {
      console.error('deleteItem', err);
      alert('خطأ أثناء الحذف');
    }
  };
}

// Helper to prompt file selection on mobile/desktop (if environment supports input element)
async function promptFileAndGet() {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files[0];
      resolve(file);
    };
    input.click();
  });
}

// --- Initialization ------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  // small delay to ensure original scripts define UI loaders like loadOffers etc.
  setTimeout(async () => {
    await syncLocalToFirestoreOnce();
    setupRealtimeListeners();
    overrideAdminLogin();
    overrideBookingForm();
    setupAdminActions();
    console.log('Full Firebase integration ready.');
  }, 600);
});

