import React, { useState, useEffect, useRef } from 'react';
import { Heart, TrendingUp, Settings, X } from 'lucide-react';

// @ts-ignore
import useTwitchWebSocket from './api/TwitchWebSocket';

const ICONS: { [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>> } = { Heart, TrendingUp };

function App() {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    followers: 1337,
    subscribers: 42,
    followerGoal: 2000,
    subscriberGoal: 100,
    themeColor: '#66FF00'
  });

  // Subscribe to Twitch WebSocket events with client app data
  const events = useTwitchWebSocket(import.meta.env.VITE_TWITCH_CLIENT_ID, import.meta.env.VITE_TWITCH_CLIENT_SECRET, window.location.origin);
  const processedEvents = useRef(new Set()); // Store processed event IDs

  // Initialize followers and subscribers state with the value from settings
  const [followers, setFollowers] = useState(settings.followers);
  const [subscribers, setSubscribers] = useState(settings.subscribers);

  useEffect(() => {
    events.forEach((event: { type: string; id: string }) => {
      // Skip duplicates
      if (processedEvents.current.has(event.id)) return;

      if (event.type === "follower") { setFollowers(prev => prev + 1); } // Increment followers count
      else if (event.type === "subscriber") { setSubscribers(prev => prev + 1); } // Increment subscribers count

      // Mark event as processed
      processedEvents.current.add(event.id);
    });
  }, [events]); // Runs every time a new event arrives

  useEffect(() => {
    setFollowers(settings.followers);
    setSubscribers(settings.subscribers);
  }, [settings.followers, settings.subscribers]);

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

        const timer = setTimeout(() => {
          setPrevValue(value);
        }, 400);
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
              initialValue={settings.followers}
              goal={settings.followerGoal}
            />
            <StatItem 
              icon={ICONS['Heart']} 
              label="Subscribers" 
              value={subscribers}
              initialValue={settings.subscribers}
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
            <label className="block text-sm text-white/80">Initial Followers</label>
            <input
              type="number"
              value={settings.followers}
              onChange={(e) => setSettings(prev => ({ ...prev, followers: parseInt(e.target.value) || 0 }))}
              className={`w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[${settings.themeColor}]`}
            />
          </div>

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
            <label className="block text-sm text-white/80">Initial Subscribers</label>
            <input
              type="number"
              value={settings.subscribers}
              onChange={(e) => setSettings(prev => ({ ...prev, subscribers: parseInt(e.target.value) || 0 }))}
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

      {/* Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute w-full h-full animate-pulse"
          style={{ background: `radial-gradient(circle at center, ${settings.themeColor}1a, transparent 70%)` }}
        ></div>
        {[...Array(40)].map((_, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: Math.random() * 2 + 'px',
              height: Math.random() * 2 + 'px',
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animation: `floatParticle ${Math.random() * 15 + 10}s infinite`,
              opacity: Math.random() * 0.3,
              filter: 'blur(1px)',
              backgroundColor: settings.themeColor
            }}
          ></div>
        ))}
      </div>
    </div>
  );
}

export default App;