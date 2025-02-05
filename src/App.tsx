import React, { useState, useEffect, useRef } from 'react';
import { Heart, TrendingUp, Settings, X } from 'lucide-react';

// @ts-ignore
import { setTwitchWebSocket } from './api/TwitchWebSocket';
// @ts-ignore
import { encrypt } from "./utils/CryptString";

const ICONS: { [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>> } = { Heart, TrendingUp };

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    followerGoal: 2000,
    subscriberGoal: 100,
    themeColor: '#66FF00'
  });
  
  // Subscribe to Twitch WebSocket events with client app data
  const { accessToken, broadcasterId, messages, channelFollowers, channelSubscriptions } = setTwitchWebSocket(import.meta.env.VITE_TWITCH_CLIENT_ID, import.meta.env.VITE_TWITCH_CLIENT_SECRET, window.location.origin);
  const processedEvents = useRef(new Set()); // Store processed event IDs

  // Initialize followers and subscribers state with the value from settings
  const [followers, setFollowers] = useState(channelFollowers);
  const [subscribers, setSubscribers] = useState(channelSubscriptions);
  
  useEffect(() => {
    messages.forEach((event: { type: string; id: string }) => {
      // Skip duplicates
      if (processedEvents.current.has(event.id)) return;

      if (event.type === "follower") { setFollowers((prev: number) => prev + 1); } // Increment followers count
      else if (event.type === "subscriber") { setSubscribers((prev: number) => prev + 1); } // Increment subscribers count

      // Mark event as processed
      processedEvents.current.add(event.id);
    });
  }, [messages]); // Runs every time a new event arrives

  useEffect(() => {
    setFollowers(channelFollowers);
    setSubscribers(channelSubscriptions);
  }, [channelFollowers, channelSubscriptions]);

  const authData = { accessToken, broadcasterId, settings: { followerGoal: settings.followerGoal, subscriberGoal: settings.subscriberGoal, themeColor: settings.themeColor } };

  // Encrypt the string
  const encryptedURLData = encrypt(import.meta.env.VITE_PASSPHRASE, JSON.stringify(authData, null, 2));

  // Get the full URL dynamically and append {sessionID}
  const fullViewerLink = `${window.location.origin}/viewer/${encryptedURLData}`;

  // Copies fullViewerLink URL to clipboard
  const copyURLToClipboard = () => { navigator.clipboard.writeText(fullViewerLink); };

  interface StatItemProps {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
    value: number;
    initialValue: number;
    goal: number;
  }

  const StatItem: React.FC<StatItemProps> = ({ icon: Icon, label, value, initialValue, goal }) => {
    const [prevValue, setPrevValue] = useState(value);
    const numberRef = useRef<HTMLDivElement>(null);
    const difference = value - initialValue;
    const progress = (value / goal) * 100;

    useEffect(() => {
      if (value !== prevValue) {
        if (numberRef.current) {
          numberRef.current.classList.remove('animate-up', 'animate-down');
          // Force reflow
          void numberRef.current.offsetWidth;
          // Add the appropriate animation class based on value change
          numberRef.current.classList.add(value > prevValue ? 'animate-up' : 'animate-down');
        }

        const timer = setTimeout(() => { setPrevValue(value); }, 400);
        return () => clearTimeout(timer);
      }
    }, [value, prevValue]);

    return (
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`p-1 rounded-md transform group-hover:scale-110 transition-all duration-500`} style={{ backgroundColor: `${settings.themeColor}0d` }}>
            <Icon className="w-3 h-3 animate-glow" style={{ color: settings.themeColor, '--theme-color': settings.themeColor } as React.CSSProperties} strokeWidth={1.5} />
          </div>
          <span className="font-medium tracking-wide text-[11px]" style={{ color: settings.themeColor }}>{label}</span>
        </div>
        
        <div className="flex items-baseline gap-2 mb-2 overflow-hidden">
          <div ref={numberRef} className="text-lg font-bold tracking-tight text-white number-scroll">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          
          {difference > 0 && (
            <div className="text-[9px] font-medium tracking-wide transition-all duration-300" style={{ color: `${settings.themeColor}cc` }}>
              +{difference}
            </div>
          )}
        </div>

        <div className="relative w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: `${settings.themeColor}1a` }}>
          <div 
            className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${Math.min(progress, 100)}%`,
              background: `linear-gradient(to right, ${settings.themeColor}, ${settings.themeColor})`
            }}
          />
        </div>
        <div className="flex justify-between items-center mt-1">
          <div className="text-[9px]" style={{ color: `${settings.themeColor}99` }}>
            Goal: {goal.toLocaleString()}
          </div>
          <div className="text-[9px]" style={{ color: `${settings.themeColor}99` }}>
            {Math.round(progress)}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent p-12 font-sans">
      <div className="fixed top-4 right-20 flex justify-center items-center max-w-screen-xl bg-[rgba(31,32,41,0.4)] text-white pl-8 pr-4 py-2 rounded-lg shadow-lg">
          <span className="max-w-3xl overflow-hidden whitespace-nowrap text-ellipsis">
            {fullViewerLink}
          </span>
          <button onClick={copyURLToClipboard}
            className="bg-gray-900/90 hover:bg-gray-800 text-white ml-4 py-3 px-3 rounded-md transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] transform hover:scale-105 backdrop-blur-lg border border-gray-700/30">
            <svg className="w-[18px] h-[18px] dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-6 5h6m-6 4h6M10 3v4h4V3h-4Z"/>
            </svg>
          </button>
        </div>
      {/* Settings Button */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="fixed top-4 right-4 p-2 rounded-lg bg-black bg-opacity-95 hover:bg-opacity-90 transition-all duration-300 backdrop-blur-xl"
        style={{ 
          color: settings.themeColor,
          borderColor: `${settings.themeColor}33`,
          boxShadow: `0 0 0 1px ${settings.themeColor}33`
        }}
      >
        <Settings className="w-5 h-5" />
      </button>

      <div className="relative group max-w-[280px]">
        <div className="absolute -inset-0.5 rounded-lg blur opacity-50 group-hover:opacity-75 transition-all duration-500"
          style={{ 
            background: `linear-gradient(to right, ${settings.themeColor}, ${settings.themeColor}, ${settings.themeColor})`
          }}
        ></div>
        
        <div className="relative bg-black bg-opacity-95 backdrop-blur-xl rounded-lg p-4 transition-all duration-500"
          style={{ 
            borderColor: `${settings.themeColor}33`,
            boxShadow: `0 0 0 1px ${settings.themeColor}33`
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <StatItem 
              icon={ICONS['TrendingUp']} 
              label="Followers" 
              value={followers}
              initialValue={channelFollowers}
              goal={settings.followerGoal}
            />
            <StatItem 
              icon={ICONS['Heart']} 
              label="Subscribers" 
              value={subscribers}
              initialValue={channelSubscriptions}
              goal={settings.subscriberGoal}
            />
          </div>

          <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500"
            style={{ 
              background: `linear-gradient(to bottom right, ${settings.themeColor}0d, transparent, transparent)`
            }}
          ></div>
        </div>
      </div>

      {/* Settings Panel */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-black/95 backdrop-blur-xl p-6 transform transition-all duration-300 ease-in-out ${showSettings ? 'translate-x-0' : 'translate-x-full'} shadow-xl`}
        style={{ 
          borderColor: `${settings.themeColor}33`,
          boxShadow: `0 0 0 1px ${settings.themeColor}33`
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-lg font-semibold">Settings</h2>
          <button
            onClick={() => setShowSettings(false)}
            className="p-1 rounded-full transition-colors hover:bg-white/5"
            style={{ 
              color: settings.themeColor
            }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm text-white/80">Followers Goal</label>
            <input
              type="number"
              value={settings.followerGoal}
              onChange={(e) => setSettings(prev => ({ ...prev, followerGoal: parseInt(e.target.value) || 0 }))}
              className={`w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[${settings.themeColor}]`}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-white/80">Subscribers Goal</label>
            <input
              type="number"
              value={settings.subscriberGoal}
              onChange={(e) => setSettings(prev => ({ ...prev, subscriberGoal: parseInt(e.target.value) || 0 }))}
              className={`w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[${settings.themeColor}]`}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-white/80">Theme Color</label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.themeColor}
                onChange={(e) => setSettings(prev => ({ ...prev, themeColor: e.target.value }))}
                className="w-10 h-10 rounded border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={settings.themeColor}
                onChange={(e) => setSettings(prev => ({ ...prev, themeColor: e.target.value }))}
                className={`flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[${settings.themeColor}]`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;