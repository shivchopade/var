import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { load } from '@cashfreepayments/cashfree-js';
import './App.css';
import FileUpload from './components/FileUpload';

// Configure axios base URL
axios.defaults.baseURL = '';

function App() {
  const [cashfree, setCashfree] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [file, setFile] = useState(null);
  const [printDetails, setPrintDetails] = useState(null);
  const currentOrderId = useRef(null);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const initializeSDK = async () => {
      const cf = await load({ mode: "sandbox" });
      setCashfree(cf);
    };
    initializeSDK();
  }, []);

  const handleFileSelected = (selectedFile) => {
    setFile(selectedFile);
  };

  const handleFileUpload = async () => {
    try {
      setPaymentStatus('UPLOADING');
      const formData = new FormData();
      formData.append('file', file);
  
      console.log('Uploading to:', axios.defaults.baseURL + '/upload');
      const response = await axios.post('/upload', formData);
      console.log('Upload response:', response.data);
      
      currentOrderId.current = response.data.orderId;
      setPrintDetails({
        pageCount: response.data.pageCount,
        amount: response.data.amount
      });
      setPaymentStatus('READY_TO_PAY');
    } catch (error) {
      console.error('Upload error:', error.response || error);
      setPaymentStatus('UPLOAD_ERROR');
    }
  };

  const handlePayment = async () => {
    try {
      setPaymentStatus('PROCESSING_PAYMENT');
      
      const paymentSession = await axios.post('/create-payment', {
        orderId: currentOrderId.current,
        amount: printDetails.amount
      });

      cashfree.checkout({
        paymentSessionId: paymentSession.data.paymentSessionId,
        redirectTarget: "_modal"
      }).then(result => {
        if (result.paymentDetails) {
          verifyPayment();
        } else {
          setPaymentStatus('PAYMENT_FAILED');
        }
      });
    } catch (error) {
      setPaymentStatus('PAYMENT_FAILED');
    }
  };

  const verifyPayment = async () => {
    try {
      setPaymentStatus('VERIFYING');
      const response = await axios.post('/verify-payment', {
        orderId: currentOrderId.current
      });

      if (response.data.success) {
        setPaymentStatus('SUCCESS');
      } else {
        setPaymentStatus('PAYMENT_FAILED');
      }
    } catch (error) {
      setPaymentStatus('VERIFICATION_ERROR');
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPaymentStatus('');
    setPrintDetails(null);
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  return (
    <div className={`app-container ${darkMode ? 'dark' : 'light'}`}>
      <div className="theme-toggle" onClick={toggleDarkMode}>
        {darkMode ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 17C14.7614 17 17 14.7614 17 12C17 9.23858 14.7614 7 12 7C9.23858 7 7 9.23858 7 12C7 14.7614 9.23858 17 12 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 1V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 21V23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4.22 4.22L5.64 5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.36 18.36L19.78 19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M1 12H3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 12H23" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M4.22 19.78L5.64 18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M18.36 5.64L19.78 4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>

      <div className="content-container">
        <h1>Paper Cat</h1>
        <p className="subtitle">Fast, reliable, and secure printing services</p>
        
        {!paymentStatus && (
          <FileUpload 
            onFileSelected={handleFileSelected}
            onUploadComplete={handleFileUpload}
            isUploading={paymentStatus === 'UPLOADING'}
          />
        )}

        {paymentStatus === 'UPLOADING' && (
          <div className="status-container status-uploading">
            <div className="status-icon">
              <span className="spinner"></span>
            </div>
            <p>Processing your file...</p>
          </div>
        )}
        
        {paymentStatus === 'UPLOAD_ERROR' && (
          <div className="status-container status-error">
            <div className="status-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 9L9 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p>Upload failed. Please try again.</p>
            <button className="upload-button" onClick={resetUpload}>Try Again</button>
          </div>
        )}

        {paymentStatus === 'READY_TO_PAY' && (
          <div className="payment-details">
            <div className="payment-amount">₹{printDetails.amount}</div>
            <div className="payment-pages">{printDetails.pageCount} page(s) will be printed</div>
            <button className="upload-button" onClick={handlePayment}>
              Pay Now
            </button>
          </div>
        )}

        {paymentStatus === 'SUCCESS' && (
          <div className="status-container status-success">
            <div className="status-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22 11.08V12C21.9988 14.1564 21.3005 16.2547 20.0093 17.9818C18.7182 19.709 16.9033 20.9725 14.8354 21.5839C12.7674 22.1953 10.5573 22.1219 8.53447 21.3746C6.51168 20.6273 4.78465 19.2461 3.61096 17.4371C2.43727 15.628 1.87979 13.4881 2.02168 11.3363C2.16356 9.18455 2.99721 7.13631 4.39828 5.49706C5.79935 3.85781 7.69279 2.71537 9.79619 2.24013C11.8996 1.7649 14.1003 1.98232 16.07 2.85999" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 4L12 14.01L9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2>Printing Started!</h2>
            <p>Printing {printDetails.pageCount} page(s)</p>
            <button className="upload-button" onClick={resetUpload}>Print Another Document</button>
          </div>
        )}

        {paymentStatus === 'PAYMENT_FAILED' && (
          <div className="status-container status-error">
            <div className="status-icon">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <p>Payment failed. Please try again.</p>
            <button className="upload-button" onClick={resetUpload}>Try Again</button>
          </div>
        )}

        {['PROCESSING_PAYMENT', 'VERIFYING'].includes(paymentStatus) && (
          <div className="status-container status-uploading">
            <div className="status-icon">
              <span className="spinner"></span>
            </div>
            <p>Processing payment...</p>
            <div className="progress-container">
              <div className="progress-bar" style={{ width: '90%' }}></div>
            </div>
          </div>
        )}

        {!paymentStatus && (
          <div className="instructions-container">
            <div className="instructions-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Instructions
            </div>
            <ul className="instructions-list">
              <li>Upload a PDF file for printing.</li>
              <li>We support files up to 50 pages.</li>
              <li>Price is ₹1 per page.</li>
              <li>Your file will be processed securely.</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;