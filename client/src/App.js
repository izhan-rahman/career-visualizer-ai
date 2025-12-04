import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LoginPage from './LoginPage';
import { Camera, Mic, Play, Send, User, Briefcase, LogOut, ShieldCheck, ArrowLeft, ArrowRight, Sparkles } from 'lucide-react';

// --- Animation Variants ---
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

// "Surprise" Animation for the Image Container
const popInVariant = {
  hidden: { scale: 0, opacity: 0, rotate: -5 },
  visible: { 
    scale: 1, 
    opacity: 1, 
    rotate: 0,
    transition: { 
      type: "spring", 
      stiffness: 260, 
      damping: 20, 
      delay: 0.1 
    }
  }
};

// --- This URL MUST match your local server ---
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

// ---------------------------------

function CareerVisualizerApp({ onLogout, role }) {
  const videoRef = useRef(null);
  
  // --- STATE MANAGEMENT ---
  const [stage, setStage] = useState("start");
  const [name, setName] = useState("");
  const [career, setCareer] = useState("");
  const [careerImage, setCareerImage] = useState(null); 
  const [listening, setListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  const transcriptRef = useRef(""); 
  const recognitionTimeoutRef = useRef(null); 

  // Memoize careerImages
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

  const getCareerData = useCallback((career, studentName) => {
    const key = (career || "").replace(/\s+/g, "").toLowerCase();
    const imagePath = careerImages[key];

    const displayName = studentName || "Student";
    
    if (imagePath) {
      return {
        title: `${displayName} wants to be a ${career}`,
        src: imagePath,
        isKnown: true
      };
    } else {
      return {
        title: `${displayName}, are you confused? Please ask your mentor for guidance.`,
        src: '/images/confused.jpeg',
        isKnown: false
      };
    }
  }, [careerImages]);

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
  }, []);

  const extractNameAndCareer = useCallback((text) => {
    // 1. Clean the text
    const cleanText = text.toLowerCase().replace(/[^a-z0-9\s]/g, "");
    let n = "";
    let c = "";

    // --- 1. CAREER DETECTION ---
    const knownCareers = Object.keys(careerImages);
    
    for (const careerKey of knownCareers) {
        const regex = new RegExp(`\\b${careerKey}\\b`, 'i');
        if (regex.test(cleanText)) {
            c = careerKey; 
            break; 
        }
    }

    if (!c) {
        const unknownCareerRegex = /(?:want to be|become|will be)\s+(?:a|an)\s+([a-z]+)/i;
        const match = cleanText.match(unknownCareerRegex);
        if (match && match[1]) {
            const stopWords = ["doctor", "engineer", "good", "great"]; 
            if (!stopWords.includes(match[1])) {
                c = match[1]; 
            }
        }
    }

    // --- 2. NAME DETECTION ---
    const nameRegex = /(?:my name is|i am|i'm|name is|this is)\s+([a-z]+)/i;
    const match = cleanText.match(nameRegex);
    
    if (match && match[1]) {
        let potentialName = match[1];
        potentialName = potentialName.replace(/my$/, "").replace(/and$/, "");

        const stopWords = ["a", "an", "the", "i", "and", "want", "going", "to", "become", "will", "student"];
        
        if (!stopWords.includes(potentialName) && potentialName.length > 2) {
            n = potentialName;
        }
    }

    n = n ? n.charAt(0).toUpperCase() + n.slice(1) : "";
    
    return { name: n, career: c || null };
  }, [careerImages]);

  const processVoiceCommand = useCallback((transcript) => {
    const { name: dName, career: dCareer } = extractNameAndCareer(transcript);
    
    if (dName) setName(dName);
    if (dCareer) setCareer(dCareer);

    if (dCareer) {
      const finalName = dName || name || "Student";
      const careerData = getCareerData(dCareer, finalName);
      setCareerImage(careerData);
      setStage("result");
      
      if (careerData.isKnown) {
        stableSaveRecord(finalName, dCareer);
      }
    } else {
      setStage("manual");
    }
  }, [extractNameAndCareer, getCareerData, stableSaveRecord, name]);


  const startVoiceRecognition = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported. Please use manual input.");
      setStage("manual");
      return;
    }

    const newRecognition = new SpeechRecognition();
    newRecognition.continuous = true; 
    newRecognition.interimResults = true; 
    newRecognition.lang = 'en-IN'; 

    transcriptRef.current = ""; 

    newRecognition.onstart = () => {
      setListening(true);
      console.log("Speech recognition started...");
      
      // --- STRICT 10 SECOND TIMER ---
      // This forces the mic to stop and goes to fallback if nothing was found
      if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
      
      recognitionTimeoutRef.current = setTimeout(() => {
          console.log("10s Strict Timeout - Force Stop");
          newRecognition.stop(); 
          setListening(false);
          
          // If we haven't found a valid transcript by now, force manual
          if (!transcriptRef.current.trim()) {
             setStage("manual");
          }
      }, 10000); 
    };

    newRecognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const currentFullTranscript = transcriptRef.current + finalTranscript + interimTranscript;
      
      // Early stop check
      const check = extractNameAndCareer(currentFullTranscript);
      if (check.career && check.name) {
          console.log("Found Name and Career! Stopping Early.");
          transcriptRef.current = currentFullTranscript; 
          
          if (recognitionTimeoutRef.current) clearTimeout(recognitionTimeoutRef.current);
          newRecognition.stop(); 
          setListening(false);
          return;
      }
      
      if (finalTranscript) {
          transcriptRef.current += finalTranscript;
      }
    };

    newRecognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
          console.error("Speech Error:", event.error);
          setListening(false);
          clearTimeout(recognitionTimeoutRef.current);
          setStage("manual");
      }
    };

    newRecognition.onend = () => {
      setListening(false);
      clearTimeout(recognitionTimeoutRef.current);
      
      if (transcriptRef.current && transcriptRef.current.trim().length > 0) {
          processVoiceCommand(transcriptRef.current.toLowerCase());
      } else {
          // If the browser stopped on its own (silence) and we have no text, go to manual
          setStage("manual");
      }
    };

    setRecognition(newRecognition);
    newRecognition.start();
    setStage("listen");
  }, [processVoiceCommand, extractNameAndCareer]);

  const speak = useCallback((text) => {
    if (!('speechSynthesis' in window) || !text.trim()) { return; }
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    
    const preferredVoice = voices.find(v => 
        (v.name.includes("Natural") && v.name.includes("English")) || 
        (v.name.includes("Google") && v.name.includes("English")) || 
        (v.lang === 'en-IN' && !v.name.includes("Microsoft")) 
    );

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    utterance.rate = 1.0; 
    utterance.pitch = 1.2; 
    utterance.volume = 1.0; 

    window.speechSynthesis.speak(utterance);
  }, []);

  useEffect(() => {
     window.speechSynthesis.getVoices();
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
          startVoiceRecognition(); 
        }, 3000);
      } catch (error) {
        console.error("Camera access error:", error);
        alert("Could not access camera. Please allow permissions.");
        setStage("start");
      }
    };
    if (stage === 'camera_demo') {
      startCameraAndTimer();
    }
    return () => {
      clearTimeout(timer);
      if (stream) stream.getTracks().forEach(track => track.stop());
      if (recognition && listening) {
        recognition.stop();
      }
      clearTimeout(recognitionTimeoutRef.current);
    };
  }, [stage, startVoiceRecognition, speak, listening, recognition]);

  const goBackToStart = () => {
    window.speechSynthesis.cancel();
    if (recognition && listening) {
      recognition.stop();
    }
    clearTimeout(recognitionTimeoutRef.current);
    setStage("start"); setName(""); setCareer(""); setCareerImage(null);
  };
  
  const handleNextCandidate = () => {
    window.speechSynthesis.cancel();
    setName("");
    setCareer("");
    setCareerImage(null);
    setStage("camera_demo");
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const studentName = name || "Student";
    const studentCareer = career;
    setName(studentName);
    const careerData = getCareerData(studentCareer, studentName);
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
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="rounded-lg shadow-lg w-full" 
                  style={{ transform: 'scaleX(-1)' }} 
                />
              </motion.div>
            )}

            {stage === "listen" && (
               <motion.div
                key="listen"
                className="p-8 text-center"
                variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}
               >
                 <p className="text-xl font-medium mb-2 text-white text-opacity-90 flex items-center justify-center gap-2"><Mic size={24}/> What do you want to be?</p>
                 <p className="text-sm text-white text-opacity-70 mb-4">e.g., "My name is John and I want to be a doctor"</p>
                 {listening && (
                    <div className="flex justify-center items-center my-4">
                        <motion.div
                          className="bg-red-500 w-8 h-8 rounded-full shadow-lg"
                          animate={{ scale: [1, 1.2, 1]}}
                          transition={{ duration: 0.8, repeat: Infinity, ease: "easeInOut"}}
                        />
                        <p className="ml-3 text-red-400 font-semibold">Listening...</p>
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
                  <input required type="text" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="appearance-none w-full bg-transparent text-white placeholder-white placeholder-opacity-70 py-2 focus:outline-none text-lg" />
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
                className="p-6 text-center flex flex-col items-center"
                variants={pageVariants} initial="initial" animate="in" exit="out" transition={pageTransition}
              >
                <h2 className="text-3xl font-bold mb-4 text-white text-opacity-90 drop-shadow-md">
                   {careerImage.title}
                </h2>
                
                {/* --- FIX 2: Fixed Square Container + Object Contain + Padding --- */}
                <motion.div
                   variants={popInVariant}
                   initial="hidden"
                   animate="visible"
                   className="relative w-64 h-64 mb-6" 
                >
                    <motion.div 
                       className="absolute -top-6 -right-6 text-yellow-400 z-10"
                       animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                       transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Sparkles size={40} fill="currentColor" />
                    </motion.div>

                    <motion.div 
                       className="absolute -bottom-6 -left-6 text-yellow-300 z-10"
                       animate={{ rotate: -360, scale: [1, 1.3, 1] }}
                       transition={{ duration: 2.5, repeat: Infinity }}
                    >
                      <Sparkles size={35} fill="currentColor" />
                    </motion.div>

                    {/* Image sits inside the box (contain) with padding so it's small & whole */}
                    <motion.img
                      src={careerImage.src}
                      alt={careerImage.title}
                      className="w-full h-full object-contain p-4 rounded-lg shadow-lg border-4 border-white bg-white/5"
                    />
                </motion.div>

                <div className="flex gap-4 w-full">
                    <motion.button
                      onClick={goBackToStart}
                      className="flex-1 flex items-center justify-center gap-2 bg-white bg-opacity-20 text-white px-4 py-3 rounded-xl hover:bg-opacity-30 transition-colors font-semibold"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Play size={18} /> Play Again
                    </motion.button>
                    <motion.button
                      onClick={handleNextCandidate}
                      className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-700 transition-colors font-semibold"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      Next Candidate <ArrowRight size={18} />
                    </motion.button>
                </div>
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
