// API Base URL
const API_BASE = "/api";

// Global Variables
let bookingData = null;
let printModal = null;

// DOM Elements
const ticketDetailsDiv = document.getElementById("ticketDetails");
const digitalTicketDiv = document.getElementById("digitalTicket");
const digitalTicketContent = document.getElementById("digitalTicketContent");

// Initialize App
document.addEventListener("DOMContentLoaded", function () {
  initConfirmation();
  printModal = new bootstrap.Modal(document.getElementById("printModal"));
});

// Initialize Confirmation Page
function initConfirmation() {
  try {
    // localStorage'dan rezervasyon sonucunu al
    const bookingResult = localStorage.getItem("bookingResult");

    if (!bookingResult) {
      showError(
        "Rezervasyon bilgisi bulunamadı. Ana sayfaya yönlendiriliyorsunuz..."
      );
      setTimeout(() => {
        window.location.href = "../index.html";
      }, 3000);
      return;
    }

    bookingData = JSON.parse(bookingResult);
    displayTicketDetails();
    createDigitalTicket();

    // Clean up localStorage
    localStorage.removeItem("bookingResult");
  } catch (error) {
    console.error("Confirmation initialization error:", error);
    showError("Bilet bilgileri yüklenirken hata oluştu.");
  }
}

// Display Ticket Details
function displayTicketDetails() {
  const ticket = bookingData.ticket;
  const flight = ticket.flight_id;

  const departureTime = new Date(flight.departure_time);
  const arrivalTime = new Date(flight.arrival_time);
  const bookingDate = new Date(ticket.createdAt);

  const totalPrice = Math.round(flight.price * 1.1); // Vergiler dahil

  ticketDetailsDiv.innerHTML = `
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3">Yolcu Bilgileri</h6>
                <table class="table table-sm">
                    <tr>
                        <td><strong>Ad Soyad:</strong></td>
                        <td>${ticket.passenger_name} ${
    ticket.passenger_surname
  }</td>
                    </tr>
                    <tr>
                        <td><strong>E-posta:</strong></td>
                        <td>${ticket.passenger_email}</td>
                    </tr>
                    <tr>
                        <td><strong>Bilet No:</strong></td>
                        <td><span class="badge bg-primary">${
                          ticket.ticket_id
                        }</span></td>
                    </tr>
                    <tr>
                        <td><strong>Koltuk:</strong></td>
                        <td>${
                          ticket.seat_number || "Check-in sırasında atanacak"
                        }</td>
                    </tr>
                </table>
            </div>
            
            <div class="col-md-6">
                <h6 class="text-primary mb-3">Uçuş Bilgileri</h6>
                <table class="table table-sm">
                    <tr>
                        <td><strong>Uçuş No:</strong></td>
                        <td>${flight.flight_id}</td>
                    </tr>
                    <tr>
                        <td><strong>Güzergah:</strong></td>
                        <td>${flight.from_city.city_name} → ${
    flight.to_city.city_name
  }</td>
                    </tr>
                    <tr>
                        <td><strong>Tarih:</strong></td>
                        <td>${formatFullDate(departureTime)}</td>
                    </tr>
                    <tr>
                        <td><strong>Kalkış:</strong></td>
                        <td>${formatTime(departureTime)}</td>
                    </tr>
                    <tr>
                        <td><strong>Varış:</strong></td>
                        <td>${formatTime(arrivalTime)}</td>
                    </tr>
                </table>
            </div>
        </div>
        
        <hr>
        
        <div class="row">
            <div class="col-md-6">
                <h6 class="text-primary mb-3">Ödeme Bilgileri</h6>
                <table class="table table-sm">
                    <tr>
                        <td>Bilet Fiyatı:</td>
                        <td class="text-end">₺${flight.price.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <td>Vergiler ve Ücretler:</td>
                        <td class="text-end">₺${Math.round(
                          flight.price * 0.1
                        ).toLocaleString()}</td>
                    </tr>
                    <tr class="table-success">
                        <td><strong>Toplam Ödenen:</strong></td>
                        <td class="text-end"><strong>₺${totalPrice.toLocaleString()}</strong></td>
                    </tr>
                </table>
            </div>
            
            <div class="col-md-6">
                <h6 class="text-primary mb-3">Rezervasyon Detayları</h6>
                <table class="table table-sm">
                    <tr>
                        <td><strong>Rezervasyon Tarihi:</strong></td>
                        <td>${formatFullDate(bookingDate)}</td>
                    </tr>
                    <tr>
                        <td><strong>Durum:</strong></td>
                        <td><span class="badge bg-success">Onaylandı</span></td>
                    </tr>
                    <tr>
                        <td><strong>PNR Kodu:</strong></td>
                        <td><code>${generatePNR()}</code></td>
                    </tr>
                </table>
            </div>
        </div>
    `;
}

// Create Digital Ticket
function createDigitalTicket() {
  const ticket = bookingData.ticket;
  const flight = ticket.flight_id;

  const departureTime = new Date(flight.departure_time);
  const arrivalTime = new Date(flight.arrival_time);

  digitalTicketContent.innerHTML = `
        <div class="digital-ticket p-4" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 15px;">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="mb-0">
                            <i class="fas fa-plane me-2"></i>
                            FlyTicket
                        </h5>
                        <span class="badge bg-light text-dark">${
                          ticket.ticket_id
                        }</span>
                    </div>
                    
                    <div class="flight-route mb-3">
                        <div class="row text-center">
                            <div class="col-4">
                                <div class="fw-bold fs-4">${
                                  flight.from_city.city_name
                                }</div>
                                <div>${formatTime(departureTime)}</div>
                                <small>${formatDate(departureTime)}</small>
                            </div>
                            <div class="col-4">
                                <i class="fas fa-arrow-right fs-3"></i>
                                <div><small>${flight.flight_id}</small></div>
                            </div>
                            <div class="col-4">
                                <div class="fw-bold fs-4">${
                                  flight.to_city.city_name
                                }</div>
                                <div>${formatTime(arrivalTime)}</div>
                                <small>${formatDate(arrivalTime)}</small>
                            </div>
                        </div>
                    </div>
                    
                    <div class="passenger-info">
                        <strong>${ticket.passenger_name} ${
    ticket.passenger_surname
  }</strong>
                        <br>
                        <small>Koltuk: ${
                          ticket.seat_number || "Atanacak"
                        }</small>
                    </div>
                </div>
                
                <div class="col-md-4 text-center">
                    <div class="qr-code mb-2" style="background: white; padding: 15px; border-radius: 10px;">
                        <div style="width: 80px; height: 80px; background: #000; margin: 0 auto; display: flex; align-items: center; justify-content: center; color: white; font-size: 10px;">
                            QR CODE
                        </div>
                    </div>
                    <small>Mobil check-in için QR kodu taratın</small>
                </div>
            </div>
        </div>
    `;

  digitalTicketDiv.style.display = "block";
}

// Download Ticket (PDF Simulation)
function downloadTicket() {
  // Bu gerçek bir PDF oluşturma işlemi değil, simülasyon
  showSuccess("Bilet PDF'i indirilmeye başladı!");

  // Gerçek uygulamada burada PDF oluşturma kütüphanesi kullanılabilir
  // Örnek: jsPDF, PDFKit vb.

  setTimeout(() => {
    // Simulated download
    const element = document.createElement("a");
    element.setAttribute(
      "href",
      "data:text/plain;charset=utf-8," + encodeURIComponent(createTicketText())
    );
    element.setAttribute(
      "download",
      `Bilet_${bookingData.ticket.ticket_id}.txt`
    );
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }, 1000);
}

// Create Ticket Text for Download
function createTicketText() {
  const ticket = bookingData.ticket;
  const flight = ticket.flight_id;

  return `
=== FLY TICKET - UÇAK BİLETİ ===

Bilet No: ${ticket.ticket_id}
PNR Kodu: ${generatePNR()}

YOLCU BİLGİLERİ:
Ad Soyad: ${ticket.passenger_name} ${ticket.passenger_surname}
E-posta: ${ticket.passenger_email}
Koltuk: ${ticket.seat_number || "Check-in sırasında atanacak"}

UÇUŞ BİLGİLERİ:
Uçuş No: ${flight.flight_id}
Güzergah: ${flight.from_city.city_name} → ${flight.to_city.city_name}
Tarih: ${formatFullDate(new Date(flight.departure_time))}
Kalkış: ${formatTime(new Date(flight.departure_time))}
Varış: ${formatTime(new Date(flight.arrival_time))}

ÖDEME BİLGİLERİ:
Bilet Fiyatı: ₺${flight.price.toLocaleString()}
Vergiler: ₺${Math.round(flight.price * 0.1).toLocaleString()}
Toplam: ₺${Math.round(flight.price * 1.1).toLocaleString()}

Bu bileti check-in sırasında ibraz ediniz.
İyi yolculuklar dileriz!

www.flyticket.com
    `;
}

// Send Ticket Email (Simulation)
function sendTicketEmail() {
  showSuccess("Bilet e-posta adresinize gönderildi!");

  // Gerçek uygulamada burada e-posta gönderme API'si çağrılır
  setTimeout(() => {
    showInfo(
      `Bilet bilgileri ${bookingData.ticket.passenger_email} adresine gönderildi.`
    );
  }, 2000);
}

// Generate PNR Code
function generatePNR() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
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

// Format Full Date
function formatFullDate(date) {
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

// New Search
function newSearch() {
  window.location.href = "../index.html";
}

// Show Success Message
function showSuccess(message) {
  showMessage(message, "success", "fas fa-check-circle");
}

// Show Info Message
function showInfo(message) {
  showMessage(message, "info", "fas fa-info-circle");
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
