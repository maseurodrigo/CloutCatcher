import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, TrendingUp } from 'lucide-react';

// @ts-ignore
import { decrypt } from "./utils/CryptString";
// @ts-ignore
import { useTwitchWebSocket } from './api/TwitchWebSocket';

// Mapping icon names
const ICONS: { [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>> } = { Heart, TrendingUp };

function Viewer() {
  // Retrieve encrypted data from the URL
  const { encryptedData } = useParams();

  // Base structure of the data
  const [widgetConfig, setWidgetConfig] = useState({
    accessToken: '',
    broadcasterId: 0,
    settings: {
      followerGoal: 0,
      subscriberGoal: 0,
      themeColor: '',
      backgroundColor: ''
    }
  });
  
  useEffect(() => {
    if (!encryptedData) return; // Wait until the encrypted data is available

    // Decrypt the authentication data array
    const decryptedURLData = decrypt(import.meta.env.VITE_PASSPHRASE, encryptedData);

    // Check if decryption were successful
    if(decryptedURLData) {
      // Parse decrypted data into JSON
      const urlJsonData = JSON.parse(decryptedURLData);

      // Convert query parameters to the proper data structure
      setWidgetConfig({
        accessToken: urlJsonData.accessToken,
        broadcasterId: urlJsonData.broadcasterId,
        settings: {
          followerGoal: urlJsonData.settings.followerGoal,
          subscriberGoal: urlJsonData.settings.subscriberGoal,
          themeColor: urlJsonData.settings.themeColor,
          backgroundColor: urlJsonData.settings.backgroundColor
        }
      });
    }
  }, [encryptedData]); // Re-run the effect if the encrypted data changes

  // Subscribe to Twitch WebSocket events with client app data
  const { messages, channelFollowers, channelSubscriptions } = useTwitchWebSocket(import.meta.env.VITE_TWITCH_CLIENT_ID, widgetConfig.accessToken, widgetConfig.broadcasterId);
  const processedEvents = useRef(new Set()); // Store processed event IDs

  // Initialize followers and subscribers state with values from websocket data
  const [followers, setFollowers] = useState(channelFollowers ?? 0);
  const [subscribers, setSubscribers] = useState(channelSubscriptions ?? 0);
  
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
          <div className={`p-1 rounded-md transform group-hover:scale-110 transition-all duration-500`} style={{ backgroundColor: `${widgetConfig.settings.themeColor}0d` }}>
            <Icon className="w-3 h-3 animate-glow" style={{ color: widgetConfig.settings.themeColor, '--theme-color': widgetConfig.settings.themeColor } as React.CSSProperties} strokeWidth={1.5} />
          </div>
          <span className="font-medium tracking-wide text-[11px]" style={{ color: widgetConfig.settings.themeColor }}>{label}</span>
        </div>
        <div className="flex items-baseline gap-2 mb-2 overflow-hidden">
          <div ref={numberRef} className="text-lg font-bold tracking-tight text-white number-scroll drop-shadow-lg">
            {typeof value === 'number' ? (value ?? 0).toLocaleString() : value}
          </div>
          {difference > 0 && (
            <div className="text-[9px] font-medium tracking-wide transition-all duration-300" style={{ color: `${widgetConfig.settings.themeColor}cc` }}>
              +{difference}
            </div>
          )}
        </div>
        <div className="relative w-full h-1 rounded-full overflow-hidden" style={{ backgroundColor: `${widgetConfig.settings.themeColor}1a` }}>
          <div 
            className="absolute top-0 left-0 h-full transition-all duration-1000 ease-out"
            style={{ 
              width: `${Math.min(progress, 100)}%`,
              background: `linear-gradient(to right, ${widgetConfig.settings.themeColor}, ${widgetConfig.settings.themeColor})`
            }}
          />
        </div>
        <div className="flex justify-between items-center mt-1">
          <div className="text-[9px]" style={{ color: `${widgetConfig.settings.themeColor}99` }}>
            Goal: {(goal ?? 0).toLocaleString()}
          </div>
          <div className="text-[9px]" style={{ color: `${widgetConfig.settings.themeColor}99` }}>
            {Math.round(progress)}%
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-transparent p-12 font-sans">
      <div className="relative group max-w-[280px]">
        <div className="absolute inset-0.5 rounded-lg blur opacity-50 group-hover:opacity-75 transition-all duration-500"
          style={{ 
            background: `linear-gradient(to right, ${widgetConfig.settings.themeColor}, ${widgetConfig.settings.themeColor}, ${widgetConfig.settings.themeColor})`
          }}></div>
        <div className="relative bg-opacity-95 backdrop-blur-xl rounded-lg p-4 transition-all duration-500"
          style={{ 
            backgroundColor: `${widgetConfig.settings.backgroundColor}`,
            borderColor: `${widgetConfig.settings.themeColor}`,
            boxShadow: `0 0 0 1px ${widgetConfig.settings.themeColor}`
          }}>
          <div className="grid grid-cols-2 gap-4">
            <StatItem 
              icon={ICONS['TrendingUp']} 
              label="Followers" 
              value={followers}
              initialValue={channelFollowers ?? 0}
              goal={widgetConfig.settings.followerGoal}/>
            <StatItem 
              icon={ICONS['Heart']} 
              label="Subscribers" 
              value={subscribers}
              initialValue={channelSubscriptions ?? 0}
              goal={widgetConfig.settings.subscriberGoal}/>
          </div>
          <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500"
            style={{ background: `linear-gradient(to bottom right, ${widgetConfig.settings.themeColor}0d, transparent, transparent)` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

export default Viewer;