import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { load } from '@cashfreepayments/cashfree-js';
import './App.css';

// Configure axios base URL
axios.defaults.baseURL = 'http://localhost:8000';

function App() {
  const [cashfree, setCashfree] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [file, setFile] = useState(null);
  const [printDetails, setPrintDetails] = useState(null);
  const currentOrderId = useRef(null);

  useEffect(() => {
    const initializeSDK = async () => {
      const cf = await load({ mode: "sandbox" });
      setCashfree(cf);
    };
    initializeSDK();
  }, []);

  const handleFileUpload = async () => {
    try {
      setPaymentStatus('UPLOADING');
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('/upload', formData);
      currentOrderId.current = response.data.orderId;
      setPrintDetails({
        pageCount: response.data.pageCount,
        amount: response.data.amount
      });
      setPaymentStatus('READY_TO_PAY');
    } catch (error) {
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

  return (
    <div className="container">
      <h1>Print & Pay</h1>
      
      {!paymentStatus && (
        <div className="upload-section">
          <input 
            type="file" 
            onChange={(e) => setFile(e.target.files[0])}
            accept=".pdf,.txt,.jpg,.png"
          />
          <button onClick={handleFileUpload}>
            Upload File
          </button>
        </div>
      )}

      {paymentStatus === 'UPLOADING' && <p>Uploading file...</p>}
      {paymentStatus === 'UPLOAD_ERROR' && (
        <div className="error">
          <p>Upload failed. Please try again.</p>
          <button onClick={() => setPaymentStatus('')}>Retry</button>
        </div>
      )}

      {paymentStatus === 'READY_TO_PAY' && (
        <div className="payment-details">
          <p>{printDetails.pageCount} page(s) - ₹{printDetails.amount}</p>
          <button onClick={handlePayment}>
            Pay Now
          </button>
        </div>
      )}

      {paymentStatus === 'SUCCESS' && (
        <div className="success">
          <h2>Printing Started! 🎉</h2>
          <p>Printing {printDetails.pageCount} page(s)</p>
        </div>
      )}

      {paymentStatus === 'PAYMENT_FAILED' && (
        <div className="payment-error">
          <p>Payment failed. Please try again.</p>
          <button onClick={() => setPaymentStatus('')}>Retry</button>
        </div>
      )}

      {['PROCESSING_PAYMENT', 'VERIFYING'].includes(paymentStatus) && (
        <p>Processing payment...</p>
      )}
    </div>
  );
}

export default App;