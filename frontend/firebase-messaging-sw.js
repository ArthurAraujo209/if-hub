importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyA1dkn0ftReTMChrrnYOmMRjtDUd_fDkz0",
    authDomain: "if-smart.firebaseapp.com",
    projectId: "if-smart",
    storageBucket: "if-smart.firebasestorage.app",
    messagingSenderId: "544575127389",
    appId: "1:544575127389:web:a7f2863fa74b9e743bf2b4",
    measurementId: "G-YGGK0YTKP1"
});

const messaging = firebase.messaging();

// Background messages
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background:', payload);
  
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: payload.notification.icon || '/assets/icons/IF HUB - SEM FUNDO - 192x192.png',
    badge: '/assets/icons/badge-72x72.png',
    data: payload.data,
    actions: [
      { action: 'open', title: 'Abrir' }
    ]
  });
});