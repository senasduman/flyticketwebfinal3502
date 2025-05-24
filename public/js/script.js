// API Base URL
const API_BASE = "/api";

// Global Variables
let allCities = [];
let searchResults = [];

// DOM Elements
const fromCitySelect = document.getElementById("fromCity");
const toCitySelect = document.getElementById("toCity");
const flightDateInput = document.getElementById("flightDate");
const searchForm = document.getElementById("searchForm");
const searchResultsSection = document.getElementById("search-results");
const flightResultsDiv = document.getElementById("flightResults");
const loadingSpinner = document.getElementById("loadingSpinner");

// Initialize App
document.addEventListener("DOMContentLoaded", function () {
  initApp();
});

// Initialize Application
async function initApp() {
  try {
    await loadCities();
    setMinDate();
    setupEventListeners();
    console.log("App initialized successfully");
  } catch (error) {
    console.error("App initialization error:", error);
    showError("Uygulama başlatılırken hata oluştu: " + error.message);
  }
}

// Load Cities from API
async function loadCities() {
  try {
    console.log("Loading cities...");
    showLoading(true);

    const response = await fetch(`${API_BASE}/cities`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    allCities = await response.json();
    console.log(`${allCities.length} şehir yüklendi`);

    if (allCities.length === 0) {
      console.warn("Database'de şehir bulunamadı, fallback kullanılıyor");
      allCities = getFallbackCities();
    }

    populateCitySelects();
    showLoading(false);
  } catch (error) {
    console.error("Cities loading error:", error);
    // API hatası durumunda fallback kullan
    allCities = getFallbackCities();
    populateCitySelects();
    showLoading(false);
    // Hata mesajını göster ama uygulamayı çökertme
    console.warn("Şehirler API'den yüklenemedi, varsayılan liste kullanılıyor");
  }
}

// Fallback Cities - API hatası durumunda kullan
function getFallbackCities() {
  return [
    { _id: "01", city_name: "Adana" },
    { _id: "06", city_name: "Ankara" },
    { _id: "07", city_name: "Antalya" },
    { _id: "16", city_name: "Bursa" },
    { _id: "34", city_name: "İstanbul" },
    { _id: "35", city_name: "İzmir" },
    { _id: "42", city_name: "Konya" },
    { _id: "55", city_name: "Samsun" },
    { _id: "61", city_name: "Trabzon" },
    // İhtiyaca göre daha fazla şehir ekleyebilirsiniz
  ];
}

// Populate City Select Options
function populateCitySelects() {
  if (!allCities || allCities.length === 0) {
    console.error("No cities available to populate selects");
    return;
  }

  const options = allCities
    .map((city) => `<option value="${city._id}">${city.city_name}</option>`)
    .join("");

  if (fromCitySelect) {
    fromCitySelect.innerHTML =
      '<option value="">Şehir seçin</option>' + options;
  }
  if (toCitySelect) {
    toCitySelect.innerHTML = '<option value="">Şehir seçin</option>' + options;
  }
}

// Set Minimum Date (today)
function setMinDate() {
  if (flightDateInput) {
    const today = new Date().toISOString().split("T")[0];
    flightDateInput.min = today;
    flightDateInput.value = today; // Default to today
  }
}

// Setup Event Listeners
function setupEventListeners() {
  if (searchForm) {
    searchForm.addEventListener("submit", handleSearch);
  }

  if (fromCitySelect) {
    fromCitySelect.addEventListener("change", updateCityOptions);
  }

  if (toCitySelect) {
    toCitySelect.addEventListener("change", updateCityOptions);
  }
}

// Update City Options
function updateCityOptions() {
  const fromCityId = fromCitySelect?.value;
  const toCityId = toCitySelect?.value;

  // Reset and repopulate options
  populateCitySelects();

  // Disable selected cities in opposite select
  if (fromCityId && toCitySelect) {
    const toCityOption = toCitySelect.querySelector(
      `option[value="${fromCityId}"]`
    );
    if (toCityOption) toCityOption.disabled = true;
  }

  if (toCityId && fromCitySelect) {
    const fromCityOption = fromCitySelect.querySelector(
      `option[value="${toCityId}"]`
    );
    if (fromCityOption) fromCityOption.disabled = true;
  }

  // Restore selected values
  if (fromCitySelect) fromCitySelect.value = fromCityId || "";
  if (toCitySelect) toCitySelect.value = toCityId || "";
}

// Handle Search Form Submit
async function handleSearch(event) {
  event.preventDefault();

  const fromCityId = fromCitySelect?.value;
  const toCityId = toCitySelect?.value;
  const selectedDate = flightDateInput?.value;

  // Validation
  if (!fromCityId || !toCityId || !selectedDate) {
    showError("Lütfen tüm alanları doldurun.");
    return;
  }

  if (fromCityId === toCityId) {
    showError("Kalkış ve varış şehri aynı olamaz.");
    return;
  }

  const searchParams = {
    from: fromCityId,
    to: toCityId,
    date: selectedDate,
  };

  await searchFlights(searchParams);
}

// Search Flights
async function searchFlights(params) {
  try {
    showLoading(true);
    console.log("Searching flights with params:", params);

    const queryString = new URLSearchParams(params).toString();
    const response = await fetch(`${API_BASE}/flights/search?${queryString}`);

    console.log("Search response status:", response.status);

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.msg || errorData.message || errorMessage;
      } catch (parseError) {
        const errorText = await response.text();
        console.error("Error response text:", errorText);
        errorMessage = `${errorMessage}: ${errorText}`;
      }
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log("Search response data:", responseData);

    // Handle different response formats
    let results = [];
    if (responseData.success && responseData.data) {
      results = responseData.data; // New format with success flag
    } else if (Array.isArray(responseData)) {
      results = responseData; // Direct array format
    } else {
      console.warn("Unexpected response format:", responseData);
      results = [];
    }

    console.log(`Found ${results.length} flights`);
    searchResults = results;
    displayFlightResults();
    showSearchResults();
  } catch (error) {
    console.error("Search error:", error);
    showError(`Uçuş arama sırasında hata oluştu: ${error.message}`);
  } finally {
    showLoading(false);
  }
}

// Display Flight Results
function displayFlightResults() {
  if (!flightResultsDiv) return;

  if (searchResults.length === 0) {
    flightResultsDiv.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info text-center">
          <i class="fas fa-info-circle me-2"></i>
          Aradığınız kriterlere uygun uçuş bulunamadı.
        </div>
      </div>
    `;
    return;
  }

  const flightCards = searchResults
    .map((flight) => createFlightCard(flight))
    .join("");
  flightResultsDiv.innerHTML = flightCards;
}

// Create Flight Card HTML - Güncellenmiş veri formatı desteği
function createFlightCard(flight) {
  try {
    const departureTime = new Date(flight.departure_time);
    const arrivalTime = new Date(flight.arrival_time);

    // Farklı veri formatlarını destekle
    let fromCityName = "Bilinmeyen Şehir";
    let toCityName = "Bilinmeyen Şehir";

    // 1. Admin panelinden gelen zenginleştirilmiş format
    if (flight.from_city_name) {
      fromCityName = flight.from_city_name;
    }
    // 2. Search API'den gelen populate edilmiş format
    else if (
      flight.from_city &&
      typeof flight.from_city === "object" &&
      flight.from_city.city_name
    ) {
      fromCityName = flight.from_city.city_name;
    }
    // 3. ObjectId format - allCities'den bul
    else if (flight.from_city && typeof flight.from_city === "string") {
      const cityObj = allCities.find((city) => city._id === flight.from_city);
      fromCityName = cityObj ? cityObj.city_name : `ID: ${flight.from_city}`;
    }

    // Aynı mantığı to_city için uygula
    if (flight.to_city_name) {
      toCityName = flight.to_city_name;
    } else if (
      flight.to_city &&
      typeof flight.to_city === "object" &&
      flight.to_city.city_name
    ) {
      toCityName = flight.to_city.city_name;
    } else if (flight.to_city && typeof flight.to_city === "string") {
      const cityObj = allCities.find((city) => city._id === flight.to_city);
      toCityName = cityObj ? cityObj.city_name : `ID: ${flight.to_city}`;
    }

    // Validate dates
    if (isNaN(departureTime.getTime()) || isNaN(arrivalTime.getTime())) {
      console.error("Invalid flight dates:", flight);
      return `
        <div class="col-12">
          <div class="alert alert-warning">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Uçuş ${flight.flight_id || "ID Yok"} - Geçersiz tarih verisi
          </div>
        </div>
      `;
    }

    return `
      <div class="col-lg-6 col-xl-4 mb-4">
        <div class="card flight-card h-100">
          <div class="card-header bg-primary text-white">
            <h6 class="mb-0">
              <i class="fas fa-plane me-2"></i>
              ${flight.flight_id || "N/A"}
            </h6>
          </div>
          <div class="card-body">
            <div class="flight-route mb-3">
              <div class="row align-items-center">
                <div class="col-4 text-center">
                  <div class="fw-bold">${fromCityName}</div>
                  <div class="text-muted small">${formatTime(
                    departureTime
                  )}</div>
                </div>
                <div class="col-4 text-center">
                  <i class="fas fa-arrow-right text-primary"></i>
                </div>
                <div class="col-4 text-center">
                  <div class="fw-bold">${toCityName}</div>
                  <div class="text-muted small">${formatTime(arrivalTime)}</div>
                </div>
              </div>
            </div>
            
            <div class="flight-details">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <div class="price fw-bold text-primary fs-5">
                  ₺${(flight.price || 0).toLocaleString()}
                </div>
                <div class="seats-info text-muted small">
                  ${flight.seats_available || 0} koltuk kaldı
                </div>
              </div>
              <button class="btn btn-primary w-100" onclick="bookFlight('${
                flight._id
              }')">
                <i class="fas fa-ticket-alt me-2"></i>
                Rezerve Et
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error creating flight card:", error, flight);
    return `
      <div class="col-12">
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-triangle me-2"></i>
          Uçuş kartı oluşturulurken hata oluştu: ${flight.flight_id || "ID Yok"}
        </div>
      </div>
    `;
  }
}

// Format Time
function formatTime(date) {
  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Book Flight
function bookFlight(flightId) {
  localStorage.setItem("selectedFlightId", flightId);
  window.location.href = "pages/booking.html";
}

// Show Search Results Section
function showSearchResults() {
  const heroSection = document.querySelector(".hero-section");
  if (heroSection) heroSection.style.display = "none";
  if (searchResultsSection) searchResultsSection.classList.remove("d-none");
}

// Show Section
function showSection(sectionName) {
  const heroSection = document.querySelector(".hero-section");

  if (sectionName === "home") {
    if (heroSection) heroSection.style.display = "block";
    if (searchResultsSection) searchResultsSection.classList.add("d-none");
  } else if (sectionName === "search-results") {
    if (searchResults.length > 0) {
      showSearchResults();
    } else {
      showError("Önce bir arama yapın.");
    }
  }
}

// Show Loading
function showLoading(show) {
  if (loadingSpinner) {
    if (show) {
      loadingSpinner.classList.remove("d-none");
    } else {
      loadingSpinner.classList.add("d-none");
    }
  }
}

// Show Error Message
function showError(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert alert-danger alert-dismissible fade show";
  alertDiv.style.cssText =
    "position: fixed; top: 20px; right: 20px; z-index: 1055; max-width: 400px;";
  alertDiv.innerHTML = `
    <i class="fas fa-exclamation-triangle me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    if (alertDiv.parentNode) alertDiv.remove();
  }, 5000);
}

// Show Success Message
function showSuccess(message) {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert alert-success alert-dismissible fade show";
  alertDiv.style.cssText =
    "position: fixed; top: 20px; right: 20px; z-index: 1055; max-width: 400px;";
  alertDiv.innerHTML = `
    <i class="fas fa-check-circle me-2"></i>
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    if (alertDiv.parentNode) alertDiv.remove();
  }, 5000);
}
