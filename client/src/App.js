import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoginPage from './LoginPage';
import { Camera, Mic, Play, Send, User, Briefcase, LogOut, ShieldCheck, ArrowLeft } from 'lucide-react';

// Animation variants (unchanged)
const pageVariants = {
  initial: { opacity: 0, x: "-50vw", scale: 0.8 },
  in: { opacity: 1, x: 0, scale: 1 },
  out: { opacity: 0, x: "50vw", scale: 1.2 }
};

const pageTransition = {
  type: "tween",
  ease: "anticipate",
  duration: 0.5
};

// --- This URL MUST match your local server ---
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

// ---------------------------------

function CareerVisualizerApp({ onLogout, role }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const [stage, setStage] = useState("start");
  const [name, setName] = useState("");
  const [career, setCareer] = useState("");
  const [careerImage, setCareerImage] = useState(null);
  const [listening, setListening] = useState(false);

  // Memoize careerImages so reference is stable and hooks deps are satisfied
  const careerImages = useMemo(() => ({
    actor: "/images/actor.jpeg", architect: "/images/architect.jpeg", artist: "/images/artist.jpeg",
    astronaut: "/images/astronaut.jpeg", athlete: "/images/athlete.jpeg", animator: "/images/animator.jpeg",
    baker: "/images/baker.jpeg", badmintonplayer: "/images/badmintonplayer.jpeg", barber: "/images/barber.jpeg",
    busdriver: "/images/busdriver.jpeg", chef: "/images/chef.jpeg", chiefminister: "/images/chief_minister.jpeg",
    coach: "/images/coach.jpeg", constructionworker: "/images/constructionworker.jpeg", cricketer: "/images/cricketer.jpeg",
    dancer: "/images/dancer.jpeg", dentist: "/images/dentist.jpeg", detective: "/images/detective.jpeg",
    doctor: "/images/doctor.jpeg", electrician: "/images/electrician.jpeg", engineer: "/images/engineer.jpeg",
    entrepreneur: "/images/entrepreneur.jpeg", farmer: "/images/farmer.jpeg", fashiondesigner: "/images/fashiondesigner.jpeg",
    firefighter: "/images/firefighter.jpeg", florist: "/images/florist.jpeg", footballer: "/images/footballer.jpeg",
    gamer: "/images/gamer.jpeg", gamedeveloper: "/images/gamedeveloper.jpeg", gardener: "/images/gardener.jpeg",
    governor: "/images/governor.jpeg", graphicdesigner: "/images/graphicdesigner.jpeg", homeminister: "/images/home_minister.jpeg",
    judge: "/images/judge.jpeg", kabaddiplayer: "/images/kabaddiplayer.jpeg", lawyer: "/images/lawyer.jpeg",
    librarian: "/images/librarian.jpeg", mailcarrier: "/images/mailcarrier.jpeg", mayor: "/images/mayor.jpeg",
    mechanic: "/images/mechanic.jpeg", mla: "/images/mla.jpeg", mp: "/images/mp.jpeg",
    musician: "/images/musician.jpeg", nurse: "/images/nurse.jpeg", pharmacist: "/images/pharmacist.jpeg",
    photographer: "/images/photographer.jpeg", pilot: "/images/pilot.jpeg", plumber: "/images/plumber.jpeg",
    police: "/images/police.jpeg", president: "/images/president.jpeg", primeminister: "/images/prime_minister.jpeg",
    roboticsengineer: "/images/roboticsengineer.jpeg", scientist: "/images/scientist.jpeg",
    socialworker: "/images/socialworker.jpeg", softwareengineer: "/images/softwareengineer.jpeg",
    soldier: "/images/soldier.jpeg", teacher: "/images/teacher.jpeg", veterinarian: "/images/veterinarian.jpeg",
    writer: "/images/writer.jpeg", youtuber: "/images/youtuber.jpeg",
  }), []);

  // Now include careerImages in the deps so eslint is happy
  const getCareerData = useCallback((career) => {
    const key = (career || "").replace(/\s+/g, "").toLowerCase();
    const imagePath = careerImages[key];

    if (imagePath) {
      return {
        title: `${name || 'Student'} wants to be a ${career}`,
        src: imagePath,
        isKnown: true
      };
    } else {
      return {
        title: `${name || 'Student'}, are you confused? Please ask your mentor for guidance.`,
        src: '/images/confused.jpeg',
        isKnown: false
      };
    }
  }, [name, careerImages]);

  const stableSaveRecord = useCallback(async (studentName, studentCareer) => {
    try {
      await fetch(`${SERVER_URL}/record`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: studentName, career: studentCareer }),
      });
      console.log('Record sent to server:', studentName, studentCareer);
    } catch (error) {
      console.error('Failed to send record:', error);
    }
  }, []); // SERVER_URL is a const at module scope

  const extractNameAndCareer = useCallback((text) => {
    let n = "", c = "";
    const np = [/my\s*name\s*is\s+([a-z\s]+?)(?=\s+and|$)/i, /i\s*am\s+([a-z\s]+?)(?=\s+and|$)/i];
    const cp = [
      /i\s*want\s*to\s*be\s*a[n]?\s+([a-z\s]+?)(?=\s+in|\s+at|\s+with|$)/i,
      /i\s*will\s*be\s*a[n]?\s+([a-z\s]+?)(?=\s+in|\s+at|\s+with|$)/i,
      /become\s*a[n]?\s+([a-z\s]+?)(?=\s+in|\s+at|\s+with|$)/i
    ];
    for (const p of np) { const m = text.match(p); if (m && m[1]) { n = m[1].trim(); break; } }
    for (const p of cp) { const m = text.match(p); if (m && m[1]) { c = m[1].trim(); break; } }
    return { name: n || "Student", career: c || null };
  }, []);

  const processVoiceCommand = useCallback((transcript) => {
    const { name: dName, career: dCareer } = extractNameAndCareer(transcript);
    setName(dName);
    if (dCareer) {
      const careerData = getCareerData(dCareer);
      setCareerImage(careerData);
      setStage("result");
      if (careerData.isKnown) {
        stableSaveRecord(dName, dCareer);
      }
    } else {
      setStage("manual");
    }
  }, [extractNameAndCareer, getCareerData, stableSaveRecord]);

  const sendAudioToServer = useCallback(async (audioBlob) => {
    const reader = new FileReader();
    reader.readAsDataURL(audioBlob);
    reader.onloadend = async () => {
      const base64Audio = reader.result;
      try {
        const response = await fetch(`${SERVER_URL}/transcribe`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioData: base64Audio }),
        });
        const data = await response.json();
        if (data.success && data.transcript) {
          processVoiceCommand(data.transcript.toLowerCase());
        } else {
          setStage("manual");
        }
      } catch (error) {
        setStage("manual");
      }
    };
  }, [processVoiceCommand]);

  const startVoiceRecognition = useCallback(async () => {
    if (!('MediaRecorder' in window)) {
      console.error("MediaRecorder not supported"); setStage("manual"); return;
    }
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (event) => { audioChunksRef.current.push(event.data); };
      mediaRecorderRef.current.onstop = () => {
        setListening(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        sendAudioToServer(audioBlob);
        audioStream.getTracks().forEach(track => track.stop());
      };
      mediaRecorderRef.current.start();
      setListening(true);
      setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, 5000);
    } catch (err) {
      console.error("Audio recording error:", err);
      alert("Could not access microphone. Please check permissions.");
      setStage("manual");
    }
  }, [sendAudioToServer]);

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window) || !text.trim()) { return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-IN';
    utterance.rate = 0.9;
    utterance.pitch = 1.1;
    const setVoiceAndSpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      const indianVoice = voices.find(v => v.lang === 'en-IN');
      if (indianVoice) {
        utterance.voice = indianVoice;
      }
      window.speechSynthesis.speak(utterance);
    }
    if (window.speechSynthesis.getVoices().length > 0) {
      setVoiceAndSpeak();
    } else {
      window.speechSynthesis.onvoiceschanged = setVoiceAndSpeak;
    }
  }, []);

  useEffect(() => {
    if (stage === 'result' && careerImage?.title) {
      speak(careerImage.title);
    }
    return () => { window.speechSynthesis.cancel(); };
  }, [stage, careerImage, speak]);

  useEffect(() => {
    let stream = null;
    let timer = null;
    const startCameraAndTimer = async () => {
      try {
        speak(" ");
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        timer = setTimeout(() => {
          if (stream) stream.getTracks().forEach(track => track.stop());
          setStage('listen');
          startVoiceRecognition();
        }, 3000);
      } catch (error) {
        setStage("start");
      }
    };
    if (stage === 'camera_demo') {
      startCameraAndTimer();
    }
    return () => {
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach(track => track.stop());
    };
  }, [stage, startVoiceRecognition, speak]);

  const goBackToStart = () => {
    window.speechSynthesis.cancel();
    setStage("start"); setName(""); setCareer(""); setCareerImage(null);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const studentName = name || "Student";
    const studentCareer = career;

    setName(studentName);

    const careerData = getCareerData(studentCareer);
    setCareerImage(careerData);
    setStage("result");

    if (careerData.isKnown) {
      stableSaveRecord(studentName, studentCareer);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-800 via-indigo-900 to-blue-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-4 right-4 flex items-center gap-4 z-10">

        {role === 'admin' && (
          <motion.button
            onClick={() => setStage('admin_panel')}
            className="flex items-center gap-1 bg-yellow-500 text-black text-sm font-bold px-4 py-2 rounded-xl shadow-md hover:bg-yellow-400 transition-colors"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <ShieldCheck size={16} /> Admin Panel
          </motion.button>
        )}
        <motion.button
          onClick={onLogout}
          className="flex items-center gap-1 bg-white bg-opacity-10 text-white text-sm px-4 py-2 rounded-xl shadow-md hover:bg-opacity-20 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <LogOut size={16} /> Logout
        </motion.button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white drop-shadow-lg">
          Career Visualizer <span className="text-purple-300">AI</span>
        </h1>
        <div className="text-sm text-white text-opacity-70 mt-2">✨ See Your Future Self! ✨</div>
      </div>

      <div className="w-full max-w-md relative">
        {listening && (
          <motion.div
            className="absolute -inset-4 bg-purple-500 rounded-full blur-2xl opacity-50 pointer-events-none"
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden="true"
           />
        )}
        <div className="relative bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg rounded-3xl shadow-xl border border-white border-opacity-20 overflow-hidden">
          <AnimatePresence mode="wait">

            {stage === "start" && (
              <motion.div
                key="start"
                className="p-8 text-center flex flex-col items-center gap-4"
                variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}
              >
                <p className="text-xl text-white text-opacity-90">Ready for your future?</p>
                <motion.button
                  onClick={() => setStage("camera_demo")}
                  className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xl font-semibold py-3 rounded-xl shadow-lg mt-4"
                  whileHover={{ scale: 1.05, boxShadow: "0px 8px 20px rgba(0,0,0,0.3)" }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                >
                  <Camera size={24} /> Open Camera
                </motion.button>
              </motion.div>
            )}

            {stage === "camera_demo" && (
              <motion.div
                key="camera_demo"
                className="p-6 text-center"
                 variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}
              >
                  <p className="text-xl font-semibold mb-4 text-white text-opacity-90">Hello! Smile!</p>
                  <video ref={videoRef} autoPlay playsInline muted className="rounded-lg shadow-lg w-full" />
              </motion.div>
            )}

            {stage === "listen" && (
               <motion.div
                key="listen"
                className="p-8 text-center"
                 variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}
               >
                  <p className="text-xl font-medium mb-2 text-white text-opacity-90 flex items-center justify-center gap-2"><Mic size={24}/> What do you want to be?</p>
                  <p className="text-sm text-white text-opacity-70 mb-4">e.g., "I want to be a doctor"</p>
                  {listening && (
                     <div className="flex justify-center items-center my-4">
                       <motion.div
                         className="bg-red-500 w-8 h-8 rounded-full shadow-lg"
                         animate={{ scale: [1, 1.2, 1]}}
                         transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut"}}
                       />
                       <p className="ml-3 text-red-400 font-semibold">Recording Audio...</p>
                     </div>
                  )}
              </motion.div>
            )}

            {stage === "manual" && (
              <motion.form
                key="manual"
                onSubmit={handleManualSubmit}
                className="p-6 flex flex-col gap-6"
                 variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}
              >
                  <p className="text-center text-white text-opacity-90">Oops! Please type your career.</p>
                  <div className="relative w-full flex items-center border-b-2 border-white border-opacity-30 focus-within:border-purple-400 transition-colors">
                    <User size={20} className="text-white text-opacity-70 mr-3" />
                    <input type="text" placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} className="appearance-none w-full bg-transparent text-white placeholder-white placeholder-opacity-70 py-2 focus:outline-none text-lg" />
                  </div>
                  <div className="relative w-full flex items-center border-b-2 border-white border-opacity-30 focus-within:border-purple-400 transition-colors">
                     <Briefcase size={20} className="text-white text-opacity-70 mr-3" />
                     <input type="text" placeholder="Your dream career" value={career} onChange={(e) => setCareer(e.target.value)} required className="appearance-none w-full bg-transparent text-white placeholder-white placeholder-opacity-70 py-2 focus:outline-none text-lg" />
                  </div>
                  <motion.button
                    type="submit"
                    className="flex items-center justify-center gap-2 w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xl font-semibold py-3 rounded-xl shadow-lg mt-4"
                    whileHover={{ scale: 1.05, boxShadow: "0px 8px 20px rgba(0,0,0,0.3)" }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  >
                    <Send size={20} /> Visualize!
                  </motion.button>
              </motion.form>
            )}

            {stage === "result" && careerImage && (
              <motion.div
                key="result"
                className="p-6 text-center"
                 variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}
              >
                <h2 className="text-3xl font-bold mb-4 text-white text-opacity-90 drop-shadow-md">{careerImage.title}</h2>
                <motion.img
                  src={careerImage.src}
                  alt={careerImage.title}
                  className="rounded-lg shadow-lg w-full h-auto object-cover mb-6"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.2 }}
                />
                <motion.button
                  onClick={goBackToStart}
                  className="flex items-center justify-center gap-2 bg-white bg-opacity-20 text-white px-6 py-2 rounded-lg hover:bg-opacity-30 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play size={18} /> Play Again
                </motion.button>
              </motion.div>
            )}
            
            {stage === "admin_panel" && role === 'admin' && (
              <motion.div
                key="admin_panel"
                className="p-6 text-center"
                variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}
              >
                <h2 className="text-2xl font-bold mb-4 text-white text-opacity-90">Admin Panel</h2>
                <div className="text-left text-white text-opacity-80 bg-black bg-opacity-20 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-2">How to Create New Users</h3>
                  <p className="text-sm">
                    To create a new user, you (Suhail) must contact the developer.
                  </p>
                  <br/>
                  <p className="text-sm">
                    This is a manual process where the developer will add the new user's email and password directly to the server code to ensure security.
                  </p>
                </div>
                <motion.button
                  onClick={goBackToStart}
                  className="flex items-center justify-center gap-2 w-full bg-white bg-opacity-20 text-white px-6 py-3 rounded-lg hover:bg-opacity-30 transition-colors mt-6"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <ArrowLeft size={18} /> Back to App
                </motion.button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// Main App component (handles login state)
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => !!localStorage.getItem('isLoggedIn')
  );
  const [userRole, setUserRole] = useState(
    () => localStorage.getItem('userRole') || null
  );

  const handleLogout = () => {
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userRole');
    setIsLoggedIn(false);
    setUserRole(null);
  };

  const handleLogin = (role) => {
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userRole', role);
    setIsLoggedIn(true);
    setUserRole(role);
  };

  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLogin} />;
  }

  return <CareerVisualizerApp onLogout={handleLogout} role={userRole} />;
}
