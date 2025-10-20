import React, { useState } from 'react';
import logoImg from '../../assets/logo.png';

const LoginRejected = () => {
  const [domain, setDomain] = useState('');
  const [isValid, setIsValid] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDomain(value);

    // Simple domain validation: example.com
    const domainRegex = /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    setIsValid(domainRegex.test(value));
  };

  return (
    <div className="flex h-screen flex-col items-center justify-center text-center">
      <img src={logoImg} className="w-[30rem] h-auto" />
      <h1 className="mb-5 mt-[-11px] text-3xl font-montserrat text-brand-green">Cyber Risk Management</h1>

      <div className="mb-4 rounded-md border border-red-500 bg-red-50 px-4 py-2 text-red-700">
        Your login attempt was rejected. Please enter your email domain to try again.
      </div>

      <input
        type="text"
        value={domain}
        onChange={handleChange}
        placeholder="Enter your email domain"
        className="mb-4 w-64 rounded border border-gray-300 px-3 py-2 text-center"
      />

      <a
        href={`/api/login?domain=${encodeURIComponent(domain)}`}
        className={`inline-flex items-center rounded-md bg-brand-teal px-4 py-2 text-white hover:bg-brand-teal/90 font-montserrat pt-[0.5%] pb-[0.5%] pl-[5%] pr-[5%] ${
          !isValid ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        Login
      </a>
    </div>
  );
};

export default LoginRejected;
