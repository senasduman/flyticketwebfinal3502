// API Base URL
const API_BASE = "/api";

// Global Variables
let dashboardData = {
  stats: {
    totalFlights: 0,
    totalBookings: 0,
    todayPassengers: 0,
    totalRevenue: 0,
  },
  recentBookings: [],
  todayFlights: [],
};

// DOM Elements
const totalFlightsElement = document.getElementById("totalFlights");
const totalBookingsElement = document.getElementById("totalBookings");
const todayPassengersElement = document.getElementById("todayPassengers");
const totalRevenueElement = document.getElementById("totalRevenue");
const recentBookingsTable = document.getElementById("recentBookingsTable");
const todayFlightsTable = document.getElementById("todayFlightsTable");
const adminNameElement = document.getElementById("adminName");
const welcomeNameElement = document.getElementById("welcomeName");
const currentDateElement = document.getElementById("currentDate");
const currentTimeElement = document.getElementById("currentTime");
const lastBackupElement = document.getElementById("lastBackup");

// Initialize Dashboard
document.addEventListener("DOMContentLoaded", function () {
  initDashboard();
});

// Initialize Dashboard
async function initDashboard() {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      window.location.href = "login.html";
      return;
    }

    // Load user info
    loadUserInfo();

    // Update date/time
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Load dashboard data
    await loadDashboardData();

    // Start auto refresh
    setInterval(refreshData, 30000); // Refresh every 30 seconds
  } catch (error) {
    console.error("Dashboard initialization error:", error);
    showError("Dashboard yüklenirken hata oluştu.");
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
    if (userData) {
      adminNameElement.textContent = userData.name || userData.username;
      welcomeNameElement.textContent = userData.name || userData.username;
    }
  } catch (error) {
    console.error("User info loading error:", error);
  }
}

// Update Date/Time
function updateDateTime() {
  const now = new Date();

  const dateOptions = {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  };

  const timeOptions = {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  };

  currentDateElement.textContent = now.toLocaleDateString("tr-TR", dateOptions);
  currentTimeElement.textContent = now.toLocaleTimeString("tr-TR", timeOptions);

  // Update last backup time (demo)
  if (lastBackupElement) {
    const lastBackup = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    lastBackupElement.textContent = lastBackup.toLocaleTimeString(
      "tr-TR",
      timeOptions
    );
  }
}

// Load Dashboard Data
async function loadDashboardData() {
  try {
    // Load all data concurrently
    await Promise.all([
      loadStatistics(),
      loadRecentBookings(),
      loadTodayFlights(),
    ]);

    // Animate counters
    animateCounters();
  } catch (error) {
    console.error("Dashboard data loading error:", error);
    showError("Veriler yüklenirken hata oluştu.");
  }
}

// Load Statistics
async function loadStatistics() {
  try {
    // Get flights with populated cities
    const flightsResponse = await fetch(`${API_BASE}/flights`);
    if (!flightsResponse.ok) {
      throw new Error(`Flights API error: ${flightsResponse.status}`);
    }
    const flights = await flightsResponse.json();

    // Get tickets with populated flight and city data
    const ticketsResponse = await fetch(`${API_BASE}/tickets`);
    if (!ticketsResponse.ok) {
      throw new Error(`Tickets API error: ${ticketsResponse.status}`);
    }
    const tickets = await ticketsResponse.json();

    console.log("Dashboard - Flights loaded:", flights.length);
    console.log("Dashboard - Sample flight:", flights[0]);
    console.log("Dashboard - Tickets loaded:", tickets.length);

    // Calculate statistics with safety checks
    dashboardData.stats.totalFlights = flights.length;
    dashboardData.stats.totalBookings = tickets.length;

    // Calculate today's passengers with better error handling
    const today = new Date().toISOString().split("T")[0];
    dashboardData.stats.todayPassengers = 0;

    for (const flight of flights) {
      const flightDate = new Date(flight.departure_time)
        .toISOString()
        .split("T")[0];
      if (flightDate === today) {
        const flightTickets = tickets.filter(
          (ticket) => ticket.flight_id && ticket.flight_id._id === flight._id
        );
        dashboardData.stats.todayPassengers += flightTickets.length;
      }
    }

    // Calculate total revenue with safety checks
    dashboardData.stats.totalRevenue = tickets.reduce((total, ticket) => {
      if (ticket.flight_id && ticket.flight_id.price) {
        return total + ticket.flight_id.price * 1.1; // Including taxes
      }
      return total;
    }, 0);
  } catch (error) {
    console.error("Statistics loading error:", error);
    // Use fallback data with better logging
    console.warn("Using fallback statistics data");
    dashboardData.stats = {
      totalFlights: 0,
      totalBookings: 0,
      todayPassengers: 0,
      totalRevenue: 0,
    };
    showError(
      "İstatistikler yüklenirken hata oluştu. Varsayılan veriler kullanılıyor."
    );
  }
}

// Load Recent Bookings
async function loadRecentBookings() {
  try {
    const response = await fetch(`${API_BASE}/tickets`);
    const tickets = await response.json();

    // Sort by creation date and take last 5
    dashboardData.recentBookings = tickets
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    displayRecentBookings();
  } catch (error) {
    console.error("Recent bookings loading error:", error);
    recentBookingsTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Veriler yüklenemedi
                </td>
            </tr>
        `;
  }
}

// Load Today's Flights
async function loadTodayFlights() {
  try {
    const response = await fetch(`${API_BASE}/flights`);
    const flights = await response.json();

    // Filter today's flights
    const today = new Date().toISOString().split("T")[0];
    dashboardData.todayFlights = flights.filter((flight) => {
      const flightDate = new Date(flight.departure_time)
        .toISOString()
        .split("T")[0];
      return flightDate === today;
    });

    displayTodayFlights();
  } catch (error) {
    console.error("Today flights loading error:", error);
    todayFlightsTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Veriler yüklenemedi
                </td>
            </tr>
        `;
  }
}

// Display Recent Bookings
// displayRecentBookings fonksiyonunu güvenli hale getir (satır 230 civarı)
function displayRecentBookings() {
  if (dashboardData.recentBookings.length === 0) {
    recentBookingsTable.innerHTML = `
            <tr>
                <td colspan="5" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>
                    Henüz rezervasyon bulunmamaktadır
                </td>
            </tr>
        `;
    return;
  }

  const bookingsHTML = dashboardData.recentBookings
    .map((booking) => {
      // Safety checks for booking data
      if (
        !booking.flight_id ||
        !booking.flight_id.from_city ||
        !booking.flight_id.to_city
      ) {
        console.warn("Incomplete booking data:", booking);
        return `
            <tr>
                <td><span class="badge bg-primary">${
                  booking.ticket_id || "N/A"
                }</span></td>
                <td>
                    <strong>${booking.passenger_name || "N/A"} ${
          booking.passenger_surname || ""
        }</strong>
                    <br>
                    <small class="text-muted">${
                      booking.passenger_email || "N/A"
                    }</small>
                </td>
                <td>
                    ${booking.flight_id?.flight_id || "N/A"}
                    <br>
                    <small class="text-muted">Şehir bilgisi eksik</small>
                </td>
                <td>${
                  booking.createdAt
                    ? formatDate(new Date(booking.createdAt))
                    : "N/A"
                }</td>
                <td><span class="badge status-pending">Veri eksik</span></td>
            </tr>
        `;
      }

      const bookingDate = new Date(booking.createdAt);
      return `
            <tr>
                <td>
                    <span class="badge bg-primary">${booking.ticket_id}</span>
                </td>
                <td>
                    <strong>${booking.passenger_name} ${
        booking.passenger_surname
      }</strong>
                    <br>
                    <small class="text-muted">${booking.passenger_email}</small>
                </td>
                <td>
                    ${booking.flight_id.flight_id}
                    <br>
                    <small class="text-muted">
                        ${booking.flight_id.from_city.city_name} → ${
        booking.flight_id.to_city.city_name
      }
                    </small>
                </td>
                <td>${formatDate(bookingDate)}</td>
                <td>
                    <span class="badge status-confirmed">Onaylandı</span>
                </td>
            </tr>
        `;
    })
    .join("");

  recentBookingsTable.innerHTML = bookingsHTML;
}

// Display Today's Flights
function displayTodayFlights() {
  if (dashboardData.todayFlights.length === 0) {
    todayFlightsTable.innerHTML = `
            <tr>
                <td colspan="7" class="text-center text-muted">
                    <i class="fas fa-info-circle me-2"></i>
                    Bugün için uçuş bulunmamaktadır
                </td>
            </tr>
        `;
    return;
  }

  const flightsHTML = dashboardData.todayFlights
    .map((flight) => {
      const departureTime = new Date(flight.departure_time);
      const arrivalTime = new Date(flight.arrival_time);
      const now = new Date();

      // Calculate occupancy (demo data)
      const occupancyRate = Math.floor(Math.random() * 40) + 60; // 60-100%
      const status = now > departureTime ? "Kalkış Yaptı" : "Zamanında";
      const statusClass =
        now > departureTime ? "status-completed" : "status-confirmed";

      return `
            <tr>
                <td>
                    <strong>${flight.flight_id}</strong>
                </td>
                <td>
                    ${flight.from_city.city_name} → ${flight.to_city.city_name}
                </td>
                <td>${formatTime(departureTime)}</td>
                <td>${formatTime(arrivalTime)}</td>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="progress me-2" style="width: 60px; height: 6px;">
                            <div class="progress-bar bg-success" style="width: ${occupancyRate}%"></div>
                        </div>
                        <small>${occupancyRate}%</small>
                    </div>
                </td>
                <td>
                    <span class="badge ${statusClass}">${status}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewFlight('${
                          flight._id
                        }')">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-warning" onclick="editFlight('${
                          flight._id
                        }')">
                            <i class="fas fa-edit"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");

  todayFlightsTable.innerHTML = flightsHTML;
}

// Animate Counters
function animateCounters() {
  animateCounter(totalFlightsElement, dashboardData.stats.totalFlights);
  animateCounter(totalBookingsElement, dashboardData.stats.totalBookings);
  animateCounter(todayPassengersElement, dashboardData.stats.todayPassengers);
  animateCounter(totalRevenueElement, dashboardData.stats.totalRevenue, true);
}

// Animate Counter
function animateCounter(element, targetValue, isCurrency = false) {
  const duration = 2000; // 2 seconds
  const step = targetValue / (duration / 16); // 60 FPS
  let currentValue = 0;

  const timer = setInterval(() => {
    currentValue += step;

    if (currentValue >= targetValue) {
      currentValue = targetValue;
      clearInterval(timer);
    }

    if (isCurrency) {
      element.textContent = "₺" + Math.floor(currentValue).toLocaleString();
    } else {
      element.textContent = Math.floor(currentValue).toLocaleString();
    }
  }, 16);
}

// Refresh Data
async function refreshData() {
  try {
    await loadStatistics();
    animateCounters();
  } catch (error) {
    console.error("Data refresh error:", error);
  }
}

// Utility Functions
function formatDate(date) {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Action Functions
function viewFlight(flightId) {
  showInfo(`Uçuş detayları görüntüleniyor: ${flightId}`);
}

function editFlight(flightId) {
  window.location.href = `manage-flights.html?edit=${flightId}`;
}

function generateReport() {
  showInfo("Rapor oluşturuluyor...");
  setTimeout(() => {
    showSuccess("Rapor başarıyla oluşturuldu!");
  }, 2000);
}

function exportData() {
  showInfo("Veriler dışa aktarılıyor...");
  setTimeout(() => {
    showSuccess("Veriler başarıyla dışa aktarıldı!");
  }, 1500);
}

function showProfile() {
  showInfo("Profil sayfası geliştirme aşamasında...");
}

function showSettings() {
  showInfo("Ayarlar sayfası geliştirme aşamasında...");
}

function logout() {
  if (confirm("Çıkış yapmak istediğinizden emin misiniz?")) {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminUser");
    window.location.href = "login.html";
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
  alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
  alertDiv.style.cssText =
    "top: 20px; right: 20px; z-index: 9999; min-width: 300px;";
  alertDiv.innerHTML = `
        <i class="${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

  document.body.appendChild(alertDiv);

  setTimeout(() => {
    if (alertDiv.parentNode) {
      alertDiv.remove();
    }
  }, 5000);
}
