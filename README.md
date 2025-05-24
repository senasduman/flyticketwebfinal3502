# FlyTicket - Flight Ticket Reservation System ✈️

A modern and user-friendly web-based flight ticket reservation system. Customers can search for flights, book tickets and admins can manage the entire system.

## 🚀 Features

### User Side

- **Flight Search**: Search for flights by city, date and number of passengers
- **Ticket Reservation**: Purchase tickets with easy reservation form
- **Reservation Confirmation**: View and download digital tickets
- **Responsive Design**: Mobile and desktop compatible interface

### Admin Panel

- **Dashboard**: System statistics and summary information
- **Flight Management**: Add, edit, delete and list flights
- **Reservation Management**: View and manage all reservations
- **Reporting**: Export data in CSV format
- **Email Sending**: Informative emails to customers

## 🛠️ Technologies Used

### Backend

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB ODM
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT token management
- **uuid** - Unique ID generation

### Frontend

- **HTML5** - Markup language
- **CSS3** - Styling
- **Bootstrap 5** - UI framework
- **JavaScript (ES6+)** - Client-side scripting
- **Font Awesome** - Icons

### Tools

- **nodemon** - Development server
- **dotenv** - Environment variables

## 📋 Requirements

- Node.js (v14.0.0 or later)
- MongoDB (v4.0 or later)
- npm or yarn

## 🔧 Installation and Run

### 1. Download the Project

```bash
git clone <repository-url>
cd flyticket-web-final
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Environment Variables

Create a `.env` file in the project root directory:

```env
MONGO_URI=mongodb://localhost:27017/flyticketDB
JWT_SECRET=flyticket-secret-key
PORT=5000
```

### 4. Start MongoDB

Make sure the MongoDB service is running:

```bash
# Windows
net start MongoDB

### Open the Application
Open the following address in your browser: `http://localhost:5000`

## 🔐 Admin Login Information

**Username:** `admin`
**Password:** `123456`

Access to admin panel: `http://localhost:5000/pages/admin/login.html`

## 📁 Project Structure

```

      flyticket-web-final/
      ├── public/
      │ ├── css/
      │ │ ├── admin.css
      │ │ └── style.css
      │ ├── js/
      │ │ ├── admin-dashboard.js
      │ │ ├── admin-login.js
      │ │ ├── booking.js
      │ │ ├── confirmation.js
      │ │ ├── manage-bookings.js
      │ │ ├── manage-flights.js
      │ │ └── script.js
      │ ├── pages/
      │ │ ├── admin/
      │ │ │ ├── dashboard.html
      │ │ │ ├── login.html
      │ │ │ ├── manage-bookings.html
      │ │ │ └── manage-flights.html
      │ │ ├── booking.html
      │ │ ├── confirmation.html
      │ │ └── flights.html
      │ └── index.html
      ├── src/
      │ ├── config/
      │ │ └── db.js
      │ ├── controllers/
      │ ├── models/
      │ │ ├── Admin.js
      │ │ ├── City.js
      │ │ ├── Flight.js
      │ │ └── Ticket.js
      │ ├── routes/
      │ │ ├── admin.js
      │ │ ├── cities.js
      │ │ ├── flights.js
      │ │ └── tickets.js
      │ ├── seeders/
      │ │ ├── adminSeeder.js
      │ │ └── citySeeder.js
      │ └── server.js
      ├── package.json
      └── README.md

```

## 🔄 API Endpoints

### General
- `GET /` - Home page
- `GET /api/test` - API test endpoint

### Cities
- `GET /api/cities` - List all cities

### Flights
- `GET /api/flights` - List/Search flights
- `POST /api/flights` - Add new flight (Admin)
- `PUT /api/flights/:id` - Update flight (Admin)
- `DELETE /api/flights/:id` - Delete flight (Admin)

### Tickets
- `POST /api/tickets` - Book ticket
- ​​`GET /api/tickets` - List all tickets (Admin)
- `GET /api/tickets/:ticket_id` - Ticket details
- `DELETE /api/tickets/:id` - Cancel ticket (Admin)

### Admin
- `POST /api/admin/login` - Admin login
- `GET /api/admin/verify` - Token verification
- `GET /api/admin/stats` - Dashboard statistics

## 💡 User Guide

### Customer Actions
1. Fill out the flight search form on the homepage
2. View available flights
3. Click the "Book" button
4. Enter passenger information
5. Confirm the reservation
6. Download your digital ticket

### Admin Actions
1. Log in to the admin panel
2. View system status on the Dashboard
3. Add/edit flights from the flight management page
4. Manage tickets from the booking management page
5. Export reports in CSV format
```
