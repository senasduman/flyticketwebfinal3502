// API Base URL
const API_BASE = "/api";

// Global Variables
let allBookings = [];
let allFlights = [];
let filteredBookings = [];
let currentBookingForAction = null;
let bookingDetailsModal = null;
let cancelBookingModal = null;
let sendEmailModal = null;

// DOM Elements
const bookingsTable = document.getElementById("bookingsTable");
const searchInput = document.getElementById("searchInput");
const flightFilter = document.getElementById("flightFilter");
const bookingDateFilter = document.getElementById("bookingDateFilter");
const flightDateFilter = document.getElementById("flightDateFilter");
const statusFilter = document.getElementById("statusFilter");

// Statistics Elements
const totalBookingsCount = document.getElementById("totalBookingsCount");
const confirmedBookingsCount = document.getElementById(
  "confirmedBookingsCount"
);
const todayBookingsCount = document.getElementById("todayBookingsCount");
const totalRevenueCount = document.getElementById("totalRevenueCount");

// Initialize App
document.addEventListener("DOMContentLoaded", function () {
  initManageBookings();
});

// Initialize Manage Bookings Page
async function initManageBookings() {
  try {
    // Check authentication
    if (!isAuthenticated()) {
      window.location.href = "login.html";
      return;
    }

    // Load user info
    loadUserInfo();

    // Initialize modals
    bookingDetailsModal = new bootstrap.Modal(
      document.getElementById("bookingDetailsModal")
    );
    cancelBookingModal = new bootstrap.Modal(
      document.getElementById("cancelBookingModal")
    );
    sendEmailModal = new bootstrap.Modal(
      document.getElementById("sendEmailModal")
    );

    // Load data
    await loadFlights();
    await loadBookings();

    // Setup event listeners
    setupEventListeners();

    // Update statistics
    updateStatistics();
  } catch (error) {
    console.error("Manage bookings initialization error:", error);
    showError("Sayfa yüklenirken hata oluştu.");
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
      document.getElementById("adminName").textContent =
        userData.name || userData.username;
    }
  } catch (error) {
    console.error("User info loading error:", error);
  }
}

// Load Flights
async function loadFlights() {
  try {
    const response = await fetch(`${API_BASE}/flights`);
    if (!response.ok) throw new Error("Flights loading failed");

    allFlights = await response.json();
    populateFlightFilter();
  } catch (error) {
    console.error("Flights loading error:", error);
    showError("Uçuşlar yüklenirken hata oluştu.");
  }
}

// Load Bookings
async function loadBookings() {
  try {
    const response = await fetch(`${API_BASE}/tickets`);
    if (!response.ok) throw new Error("Bookings loading failed");

    allBookings = await response.json();
    filteredBookings = [...allBookings];

    displayBookings();
    updateStatistics();
  } catch (error) {
    console.error("Bookings loading error:", error);
    showError("Rezervasyonlar yüklenirken hata oluştu.");
    bookingsTable.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    Rezervasyon verileri yüklenemedi
                </td>
            </tr>
        `;
  }
}

// Populate Flight Filter
function populateFlightFilter() {
  const flightOptions = allFlights
    .map(
      (flight) =>
        `<option value="${flight._id}">${flight.flight_id} - ${flight.from_city.city_name} → ${flight.to_city.city_name}</option>`
    )
    .join("");

  flightFilter.innerHTML = '<option value="">Tümü</option>' + flightOptions;
}

// Setup Event Listeners
function setupEventListeners() {
  // Filter event listeners
  searchInput.addEventListener("input", applyFilters);
  flightFilter.addEventListener("change", applyFilters);
  bookingDateFilter.addEventListener("change", applyFilters);
  flightDateFilter.addEventListener("change", applyFilters);
  statusFilter.addEventListener("change", applyFilters);
}

// Display Bookings
function displayBookings() {
  if (filteredBookings.length === 0) {
    bookingsTable.innerHTML = `
            <tr>
                <td colspan="9" class="text-center text-muted py-4">
                    <i class="fas fa-search me-2"></i>
                    ${
                      allBookings.length === 0
                        ? "Henüz rezervasyon bulunmamaktadır"
                        : "Arama kriterlerine uygun rezervasyon bulunamadı"
                    }
                </td>
            </tr>
        `;
    return;
  }

  const bookingsHTML = filteredBookings
    .map((booking) => {
      const bookingDate = new Date(booking.createdAt);
      const flightDate = new Date(booking.flight_id.departure_time);
      const now = new Date();

      // Determine status
      let status, statusClass;
      if (booking.status === "cancelled") {
        status = "İptal";
        statusClass = "status-cancelled";
      } else if (now > new Date(booking.flight_id.arrival_time)) {
        status = "Tamamlandı";
        statusClass = "status-completed";
      } else {
        status = "Onaylandı";
        statusClass = "status-confirmed";
      }

      // Calculate total price (including taxes)
      const totalPrice = Math.round(booking.flight_id.price * 1.1);

      return `
            <tr>
                <td>
                    <span class="badge bg-primary">${booking.ticket_id}</span>
                </td>
                <td>
                    <div><strong>${booking.passenger_name} ${
        booking.passenger_surname
      }</strong></div>
                    <div class="small text-muted">${
                      booking.passenger_email
                    }</div>
                    <div class="small text-muted">${
                      booking.passenger_phone || "Telefon belirtilmemiş"
                    }</div>
                </td>
                <td>
                    <div><strong>${booking.flight_id.flight_id}</strong></div>
                    <div class="small text-muted">
                        ${booking.flight_id.from_city.city_name} → ${
        booking.flight_id.to_city.city_name
      }
                    </div>
                </td>
                <td>
                    <span class="badge bg-secondary">${
                      booking.seat_number || "Atanmadı"
                    }</span>
                </td>
                <td>
                    <div>${formatDate(bookingDate)}</div>
                    <div class="small text-muted">${formatTime(
                      bookingDate
                    )}</div>
                </td>
                <td>
                    <div><strong>${formatDate(flightDate)}</strong></div>
                    <div class="small text-muted">
                        ${formatTime(flightDate)} - ${formatTime(
        new Date(booking.flight_id.arrival_time)
      )}
                    </div>
                </td>
                <td>
                    <strong>₺${totalPrice.toLocaleString()}</strong>
                </td>
                <td>
                    <span class="badge ${statusClass}">${status}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewBookingDetails('${
                          booking._id
                        }')" 
                                title="Detaylar">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button class="btn btn-outline-info" onclick="sendBookingEmail('${
                          booking._id
                        }')" 
                                title="E-posta Gönder">
                            <i class="fas fa-envelope"></i>
                        </button>
                        ${
                          booking.status !== "cancelled"
                            ? `
                            <button class="btn btn-outline-danger" onclick="cancelBooking('${booking._id}')" 
                                    title="İptal Et">
                                <i class="fas fa-ban"></i>
                            </button>
                        `
                            : ""
                        }
                    </div>
                </td>
            </tr>
        `;
    })
    .join("");

  bookingsTable.innerHTML = bookingsHTML;
}

// Apply Filters
function applyFilters() {
  const searchTerm = searchInput.value.toLowerCase().trim();
  const selectedFlight = flightFilter.value;
  const selectedBookingDate = bookingDateFilter.value;
  const selectedFlightDate = flightDateFilter.value;
  const selectedStatus = statusFilter.value;

  filteredBookings = allBookings.filter((booking) => {
    // Search filter
    const matchesSearch =
      !searchTerm ||
      booking.ticket_id.toLowerCase().includes(searchTerm) ||
      booking.passenger_name.toLowerCase().includes(searchTerm) ||
      booking.passenger_surname.toLowerCase().includes(searchTerm) ||
      booking.passenger_email.toLowerCase().includes(searchTerm) ||
      booking.flight_id.flight_id.toLowerCase().includes(searchTerm);

    // Flight filter
    const matchesFlight =
      !selectedFlight || booking.flight_id._id === selectedFlight;

    // Booking date filter
    const bookingDate = new Date(booking.createdAt).toISOString().split("T")[0];
    const matchesBookingDate =
      !selectedBookingDate || bookingDate === selectedBookingDate;

    // Flight date filter
    const flightDate = new Date(booking.flight_id.departure_time)
      .toISOString()
      .split("T")[0];
    const matchesFlightDate =
      !selectedFlightDate || flightDate === selectedFlightDate;

    // Status filter
    const now = new Date();
    let bookingStatus;
    if (booking.status === "cancelled") {
      bookingStatus = "cancelled";
    } else if (now > new Date(booking.flight_id.arrival_time)) {
      bookingStatus = "completed";
    } else {
      bookingStatus = "confirmed";
    }

    const matchesStatus = !selectedStatus || bookingStatus === selectedStatus;

    return (
      matchesSearch &&
      matchesFlight &&
      matchesBookingDate &&
      matchesFlightDate &&
      matchesStatus
    );
  });

  displayBookings();
  updateStatistics();
}

// Clear Filters
function clearFilters() {
  searchInput.value = "";
  flightFilter.value = "";
  bookingDateFilter.value = "";
  flightDateFilter.value = "";
  statusFilter.value = "";

  filteredBookings = [...allBookings];
  displayBookings();
  updateStatistics();
}

// Update Statistics
function updateStatistics() {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  // Total bookings
  totalBookingsCount.textContent = allBookings.length;

  // Confirmed bookings
  const confirmedBookings = allBookings.filter(
    (booking) => booking.status !== "cancelled"
  );
  confirmedBookingsCount.textContent = confirmedBookings.length;

  // Today's bookings
  const todayBookings = allBookings.filter((booking) => {
    const bookingDate = new Date(booking.createdAt).toISOString().split("T")[0];
    return bookingDate === today;
  });
  todayBookingsCount.textContent = todayBookings.length;

  // Total revenue
  const totalRevenue = confirmedBookings.reduce((total, booking) => {
    return total + Math.round(booking.flight_id.price * 1.1);
  }, 0);
  totalRevenueCount.textContent = "₺" + totalRevenue.toLocaleString();
}

// View Booking Details
function viewBookingDetails(bookingId) {
  const booking = allBookings.find((b) => b._id === bookingId);
  if (!booking) {
    showError("Rezervasyon bulunamadı.");
    return;
  }

  const bookingDate = new Date(booking.createdAt);
  const departureTime = new Date(booking.flight_id.departure_time);
  const arrivalTime = new Date(booking.flight_id.arrival_time);
  const totalPrice = Math.round(booking.flight_id.price * 1.1);
  const taxes = Math.round(booking.flight_id.price * 0.1);

  const detailsHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3">Yolcu Bilgileri</h6>
                <table class="table table-sm">
                    <tr>
                        <td><strong>Ad Soyad:</strong></td>
                        <td>${booking.passenger_name} ${
    booking.passenger_surname
  }</td>
                    </tr>
                    <tr>
                        <td><strong>E-posta:</strong></td>
                        <td>${booking.passenger_email}</td>
                    </tr>
                    <tr>
                        <td><strong>Telefon:</strong></td>
                        <td>${booking.passenger_phone || "Belirtilmemiş"}</td>
                    </tr>
                    <tr>
                        <td><strong>Bilet No:</strong></td>
                        <td><span class="badge bg-primary">${
                          booking.ticket_id
                        }</span></td>
                    </tr>
                    <tr>
                        <td><strong>Koltuk:</strong></td>
                        <td>${
                          booking.seat_number || "Check-in sırasında atanacak"
                        }</td>
                    </tr>
                </table>
            </div>
            
            <div class="col-md-6">
                <h6 class="text-primary mb-3">Uçuş Bilgileri</h6>
                <table class="table table-sm">
                    <tr>
                        <td><strong>Uçuş No:</strong></td>
                        <td>${booking.flight_id.flight_id}</td>
                    </tr>
                    <tr>
                        <td><strong>Güzergah:</strong></td>
                        <td>${booking.flight_id.from_city.city_name} → ${
    booking.flight_id.to_city.city_name
  }</td>
                    </tr>
                    <tr>
                        <td><strong>Kalkış:</strong></td>
                        <td>${formatFullDate(departureTime)} - ${formatTime(
    departureTime
  )}</td>
                    </tr>
                    <tr>
                        <td><strong>Varış:</strong></td>
                        <td>${formatFullDate(arrivalTime)} - ${formatTime(
    arrivalTime
  )}</td>
                    </tr>
                    <tr>
                        <td><strong>Süre:</strong></td>
                        <td>${calculateFlightDuration(
                          departureTime,
                          arrivalTime
                        )}</td>
                    </tr>
                </table>
            </div>
        </div>
        
        <hr>
        
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3">Rezervasyon Detayları</h6>
                <table class="table table-sm">
                    <tr>
                        <td><strong>Rezervasyon Tarihi:</strong></td>
                        <td>${formatFullDate(bookingDate)} - ${formatTime(
    bookingDate
  )}</td>
                    </tr>
                    <tr>
                        <td><strong>Durum:</strong></td>
                        <td>
                            ${
                              booking.status === "cancelled"
                                ? '<span class="badge status-cancelled">İptal</span>'
                                : '<span class="badge status-confirmed">Onaylandı</span>'
                            }
                        </td>
                    </tr>
                    <tr>
                        <td><strong>PNR Kodu:</strong></td>
                        <td><code>${generatePNR(booking.ticket_id)}</code></td>
                    </tr>
                </table>
            </div>
            
            <div class="col-md-6">
                <h6 class="text-primary mb-3">Ödeme Bilgileri</h6>
                <table class="table table-sm">
                    <tr>
                        <td>Bilet Fiyatı:</td>
                        <td class="text-end">₺${booking.flight_id.price.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Vergiler ve Ücretler:</td>
                        <td class="text-end">₺${taxes.toLocaleString()}</td>
                    </tr>
                    <tr class="table-success">
                        <td><strong>Toplam Ödenen:</strong></td>
                        <td class="text-end"><strong>₺${totalPrice.toLocaleString()}</strong></td>
                    </tr>
                </table>
            </div>
        </div>
    `;

  document.getElementById("bookingDetailsContent").innerHTML = detailsHTML;
  bookingDetailsModal.show();
}

// Send Booking Email
function sendBookingEmail(bookingId) {
  const booking = allBookings.find((b) => b._id === bookingId);
  if (!booking) {
    showError("Rezervasyon bulunamadı.");
    return;
  }

  currentBookingForAction = booking;

  // Fill email form
  document.getElementById("emailTo").value = booking.passenger_email;
  document.getElementById(
    "emailSubject"
  ).value = `Rezervasyon Bilgileri - ${booking.ticket_id}`;
  document.getElementById("emailMessage").value = `Merhaba ${
    booking.passenger_name
  },

${booking.ticket_id} numaralı biletinizin detayları:

Uçuş: ${booking.flight_id.flight_id}
Güzergah: ${booking.flight_id.from_city.city_name} → ${
    booking.flight_id.to_city.city_name
  }
Tarih: ${formatFullDate(new Date(booking.flight_id.departure_time))}
Kalkış: ${formatTime(new Date(booking.flight_id.departure_time))}

İyi yolculuklar dileriz.

FlyTicket Ekibi`;

  sendEmailModal.show();
}

// Cancel Booking
function cancelBooking(bookingId) {
  const booking = allBookings.find((b) => b._id === bookingId);
  if (!booking) {
    showError("Rezervasyon bulunamadı.");
    return;
  }

  currentBookingForAction = booking;

  // Show booking info in cancel modal
  document.getElementById("cancelBookingInfo").innerHTML = `
        <div class="border rounded p-3 bg-light">
            <strong>Bilet No:</strong> ${booking.ticket_id}<br>
            <strong>Yolcu:</strong> ${booking.passenger_name} ${
    booking.passenger_surname
  }<br>
            <strong>Uçuş:</strong> ${booking.flight_id.flight_id}<br>
            <strong>Güzergah:</strong> ${
              booking.flight_id.from_city.city_name
            } → ${booking.flight_id.to_city.city_name}<br>
            <strong>Tarih:</strong> ${formatFullDate(
              new Date(booking.flight_id.departure_time)
            )}
        </div>
    `;

  document.getElementById("cancelReason").value = "";
  cancelBookingModal.show();
}

// Confirm Cancel Booking
async function confirmCancelBooking() {
  try {
    if (!currentBookingForAction) return;

    const cancelReason = document.getElementById("cancelReason").value.trim();

    // Show loading
    const cancelButton = document.querySelector(
      "#cancelBookingModal .btn-danger"
    );
    const originalText = cancelButton.innerHTML;
    cancelButton.innerHTML =
      '<i class="fas fa-spinner fa-spin me-2"></i>İptal Ediliyor...';
    cancelButton.disabled = true;

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Update booking status
    const bookingIndex = allBookings.findIndex(
      (b) => b._id === currentBookingForAction._id
    );
    if (bookingIndex !== -1) {
      allBookings[bookingIndex].status = "cancelled";
      allBookings[bookingIndex].cancelReason = cancelReason;
      allBookings[bookingIndex].cancelDate = new Date().toISOString();
    }

    // Update display
    applyFilters();
    cancelBookingModal.hide();
    showSuccess("Rezervasyon başarıyla iptal edildi.");
  } catch (error) {
    console.error("Cancel booking error:", error);
    showError("Rezervasyon iptal edilirken hata oluştu.");
  } finally {
    // Reset button
    const cancelButton = document.querySelector(
      "#cancelBookingModal .btn-danger"
    );
    cancelButton.innerHTML = '<i class="fas fa-ban me-2"></i>İptal Et';
    cancelButton.disabled = false;
    currentBookingForAction = null;
  }
}

// Send Email
async function sendEmail() {
  try {
    if (!currentBookingForAction) return;

    const emailData = {
      to: document.getElementById("emailTo").value,
      subject: document.getElementById("emailSubject").value,
      message: document.getElementById("emailMessage").value,
    };

    // Validate
    if (!emailData.to || !emailData.subject || !emailData.message) {
      showError("Lütfen tüm alanları doldurun.");
      return;
    }

    // Show loading
    const sendButton = document.querySelector("#sendEmailModal .btn-primary");
    const originalText = sendButton.innerHTML;
    sendButton.innerHTML =
      '<i class="fas fa-spinner fa-spin me-2"></i>Gönderiliyor...';
    sendButton.disabled = true;

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));

    sendEmailModal.hide();
    showSuccess(`E-posta ${emailData.to} adresine başarıyla gönderildi.`);
  } catch (error) {
    console.error("Send email error:", error);
    showError("E-posta gönderilirken hata oluştu.");
  } finally {
    // Reset button
    const sendButton = document.querySelector("#sendEmailModal .btn-primary");
    sendButton.innerHTML = '<i class="fas fa-paper-plane me-2"></i>Gönder';
    sendButton.disabled = false;
    currentBookingForAction = null;
  }
}

// Print Booking Details
function printBookingDetails() {
  window.print();
}

// Refresh Bookings
async function refreshBookings() {
  const refreshButton = document.querySelector(
    'button[onclick="refreshBookings()"]'
  );
  const originalText = refreshButton.innerHTML;

  try {
    refreshButton.innerHTML =
      '<i class="fas fa-spinner fa-spin me-2"></i>Yenileniyor...';
    refreshButton.disabled = true;

    await loadBookings();
    showSuccess("Rezervasyon listesi yenilendi.");
  } catch (error) {
    showError("Veriler yenilenirken hata oluştu.");
  } finally {
    refreshButton.innerHTML = originalText;
    refreshButton.disabled = false;
  }
}

// Export Bookings
function exportBookings() {
  try {
    // Create CSV content
    const headers = [
      "Bilet No",
      "Yolcu Adı",
      "Yolcu Soyadı",
      "E-posta",
      "Telefon",
      "Uçuş No",
      "Kalkış Şehri",
      "Varış Şehri",
      "Uçuş Tarihi",
      "Rezervasyon Tarihi",
      "Koltuk",
      "Fiyat",
      "Durum",
    ];
    const rows = filteredBookings.map((booking) => [
      booking.ticket_id,
      booking.passenger_name,
      booking.passenger_surname,
      booking.passenger_email,
      booking.passenger_phone || "",
      booking.flight_id.flight_id,
      booking.flight_id.from_city.city_name,
      booking.flight_id.to_city.city_name,
      new Date(booking.flight_id.departure_time).toLocaleString("tr-TR"),
      new Date(booking.createdAt).toLocaleString("tr-TR"),
      booking.seat_number || "",
      Math.round(booking.flight_id.price * 1.1),
      booking.status === "cancelled" ? "İptal" : "Onaylandı",
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    // Download file
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `rezervasyonlar_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    link.click();

    showSuccess("Rezervasyon listesi başarıyla dışa aktarıldı.");
  } catch (error) {
    console.error("Export error:", error);
    showError("Dışa aktarma sırasında hata oluştu.");
  }
}

// Utility Functions
function formatDate(date) {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTime(date) {
  return date.toLocaleTimeString("tr-TR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(date) {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function calculateFlightDuration(departureTime, arrivalTime) {
  const durationMs = arrivalTime - departureTime;
  const hours = Math.floor(durationMs / (1000 * 60 * 60));
  const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}s ${minutes}dk`;
}

function generatePNR(ticketId) {
  return ticketId.substr(-6).toUpperCase();
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
