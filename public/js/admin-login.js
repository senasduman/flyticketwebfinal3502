// API Base URL
const API_BASE = "/api";

// Global Variables
let loadingModal = null;

// DOM Elements
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginButton = document.getElementById("loginButton");
const rememberMeCheckbox = document.getElementById("rememberMe");

// Initialize App
document.addEventListener("DOMContentLoaded", function () {
  initLogin();
  loadingModal = new bootstrap.Modal(document.getElementById("loadingModal"));
});

// Initialize Login Page
function initLogin() {
  // Check if already logged in
  if (isLoggedIn()) {
    window.location.href = "dashboard.html";
    return;
  }

  setupEventListeners();
  loadSavedCredentials();
}

// Setup Event Listeners
function setupEventListeners() {
  loginForm.addEventListener("submit", handleLogin);

  // Enter key support
  usernameInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      passwordInput.focus();
    }
  });

  passwordInput.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      handleLogin(e);
    }
  });

  // Real-time validation
  usernameInput.addEventListener("input", validateForm);
  passwordInput.addEventListener("input", validateForm);
}

// Load Saved Credentials
function loadSavedCredentials() {
  const savedUsername = localStorage.getItem("adminUsername");
  if (savedUsername) {
    usernameInput.value = savedUsername;
    rememberMeCheckbox.checked = true;
    passwordInput.focus();
  } else {
    usernameInput.focus();
  }
}

// Validate Form
function validateForm() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  const isValid = username.length >= 3 && password.length >= 3;
  loginButton.disabled = !isValid;

  return isValid;
}

// Handle Login Form Submit
async function handleLogin(event) {
  event.preventDefault();

  if (!validateForm()) {
    showError("Lütfen kullanıcı adı ve şifre girin.");
    return;
  }

  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  try {
    showLoadingModal(true);

    // Simulate API call - Demo için basit kontrol
    const loginResult = await simulateLogin(username, password);

    if (loginResult.success) {
      // Save credentials if remember me is checked
      if (rememberMeCheckbox.checked) {
        localStorage.setItem("adminUsername", username);
      } else {
        localStorage.removeItem("adminUsername");
      }

      // Save auth token
      localStorage.setItem("adminToken", loginResult.token);
      localStorage.setItem("adminUser", JSON.stringify(loginResult.user));

      showSuccess("Giriş başarılı! Yönlendiriliyorsunuz...");

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 1500);
    } else {
      throw new Error(loginResult.message || "Giriş başarısız");
    }
  } catch (error) {
    console.error("Login error:", error);
    showError(error.message || "Giriş sırasında hata oluştu.");
    shakeForm();
  } finally {
    showLoadingModal(false);
  }
}

// Simulate Login API Call
async function simulateLogin(username, password) {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 2000));

  // Demo credentials
  const validCredentials = [
    {
      username: "admin",
      password: "123456",
      role: "admin",
      name: "Admin User",
    },
    {
      username: "manager",
      password: "manager123",
      role: "manager",
      name: "Flight Manager",
    },
    {
      username: "operator",
      password: "operator123",
      role: "operator",
      name: "System Operator",
    },
  ];

  const user = validCredentials.find(
    (cred) => cred.username === username && cred.password === password
  );

  if (user) {
    return {
      success: true,
      token: generateToken(),
      user: {
        username: user.username,
        role: user.role,
        name: user.name,
        loginTime: new Date().toISOString(),
      },
    };
  } else {
    return {
      success: false,
      message: "Kullanıcı adı veya şifre hatalı!",
    };
  }
}

// Generate Demo Token
function generateToken() {
  return "admin_" + Math.random().toString(36).substr(2, 16) + "_" + Date.now();
}

// Check if user is logged in
function isLoggedIn() {
  const token = localStorage.getItem("adminToken");
  const user = localStorage.getItem("adminUser");

  if (!token || !user) {
    return false;
  }

  // In a real app, you would validate the token with the server
  try {
    const userData = JSON.parse(user);
    const loginTime = new Date(userData.loginTime);
    const now = new Date();

    // Token expires after 24 hours
    const hoursElapsed = (now - loginTime) / (1000 * 60 * 60);

    if (hoursElapsed > 24) {
      logout();
      return false;
    }

    return true;
  } catch (error) {
    logout();
    return false;
  }
}

// Logout function
function logout() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("adminUser");
  window.location.href = "login.html";
}

// Toggle Password Visibility
function togglePassword() {
  const passwordToggleIcon = document.getElementById("passwordToggleIcon");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    passwordToggleIcon.classList.remove("fa-eye");
    passwordToggleIcon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    passwordToggleIcon.classList.remove("fa-eye-slash");
    passwordToggleIcon.classList.add("fa-eye");
  }
}

// Show Loading Modal
function showLoadingModal(show) {
  if (show) {
    loadingModal.show();
    loginButton.disabled = true;
  } else {
    loadingModal.hide();
    loginButton.disabled = false;
  }
}

// Shake Form Animation (for invalid login)
function shakeForm() {
  const loginCard = document.querySelector(".card");
  loginCard.style.animation = "shake 0.5s ease-in-out";

  setTimeout(() => {
    loginCard.style.animation = "";
  }, 500);
}

// Show Success Message
function showSuccess(message) {
  showMessage(message, "success", "fas fa-check-circle");
}

// Show Error Message
function showError(message) {
  showMessage(message, "danger", "fas fa-exclamation-triangle");
}

// Generic Show Message Function
function showMessage(message, type, icon) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  alertDiv.style.cssText =
    "top: 20px; right: 20px; z-index: 9999; min-width: 350px;";
  alertDiv.innerHTML = `
        <i class="${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

  document.body.appendChild(alertDiv);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}

// Add CSS for shake animation
const style = document.createElement("style");
style.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
`;
document.head.appendChild(style);
