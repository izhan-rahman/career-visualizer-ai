import React, { useState } from 'react';
import { motion } from 'framer-motion';

// --- This URL MUST match your local server ---
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';


export default function LoginPage({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loginType, setLoginType] = useState('user'); // 'user' or 'admin'

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const response = await fetch(`${SERVER_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (data.success && data.role === loginType) {
        localStorage.setItem('isLoggedIn', 'true');
        localStorage.setItem('userRole', data.role);
        onLoginSuccess(data.role);
      } else if (data.success && data.role !== loginType) {
        setError(`You are a ${data.role}, not a ${loginType}.`);
      } else {
        setError('Invalid email or password');
      }
    } catch (err) {
      setError('Failed to connect to the server. Is it running?');
    }
  };

  const handleForgotPassword = () => {
    // Simple placeholder behaviour — replace with your own flow.
    // Using a button avoids the invalid href lint error.
    alert('Please contact the administrator to reset your password.');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-indigo-900 to-blue-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-8 text-center drop-shadow-lg">
          Career Visualizer <span className="text-purple-300">AI</span>
        </h1>

        <motion.div
          className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-3xl shadow-xl border border-white border-opacity-20 p-8 flex flex-col items-center gap-6"
          whileHover={{
            scale: 1.03,
            boxShadow: "0px 20px 40px rgba(0,0,0,0.3)"
          }}
          transition={{ type: "spring", stiffness: 300, damping: 15 }}
        >

          <div className="bg-white bg-opacity-20 p-4 rounded-full shadow-lg border border-white border-opacity-30">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-white text-opacity-80" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>

          <div className="flex w-full bg-black bg-opacity-20 rounded-full p-1">
            <button
              onClick={() => setLoginType('user')}
              className={`w-1/2 py-2 rounded-full text-white ${loginType === 'user' ? 'bg-purple-600' : 'opacity-70'} transition-all`}
            >
              User
            </button>
            <button
              onClick={() => setLoginType('admin')}
              className={`w-1/2 py-2 rounded-full text-white ${loginType === 'admin' ? 'bg-purple-600' : 'opacity-70'} transition-all`}
            >
              Admin
            </button>
          </div>

          <h2 className="text-2xl font-bold text-white text-opacity-90">
            {loginType === 'admin' ? 'Admin Login' : 'User Login'}
          </h2>

          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-red-300 bg-red-800 bg-opacity-40 p-3 rounded-lg text-center w-full text-sm"
            >
              {error}
            </motion.p>
          )}

          <form onSubmit={handleSubmit} className="w-full flex flex-col gap-6">
            <div className="relative w-full flex items-center border-b-2 border-white border-opacity-30 focus-within:border-purple-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white text-opacity-70 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email ID"
                className="appearance-none w-full bg-transparent text-white placeholder-white placeholder-opacity-70 py-2 focus:outline-none text-lg"
              />
            </div>

            <div className="relative w-full flex items-center border-b-2 border-white border-opacity-30 focus-within:border-purple-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white text-opacity-70 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Password"
                className="appearance-none w-full bg-transparent text-white placeholder-white placeholder-opacity-70 py-2 focus:outline-none text-lg"
              />
            </div>

            <div className="flex justify-between items-center w-full text-sm mt-2">
              <label className="flex items-center text-white text-opacity-80">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={() => setRememberMe(!rememberMe)}
                  className="appearance-none h-4 w-4 bg-white bg-opacity-20 rounded border border-white border-opacity-50 checked:bg-purple-500 checked:border-transparent mr-2 transition"
                />
                Remember me
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-purple-300 hover:text-purple-200 transition-colors"
              >
                Forgot Password?
              </button>
            </div>

            <motion.button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xl font-semibold py-3 rounded-xl shadow-lg mt-4"
              whileHover={{ scale: 1.05, boxShadow: "0px 8px 20px rgba(0,0,0,0.3)" }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 400, damping: 10 }}
            >
              LOGIN
            </motion.button>
          </form>
        </motion.div>
      </motion.div>
    </div>
  );
}
