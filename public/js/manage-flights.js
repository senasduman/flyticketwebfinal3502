// API Base URL
const API_BASE = "/api";

// Global Variables
let allFlights = [];
let allCities = [];
let filteredFlights = [];
let currentEditingFlight = null;
let flightModal = null;
let deleteModal = null;

// DOM Elements
const flightsTable = document.getElementById("flightsTable");
const searchInput = document.getElementById("searchInput");
const fromCityFilter = document.getElementById("fromCityFilter");
const toCityFilter = document.getElementById("toCityFilter");
const dateFilter = document.getElementById("dateFilter");
const statusFilter = document.getElementById("statusFilter");

// Statistics Elements
const totalFlightsCount = document.getElementById("totalFlightsCount");
const activeFlightsCount = document.getElementById("activeFlightsCount");
const todayFlightsCount = document.getElementById("todayFlightsCount");
const totalPassengersCount = document.getElementById("totalPassengersCount");

// Form Elements
const flightForm = document.getElementById("flightForm");
const flightModalTitle = document.getElementById("flightModalTitle");

// Initialize App
document.addEventListener("DOMContentLoaded", function () {
  initManageFlights();
});

// Initialize Manage Flights Page
async function initManageFlights() {
  try {
    if (!isAuthenticated()) {
      window.location.href = "../../login.html";
      return;
    }

    loadUserInfo();

    // Initialize Bootstrap Modals
    flightModal = new bootstrap.Modal(document.getElementById("flightModal"));
    deleteModal = new bootstrap.Modal(document.getElementById("deleteModal"));

    await loadCities();
    await loadFlights();
    setupEventListeners();
    updateStatistics();

    console.log("Manage flights page initialized successfully");
  } catch (error) {
    console.error("Manage flights initialization error:", error);
    showError("Sayfa yüklenirken hata oluştu: " + error.message);
  }
}

// Check Authentication
function isAuthenticated() {
  const token = localStorage.getItem("adminToken");
  const user = localStorage.getItem("adminUser");
  return token && user;
}

// Load User Info
function loadUserInfo() {
  try {
    const userData = JSON.parse(localStorage.getItem("adminUser"));
    if (userData && document.getElementById("adminName")) {
      document.getElementById("adminName").textContent =
        userData.name || userData.username || "Admin";
    }
  } catch (error) {
    console.error("User info loading error:", error);
  }
}

// Load Cities
async function loadCities() {
  try {
    console.log("Loading cities...");
    const response = await fetch(`${API_BASE}/cities`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    allCities = await response.json();
    console.log(`Loaded ${allCities.length} cities`);

    populateCityFilters();
    populateCitySelects();
  } catch (error) {
    console.error("Cities loading error:", error);
    showError("Şehirler yüklenirken hata oluştu: " + error.message);
    // Set empty arrays to prevent further errors
    allCities = [];
  }
}

// Load Flights
async function loadFlights() {
  try {
    console.log("Loading flights...");
    showLoadingState();

    const response = await fetch(`${API_BASE}/flights`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("Raw flight data received:", data);

    // Backend should return enriched flights with city names
    allFlights = Array.isArray(data) ? data : [];
    filteredFlights = [...allFlights];

    console.log(`Loaded ${allFlights.length} flights`);

    if (allFlights.length > 0) {
      console.log("First flight sample:", {
        flight_id: allFlights[0].flight_id,
        from_city_name: allFlights[0].from_city_name,
        to_city_name: allFlights[0].to_city_name,
        from_city_id: allFlights[0].from_city_id,
        to_city_id: allFlights[0].to_city_id,
      });
    }

    displayFlights();
    updateStatistics();
  } catch (error) {
    console.error("Flights loading error:", error);
    showError(`Uçuşlar yüklenirken hata oluştu: ${error.message}`);
    showErrorState(error.message);
    // Set empty arrays to prevent further errors
    allFlights = [];
    filteredFlights = [];
  }
}

// Show Loading State
function showLoadingState() {
  flightsTable.innerHTML = `
    <tr>
      <td colspan="9" class="text-center py-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Yükleniyor...</span>
        </div>
        <div class="mt-2">Uçuş verileri yükleniyor...</div>
      </td>
    </tr>
  `;
}

// Show Error State
function showErrorState(errorMessage) {
  flightsTable.innerHTML = `
    <tr>
      <td colspan="9" class="text-center text-danger py-4">
        <i class="fas fa-exclamation-triangle me-2"></i>
        Veri yüklenemedi: ${errorMessage}
        <br>
        <button class="btn btn-outline-primary btn-sm mt-2" onclick="refreshFlights()">
          <i class="fas fa-sync-alt me-1"></i>
          Tekrar Dene
        </button>
      </td>
    </tr>
  `;
}

// Populate City Filters
function populateCityFilters() {
  const options = allCities
    .map((city) => `<option value="${city._id}">${city.city_name}</option>`)
    .join("");

  if (fromCityFilter) {
    fromCityFilter.innerHTML = '<option value="">Tümü</option>' + options;
  }
  if (toCityFilter) {
    toCityFilter.innerHTML = '<option value="">Tümü</option>' + options;
  }
}

// Populate City Selects in Modal
function populateCitySelects() {
  const options = allCities
    .map((city) => `<option value="${city._id}">${city.city_name}</option>`)
    .join("");

  const fromCitySelect = document.getElementById("fromCity");
  const toCitySelect = document.getElementById("toCity");

  if (fromCitySelect) {
    fromCitySelect.innerHTML =
      '<option value="">Şehir seçin</option>' + options;
  }
  if (toCitySelect) {
    toCitySelect.innerHTML = '<option value="">Şehir seçin</option>' + options;
  }
}

// Setup Event Listeners
function setupEventListeners() {
  // Filter events
  if (searchInput) searchInput.addEventListener("input", applyFilters);
  if (fromCityFilter) fromCityFilter.addEventListener("change", applyFilters);
  if (toCityFilter) toCityFilter.addEventListener("change", applyFilters);
  if (dateFilter) dateFilter.addEventListener("change", applyFilters);
  if (statusFilter) statusFilter.addEventListener("change", applyFilters);

  // Form events
  if (flightForm) {
    flightForm.addEventListener("submit", function (e) {
      e.preventDefault();
      saveFlight();
    });
  }

  // Auto-fill arrival date when departure date changes
  const departureDate = document.getElementById("departureDate");
  if (departureDate) {
    departureDate.addEventListener("change", function () {
      const arrivalDate = document.getElementById("arrivalDate");
      if (arrivalDate && !arrivalDate.value) {
        arrivalDate.value = this.value;
      }
    });
  }

  // Auto-fill available seats when total seats changes (for new flights only)
  const totalSeats = document.getElementById("totalSeats");
  if (totalSeats) {
    totalSeats.addEventListener("input", function () {
      const availableSeats = document.getElementById("availableSeats");
      if (availableSeats && !currentEditingFlight) {
        availableSeats.value = this.value;
      }
    });
  }
}

// Display Flights
function displayFlights() {
  if (!flightsTable) return;

  if (filteredFlights.length === 0) {
    flightsTable.innerHTML = `
      <tr>
        <td colspan="9" class="text-center text-muted py-4">
          <i class="fas fa-search me-2"></i>
          ${
            allFlights.length === 0
              ? "Henüz uçuş eklenmemiş"
              : "Arama kriterlerine uygun uçuş bulunamadı"
          }
        </td>
      </tr>
    `;
    return;
  }

  const flightsHTML = filteredFlights
    .map((flight, index) => {
      try {
        // Use enriched city names from backend
        const fromCityName = flight.from_city_name || "Bilinmeyen Şehir";
        const toCityName = flight.to_city_name || "Bilinmeyen Şehir";

        const departureTime = new Date(flight.departure_time);
        const arrivalTime = new Date(flight.arrival_time);
        const now = new Date();

        // Calculate duration
        const durationMs = arrivalTime - departureTime;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor(
          (durationMs % (1000 * 60 * 60)) / (1000 * 60)
        );
        const duration = `${hours}s ${minutes}dk`;

        // Calculate occupancy
        const totalSeats = flight.seats_total || 0;
        const availableSeats = flight.seats_available || 0;
        const occupiedSeats = totalSeats - availableSeats;
        const occupancyRate =
          totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

        // Determine status
        let status, statusClass;
        if (now > arrivalTime) {
          status = "Tamamlandı";
          statusClass = "status-completed";
        } else if (now > departureTime) {
          status = "Uçuyor";
          statusClass = "status-flying";
        } else {
          status = "Planlandı";
          statusClass = "status-scheduled";
        }

        return `
          <tr>
            <td><strong>${flight.flight_id || "N/A"}</strong></td>
            <td>
              <div>${fromCityName}</div>
              <div class="text-center my-1">
                <i class="fas fa-arrow-down text-muted"></i>
              </div>
              <div>${toCityName}</div>
            </td>
            <td>
              <div><strong>${formatDate(departureTime)}</strong></div>
              <div class="small text-muted">
                ${formatTime(departureTime)} - ${formatTime(arrivalTime)}
              </div>
            </td>
            <td>${duration}</td>
            <td><strong>₺${(flight.price || 0).toLocaleString()}</strong></td>
            <td>
              <div>${availableSeats}/${totalSeats}</div>
              <div class="progress mt-1" style="height: 4px;">
                <div class="progress-bar ${
                  occupancyRate > 80
                    ? "bg-danger"
                    : occupancyRate > 60
                    ? "bg-warning"
                    : "bg-success"
                }" style="width: ${occupancyRate}%"></div>
              </div>
            </td>
            <td><span class="small">${occupancyRate}%</span></td>
            <td><span class="badge ${statusClass}">${status}</span></td>
            <td>
              <div class="btn-group btn-group-sm">
                <button class="btn btn-outline-primary" 
                        onclick="viewFlight('${flight._id}')" 
                        title="Görüntüle">
                  <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-outline-warning" 
                        onclick="editFlight('${flight._id}')" 
                        title="Düzenle">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-outline-danger" 
                        onclick="deleteFlight('${flight._id}')" 
                        title="Sil">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      } catch (error) {
        console.error(`Error processing flight ${index}:`, error, flight);
        return `
          <tr>
            <td colspan="9" class="text-center text-danger py-2">
              <i class="fas fa-exclamation-triangle me-2"></i>
              Uçuş verisi işlenirken hata: ${flight.flight_id || "ID Yok"}
            </td>
          </tr>
        `;
      }
    })
    .join("");

  flightsTable.innerHTML = flightsHTML;
}

// Apply Filters
function applyFilters() {
  const searchTerm = (searchInput?.value || "").toLowerCase().trim();
  const fromCityIdFilter = fromCityFilter?.value || "";
  const toCityIdFilter = toCityFilter?.value || "";
  const selectedDate = dateFilter?.value || "";
  const selectedStatus = statusFilter?.value || "";

  filteredFlights = allFlights.filter((flight) => {
    // Use enriched city names and IDs from backend
    const fromCityName = flight.from_city_name || "";
    const toCityName = flight.to_city_name || "";
    const flightFromCityId = flight.from_city_id || "";
    const flightToCityId = flight.to_city_id || "";

    // Search filter
    const matchesSearch =
      !searchTerm ||
      (flight.flight_id &&
        flight.flight_id.toLowerCase().includes(searchTerm)) ||
      fromCityName.toLowerCase().includes(searchTerm) ||
      toCityName.toLowerCase().includes(searchTerm);

    // City filters
    const matchesFromCity =
      !fromCityIdFilter || flightFromCityId === fromCityIdFilter;
    const matchesToCity = !toCityIdFilter || flightToCityId === toCityIdFilter;

    // Date filter
    const flightDate = new Date(flight.departure_time)
      .toISOString()
      .split("T")[0];
    const matchesDate = !selectedDate || flightDate === selectedDate;

    // Status filter
    const now = new Date();
    const departureTime = new Date(flight.departure_time);
    const arrivalTime = new Date(flight.arrival_time);

    let currentStatus;
    if (now > arrivalTime) {
      currentStatus = "completed";
    } else if (now > departureTime) {
      currentStatus = "flying";
    } else {
      currentStatus = "scheduled";
    }

    let matchesStatus = !selectedStatus;
    if (selectedStatus === "active") {
      matchesStatus =
        currentStatus === "flying" || currentStatus === "scheduled";
    } else if (selectedStatus) {
      matchesStatus = currentStatus === selectedStatus;
    }

    return (
      matchesSearch &&
      matchesFromCity &&
      matchesToCity &&
      matchesDate &&
      matchesStatus
    );
  });

  displayFlights();
  updateStatistics();
}

// Clear Filters
function clearFilters() {
  if (searchInput) searchInput.value = "";
  if (fromCityFilter) fromCityFilter.value = "";
  if (toCityFilter) toCityFilter.value = "";
  if (dateFilter) dateFilter.value = "";
  if (statusFilter) statusFilter.value = "";
  applyFilters();
}

// Update Statistics
function updateStatistics() {
  if (totalFlightsCount) totalFlightsCount.textContent = allFlights.length;

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Active flights (not yet arrived)
  const activeFlights = allFlights.filter((flight) => {
    const arrivalTime = new Date(flight.arrival_time);
    return now < arrivalTime;
  });
  if (activeFlightsCount) activeFlightsCount.textContent = activeFlights.length;

  // Today's flights
  const todayFlights = allFlights.filter((flight) => {
    const flightDate = new Date(flight.departure_time)
      .toISOString()
      .split("T")[0];
    return flightDate === today;
  });
  if (todayFlightsCount) todayFlightsCount.textContent = todayFlights.length;

  // Total passengers
  const totalPassengers = allFlights.reduce((sum, flight) => {
    return sum + (flight.seats_total - flight.seats_available);
  }, 0);
  if (totalPassengersCount) totalPassengersCount.textContent = totalPassengers;
}

// Show Add Flight Modal
function showAddFlightModal() {
  currentEditingFlight = null;
  if (flightModalTitle) {
    flightModalTitle.innerHTML =
      '<i class="fas fa-plus me-2"></i>Yeni Uçuş Ekle';
  }

  if (flightForm) flightForm.reset();

  const editFlightId = document.getElementById("editFlightId");
  if (editFlightId) editFlightId.value = "";

  // Set default date to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split("T")[0];

  const departureDate = document.getElementById("departureDate");
  const arrivalDate = document.getElementById("arrivalDate");
  if (departureDate) departureDate.value = defaultDate;
  if (arrivalDate) arrivalDate.value = defaultDate;

  if (flightModal) flightModal.show();
}

// Edit Flight
function editFlight(flightId) {
  const flight = allFlights.find((f) => f._id === flightId);
  if (!flight) {
    showError("Uçuş bulunamadı.");
    return;
  }

  currentEditingFlight = flight;
  if (flightModalTitle) {
    flightModalTitle.innerHTML = '<i class="fas fa-edit me-2"></i>Uçuş Düzenle';
  }

  // Fill form with flight data
  const fields = {
    editFlightId: flight._id,
    flightId: flight.flight_id,
    price: flight.price,
    fromCity: flight.from_city_id,
    toCity: flight.to_city_id,
    totalSeats: flight.seats_total,
    availableSeats: flight.seats_available,
  };

  Object.entries(fields).forEach(([fieldId, value]) => {
    const element = document.getElementById(fieldId);
    if (element) element.value = value;
  });

  // Set dates and times
  const departure = new Date(flight.departure_time);
  const arrival = new Date(flight.arrival_time);

  const dateTimeFields = {
    departureDate: departure.toISOString().split("T")[0],
    departureTime: departure.toTimeString().split(" ")[0].slice(0, 5),
    arrivalDate: arrival.toISOString().split("T")[0],
    arrivalTime: arrival.toTimeString().split(" ")[0].slice(0, 5),
  };

  Object.entries(dateTimeFields).forEach(([fieldId, value]) => {
    const element = document.getElementById(fieldId);
    if (element) element.value = value;
  });

  if (flightModal) flightModal.show();
}

// Save Flight
async function saveFlight() {
  const saveButton = document.querySelector("#flightModal .btn-primary");
  const originalButtonText = saveButton?.innerHTML || "";

  try {
    if (!flightForm?.checkValidity()) {
      flightForm?.reportValidity();
      return;
    }

    // Collect form data
    const formData = {
      flight_id: document.getElementById("flightId")?.value?.trim(),
      price: parseFloat(document.getElementById("price")?.value || 0),
      from_city: document.getElementById("fromCity")?.value,
      to_city: document.getElementById("toCity")?.value,
      departure_time: new Date(
        `${document.getElementById("departureDate")?.value}T${
          document.getElementById("departureTime")?.value
        }`
      ).toISOString(),
      arrival_time: new Date(
        `${document.getElementById("arrivalDate")?.value}T${
          document.getElementById("arrivalTime")?.value
        }`
      ).toISOString(),
      seats_total: parseInt(document.getElementById("totalSeats")?.value || 0),
      seats_available: parseInt(
        document.getElementById("availableSeats")?.value || 0
      ),
    };

    // Validation
    if (formData.from_city === formData.to_city) {
      showError("Kalkış ve varış şehri aynı olamaz.");
      return;
    }
    if (new Date(formData.departure_time) >= new Date(formData.arrival_time)) {
      showError("Varış zamanı kalkış zamanından sonra olmalıdır.");
      return;
    }
    if (formData.seats_available > formData.seats_total) {
      showError("Müsait koltuk sayısı toplam koltuk sayısından fazla olamaz.");
      return;
    }

    // Show loading state
    if (saveButton) {
      saveButton.innerHTML =
        '<i class="fas fa-spinner fa-spin me-2"></i>Kaydediliyor...';
      saveButton.disabled = true;
    }

    // API call
    const url = currentEditingFlight
      ? `${API_BASE}/flights/${currentEditingFlight._id}`
      : `${API_BASE}/flights`;
    const method = currentEditingFlight ? "PUT" : "POST";

    const response = await fetch(url, {
      method: method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        errorData.msg || errorData.message || "Uçuş kaydedilemedi"
      );
    }

    const savedFlight = await response.json();

    // Update local data
    if (currentEditingFlight) {
      const index = allFlights.findIndex(
        (f) => f._id === currentEditingFlight._id
      );
      if (index !== -1) allFlights[index] = savedFlight;
      showSuccess("Uçuş başarıyla güncellendi.");
    } else {
      allFlights.push(savedFlight);
      showSuccess("Yeni uçuş başarıyla eklendi.");
    }

    applyFilters();
    if (flightModal) flightModal.hide();
  } catch (error) {
    console.error("Save flight error:", error);
    showError(error.message || "Uçuş kaydedilirken hata oluştu.");
  } finally {
    if (saveButton) {
      saveButton.innerHTML = originalButtonText;
      saveButton.disabled = false;
    }
  }
}

// Delete Flight
function deleteFlight(flightId) {
  const flight = allFlights.find((f) => f._id === flightId);
  if (!flight) {
    showError("Uçuş bulunamadı.");
    return;
  }

  const deleteFlightInfo = document.getElementById("deleteFlightInfo");
  if (deleteFlightInfo) {
    deleteFlightInfo.innerHTML = `
      <div class="border rounded p-3 bg-light">
        <strong>${flight.flight_id}</strong><br>
        ${flight.from_city_name || "Bilinmeyen"} → ${
      flight.to_city_name || "Bilinmeyen"
    }<br>
        <small class="text-muted">${formatDate(
          new Date(flight.departure_time)
        )}</small>
      </div>
    `;
  }

  // Store flight ID for confirmation
  if (deleteModal) {
    deleteModal._flightId = flightId;
    deleteModal.show();
  }
}

// Confirm Delete Flight
async function confirmDeleteFlight() {
  const flightId = deleteModal?._flightId;
  if (!flightId) return;

  const deleteButton = document.querySelector("#deleteModal .btn-danger");
  const originalButtonText = deleteButton?.innerHTML || "";

  try {
    if (deleteButton) {
      deleteButton.innerHTML =
        '<i class="fas fa-spinner fa-spin me-2"></i>Siliniyor...';
      deleteButton.disabled = true;
    }

    const response = await fetch(`${API_BASE}/flights/${flightId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.msg || errorData.message || "Uçuş silinemedi");
    }

    allFlights = allFlights.filter((f) => f._id !== flightId);
    applyFilters();
    if (deleteModal) deleteModal.hide();
    showSuccess("Uçuş başarıyla silindi.");
  } catch (error) {
    console.error("Delete flight error:", error);
    showError(error.message || "Uçuş silinirken hata oluştu.");
  } finally {
    if (deleteButton) {
      deleteButton.innerHTML = originalButtonText;
      deleteButton.disabled = false;
    }
  }
}

// View Flight
function viewFlight(flightId) {
  const flight = allFlights.find((f) => f._id === flightId);
  if (!flight) {
    showError("Uçuş bulunamadı.");
    return;
  }

  showInfo(
    `Uçuş: ${flight.flight_id} (${flight.from_city_name || "?"} → ${
      flight.to_city_name || "?"
    })`
  );
}

// Refresh Flights
async function refreshFlights() {
  const refreshButton = document.querySelector(
    'button[onclick="refreshFlights()"]'
  );
  const originalText = refreshButton?.innerHTML || "";

  try {
    if (refreshButton) {
      refreshButton.innerHTML =
        '<i class="fas fa-spinner fa-spin me-1"></i>Yenileniyor...';
      refreshButton.disabled = true;
    }

    await loadFlights();
    showSuccess("Uçuş listesi yenilendi.");
  } catch (error) {
    showError("Veriler yenilenirken hata oluştu: " + error.message);
  } finally {
    if (refreshButton) {
      refreshButton.innerHTML = originalText;
      refreshButton.disabled = false;
    }
  }
}

// Export Flights
function exportFlights() {
  try {
    if (filteredFlights.length === 0) {
      showInfo("Dışa aktarılacak uçuş bulunmuyor.");
      return;
    }

    const headers = [
      "Uçuş No",
      "Kalkış Şehri",
      "Varış Şehri",
      "Kalkış Zamanı",
      "Varış Zamanı",
      "Fiyat",
      "Toplam Koltuk",
      "Müsait Koltuk",
    ];

    const rows = filteredFlights.map((flight) => [
      flight.flight_id,
      flight.from_city_name || "Bilinmeyen",
      flight.to_city_name || "Bilinmeyen",
      new Date(flight.departure_time).toLocaleString("tr-TR"),
      new Date(flight.arrival_time).toLocaleString("tr-TR"),
      flight.price,
      flight.seats_total,
      flight.seats_available,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${String(
                cell === null || cell === undefined ? "" : cell
              ).replace(/"/g, '""')}"`
          )
          .join(",")
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `ucuslar_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showSuccess("Uçuş listesi başarıyla dışa aktarıldı.");
  } catch (error) {
    console.error("Export error:", error);
    showError("Dışa aktarma sırasında hata oluştu: " + error.message);
  }
}

// Utility Functions
function formatDate(date) {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function logout() {
  if (confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    window.location.href = "../../login.html";
  }
}

// Message Functions
function showSuccess(message) {
  showMessage(message, "success", "fas fa-check-circle");
}

function showError(message) {
  showMessage(message, "danger", "fas fa-exclamation-triangle");
}

function showInfo(message) {
  showMessage(message, "info", "fas fa-info-circle");
}

function showMessage(message, type, icon) {
  const alertDiv = document.createElement("div");
  alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
  alertDiv.style.cssText = `
    position: fixed; 
    top: 20px; 
    right: 20px; 
    z-index: 1055; 
    min-width: 300px;
    max-width: 500px;
  `;

  alertDiv.innerHTML = `
    <i class="${icon} me-2"></i>${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  document.body.appendChild(alertDiv);

  // Auto remove after 5 seconds
  setTimeout(() => {
    const bsAlert = bootstrap.Alert.getInstance(alertDiv);
    if (bsAlert) {
      bsAlert.close();
    } else if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}
