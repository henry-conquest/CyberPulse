import React, { useState } from 'react';
import logoImg from '../../assets/logo.png';

const LoginRejected = () => {
  const [email, setEmail] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEmail(value);

    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setIsValid(emailRegex.test(value));
  };

  const getDomainFromEmail = (email: string) => {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1] : '';
  };

  const params = new URLSearchParams(window.location.search);
  const errorMessage = params.get('message');

  const getFriendlyMessage = (message: string | null) => {
    if (!message) {
      return 'Sorry, your login attempt was rejected. Please enter your email to try again.';
    }

    switch (message) {
      case 'Unknown tenant domain':
        return (
          'We couldn’t find an organisation associated with your email domain. ' +
          'Please check your email address or contact your administrator.'
        );

      default:
        return 'Sorry, your login attempt was rejected. Please try again.';
    }
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center text-center">
      <img src={logoImg} className="w-[30rem] h-auto" />
      <h1 className="mb-5 mt-[-11px] text-3xl font-montserrat text-brand-green">Cyber Risk Management</h1>

      <div className="mb-4 rounded-md border border-red-500 bg-red-50 px-4 py-2 text-red-700">
        {getFriendlyMessage(errorMessage)}
      </div>

      <input
        type="email"
        value={email}
        onChange={handleChange}
        placeholder="Enter your email"
        className="mb-4 w-80 rounded border border-gray-300 px-3 py-2 text-center"
      />
      <a
        href={`/api/login?domain=${encodeURIComponent(getDomainFromEmail(email))}`}
        className={`inline-flex items-center rounded-md w-80 bg-brand-teal px-4 py-2 text-white hover:bg-brand-teal/90 font-montserrat pt-[0.5%] pb-[0.5%] pl-[5%] pr-[5%] ${
          !isValid ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        Login with Microsoft
      </a>
    </div>
  );
};

export default LoginRejected;
