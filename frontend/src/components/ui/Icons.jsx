// src/components/ui/Icons.jsx
import { 
  // Navigation & Layout
  FiHome, FiShoppingBag, FiPackage, FiUsers, FiBarChart2,
  FiSettings, FiLogOut, FiBell, FiUser, FiGrid, FiMenu,
  
  // Actions
  FiSearch, FiPlus, FiMinus, FiEdit, FiEye, FiDownload, 
  FiUpload, FiRefreshCw, FiTrash2, FiCopy, FiSave, FiFilter,
  FiPrinter, FiShare2, FiSend, FiMail, FiPhone, FiCamera,
  FiVideo, FiImage, FiFile, FiFileText, FiArchive, FiInbox,
  
  // Navigation arrows
  FiArrowLeft, FiArrowRight, FiArrowUp, FiArrowDown,
  FiChevronLeft, FiChevronRight, FiChevronUp, FiChevronDown,
  
  // Status & Feedback
  FiAlertCircle, FiCheckCircle, FiXCircle, FiInfo, FiHelpCircle,
  FiClock, FiCalendar, FiStar, FiHeart, FiFlag, FiAward,
  
  // Financial
  FiDollarSign, FiCreditCard, FiPercent, FiTrendingUp, FiTrendingDown,
  
  // Media & Files
  FiBox, FiFolder, FiDatabase, FiCloud, FiDownloadCloud, FiUploadCloud,
  
  // Communication
  FiMessageCircle, FiMessageSquare,
  
  // Misc
  FiX, FiCheck, FiLock, FiKey, FiShield,
  FiMapPin, FiGlobe, FiLink, FiExternalLink,
  
  // POS Specific
  FiTruck, FiShoppingCart, FiTag,
  FiUserPlus, FiUserMinus, FiUserCheck, FiUserX,
  
  // Theme Icons
  FiSun, FiMoon,
  
  // Additional icons needed for new features
  FiFileText as FiDocument,
  FiCalendar as FiCalendarIcon,
  FiClock as FiHistory,
} from 'react-icons/fi';

// Import from Material Design icons
import { 
  MdOutlineInstallMobile,
  MdOutlinePayment,
  MdOutlineReceipt,
  MdOutlineStore,
  MdOutlineTransferWithinAStation,
  MdOutlineSwitchAccount,
  MdOutlineStorefront,
  MdOutlineHome,
} from 'react-icons/md';

import {
  BsFileEarmarkText,
  BsCreditCard2Front,
  BsCalendarCheck,
  BsShop,
  BsArrowLeftRight,
  BsArrowReturnLeft,
  BsBuilding,
} from 'react-icons/bs';

import {
  HiOutlineSwitchHorizontal,
} from 'react-icons/hi';

import {
  IoHomeOutline,
} from 'react-icons/io5';

// Create safe icon wrapper to handle undefined icons
const createSafeIcon = (Icon, fallback) => {
  if (!Icon) {
    console.warn(`Icon component is undefined, using fallback: ${fallback}`);
    return () => <span className="inline-block">{fallback}</span>;
  }
  return Icon;
};

// Define all icons with fallbacks for missing ones
export const Icons = {
  // Navigation
  home: FiHome,
  dashboard: FiHome,
  shoppingBag: FiShoppingBag,
  package: FiPackage,
  users: FiUsers,
  reports: FiBarChart2,
  settings: FiSettings,
  menu: FiMenu,
  
  // Actions
  logout: FiLogOut,
  notifications: FiBell,
  user: FiUser,
  apps: FiGrid,
  grid: FiGrid,
  search: FiSearch,
  add: FiPlus,
  plus: FiPlus,
  minus: FiMinus,
  edit: FiEdit,
  view: FiEye,
  eye: FiEye,
  download: FiDownload,
  upload: FiUpload,
  refresh: FiRefreshCw,
  trash: FiTrash2,
  copy: FiCopy,
  save: FiSave,
  filter: FiFilter,
  printer: FiPrinter,
  share: FiShare2,
  send: FiSend,
  mail: FiMail,
  phone: FiPhone,
  camera: FiCamera,
  video: FiVideo,
  image: FiImage,
  file: FiFile,
  fileText: FiFileText,
  archive: FiArchive,
  inbox: FiInbox,
  
  // Navigation arrows
  arrowLeft: FiArrowLeft,
  arrowRight: FiArrowRight,
  arrowUp: FiArrowUp,
  arrowDown: FiArrowDown,
  chevronLeft: FiChevronLeft,
  chevronRight: FiChevronRight,
  chevronUp: FiChevronUp,
  chevronDown: FiChevronDown,
  
  // Status
  alert: FiAlertCircle,
  warning: FiAlertCircle,
  success: FiCheckCircle,
  check: FiCheck,
  checkCircle: FiCheckCircle,
  error: FiXCircle,
  x: FiX,
  close: FiX,
  info: FiInfo,
  help: FiHelpCircle,
  question: FiHelpCircle,
  clock: FiClock,
  calendar: FiCalendar,
  star: FiStar,
  heart: FiHeart,
  flag: FiFlag,
  award: FiAward,
  
  // Financial
  money: FiDollarSign,
  cash: FiDollarSign,
  creditCard: FiCreditCard,
  card: FiCreditCard,
  percent: FiPercent,
  calculator: FiPercent,
  trendingUp: FiTrendingUp,
  trendingDown: FiTrendingDown,
  
  // Media & Files
  box: FiBox,
  folder: FiFolder,
  database: FiDatabase,
  cloud: FiCloud,
  downloadCloud: FiDownloadCloud,
  uploadCloud: FiUploadCloud,
  
  // Communication
  message: FiMessageCircle,
  messageSquare: FiMessageSquare,
  chat: FiMessageCircle,
  email: FiMail,
  call: FiPhone,
  
  // Security
  lock: FiLock,
  key: FiKey,
  shield: FiShield,
  
  // Location
  mapPin: FiMapPin,
  location: FiMapPin,
  globe: FiGlobe,
  link: FiLink,
  externalLink: FiExternalLink,
  
  // POS Specific
  truck: FiTruck,
  delivery: FiTruck,
  boxIcon: FiBox,
  cart: FiShoppingCart,
  shoppingCart: FiShoppingCart,
  tag: FiTag,
  price: FiTag,
  team: FiUsers,
  userPlus: FiUserPlus,
  addUser: FiUserPlus,
  userMinus: FiUserMinus,
  removeUser: FiUserMinus,
  userCheck: FiUserCheck,
  userX: FiUserX,
  verified: FiUserCheck,
  
  // Additional POS Icons
  barcode: FiCamera,
  scan: FiCamera,
  receipt: FiPrinter,
  invoice: FiFileText,
  inventory: FiPackage,
  customers: FiUsers,
  staff: FiUsers,
  report: FiBarChart2,
  analytics: FiBarChart2,
  chart: FiBarChart2,
  
  // Payment Methods
  cashPayment: FiDollarSign,
  cardPayment: FiCreditCard,
  mobilePayment: FiPhone,
  giftCard: FiStar,
  splitPayment: FiGrid,
  
  // NEW ICONS FOR RECORDS, CREDIT SALE, INSTALLMENTS
  document: FiDocument || BsFileEarmarkText || FiFileText,
  records: FiDocument || MdOutlineReceipt || FiFileText,
  history: FiHistory || FiClock,
  creditCard2: BsCreditCard2Front || FiCreditCard,
  payment: MdOutlinePayment || FiCreditCard,
  installment: MdOutlineInstallMobile || BsCalendarCheck || FiCalendarIcon,
  calendarCheck: BsCalendarCheck || FiCalendarIcon,
  schedule: FiCalendarIcon || FiClock,
  
  // STORE & TRANSFER ICONS (CRITICAL FOR MultiStore)
  store: MdOutlineStore || BsShop || FiGrid,
  transfer: MdOutlineTransferWithinAStation || BsArrowLeftRight || FiTruck,
  xCircle: FiXCircle,
  help: FiHelpCircle,
  switch: HiOutlineSwitchHorizontal || MdOutlineSwitchAccount || FiRefreshCw,
  building: BsBuilding || FiMapPin,
  homeStore: MdOutlineHome || IoHomeOutline || FiHome,
  backArrow: BsArrowReturnLeft || FiArrowLeft,
  storefront: MdOutlineStorefront || BsShop,
  
  // Theme Icons
  sun: FiSun,
  moon: FiMoon,
  cloudIcon: FiCloud,
  switchStore: HiOutlineSwitchHorizontal || MdOutlineSwitchAccount,
};

// Export a helper function to safely get icons
export const getIcon = (iconName, fallback = null) => {
  const Icon = Icons[iconName];
  if (!Icon) {
    console.warn(`Icon "${iconName}" not found in Icons object`);
    return fallback ? () => <span className="inline-block">{fallback}</span> : null;
  }
  return Icon;
};

// Export default for convenience
export default Icons;