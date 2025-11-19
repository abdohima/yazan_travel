Yazan Travel - Firebase Full Integration (Mobile-friendly)
----------------------------------------------------------

What I prepared for you (full project zip):
- index.html  (your original HTML with Firebase integration scripts injected)
- firebase.js (initializes Firebase - keep your config here)
- app.js      (full Firestore sync, realtime listeners, CRUD helpers, image upload, admin auth)
- firestore.rules (suggested Firestore security rules to paste in Firebase Console)
- storage.rules   (suggested Storage security rules)
- README (this file)

--- Quick simple steps to get everything working (mobile-friendly):

1) Open Firebase Console (on mobile browser):
   https://console.firebase.google.com/

2) Create a Project (or use your existing 'yazan-travel-9ada7').
   Enable: Authentication (Email/Password), Firestore Database, Storage, Hosting (optional)

3) In Project Settings -> Web Apps, ensure your firebaseConfig matches the one in firebase.js
   (I already set your config in firebase.js).

4) Set Firestore rules & Storage rules:
   - Go to Firestore -> Rules, replace with contents of firestore.rules
   - Go to Storage -> Rules, replace with contents of storage.rules
   IMPORTANT: These rules require admin accounts to have verified email. You can remove email_verified check if you prefer simpler auth, but it's safer with verification.

5) Create an Admin user:
   - Go to Authentication -> Users -> Add user
   - Add email (example: admin@yazan.com) and a password
   - Optionally verify the email in the Firebase console (or uncheck email_verified requirement in rules)

6) Upload files to your project folder (on your phone):
   - Unzip the provided zip
   - Place index.html, firebase.js, app.js in the same folder

7) Test locally on mobile browser:
   - Open index.html in mobile browser (file://) OR better: use a tiny local server app on Android like 'Simple HTTP Server' or use Termux:
     pkg install nodejs
     npm install -g http-server
     http-server .
     Then open http://localhost:8080 on phone

8) Create Admin login and test:
   - Use the admin email you created to log in through the Admin Login modal
   - Try adding an offer/hotel via Admin Panel prompts (Add New) - these will write to Firestore

9) Image upload:
   - When prompted to upload an image, select 'upload' and choose a file; it will be saved to Firebase Storage and its URL used in records.

10) Deploy to Firebase Hosting (optional, from mobile using Termux):
    - Install Termux, nodejs, firebase-tools
    - firebase login
    - firebase init hosting
    - firebase deploy

--- Notes & Help
- If anything fails, send me the error message (copy the red text from console) and I'll fix it.
- If you want, I can also produce a trimmed 'admin-only' UI and improve the add/edit modals so you don't use prompts.
- I can set up WhatsApp/email notifications for new bookings next if you want.

Good luck — افتح الملف المضغوط وجرب، وابعثلي لو فيه أي حاجة مش واضحة أو حصلت خطأ وأنا اصلحها فوراً.
