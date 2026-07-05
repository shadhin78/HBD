import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyAQclePrRzsnvsZSPF9s3c2pqXzy8gJpNo",
  authDomain: "project-error-78.firebaseapp.com",
  projectId: "project-error-78",
  storageBucket: "project-error-78.firebasestorage.app",
  messagingSenderId: "757218203491",
  appId: "1:757218203491:web:554affe06c958656b7a556"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const loginOverlay = document.getElementById('login-overlay');
  const loginForm = document.getElementById('login-form');
  const adminPasswordInput = document.getElementById('admin-password');
  const loginError = document.getElementById('login-error');
  
  const dashboardContainer = document.getElementById('dashboard-container');
  const logoutBtn = document.getElementById('logout-btn');
  const configForm = document.getElementById('config-form');
  
  const recipientNameInput = document.getElementById('recipient-name-input');
  const recipientAgeInput = document.getElementById('recipient-age-input');
  const cakeFlavorSelect = document.getElementById('cake-flavor');
  const sprinklesToggle = document.getElementById('sprinkles-toggle');
  const berriesToggle = document.getElementById('berries-toggle');
  const hbdMessageInput = document.getElementById('hbd-message-input');
  
  const hbdCount = document.getElementById('hbd-count');
  const saveStatus = document.getElementById('save-status');
  const saveBtn = document.getElementById('save-btn');
  
  const shareUrlInput = document.getElementById('share-url');
  const copyLinkBtn = document.getElementById('copy-link-btn');
  const copySuccess = document.getElementById('copy-success');

  const CORRECT_PASS = 'HBD787898';
  let activePassword = '';

  // Setup current website URL for copying
  const siteUrl = window.location.protocol + '//' + window.location.host + '/' + 'index.html';
  shareUrlInput.value = siteUrl;

  // Check if password already stored in session
  const storedPassword = sessionStorage.getItem('admin_pass');
  if (storedPassword === CORRECT_PASS) {
    activePassword = storedPassword;
    showDashboard();
  }

  // Handle Login form submit
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const typedPassword = adminPasswordInput.value.trim();

    if (typedPassword === CORRECT_PASS) {
      activePassword = typedPassword;
      sessionStorage.setItem('admin_pass', typedPassword);
      loginError.textContent = '';
      showDashboard();
    } else {
      loginError.textContent = '❌ Incorrect password. Please try again.';
      adminPasswordInput.value = '';
      adminPasswordInput.focus();
    }
  });

  // Handle Logout
  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('admin_pass');
    activePassword = '';
    hideDashboard();
  });

  function showDashboard() {
    loginOverlay.classList.add('hidden');
    dashboardContainer.classList.remove('hidden');
    loadCurrentConfig();
  }

  function hideDashboard() {
    loginOverlay.classList.remove('hidden');
    dashboardContainer.classList.add('hidden');
    adminPasswordInput.value = '';
    adminPasswordInput.focus();
  }

  // Load Configuration from Firestore
  async function loadCurrentConfig() {
    try {
      const docRef = doc(db, "birthday_wishes", "global");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const config = docSnap.data();
        
        // Populate inputs
        recipientNameInput.value = config.name || '';
        recipientAgeInput.value = config.age || '21';
        cakeFlavorSelect.value = config.cakeFlavor || 'strawberry';
        sprinklesToggle.checked = config.sprinkles !== false;
        berriesToggle.checked = config.berries !== false;
        hbdMessageInput.value = config.hbdMessage || '';
        
        // Select appropriate gender radio
        const genderRadios = document.getElementsByName('gender');
        for (const radio of genderRadios) {
          if (radio.value === config.gender) {
            radio.checked = true;
            break;
          }
        }
        
        // Trigger character counts
        updateCharCounts();
      }
    } catch (error) {
      console.error('Error loading current configuration:', error);
      showStatusAlert('Failed to load current settings from Firestore database', 'error');
    }
  }

  // Character Count Helpers
  function updateCharCounts() {
    hbdCount.textContent = hbdMessageInput.value.length;
  }

  hbdMessageInput.addEventListener('input', updateCharCounts);

  // Form Submission
  configForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    setSaveLoading(true);
    showStatusAlert(null); // hide existing alerts

    const selectedGenderRadio = document.querySelector('input[name="gender"]:checked');
    const payload = {
      name: recipientNameInput.value.trim(),
      age: recipientAgeInput.value.trim(),
      gender: selectedGenderRadio ? selectedGenderRadio.value : 'pastel',
      cakeFlavor: cakeFlavorSelect.value,
      sprinkles: sprinklesToggle.checked,
      berries: berriesToggle.checked,
      hbdMessage: hbdMessageInput.value.trim(),
      warmMessage: hbdMessageInput.value.trim() // store in both
    };

    try {
      const docRef = doc(db, "birthday_wishes", "global");
      await setDoc(docRef, payload);
      showStatusAlert('🎉 Changes saved successfully! Wishing page updated live.', 'success');
    } catch (error) {
      console.error('Error submitting config changes to Firestore:', error);
      showStatusAlert('❌ Database error: ' + (error.message || 'Failed to save to Firestore.'), 'error');
    } finally {
      setSaveLoading(false);
    }
  });

  function setSaveLoading(loading) {
    const btnText = saveBtn.querySelector('.btn-text');
    const spinner = saveBtn.querySelector('.spinner');

    if (loading) {
      saveBtn.disabled = true;
      btnText.textContent = 'Saving Changes...';
      spinner.classList.remove('hidden');
    } else {
      saveBtn.disabled = false;
      btnText.textContent = 'Save & Publish Changes';
      spinner.classList.add('hidden');
    }
  }

  function showStatusAlert(message, type = '') {
    saveStatus.className = 'p-3 text-sm font-semibold rounded-xl text-center';
    if (!message) {
      saveStatus.classList.add('hidden');
      return;
    }
    
    saveStatus.classList.remove('hidden');
    saveStatus.textContent = message;
    if (type === 'success') {
      saveStatus.classList.add('bg-emerald-500/20', 'text-emerald-400');
    } else if (type === 'error') {
      saveStatus.classList.add('bg-rose-500/20', 'text-rose-400');
    }
    saveStatus.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Sharing URL Copy
  copyLinkBtn.addEventListener('click', () => {
    shareUrlInput.select();
    shareUrlInput.setSelectionRange(0, 99999);

    try {
      navigator.clipboard.writeText(shareUrlInput.value);
      showCopySuccess();
    } catch (err) {
      document.execCommand('copy');
      showCopySuccess();
    }
  });

  function showCopySuccess() {
    copySuccess.classList.remove('hidden');
    setTimeout(() => {
      copySuccess.classList.add('hidden');
    }, 3000);
  }
});
