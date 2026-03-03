// ====== Firebase config ======
const firebaseConfig = {
  apiKey: "AIzaSyC0ej8neEDFZTWOTZ7i_KKe6Lp9zQzd8os",
  authDomain: "kupiprodai-b8a72.firebaseapp.com",
  projectId: "kupiprodai-b8a72",
  storageBucket: "kupiprodai-b8a72.appspot.com",
  messagingSenderId: "738493216496",
  appId: "1:738493216496:web:69e4f182792cb0c21fb435",
  measurementId: "G-SXQR7WRJKQ"
};

// ====== Initialize Firebase ======
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ====== DOM Elements ======
const authSection = document.getElementById('auth-section');
const userSection = document.getElementById('user-section');
const adminSection = document.getElementById('admin-section');

const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const signupBtn = document.getElementById('signup-btn');
const loginBtn = document.getElementById('login-btn');
const googleBtn = document.getElementById('google-btn');
const logoutBtn = document.getElementById('logout-btn');
const authMsg = document.getElementById('auth-msg');

const userNameSpan = document.getElementById('user-name');

const adTitle = document.getElementById('ad-title');
const adDesc = document.getElementById('ad-desc');
const adCategory = document.getElementById('ad-category');
const adContacts = document.getElementById('ad-contacts');
const adPhoto = document.getElementById('ad-photo');
const addAdBtn = document.getElementById('add-ad-btn');
const adMsg = document.getElementById('ad-msg');

const myAdsDiv = document.getElementById('my-ads');
const pendingAdsDiv = document.getElementById('pending-ads');

// ====== Admin Email ======
const ADMIN_EMAIL = "renatyakupov0220@gmail.com";

// ====== Auth ======
signupBtn.addEventListener('click', () => {
  auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value)
    .then(userCred => {
      authMsg.textContent = "Регистрация успешна!";
    })
    .catch(err => authMsg.textContent = err.message);
});

loginBtn.addEventListener('click', () => {
  auth.signInWithEmailAndPassword(emailInput.value, passwordInput.value)
    .catch(err => authMsg.textContent = err.message);
});

googleBtn.addEventListener('click', () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider).catch(err => authMsg.textContent = err.message);
});

logoutBtn.addEventListener('click', () => {
  auth.signOut();
});

// ====== Image Compression ======
function compressImage(file, maxWidth=800, maxHeight=800, quality=0.7) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = event => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round(height * (maxWidth / width));
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round(width * (maxHeight / height));
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        resolve(canvas.toDataURL('image/jpeg', quality));
      };

      img.onerror = err => reject(err);
    };

    reader.onerror = err => reject(err);
  });
}

// ====== Add Advertisement ======
addAdBtn.addEventListener('click', async () => {
  const title = adTitle.value.trim();
  const desc = adDesc.value.trim();
  const category = adCategory.value.trim();
  const contacts = adContacts.value.trim();
  const file = adPhoto.files[0];

  if (!title || !desc || !category || !contacts || !file) {
    adMsg.textContent = "Заполните все поля и выберите фото!";
    return;
  }
  if (desc.length > 300) {
    adMsg.textContent = "Описание не более 300 символов!";
    return;
  }
  if (!['image/jpeg','image/png'].includes(file.type)) {
    adMsg.textContent = "Только JPG/PNG!";
    return;
  }
  if (file.size > 5*1024*1024) {
    adMsg.textContent = "Фото до 5 МБ!";
    return;
  }

  adMsg.textContent = "Загружаем...";
  try {
    const photoData = await compressImage(file);
    await db.collection('ads').add({
      title, desc, category, contacts,
      photo: photoData,
      status: "pending",
      uid: auth.currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    adMsg.textContent = "Объявление отправлено на модерацию!";
    adTitle.value = adDesc.value = adCategory.value = adContacts.value = '';
    adPhoto.value = '';
    loadMyAds();
    loadPendingAds();
  } catch(err) {
    adMsg.textContent = "Ошибка загрузки фото!";
    console.error(err);
  }
});

// ====== Load User Ads ======
function loadMyAds() {
  myAdsDiv.innerHTML = '';
  db.collection('ads').where('uid','==',auth.currentUser.uid)
    .orderBy('createdAt','desc')
    .get().then(snapshot => {
      snapshot.forEach(doc => {
        const ad = doc.data();
        const div = document.createElement('div');
        div.className = 'ad-card';
        div.innerHTML = `
          <strong>${ad.title}</strong> [${ad.status}]<br>
          ${ad.desc}<br>
          <em>${ad.category}</em><br>
          <span>${ad.contacts}</span><br>
          <img src="${ad.photo}">
        `;
        myAdsDiv.appendChild(div);
      });
    });
}

// ====== Load Pending Ads (Admin) ======
function loadPendingAds() {
  if (auth.currentUser.email !== ADMIN_EMAIL) return;
  adminSection.classList.remove('hidden');
  pendingAdsDiv.innerHTML = '';
  db.collection('ads').where('status','==','pending')
    .orderBy('createdAt','desc')
    .get().then(snapshot => {
      snapshot.forEach(doc => {
        const ad = doc.data();
        const div = document.createElement('div');
        div.className = 'ad-card';
        div.innerHTML = `
          <strong>${ad.title}</strong><br>
          ${ad.desc}<br>
          <em>${ad.category}</em><br>
          <span>${ad.contacts}</span><br>
          <img src="${ad.photo}"><br>
          <button onclick="approveAd('${doc.id}')">Одобрить</button>
          <button onclick="rejectAd('${doc.id}')">Отклонить</button>
        `;
        pendingAdsDiv.appendChild(div);
      });
    });
}

// ====== Approve / Reject ======
window.approveAd = id => {
  db.collection('ads').doc(id).update({status:'approved'});
  loadPendingAds();
};
window.rejectAd = id => {
  db.collection('ads').doc(id).delete();
  loadPendingAds();
};

// ====== Auth State ======
auth.onAuthStateChanged(user => {
  if (user) {
    authSection.classList.add('hidden');
    userSection.classList.remove('hidden');
    userNameSpan.textContent = user.email;
    loadMyAds();
    loadPendingAds();
  } else {
    authSection.classList.remove('hidden');
    userSection.classList.add('hidden');
  }
});
