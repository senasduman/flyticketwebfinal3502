// API Base URL
const API_BASE = "/api";

// Global Variables
let selectedFlight = null;
let loadingModal = null;

// DOM Elements
const flightDetailsDiv = document.getElementById("flightDetails");
const bookingForm = document.getElementById("bookingForm");
const confirmBookingBtn = document.getElementById("confirmBookingBtn");

// Initialize App
document.addEventListener("DOMContentLoaded", function () {
  initBooking();
  loadingModal = new bootstrap.Modal(document.getElementById("loadingModal"));
});

// Initialize Booking Page
async function initBooking() {
  try {
    const flightId = localStorage.getItem("selectedFlightId");

    if (!flightId) {
      showError("Uçuş seçilmedi. Ana sayfaya yönlendiriliyorsunuz...");
      setTimeout(() => {
        window.location.href = "../index.html";
      }, 2000);
      return;
    }

    await loadFlightDetails(flightId);
    setupEventListeners();
  } catch (error) {
    console.error("Booking initialization error:", error);
    showError("Rezervasyon sayfası yüklenirken hata oluştu.");
  }
}

// Load Flight Details
async function loadFlightDetails(flightId) {
  try {
    const response = await fetch(`${API_BASE}/flights`);

    if (!response.ok) {
      throw new Error("Uçuş bilgileri alınamadı");
    }

    const flights = await response.json();
    selectedFlight = flights.find((flight) => flight._id === flightId);

    if (!selectedFlight) {
      throw new Error("Seçilen uçuş bulunamadı");
    }

    displayFlightDetails();
  } catch (error) {
    console.error("Flight details loading error:", error);
    flightDetailsDiv.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle me-2"></i>
                Uçuş bilgileri yüklenemedi.
            </div>
        `;
  }
}

// Display Flight Details
function displayFlightDetails() {
  const departureTime = new Date(selectedFlight.departure_time);
  const arrivalTime = new Date(selectedFlight.arrival_time);
  const duration = calculateFlightDuration(departureTime, arrivalTime);

  flightDetailsDiv.innerHTML = `
        <div class="flight-summary">
            <div class="text-center mb-3">
                <h6 class="text-primary mb-1">${selectedFlight.flight_id}</h6>
                <small class="text-muted">Uçuş Numarası</small>
            </div>
            
            <div class="route-info mb-3">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="text-center">
                        <div class="fw-bold">${
                          selectedFlight.from_city.city_name
                        }</div>
                        <div class="text-primary">${formatTime(
                          departureTime
                        )}</div>
                        <small class="text-muted">${formatDate(
                          departureTime
                        )}</small>
                    </div>
                    <div class="text-center">
                        <i class="fas fa-plane text-primary"></i>
                        <div><small class="text-muted">${duration}</small></div>
                    </div>
                    <div class="text-center">
                        <div class="fw-bold">${
                          selectedFlight.to_city.city_name
                        }</div>
                        <div class="text-primary">${formatTime(
                          arrivalTime
                        )}</div>
                        <small class="text-muted">${formatDate(
                          arrivalTime
                        )}</small>
                    </div>
                </div>
            </div>
            
            <hr>
            
            <div class="pricing-info">
                <div class="d-flex justify-content-between mb-2">
                    <span>Bilet Fiyatı:</span>
                    <span class="fw-bold">₺${selectedFlight.price.toLocaleString()}</span>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span>Vergiler ve Ücretler:</span>
                    <span>₺${Math.round(
                      selectedFlight.price * 0.1
                    ).toLocaleString()}</span>
                </div>
                <hr>
                <div class="d-flex justify-content-between">
                    <span class="fw-bold">Toplam:</span>
                    <span class="fw-bold text-success">₺${Math.round(
                      selectedFlight.price * 1.1
                    ).toLocaleString()}</span>
                </div>
            </div>
            
            <div class="mt-3 p-2 bg-light rounded">
                <small class="text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    Kalan Koltuk: ${selectedFlight.seats_available}
                </small>
            </div>
        </div>
    `;
}

// Setup Event Listeners
function setupEventListeners() {
  bookingForm.addEventListener("submit", handleBooking);

  // Form validation
  const requiredFields = [
    "passengerName",
    "passengerSurname",
    "passengerEmail",
  ];
  requiredFields.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    field.addEventListener("input", validateForm);
  });

  document
    .getElementById("termsAccepted")
    .addEventListener("change", validateForm);
}

// Validate Form
function validateForm() {
  const name = document.getElementById("passengerName").value.trim();
  const surname = document.getElementById("passengerSurname").value.trim();
  const email = document.getElementById("passengerEmail").value.trim();
  const termsAccepted = document.getElementById("termsAccepted").checked;

  const isValid = name && surname && email && termsAccepted;
  confirmBookingBtn.disabled = !isValid;

  return isValid;
}

// Handle Booking Form Submit
async function handleBooking(event) {
  event.preventDefault();

  if (!validateForm()) {
    showError("Lütfen tüm zorunlu alanları doldurun.");
    return;
  }

  if (!selectedFlight) {
    showError("Uçuş bilgisi bulunamadı.");
    return;
  }

  const bookingData = {
    passenger_name: document.getElementById("passengerName").value.trim(),
    passenger_surname: document.getElementById("passengerSurname").value.trim(),
    passenger_email: document.getElementById("passengerEmail").value.trim(),
    flight_id: selectedFlight._id,
    seat_number: document.getElementById("seatNumber").value || null,
  };

  try {
    showLoadingModal(true);

    const response = await fetch(`${API_BASE}/tickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bookingData),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.msg || "Rezervasyon oluşturulamadı");
    }

    // Başarılı rezervasyon
    localStorage.setItem("bookingResult", JSON.stringify(result));
    localStorage.removeItem("selectedFlightId"); // Clean up

    showSuccess("Rezervasyonunuz başarıyla oluşturuldu!");

    // Confirmation sayfasına yönlendir
    setTimeout(() => {
      window.location.href = "confirmation.html";
    }, 1500);
  } catch (error) {
    console.error("Booking error:", error);
    showError(error.message || "Rezervasyon sırasında hata oluştu.");
  } finally {
    showLoadingModal(false);
  }
}

// Calculate Flight Duration
function calculateFlightDuration(departureTime, arrivalTime) {
  const diffMs = arrivalTime - departureTime;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  return `${diffHours}s ${diffMinutes}dk`;
}

// Format Time
function formatTime(date) {
  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Format Date
function formatDate(date) {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
  });
}

// Show Loading Modal
function showLoadingModal(show) {
  if (show) {
    loadingModal.show();
    confirmBookingBtn.disabled = true;
  } else {
    loadingModal.hide();
    confirmBookingBtn.disabled = false;
  }
}

// Go Back Function
function goBack() {
  window.history.back();
}

// Show Error Message
function showError(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className =
    "alert alert-danger alert-dismissible fade show position-fixed";
  alertDiv.style.cssText =
    "top: 20px; right: 20px; z-index: 9999; min-width: 300px;";
  alertDiv.innerHTML = `
        <i class="fas fa-exclamation-triangle me-2"></i>
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

// Show Success Message
function showSuccess(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className =
    "alert alert-success alert-dismissible fade show position-fixed";
  alertDiv.style.cssText =
    "top: 20px; right: 20px; z-index: 9999; min-width: 300px;";
  alertDiv.innerHTML = `
        <i class="fas fa-check-circle me-2"></i>
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
