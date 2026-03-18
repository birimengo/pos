frontend/
├── 📄 index.html
├── 📄 package.json
├── 📄 package-lock.json
├── 📄 vite.config.js
├── 📄 postcss.config.js
├── 📄 README.md
├── 📄 .gitignore
│
├── 📁 public/
│   ├── 📄 vite.svg
│   ├── 📄 favicon.ico
│   ├── 📄 apple-touch-icon.png
│   ├── 📄 icon-192.png
│   ├── 📄 icon-512.png
│   └── 📄 icon-512-maskable.png
│
└── 📁 src/
    ├── 📄 main.jsx
    ├── 📄 App.jsx
    ├── 📄 App.css
    ├── 📄 index.css
    │
    ├── 📁 assets/
    │   └── 📄 react.svg
    │
    ├── 📁 components/
    │   ├── 📁 layout/
    │   │   ├── 📄 MainLayout.jsx
    │   │   ├── 📄 Header.jsx
    │   │   ├── 📄 Sidebar.jsx
    │   │   └── 📄 Footer.jsx
    │   │
    │   ├── 📁 common/
    │   │   ├── 📄 Button.jsx
    │   │   ├── 📄 Card.jsx
    │   │   ├── 📄 Modal.jsx
    │   │   ├── 📄 Input.jsx
    │   │   ├── 📄 Select.jsx
    │   │   ├── 📄 Table.jsx
    │   │   ├── 📄 Spinner.jsx
    │   │   ├── 📄 Alert.jsx
    │   │   └── 📄 Badge.jsx
    │   │
    │   └── 📁 ui/
    │       ├── 📄 Icons.jsx
    │       ├── 📄 ThemeSwitcher.jsx
    │       └── 📄 PWAInstallPrompt.jsx
    │
    ├── 📁 context/
    │   ├── 📄 ThemeContext.jsx
    │   └── 📄 NotificationContext.jsx
    │
    ├── 📁 hooks/
    │   ├── 📄 useLocalStorage.js
    │   ├── 📄 useDebounce.js
    │   ├── 📄 useMediaQuery.js
    │   └── 📄 useClickOutside.js
    │
    ├── 📁 services/
    │   ├── 📄 axios.js
    │   └── 📄 socket.js
    │
    ├── 📁 utils/
    │   ├── 📄 helpers.js
    │   └── 📄 constants.js
    │
    ├── 📁 styles/
    │   ├── 📄 globals.css
    │   └── 📄 themes.css
    │
    ├── 📁 routes/
    │   ├── 📄 index.jsx
    │   └── 📄 ProtectedRoute.jsx
    │
    └── 📁 features/
        ├── 📁 auth/
        │   ├── 📄 AuthContext.jsx
        │   ├── 📄 Login.jsx
        │   ├── 📄 Register.jsx
        │   ├── 📄 ForgotPassword.jsx
        │   ├── 📄 ResetPassword.jsx
        │   └── 📄 ProtectedRoute.jsx
        │
        └── 📁 pos/
            ├── 📄 POSLayout.jsx
            │
            ├── 📁 context/
            │   ├── 📄 POSContext.jsx
            │   ├── 📄 CartContext.jsx
            │   ├── 📄 CustomerContext.jsx
            │   ├── 📄 InventoryContext.jsx
            │   └── 📄 SettingsContext.jsx
            │
            ├── 📁 hooks/
            │   ├── 📄 useCart.js
            │   ├── 📄 useInventory.js
            │   ├── 📄 useCustomers.js
            │   ├── 📄 useBarcodeScanner.js
            │   ├── 📄 useOfflineSync.js
            │   ├── 📄 usePayment.js
            │   └── 📄 useWebSocket.js
            │
            ├── 📁 services/
            │   ├── 📄 api.js
            │   ├── 📄 indexedDB.js
            │   ├── 📄 syncService.js
            │   ├── 📄 offlineQueue.js
            │   ├── 📄 offlineSyncManager.js
            │   └── 📄 opfsService.js
            │
            ├── 📁 utils/
            │   ├── 📄 calculators.js
            │   ├── 📄 formatters.js
            │   ├── 📄 validators.js
            │   ├── 📄 barcode.js
            │   └── 📄 receiptGenerator.js
            │
            ├── 📁 components/
            │   └── 📄 BarcodeScanner.jsx
            │
            ├── 📁 checkout/
            │   ├── 📄 Checkout.jsx
            │   ├── 📄 Cart.jsx
            │   ├── 📄 CartItem.jsx
            │   ├── 📄 PaymentModal.jsx
            │   ├── 📄 Receipt.jsx
            │   ├── 📄 CustomerModal.jsx
            │   ├── 📄 BarcodeScanner.jsx
            │   ├── 📄 DigitalReceipt.jsx
            │   └── 📄 QuickCheckout.jsx
            │
            ├── 📁 inventory/
            │   ├── 📄 InventoryDashboard.jsx
            │   ├── 📄 ProductList.jsx
            │   ├── 📄 ProductForm.jsx
            │   ├── 📄 ProductDetails.jsx
            │   ├── 📄 LowStockAlerts.jsx
            │   ├── 📄 BulkUpload.jsx
            │   ├── 📄 StockAdjustmentModal.jsx
            │   ├── 📄 StockTransfer.jsx
            │   └── 📄 Categories.jsx
            │
            ├── 📁 customers/
            │   ├── 📄 CustomerList.jsx
            │   ├── 📄 CustomerProfile.jsx
            │   ├── 📄 CustomerForm.jsx
            │   ├── 📄 LoyaltyProgram.jsx
            │   ├── 📄 LoyaltyPoints.jsx
            │   ├── 📄 PurchaseHistory.jsx
            │   ├── 📄 MarketingCampaigns.jsx
            │   └── 📄 CustomerSegments.jsx
            │
            ├── 📁 employees/
            │   └── 📄 EmployeeManagement.jsx
            │
            ├── 📁 purchaseOrders/
            │   └── 📄 PurchaseOrders.jsx
            │
            ├── 📁 stores/
            │   └── 📄 MultiStore.jsx
            │
            ├── 📁 returns/
            │   └── 📄 Returns.jsx
            │
            ├── 📁 reports/
            │   ├── 📄 ReportsDashboard.jsx
            │   ├── 📄 SalesReports.jsx
            │   ├── 📄 InventoryReports.jsx
            │   ├── 📄 CustomerReports.jsx
            │   ├── 📄 EmployeeReports.jsx
            │   ├── 📄 ProfitAnalysis.jsx
            │   ├── 📄 SalesTrends.jsx
            │   └── 📄 CustomReports.jsx
            │
            └── 📁 settings/
                ├── 📄 Settings.jsx
                ├── 📄 StoreSettings.jsx
                ├── 📄 ReceiptSettings.jsx
                ├── 📄 HardwareSettings.jsx
                ├── 📄 BackupSettings.jsx
                ├── 📄 UserSettings.jsx
                └── 📄 AppearanceSettings.jsx

                ┌─────────────────────────────────────────────────────────┐
│                   BIZCORE POS SYSTEM                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  🛒 CHECKOUT            📦 INVENTORY     👥 CUSTOMERS   │
│  • Cart Management      • Stock Tracking  • Profiles    │
│  • Payments             • Low Alerts      • Loyalty     │
│  • Receipts             • Adjustments     • History     │
│  • Barcode Scan         • Bulk Upload     • Segments    │
│                                                          │
│  📋 PURCHASE ORDERS     👔 EMPLOYEES      🏢 MULTI-STORE│
│  • Create POs           • Clock In/Out    • Locations   │
│  • Supplier Mgmt        • Permissions     • Transfers   │
│  • Auto-reorder         • Time Tracking   • Reports     │
│  • Low Stock Alerts     • Payroll         • Analytics   │
│                                                          │
│  ↩️ RETURNS              📊 REPORTS        ⚙️ SETTINGS  │
│  • Process Returns      • Sales Reports   • Store Config│
│  • Refund Mgmt          • Inventory       • Hardware    │
│  • Restock Items        • Customer        • Backup      │
│  • Multiple Methods     • Analytics       • Appearance  │
│                                                          │
│  📱 BARCODE/QR CODE SYSTEM                               │
│  • Scanner (Camera/Upload/Manual)                        │
│  • Generator (5 formats)                                  │
│  • Print Labels                                           │
│                                                          │
│  🔋 TECHNICAL FEATURES                                    │
│  • PWA Installable      • Offline Mode    • OPFS Storage│
│  • Auto-sync            • IndexedDB       • Themes      │
│  • Responsive           • Mobile-ready    • Performance │
│                                                          │
└─────────────────────────────────────────────────────────

# BizCore POS System

A modern Point of Sale system with offline-first architecture and cloud synchronization.

## Features
- Offline-first architecture with IndexedDB
- Real-time cloud sync with MongoDB
- Customer management with loyalty points
- Product inventory management
- Multiple payment methods (cash, card, mobile, gift)
- Installment and credit sale options
- Receipt generation (print, email, SMS, WhatsApp)
- Dark/light theme support

## Tech Stack
### Frontend
- React 19
- Vite
- TailwindCSS
- IndexedDB (local storage)
- Cloudinary (image storage)

### Backend
- Node.js + Express
- MongoDB Atlas
- Cloudinary API
- JWT Authentication

## Installation

### Prerequisites
- Node.js v18+
- MongoDB Atlas account
- Cloudinary account

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev┘