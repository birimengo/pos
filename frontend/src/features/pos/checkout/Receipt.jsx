// src/features/pos/checkout/Receipt.jsx
import { useTheme } from '../../../context/ThemeContext';
import { Icons } from '../../../components/ui/Icons';
import { useState, useRef } from 'react';
import jsPDF from 'jspdf';

export default function Receipt({ sale, onClose, onPrint, onEmail, onSms }) {
  const { theme, getTheme } = useTheme();
  const currentTheme = getTheme(theme);
  const [showPenaltyInfo, setShowPenaltyInfo] = useState(false);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [showWhatsappInput, setShowWhatsappInput] = useState(false);
  const receiptRef = useRef(null);

  // Safely access sale properties with defaults
  const saleData = {
    receiptNumber: sale?.receiptNumber || 'N/A',
    timestamp: sale?.timestamp || new Date().toISOString(),
    customer: sale?.customer || null,
    status: sale?.status || 'completed',
    notes: sale?.notes || '',
    method: sale?.method || sale?.paymentMethod || 'Cash',
    amount: sale?.amount || sale?.total || 0,
    remaining: sale?.remaining || 0,
    change: sale?.change || 0,
    subtotal: sale?.subtotal || 0,
    discount: sale?.discount || 0,
    tax: sale?.tax || 0,
    total: sale?.total || 0,
    items: sale?.items || [],
    id: sale?.id || sale?.transactionId || 'N/A',
    selectedSchedule: sale?.selectedSchedule || null,
    dueDate: sale?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    penaltyRate: 30,
    refundRate: 70
  };

  // Format price helper
  const formatPrice = (price) => {
    if (price === undefined || price === null) return '0';
    const rounded = Math.round(price * 100) / 100;
    if (rounded % 1 === 0) {
      return rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    } else {
      return rounded.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
  };

  // Calculate penalty and refund amounts
  const calculatePenalty = () => {
    const paidAmount = saleData.amount;
    const penaltyAmount = (paidAmount * saleData.penaltyRate) / 100;
    const refundAmount = (paidAmount * saleData.refundRate) / 100;
    return { penaltyAmount, refundAmount };
  };

  const { penaltyAmount, refundAmount } = calculatePenalty();

  // Get selected payment schedule details
  const getSelectedSchedule = () => {
    if (saleData.status !== 'installment' || !saleData.selectedSchedule || saleData.remaining <= 0) {
      return null;
    }

    const remaining = saleData.remaining;
    const dueDate = new Date(saleData.dueDate);
    
    switch(saleData.selectedSchedule) {
      case 'weekly':
        return {
          type: 'Weekly',
          amount: remaining / 4,
          count: 4,
          total: remaining,
          nextDate: new Date(dueDate.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          frequency: 'week',
          dueDate: dueDate.toLocaleDateString()
        };
      case 'monthly':
        return {
          type: 'Monthly',
          amount: remaining / 3,
          count: 3,
          total: remaining,
          nextDate: new Date(dueDate.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
          frequency: 'month',
          dueDate: dueDate.toLocaleDateString()
        };
      case 'daily':
        return {
          type: 'Daily',
          amount: remaining / 30,
          count: 30,
          total: remaining,
          nextDate: new Date(dueDate.getTime() + 24 * 60 * 60 * 1000).toLocaleDateString(),
          frequency: 'day',
          dueDate: dueDate.toLocaleDateString()
        };
      default:
        return null;
    }
  };

  const selectedSchedule = getSelectedSchedule();

  // Check if payment is overdue
  const isOverdue = () => {
    if (saleData.status === 'completed') return false;
    const dueDate = new Date(saleData.dueDate);
    const today = new Date();
    return today > dueDate;
  };

  // Generate receipt text for SMS/WhatsApp
  const generateReceiptText = () => {
    const storeName = 'BizCore POS';
    const storePhone = '(555) 123-4567';
    const overdue = isOverdue();
    
    let text = `${storeName}\n`;
    text += `Receipt #: ${saleData.receiptNumber}\n`;
    text += `Date: ${new Date(saleData.timestamp).toLocaleString()}\n`;
    
    if (saleData.customer) {
      text += `Customer: ${saleData.customer.name}\n`;
    }
    
    text += `\nITEMS:\n`;
    saleData.items.forEach(item => {
      text += `${item.name} x${item.quantity} - $${formatPrice(item.price * item.quantity)}\n`;
    });
    
    text += `\nSubtotal: $${formatPrice(saleData.subtotal)}\n`;
    if (saleData.discount > 0) text += `Discount: -$${formatPrice(saleData.discount)}\n`;
    text += `Tax: $${formatPrice(saleData.tax)}\n`;
    text += `TOTAL: $${formatPrice(saleData.total)}\n`;
    
    text += `\nPaid: $${formatPrice(saleData.amount)}\n`;
    if (saleData.remaining > 0) {
      text += `Remaining: $${formatPrice(saleData.remaining)}\n`;
      text += `Due Date: ${new Date(saleData.dueDate).toLocaleDateString()}\n`;
    }
    
    if (saleData.status !== 'completed') {
      text += `\n⚠️ ${overdue ? 'OVERDUE' : 'Payment Pending'}\n`;
      text += `Penalty if late: ${saleData.penaltyRate}%\n`;
      text += `Refund if fails: ${saleData.refundRate}%\n`;
    }
    
    text += `\nThank you for your business!`;
    
    return text;
  };

  // Capture receipt as image using dom-to-image with dynamic import
  const captureAsImage = async () => {
    if (!receiptRef.current) return null;
    
    try {
      const domtoimage = await import('dom-to-image');
      const dataUrl = await domtoimage.default.toPng(receiptRef.current, {
        bgcolor: theme === 'dark' ? '#1f2937' : '#ffffff',
        style: {
          'font-family': 'monospace',
          'font-size': '14px',
          'padding': '16px',
          'background-color': theme === 'dark' ? '#1f2937' : '#ffffff'
        }
      });
      return dataUrl;
    } catch (error) {
      console.error('Failed to capture receipt as image:', error);
      return null;
    }
  };

  // Generate PDF
  const generatePDF = async () => {
    try {
      const dataUrl = await captureAsImage();
      if (!dataUrl) return null;
      
      const img = new Image();
      img.src = dataUrl;
      
      return new Promise((resolve) => {
        img.onload = () => {
          try {
            const pdf = new jsPDF({
              orientation: 'portrait',
              unit: 'px',
              format: [img.width / 2, img.height / 2]
            });
            
            pdf.addImage(dataUrl, 'PNG', 0, 0, img.width / 2, img.height / 2);
            resolve(pdf.output('datauristring'));
          } catch (pdfError) {
            console.error('PDF generation error:', pdfError);
            resolve(null);
          }
        };
        
        img.onerror = () => {
          console.error('Failed to load image for PDF');
          resolve(null);
        };
      });
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      return null;
    }
  };

  // Share via Email
  const shareViaEmail = async () => {
    if (!saleData.customer?.email) {
      alert('No email address available for this customer');
      return;
    }
    
    setIsSharing(true);
    setShareMessage('Preparing email...');
    
    try {
      const subject = `Receipt ${saleData.receiptNumber}`;
      const body = generateReceiptText();
      
      window.location.href = `mailto:${saleData.customer.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      
      setShareMessage('Email client opened');
      setTimeout(() => setShareMessage(''), 2000);
    } catch (error) {
      console.error('Failed to send email:', error);
      setShareMessage('Failed to send email');
      setTimeout(() => setShareMessage(''), 2000);
    } finally {
      setIsSharing(false);
    }
  };

  // Share via SMS
  const shareViaSMS = () => {
    if (!saleData.customer?.phone) {
      alert('No phone number available for this customer');
      return;
    }
    
    setIsSharing(true);
    setShareMessage('Sending SMS...');
    
    try {
      const text = generateReceiptText();
      const encodedText = encodeURIComponent(text);
      const smsLink = `sms:${saleData.customer.phone}?body=${encodedText}`;
      
      window.location.href = smsLink;
      
      setShareMessage('SMS app opened');
      setTimeout(() => setShareMessage(''), 2000);
    } catch (error) {
      console.error('Failed to send SMS:', error);
      setShareMessage('Failed to send SMS');
      setTimeout(() => setShareMessage(''), 2000);
    } finally {
      setIsSharing(false);
    }
  };

  // Share via WhatsApp Text
  const shareViaWhatsAppText = () => {
    if (!saleData.customer?.phone) {
      setShowWhatsappInput(true);
      setShareMessage('Please enter WhatsApp number');
      setTimeout(() => setShareMessage(''), 3000);
      return;
    }
    
    openWhatsApp(saleData.customer.phone, generateReceiptText());
  };

  // Share via WhatsApp Image
  const shareViaWhatsAppImage = async () => {
    setIsSharing(true);
    setShareMessage('Preparing image for WhatsApp...');
    
    try {
      const imageData = await captureAsImage();
      if (!imageData) {
        setShareMessage('Failed to capture image');
        setTimeout(() => setShareMessage(''), 2000);
        return;
      }

      // Convert base64 to blob
      const blob = await (await fetch(imageData)).blob();
      const file = new File([blob], `receipt-${saleData.receiptNumber}.png`, { type: 'image/png' });

      // Check if Web Share API supports files
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Receipt ${saleData.receiptNumber}`,
          text: generateReceiptText(),
          files: [file]
        });
        setShareMessage('Shared successfully');
      } else {
        // Fallback: Open WhatsApp with text
        if (saleData.customer?.phone) {
          openWhatsApp(saleData.customer.phone, generateReceiptText());
        } else {
          setShowWhatsappInput(true);
          setShareMessage('Enter WhatsApp number');
        }
      }
      
      setTimeout(() => setShareMessage(''), 2000);
    } catch (error) {
      console.error('Failed to share image:', error);
      setShareMessage('Failed to share');
      setTimeout(() => setShareMessage(''), 2000);
    } finally {
      setIsSharing(false);
    }
  };

  // Open WhatsApp with manual number
  const shareViaWhatsAppManual = () => {
    if (!whatsappNumber) {
      setShareMessage('Please enter a WhatsApp number');
      setTimeout(() => setShareMessage(''), 2000);
      return;
    }
    
    openWhatsApp(whatsappNumber, generateReceiptText());
    setShowWhatsappInput(false);
    setWhatsappNumber('');
  };

  // Open WhatsApp helper
  const openWhatsApp = (phoneNumber, text) => {
    setIsSharing(true);
    setShareMessage('Opening WhatsApp...');
    
    try {
      const encodedText = encodeURIComponent(text);
      const cleanedNumber = phoneNumber.replace(/\D/g, '');
      const whatsappLink = `https://wa.me/${cleanedNumber}?text=${encodedText}`;
      
      window.open(whatsappLink, '_blank');
      
      setShareMessage('WhatsApp opened');
      setTimeout(() => setShareMessage(''), 2000);
    } catch (error) {
      console.error('Failed to open WhatsApp:', error);
      setShareMessage('Failed to open WhatsApp');
      setTimeout(() => setShareMessage(''), 2000);
    } finally {
      setIsSharing(false);
    }
  };

  // Download as Image
  const downloadAsImage = async () => {
    setIsSharing(true);
    setShareMessage('Generating image...');
    
    try {
      const imageData = await captureAsImage();
      if (imageData) {
        const link = document.createElement('a');
        link.download = `receipt-${saleData.receiptNumber}.png`;
        link.href = imageData;
        link.click();
        
        setShareMessage('Image downloaded');
        setTimeout(() => setShareMessage(''), 2000);
      } else {
        setShareMessage('Failed to generate image');
        setTimeout(() => setShareMessage(''), 2000);
      }
    } catch (error) {
      console.error('Failed to download image:', error);
      setShareMessage('Failed to download');
      setTimeout(() => setShareMessage(''), 2000);
    } finally {
      setIsSharing(false);
    }
  };

  // Download as PDF
  const downloadAsPDF = async () => {
    setIsSharing(true);
    setShareMessage('Generating PDF...');
    
    try {
      const pdfData = await generatePDF();
      if (pdfData) {
        const link = document.createElement('a');
        link.download = `receipt-${saleData.receiptNumber}.pdf`;
        link.href = pdfData;
        link.click();
        
        setShareMessage('PDF downloaded');
        setTimeout(() => setShareMessage(''), 2000);
      } else {
        setShareMessage('Failed to generate PDF');
        setTimeout(() => setShareMessage(''), 2000);
      }
    } catch (error) {
      console.error('Failed to download PDF:', error);
      setShareMessage('Failed to download');
      setTimeout(() => setShareMessage(''), 2000);
    } finally {
      setIsSharing(false);
    }
  };

  // Handle print (unchanged)
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const storeName = 'BizCore POS';
      const storeAddress = '123 Main Street';
      const storePhone = '(555) 123-4567';
      const overdue = isOverdue();
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Receipt ${saleData.receiptNumber}</title>
            <style>
              body { 
                font-family: 'Courier New', monospace; 
                padding: 20px; 
                max-width: 300px; 
                margin: 0 auto;
                font-size: 12px;
                line-height: 1.4;
              }
              .header { 
                text-align: center; 
                margin-bottom: 20px;
                border-bottom: 1px dashed #000;
                padding-bottom: 10px;
              }
              .store-name {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 5px;
              }
              .store-details {
                font-size: 10px;
                color: #555;
              }
              .receipt-info {
                margin: 15px 0;
                padding: 10px 0;
                border-top: 1px dashed #000;
                border-bottom: 1px dashed #000;
              }
              .receipt-info div {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                margin: 3px 0;
              }
              .customer-info {
                background: #f5f5f5;
                padding: 8px;
                margin: 10px 0;
                border-radius: 4px;
                font-size: 10px;
              }
              .status-badge {
                text-align: center;
                padding: 5px;
                margin: 10px 0;
                border-radius: 4px;
                font-weight: bold;
                font-size: 11px;
              }
              .installment {
                background: #e6f3ff;
                color: #0066cc;
              }
              .credit {
                background: #f3e6ff;
                color: #6600cc;
              }
              .overdue {
                background: #ffe6e6;
                color: #cc0000;
                border: 1px solid #ff9999;
              }
              .penalty-box {
                background: #fff3e6;
                border: 1px solid #ff9966;
                padding: 8px;
                margin: 10px 0;
                border-radius: 4px;
              }
              .penalty-title {
                font-weight: bold;
                color: #cc6600;
                font-size: 10px;
                margin-bottom: 5px;
              }
              .items {
                margin: 15px 0;
              }
              .item {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                margin: 5px 0;
              }
              .item-details {
                flex: 1;
              }
              .item-sku {
                font-size: 9px;
                color: #777;
              }
              .totals {
                margin: 15px 0;
                padding-top: 10px;
                border-top: 1px dashed #000;
              }
              .total-row {
                display: flex;
                justify-content: space-between;
                font-size: 11px;
                margin: 3px 0;
              }
              .grand-total {
                font-size: 14px;
                font-weight: bold;
                margin-top: 8px;
                padding-top: 5px;
                border-top: 1px solid #000;
              }
              .payment-details {
                background: #f9f9f9;
                padding: 8px;
                margin: 10px 0;
                border-radius: 4px;
              }
              .schedule-box {
                border: 1px solid #0066cc;
                padding: 8px;
                margin: 8px 0;
                border-radius: 4px;
                background: #e6f3ff;
              }
              .schedule-title {
                font-weight: bold;
                font-size: 10px;
                margin-bottom: 5px;
                color: #0066cc;
              }
              .schedule-row {
                display: flex;
                justify-content: space-between;
                font-size: 9px;
                margin: 2px 0;
              }
              .warning-box {
                background: #fff3cd;
                border: 1px solid #ffc107;
                padding: 8px;
                margin: 10px 0;
                border-radius: 4px;
                font-size: 9px;
              }
              .footer {
                text-align: center;
                margin-top: 20px;
                padding-top: 10px;
                border-top: 1px dashed #000;
                font-size: 10px;
              }
              .note {
                font-size: 8px;
                color: #777;
                text-align: center;
                margin-top: 5px;
              }
              .terms {
                font-size: 7px;
                color: #999;
                text-align: center;
                margin-top: 10px;
                border-top: 1px dotted #ccc;
                padding-top: 5px;
              }
              @media print {
                body { margin: 0; padding: 10px; }
              }
            </style>
          </head>
          <body>
            <div class="header">
              <div class="store-name">${storeName}</div>
              <div class="store-details">${storeAddress}</div>
              <div class="store-details">Tel: ${storePhone}</div>
            </div>

            <div class="receipt-info">
              <div>
                <span>Receipt #:</span>
                <span>${saleData.receiptNumber}</span>
              </div>
              <div>
                <span>Date:</span>
                <span>${new Date(saleData.timestamp).toLocaleString()}</span>
              </div>
              <div>
                <span>Cashier:</span>
                <span>John Doe</span>
              </div>
            </div>

            ${saleData.customer ? `
              <div class="customer-info">
                <div><strong>Customer:</strong> ${saleData.customer.name}</div>
                ${saleData.customer.email ? `<div>Email: ${saleData.customer.email}</div>` : ''}
                ${saleData.customer.phone ? `<div>Phone: ${saleData.customer.phone}</div>` : ''}
                ${saleData.customer.loyaltyPoints ? `<div>Loyalty Points: ${saleData.customer.loyaltyPoints}</div>` : ''}
              </div>
            ` : ''}

            ${saleData.status !== 'completed' ? `
              <div class="status-badge ${overdue ? 'overdue' : (saleData.status === 'installment' ? 'installment' : 'credit')}">
                ${overdue ? '⚠️ OVERDUE - PAYMENT REQUIRED' : (saleData.status === 'installment' ? '🔄 INSTALLMENT PAYMENT' : '📝 CREDIT SALE')}
              </div>
            ` : ''}

            ${overdue ? `
              <div class="penalty-box">
                <div class="penalty-title">⚠️ PENALTY WARNING</div>
                <div class="schedule-row">
                  <span>Payment Status:</span>
                  <span style="color: #cc0000;">OVERDUE</span>
                </div>
                <div class="schedule-row">
                  <span>Original Due Date:</span>
                  <span>${new Date(saleData.dueDate).toLocaleDateString()}</span>
                </div>
                <div class="schedule-row" style="margin-top: 5px; padding-top: 5px; border-top: 1px dashed #ff9966;">
                  <span>Amount Paid:</span>
                  <span>$${formatPrice(saleData.amount)}</span>
                </div>
                <div class="schedule-row">
                  <span>Penalty (${saleData.penaltyRate}%):</span>
                  <span style="color: #cc0000;">-$${formatPrice(penaltyAmount)}</span>
                </div>
                <div class="schedule-row" style="font-weight: bold;">
                  <span>Refund Amount:</span>
                  <span style="color: #006600;">$${formatPrice(refundAmount)}</span>
                </div>
                <div class="note" style="margin-top: 5px; color: #cc6600;">
                  * If payment fails, only ${saleData.refundRate}% of paid amount is refundable
                </div>
              </div>
            ` : ''}

            <div class="items">
              <h3 style="font-size: 12px; margin-bottom: 10px;">Items</h3>
              ${saleData.items.map(item => `
                <div class="item">
                  <div class="item-details">
                    <div>${item.name} x${item.quantity}</div>
                    <div class="item-sku">SKU: ${item.sku}</div>
                  </div>
                  <div>$${formatPrice(item.price * item.quantity)}</div>
                </div>
              `).join('')}
            </div>

            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>$${formatPrice(saleData.subtotal)}</span>
              </div>
              ${saleData.discount > 0 ? `
                <div class="total-row">
                  <span>Discount:</span>
                  <span>-$${formatPrice(saleData.discount)}</span>
                </div>
              ` : ''}
              <div class="total-row">
                <span>Tax (10%):</span>
                <span>$${formatPrice(saleData.tax)}</span>
              </div>
              <div class="grand-total total-row">
                <span>TOTAL:</span>
                <span>$${formatPrice(saleData.total)}</span>
              </div>
            </div>

            <div class="payment-details">
              <div class="total-row">
                <span>Payment Method:</span>
                <span>${saleData.method}</span>
              </div>
              <div class="total-row">
                <span>Amount Paid:</span>
                <span>$${formatPrice(saleData.amount)}</span>
              </div>
              ${saleData.remaining > 0 ? `
                <div class="total-row">
                  <span>Remaining Balance:</span>
                  <span>$${formatPrice(saleData.remaining)}</span>
                </div>
                <div class="total-row">
                  <span>Due Date:</span>
                  <span>${new Date(saleData.dueDate).toLocaleDateString()}</span>
                </div>
              ` : ''}
              ${saleData.change > 0 ? `
                <div class="total-row">
                  <span>Change:</span>
                  <span>$${formatPrice(saleData.change)}</span>
                </div>
              ` : ''}
            </div>

            ${saleData.status === 'installment' && selectedSchedule ? `
              <div style="margin: 15px 0;">
                <h3 style="font-size: 11px; margin-bottom: 8px;">Payment Schedule</h3>
                
                <div class="schedule-box">
                  <div class="schedule-title">📅 ${selectedSchedule.type} Plan</div>
                  <div class="schedule-row">
                    <span>Amount:</span>
                    <span>$${formatPrice(selectedSchedule.amount)}/${selectedSchedule.frequency}</span>
                  </div>
                  <div class="schedule-row">
                    <span>Duration:</span>
                    <span>${selectedSchedule.count} ${selectedSchedule.frequency}s</span>
                  </div>
                  <div class="schedule-row">
                    <span>Total:</span>
                    <span>$${formatPrice(selectedSchedule.total)}</span>
                  </div>
                  <div class="schedule-row">
                    <span>First Due Date:</span>
                    <span>${selectedSchedule.dueDate}</span>
                  </div>
                  <div class="schedule-row">
                    <span>Next Payment:</span>
                    <span>${selectedSchedule.nextDate}</span>
                  </div>
                </div>

                <div class="warning-box">
                  <strong>⚠️ Payment Terms:</strong><br/>
                  • ${saleData.penaltyRate}% penalty on paid amount if payment fails<br/>
                  • Only ${saleData.refundRate}% of paid amount is refundable<br/>
                  • Payments must be made by due dates
                </div>
              </div>
            ` : ''}

            ${saleData.status === 'credit' && saleData.remaining > 0 ? `
              <div class="schedule-box" style="background: #f3e6ff; border-color: #6600cc;">
                <div class="schedule-title" style="color: #6600cc;">📝 Credit Terms</div>
                <div class="schedule-row">
                  <span>Remaining Balance:</span>
                  <span>$${formatPrice(saleData.remaining)}</span>
                </div>
                <div class="schedule-row">
                  <span>Due Date:</span>
                  <span>${new Date(saleData.dueDate).toLocaleDateString()}</span>
                </div>
                <div class="schedule-row">
                  <span>Days Remaining:</span>
                  <span>${Math.max(0, Math.ceil((new Date(saleData.dueDate) - new Date()) / (1000 * 60 * 60 * 24)))} days</span>
                </div>
                <div class="warning-box" style="margin-top: 8px;">
                  <strong>⚠️ Credit Terms:</strong><br/>
                  • ${saleData.penaltyRate}% penalty if payment fails<br/>
                  • Only ${saleData.refundRate}% refundable<br/>
                  • Payment required by due date
                </div>
              </div>
            ` : ''}

            ${saleData.notes ? `
              <div class="schedule-box" style="background: #f5f5f5;">
                <div class="schedule-title">📌 Notes</div>
                <div class="note">${saleData.notes}</div>
              </div>
            ` : ''}

            <div class="footer">
              <p>Thank you for your business!</p>
              <p style="font-size: 8px; margin-top: 5px;">GST: 12345-6789</p>
              <p style="font-size: 8px;">Transaction ID: ${saleData.id}</p>
            </div>

            <div class="terms">
              <p>Terms & Conditions:</p>
              <p>• Failure to pay on time results in ${saleData.penaltyRate}% penalty</p>
              <p>• Refund limited to ${saleData.refundRate}% of paid amount</p>
              <p>• All payments must be completed by due dates</p>
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.onload = function() {
        printWindow.print();
      };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className={`w-full max-w-sm ${currentTheme.colors.card} rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
        {/* Header */}
        <div className={`p-4 border-b ${currentTheme.colors.border} flex justify-between items-center sticky top-0 ${currentTheme.colors.card} z-10`}>
          <h2 className={`text-lg font-semibold ${currentTheme.colors.text}`}>Receipt</h2>
          <button onClick={onClose} className={`p-1 rounded-lg ${currentTheme.colors.hover}`}>
            <Icons.x className="text-xl" />
          </button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-4 font-mono text-sm space-y-3">
          {/* Store Info */}
          <div className="text-center">
            <h3 className={`text-lg font-bold ${currentTheme.colors.text}`}>BizCore POS</h3>
            <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>123 Main Street</p>
            <p className={`text-[10px] ${currentTheme.colors.textSecondary}`}>Tel: (555) 123-4567</p>
          </div>

          {/* Receipt Info */}
          <div className={`border-t border-b ${currentTheme.colors.border} py-2`}>
            <div className="flex justify-between text-[10px]">
              <span className={currentTheme.colors.textSecondary}>Receipt #:</span>
              <span className={currentTheme.colors.text}>{saleData.receiptNumber}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className={currentTheme.colors.textSecondary}>Date:</span>
              <span className={currentTheme.colors.text}>{new Date(saleData.timestamp).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className={currentTheme.colors.textSecondary}>Cashier:</span>
              <span className={currentTheme.colors.text}>John Doe</span>
            </div>
          </div>

          {/* Customer Info */}
          {saleData.customer && (
            <div className={`p-2 rounded-lg ${currentTheme.colors.accentLight} space-y-0.5`}>
              <p className={`text-[10px] font-medium ${currentTheme.colors.text}`}>Customer: {saleData.customer.name}</p>
              {saleData.customer.email && <p className={`text-[8px] ${currentTheme.colors.textSecondary}`}>Email: {saleData.customer.email}</p>}
              {saleData.customer.phone && <p className={`text-[8px] ${currentTheme.colors.textSecondary}`}>Phone: {saleData.customer.phone}</p>}
              {saleData.customer.loyaltyPoints > 0 && (
                <p className={`text-[8px] ${currentTheme.colors.textSecondary}`}>Loyalty Points: {saleData.customer.loyaltyPoints}</p>
              )}
            </div>
          )}

          {/* Payment Status Badge */}
          {saleData.status !== 'completed' && (
            <div 
              className={`p-1.5 rounded-lg text-center cursor-pointer transition-all ${
                isOverdue() 
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700' 
                  : saleData.status === 'installment' 
                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' 
                    : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'
              }`}
              onClick={() => setShowPenaltyInfo(!showPenaltyInfo)}
              title="Click to toggle penalty information"
            >
              <p className="text-[10px] font-medium">
                {isOverdue() ? '⚠️ PAYMENT OVERDUE' : (saleData.status === 'installment' ? '🔄 Installment Payment' : '📝 Credit Sale')}
              </p>
            </div>
          )}

          {/* Penalty Information - Toggle Section */}
          {(saleData.status !== 'completed' || showPenaltyInfo) && (
            <div className={`p-2 rounded-lg border ${
              isOverdue() 
                ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/10' 
                : 'border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10'
            } transition-all`}>
              <div className="flex justify-between items-center mb-1">
                <p className={`text-[8px] font-medium ${isOverdue() ? 'text-red-600' : 'text-amber-600'}`}>
                  ⚖️ Payment Terms
                </p>
                <button 
                  onClick={() => setShowPenaltyInfo(!showPenaltyInfo)}
                  className="text-[10px] text-gray-500"
                >
                  {showPenaltyInfo ? '▲' : '▼'}
                </button>
              </div>
              
              {showPenaltyInfo && (
                <div className="space-y-1 mt-1">
                  <div className="flex justify-between text-[7px]">
                    <span className={currentTheme.colors.textSecondary}>Paid Amount:</span>
                    <span className="text-green-600">$${formatPrice(saleData.amount)}</span>
                  </div>
                  <div className="flex justify-between text-[7px]">
                    <span className={currentTheme.colors.textSecondary}>Penalty if Late ({saleData.penaltyRate}%):</span>
                    <span className="text-red-600">-$${formatPrice(penaltyAmount)}</span>
                  </div>
                  <div className="flex justify-between text-[7px] font-medium">
                    <span className={currentTheme.colors.textSecondary}>Refund if Failed:</span>
                    <span className="text-green-600">$${formatPrice(refundAmount)}</span>
                  </div>
                  <div className="text-[6px] text-gray-500 mt-1 pt-1 border-t border-dashed">
                    * {saleData.refundRate}% of paid amount refundable if payment fails
                  </div>
                  {isOverdue() && (
                    <div className="text-[7px] text-red-600 font-medium mt-1">
                      ⚠️ Payment overdue - penalty will apply
                    </div>
                  )}
                </div>
              )}
              
              {!showPenaltyInfo && (
                <p className="text-[6px] text-gray-500 mt-0.5">
                  {isOverdue() ? '⚠️ Overdue' : `${saleData.penaltyRate}% penalty if late`}
                </p>
              )}
            </div>
          )}

          {/* Items */}
          <div className="space-y-1">
            <p className={`text-[10px] font-medium ${currentTheme.colors.text}`}>Items</p>
            {saleData.items.map((item, index) => (
              <div key={index} className="flex justify-between text-[10px]">
                <div className="flex-1">
                  <span className={currentTheme.colors.text}>{item.name}</span>
                  <span className={`ml-1 ${currentTheme.colors.textSecondary}`}>x{item.quantity}</span>
                </div>
                <span className={currentTheme.accentText}>${formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className={`border-t ${currentTheme.colors.border} pt-2 space-y-0.5`}>
            <div className="flex justify-between text-[10px]">
              <span className={currentTheme.colors.textSecondary}>Subtotal:</span>
              <span className={currentTheme.colors.text}>$${formatPrice(saleData.subtotal)}</span>
            </div>
            {saleData.discount > 0 && (
              <div className="flex justify-between text-[10px]">
                <span className={currentTheme.colors.textSecondary}>Discount:</span>
                <span className="text-green-600">-$${formatPrice(saleData.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[10px]">
              <span className={currentTheme.colors.textSecondary}>Tax (10%):</span>
              <span className={currentTheme.colors.text}>$${formatPrice(saleData.tax)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold pt-1 border-t border-dashed">
              <span className={currentTheme.colors.text}>TOTAL:</span>
              <span className={currentTheme.accentText}>$${formatPrice(saleData.total)}</span>
            </div>
          </div>

          {/* Payment Details */}
          <div className={`p-2 rounded-lg ${currentTheme.colors.accentLight} space-y-1`}>
            <div className="flex justify-between text-[9px]">
              <span className={currentTheme.colors.textSecondary}>Method:</span>
              <span className={currentTheme.colors.text}>{saleData.method}</span>
            </div>
            <div className="flex justify-between text-[9px]">
              <span className={currentTheme.colors.textSecondary}>Amount Paid:</span>
              <span className="text-green-600 font-medium">$${formatPrice(saleData.amount)}</span>
            </div>
            {saleData.remaining > 0 && (
              <>
                <div className="flex justify-between text-[9px]">
                  <span className={currentTheme.colors.textSecondary}>Remaining Balance:</span>
                  <span className="text-amber-600 font-medium">$${formatPrice(saleData.remaining)}</span>
                </div>
                <div className="flex justify-between text-[9px]">
                  <span className={currentTheme.colors.textSecondary}>Due Date:</span>
                  <span className={isOverdue() ? 'text-red-600 font-medium' : currentTheme.colors.text}>
                    {new Date(saleData.dueDate).toLocaleDateString()}
                  </span>
                </div>
                {saleData.status === 'credit' && (
                  <div className="flex justify-between text-[9px]">
                    <span className={currentTheme.colors.textSecondary}>Days Remaining:</span>
                    <span className={isOverdue() ? 'text-red-600' : 'text-green-600'}>
                      {Math.max(0, Math.ceil((new Date(saleData.dueDate) - new Date()) / (1000 * 60 * 60 * 24)))} days
                    </span>
                  </div>
                )}
              </>
            )}
            {saleData.change > 0 && (
              <div className="flex justify-between text-[9px]">
                <span className={currentTheme.colors.textSecondary}>Change:</span>
                <span className={currentTheme.colors.text}>$${formatPrice(saleData.change)}</span>
              </div>
            )}
          </div>

          {/* Selected Payment Schedule */}
          {saleData.status === 'installment' && selectedSchedule && (
            <div className="space-y-1.5">
              <p className={`text-[9px] font-medium ${currentTheme.colors.text}`}>📋 Payment Schedule</p>
              
              <div className={`p-2 rounded border ${
                isOverdue() 
                  ? 'border-red-300 bg-red-50 dark:bg-red-900/10' 
                  : 'border-blue-300 bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <p className={`text-[8px] font-medium ${isOverdue() ? 'text-red-600' : 'text-blue-600 dark:text-blue-400'}`}>
                  📅 {selectedSchedule.type} Plan
                </p>
                <div className="grid grid-cols-2 gap-1 mt-1 text-[7px]">
                  <span className={currentTheme.colors.textSecondary}>Amount:</span>
                  <span className="text-right">${formatPrice(selectedSchedule.amount)}/{selectedSchedule.frequency}</span>
                  
                  <span className={currentTheme.colors.textSecondary}>Duration:</span>
                  <span className="text-right">{selectedSchedule.count} {selectedSchedule.frequency}s</span>
                  
                  <span className={currentTheme.colors.textSecondary}>Total:</span>
                  <span className="text-right">${formatPrice(selectedSchedule.total)}</span>
                  
                  <span className={currentTheme.colors.textSecondary}>First Due:</span>
                  <span className="text-right">{selectedSchedule.dueDate}</span>
                  
                  <span className={currentTheme.colors.textSecondary}>Next:</span>
                  <span className="text-right">{selectedSchedule.nextDate}</span>
                </div>
              </div>
            </div>
          )}

          {/* Credit Sale Terms */}
          {saleData.status === 'credit' && saleData.remaining > 0 && (
            <div className={`p-2 rounded-lg ${
              isOverdue() 
                ? 'bg-red-50 dark:bg-red-900/10 border border-red-300' 
                : 'bg-purple-50 dark:bg-purple-900/20'
            } space-y-0.5`}>
              <p className={`text-[9px] font-medium ${isOverdue() ? 'text-red-600' : 'text-purple-700 dark:text-purple-400'}`}>
                📝 Credit Terms
              </p>
              <p className={`text-[8px] ${currentTheme.colors.textSecondary}`}>
                Remaining: <span className="font-medium text-purple-600">$${formatPrice(saleData.remaining)}</span>
              </p>
              <p className={`text-[8px] ${currentTheme.colors.textSecondary}`}>
                Due: {new Date(saleData.dueDate).toLocaleDateString()}
                {isOverdue() && <span className="text-red-600 ml-1">(Overdue)</span>}
              </p>
              <p className={`text-[8px] ${currentTheme.colors.textSecondary}`}>
                Days Left: <span className={isOverdue() ? 'text-red-600' : 'text-green-600'}>
                  {Math.max(0, Math.ceil((new Date(saleData.dueDate) - new Date()) / (1000 * 60 * 60 * 24)))} days
                </span>
              </p>
            </div>
          )}

          {/* Notes */}
          {saleData.notes && (
            <div className={`p-1.5 rounded-lg ${currentTheme.colors.accentLight}`}>
              <p className={`text-[8px] ${currentTheme.colors.textSecondary}`}>📌 {saleData.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className={`pt-2 border-t ${currentTheme.colors.border} text-center`}>
            <p className={`text-[9px] ${currentTheme.colors.text}`}>Thank you for your business!</p>
            <p className={`text-[6px] ${currentTheme.colors.textSecondary} mt-0.5`}>GST: 12345-6789</p>
            <p className={`text-[6px] ${currentTheme.colors.textSecondary}`}>ID: {saleData.id.slice(-8)}</p>
            {saleData.status !== 'completed' && (
              <p className={`text-[5px] ${currentTheme.colors.textSecondary} mt-1`}>
                * {saleData.penaltyRate}% penalty applies for late payment. {saleData.refundRate}% refund if payment fails.
              </p>
            )}
          </div>
        </div>

        {/* Share Status Message */}
        {shareMessage && (
          <div className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] text-center">
            {shareMessage}
          </div>
        )}

        {/* WhatsApp Number Input */}
        {showWhatsappInput && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-[10px] mb-2">Enter WhatsApp number:</p>
            <div className="flex gap-2">
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+1234567890"
                className={`flex-1 px-2 py-1 text-xs rounded border ${currentTheme.colors.border} ${currentTheme.colors.bgSecondary} ${currentTheme.colors.text}`}
              />
              <button
                onClick={shareViaWhatsAppManual}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              >
                Send
              </button>
              <button
                onClick={() => {
                  setShowWhatsappInput(false);
                  setWhatsappNumber('');
                }}
                className="px-3 py-1 bg-gray-500 text-white text-xs rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Share Options */}
        <div className="p-3 border-t border-gray-200 dark:border-gray-700 space-y-2">
          {/* Main Share Button */}
          <button
            onClick={() => setShowShareOptions(!showShareOptions)}
            className={`w-full px-3 py-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} ${currentTheme.colors.text} flex items-center justify-center gap-2 text-xs`}
          >
            <Icons.share className="text-sm" /> Share Receipt
          </button>

          {/* Share Options Grid */}
          {showShareOptions && (
            <div className="grid grid-cols-2 gap-2 pt-2">
              {/* Email */}
              <button
                onClick={shareViaEmail}
                disabled={isSharing || !saleData.customer?.email}
                className={`p-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex flex-col items-center gap-1 ${!saleData.customer?.email ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!saleData.customer?.email ? 'No email available' : 'Send via Email'}
              >
                <Icons.mail className="text-blue-500 text-lg" />
                <span className="text-[8px]">Email</span>
              </button>

              {/* SMS */}
              <button
                onClick={shareViaSMS}
                disabled={isSharing || !saleData.customer?.phone}
                className={`p-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex flex-col items-center gap-1 ${!saleData.customer?.phone ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={!saleData.customer?.phone ? 'No phone number' : 'Send via SMS'}
              >
                <Icons.message className="text-green-500 text-lg" />
                <span className="text-[8px]">SMS</span>
              </button>

              {/* WhatsApp Text */}
              <button
                onClick={shareViaWhatsAppText}
                disabled={isSharing}
                className={`p-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex flex-col items-center gap-1`}
                title="Send via WhatsApp"
              >
                <Icons.message className="text-green-600 text-lg" />
                <span className="text-[8px]">WhatsApp</span>
              </button>

              {/* WhatsApp Image */}
              <button
                onClick={shareViaWhatsAppImage}
                disabled={isSharing}
                className={`p-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex flex-col items-center gap-1`}
                title="Send Image via WhatsApp"
              >
                <Icons.image className="text-green-600 text-lg" />
                <span className="text-[8px]">WhatsApp Img</span>
              </button>

              {/* Download Image */}
              <button
                onClick={downloadAsImage}
                disabled={isSharing}
                className={`p-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex flex-col items-center gap-1`}
                title="Download as Image"
              >
                <Icons.image className="text-purple-500 text-lg" />
                <span className="text-[8px]">Image</span>
              </button>

              {/* Download PDF */}
              <button
                onClick={downloadAsPDF}
                disabled={isSharing}
                className={`p-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex flex-col items-center gap-1`}
                title="Download as PDF"
              >
                <Icons.file className="text-red-500 text-lg" />
                <span className="text-[8px]">PDF</span>
              </button>

              {/* Print */}
              <button
                onClick={handlePrint}
                disabled={isSharing}
                className={`p-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex flex-col items-center gap-1`}
                title="Print Receipt"
              >
                <Icons.printer className="text-gray-500 text-lg" />
                <span className="text-[8px]">Print</span>
              </button>

              {/* Text Copy */}
              <button
                onClick={() => {
                  navigator.clipboard.writeText(generateReceiptText());
                  setShareMessage('Text copied!');
                  setTimeout(() => setShareMessage(''), 2000);
                }}
                disabled={isSharing}
                className={`p-2 rounded-lg border ${currentTheme.colors.border} ${currentTheme.colors.hover} flex flex-col items-center gap-1`}
                title="Copy as Text"
              >
                <Icons.copy className="text-amber-500 text-lg" />
                <span className="text-[8px]">Copy</span>
              </button>
            </div>
          )}

          {/* New Sale Button */}
          <button
            onClick={onClose}
            className={`w-full px-3 py-2 rounded-lg bg-gradient-to-r ${currentTheme.colors.accent} text-white font-semibold flex items-center justify-center gap-2 text-xs mt-2`}
          >
            <Icons.shoppingBag className="text-sm" /> New Sale
          </button>
        </div>
      </div>
    </div>
  );
}