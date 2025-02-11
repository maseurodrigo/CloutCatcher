import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Heart, TrendingUp } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

// @ts-ignore
import { decrypt } from "./utils/CryptString";
// @ts-ignore
import { useTwitchWebSocket } from './api/TwitchWebSocket';
import AnimatedBorderTrail from './components/animated-border-trail';

// Mapping icon names
const ICONS: { [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>> } = { Heart, TrendingUp };

function Viewer() {
  const { t, i18n } = useTranslation();

  // Retrieve encrypted data from the URL
  const { encryptedData } = useParams();

  // Base structure of the data
  const [widgetConfig, setWidgetConfig] = useState({
    refreshToken: '',
    broadcasterId: 0,
    settings: {
      lang: "en",
      showFollowers: true,
      showSubscribers: true,
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
        refreshToken: urlJsonData.refreshToken,
        broadcasterId: urlJsonData.broadcasterId,
        settings: {
          lang: urlJsonData.settings.lang, 
          showFollowers: urlJsonData.settings.showFollowers, 
          showSubscribers: urlJsonData.settings.showSubscribers, 
          followerGoal: urlJsonData.settings.followerGoal,
          subscriberGoal: urlJsonData.settings.subscriberGoal,
          themeColor: urlJsonData.settings.themeColor,
          backgroundColor: urlJsonData.settings.backgroundColor
        }
      });

      // Updates the i18n language
      i18n.changeLanguage(urlJsonData.settings.lang);
    }
  }, [encryptedData]); // Re-run the effect if the encrypted data changes

  // Subscribe to Twitch WebSocket events with client app data
  const { messages, channelFollowers, channelSubscriptions } = useTwitchWebSocket(
    import.meta.env.VITE_TWITCH_CLIENT_ID, 
    import.meta.env.VITE_TWITCH_CLIENT_SECRET, 
    widgetConfig.refreshToken, 
    widgetConfig.broadcasterId
  );
  const processedEvents = useRef(new Set()); // Store processed event IDs

  // Initialize followers and subscribers state with values from websocket data
  const [initialFollowers, setInitialFollowers] = useState(() => channelFollowers ?? 0);
  const [initialSubscribers, setInitialSubscribers] = useState(() => channelSubscriptions ?? 0);

  const [followers, setFollowers] = useState(() => channelFollowers ?? 0);
  const [subscribers, setSubscribers] = useState(() => channelSubscriptions ?? 0);
  
  useEffect(() => {
    if (!initialFollowers) setInitialFollowers(channelFollowers ?? 0);
    if (!initialSubscribers) setInitialSubscribers(channelSubscriptions ?? 0);
    setFollowers(channelFollowers ?? 0);
    setSubscribers(channelSubscriptions ?? 0);
  }, [channelFollowers, channelSubscriptions]);

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
      <div className="flex-auto">
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
            <Trans t={t} i18nKey="goal" components={[<code key={0} />]} />: {(goal ?? 0).toLocaleString()}
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
        <AnimatedBorderTrail trailSize="lg" trailColor={`${widgetConfig.settings.themeColor}`} className='w-full'>
          <div className="relative bg-opacity-95 backdrop-blur-xl rounded-md p-4 transition-all duration-500"
            style={{ 
              backgroundColor: `${widgetConfig.settings.backgroundColor}`,
              boxShadow: `0 0 0 1px ${widgetConfig.settings.themeColor}`
            }}>
            <div className='flex space-x-4'>
              {widgetConfig.settings.showFollowers && (
                <StatItem 
                  icon={ICONS['TrendingUp']} 
                  label={t('followers')} 
                  value={followers}
                  initialValue={initialFollowers}
                  goal={widgetConfig.settings.followerGoal}/>
              )}
              {widgetConfig.settings.showSubscribers && (
                <StatItem 
                  icon={ICONS['Heart']} 
                  label={t('subscribers')} 
                  value={subscribers}
                  initialValue={initialSubscribers}
                  goal={widgetConfig.settings.subscriberGoal}/>
              )}
            </div>
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500"
              style={{ background: `linear-gradient(to bottom right, ${widgetConfig.settings.themeColor}0d, transparent, transparent)` }}>
            </div>
          </div>
        </AnimatedBorderTrail>
      </div>
    </div>
  );
}

export default Viewer;