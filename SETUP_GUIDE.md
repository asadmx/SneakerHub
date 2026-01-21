# 🚀 SneakerHub - Local Setup Guide

This guide will help you get SneakerHub running on your local machine step by step.

## 📋 Prerequisites

Before you begin, make sure you have the following installed:

1. **Node.js** (version 14 or higher)
   - Download from: https://nodejs.org/
   - To check if installed: `node --version`
   
2. **npm** (comes with Node.js)
   - To check if installed: `npm --version`

3. **Git** (optional, for cloning the repository)
   - Download from: https://git-scm.com/

## 📦 Step 1: Install Dependencies

1. **Open your terminal/command prompt** in the project directory:
   ```bash
   cd SneakerHub
   ```

2. **Install all required packages**:
   ```bash
   npm install
   ```

   This will install:
   - Express.js (web server)
   - SQLite database (better-sqlite3)
   - JWT (authentication)
   - bcryptjs (password hashing)
   - CORS (cross-origin resource sharing)
   - nodemon (optional, for auto-restart during development)

   ⏱️ This may take 1-2 minutes.

## 🗄️ Step 2: Seed the Database (Optional but Recommended)

The database will automatically create tables when you start the server, but you can seed it with demo data:

```bash
npm run seed
```

This creates:
- A demo user account (email: `demo@sneakerhub.com`, password: `password123`)
- Sample orders for testing

## 🖥️ Step 3: Start the Server

1. **Start the backend server**:
   ```bash
   npm start
   ```

   Or for development mode with auto-restart:
   ```bash
   npm run dev
   ```

2. **You should see**:
   ```
   🚀 SneakerHub Server Started
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   📡 Server running on: http://localhost:3000
   🗄️  Database: sneakerhub.db
   🧩 Frontend: src (entry: order-tracking.HTML)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ```

3. **Keep this terminal window open** - the server needs to keep running!

## 🌐 Step 4: Open the Application

1. **Open your web browser** (Chrome, Firefox, Edge, etc.)

2. **Navigate to**:
   ```
   http://localhost:3000
   ```

   Or directly access:
   - Home: `http://localhost:3000/src/index.HTML`
   - Browse: `http://localhost:3000/src/search-products.HTML`
   - Login: `http://localhost:3000/src/user-registration.HTML`

## 🔐 Step 5: Test Login

Use these credentials to test:

**Demo Account (if you ran `npm run seed`):**
- Email: `demo@sneakerhub.com`
- Password: `password123`

**Or create a new account** using the registration form!

## 📁 Project Structure

```
SneakerHub/
├── server.js              # Backend server (Express.js)
├── package.json           # Project dependencies
├── sneakerhub.db          # SQLite database (created automatically)
├── src/                   # Frontend files
│   ├── index.HTML         # Homepage
│   ├── search-products.HTML  # Browse products
│   ├── product.html       # Product detail page
│   ├── cart.HTML          # Shopping cart
│   ├── checkout-page.HTML # Checkout
│   ├── order-tracking.HTML # Order tracking
│   ├── user-registration.HTML # Login/Register
│   └── nav.js             # Navigation logic
└── shoes/                 # Product images
```

## 🛠️ Available Scripts

- `npm start` - Start the server
- `npm run dev` - Start server with auto-restart (requires nodemon)
- `npm run seed` - Seed database with demo data

## 🐛 Troubleshooting

### Problem: "Port 3000 is already in use"
**Solution**: 
- Stop other applications using port 3000, or
- Change the port in `server.js`: `const PORT = process.env.PORT || 3001;`
- Then access via `http://localhost:3001`

### Problem: "Cannot find module 'better-sqlite3'"
**Solution**:
```bash
npm install better-sqlite3
```

### Problem: "Database locked" or SQLite errors
**Solution**:
- Stop the server (Ctrl+C)
- Delete `sneakerhub.db` file
- Restart the server (it will create a new database)

### Problem: Images not loading
**Solution**:
- Make sure the `shoes/` folder exists with image files
- Check that image paths in HTML match actual filenames
- Use forward slashes in paths: `../shoes/image.jpg`

### Problem: "Cannot connect to API"
**Solution**:
- Make sure the server is running (`npm start`)
- Check that you're accessing via `http://localhost:3000`
- Check browser console for errors (F12)

### Problem: Login not working
**Solution**:
- Make sure you're using the correct email/password
- Run `npm run seed` to create demo account
- Check browser console for errors
- Verify JWT_SECRET in server.js

## 🎯 Testing the Application

1. **Browse Products**: Visit `http://localhost:3000/src/search-products.HTML`
2. **View Product**: Click any product card
3. **Add to Cart**: Select size and click "Add to Cart"
4. **View Cart**: Click "My Cart" in navigation
5. **Checkout**: Select items and proceed to checkout
6. **Track Orders**: Login and view "My Orders"

## 🔄 Making Changes

- **Frontend changes**: Edit files in `src/` folder, refresh browser
- **Backend changes**: Restart server (Ctrl+C, then `npm start`)
- **Database changes**: Edit `server.js` initialization code, restart server

## 📝 Environment Variables (Optional)

You can customize the server using environment variables:

```bash
# Windows PowerShell
$env:PORT=3001
$env:JWT_SECRET="my-secret-key"
npm start

# Windows CMD
set PORT=3001
set JWT_SECRET=my-secret-key
npm start

# Linux/Mac
PORT=3001 JWT_SECRET=my-secret-key npm start
```

## ✅ Success Checklist

- [ ] Node.js and npm installed
- [ ] Dependencies installed (`npm install`)
- [ ] Database seeded (`npm run seed`)
- [ ] Server running (`npm start`)
- [ ] Browser opens `http://localhost:3000`
- [ ] Can browse products
- [ ] Can login/register
- [ ] Can add items to cart
- [ ] Can view orders

## 🆘 Need Help?

- Check the browser console (F12) for JavaScript errors
- Check the server terminal for backend errors
- Review the README.md for project overview
- Check API_TESTING_EXAMPLES.md for API documentation

---

**Happy Coding! 🎉**
