import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Users, UserPlus, BadgeCheck, BadgePlus, Settings, X } from 'lucide-react';
import { Trans, useTranslation } from 'react-i18next';

// @ts-ignore
import { setTwitchWebSocket } from './api/TwitchWebSocket';
// @ts-ignore
import { encrypt } from "./utils/CryptString";
import AnimatedBorderTrail from './components/animated-border-trail';
import SlotCounter from 'react-slot-counter';

// Mapping icon names
const ICONS: { [key: string]: React.ComponentType<React.SVGProps<SVGSVGElement>> } = { Users, UserPlus, BadgeCheck, BadgePlus };

function App() {
  const { t, i18n } = useTranslation();

  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    lang: "en",
    showFollowers: true,
    showSubscribers: true,
    showLatests: false,
    followerGoal: 1000,
    subscriberGoal: 50,
    themeColor: '#66FF00',
    backgroundColor: '#121212'
  });
  
  // Set and subscribe to Twitch WebSocket events with client app data
  const { refreshToken, broadcasterId, messages, channelFollowers, channelSubscriptions } = setTwitchWebSocket(
    import.meta.env.VITE_TWITCH_CLIENT_ID, 
    import.meta.env.VITE_TWITCH_CLIENT_SECRET, 
    window.location.origin
  );

  // Store processed event IDs
  const processedEvents = useRef(new Set());

  // Initialize followers and subscribers states with values from websocket data
  const [initialFollowers, setInitialFollowers] = useState(() => channelFollowers ?? 0);
  const [initialSubscribers, setInitialSubscribers] = useState(() => channelSubscriptions ?? 0);

  const [followers, setFollowers] = useState(() => channelFollowers ?? 0);
  const [subscribers, setSubscribers] = useState(() => channelSubscriptions ?? 0);

  const [lastFollower, setLastFollower] = useState('');
  const [lastSubscriber, setLastSubscriber] = useState('');

  useEffect(() => {
    if (!initialFollowers) setInitialFollowers(channelFollowers ?? 0);
    if (!initialSubscribers) setInitialSubscribers(channelSubscriptions ?? 0);
    setFollowers(channelFollowers ?? 0);
    setSubscribers(channelSubscriptions ?? 0);
  }, [channelFollowers, channelSubscriptions]);
  
  useEffect(() => {
    messages.forEach((event: { type: string; id: string, name: string }) => {
      // Skip duplicates
      if (processedEvents.current.has(event.id)) return;

      if (event.type === "follower") { 
        // Update the last follower name when an event occurs
        setLastFollower(event.name);

        // Increment followers count
        setFollowers((prev: number) => prev + 1);
      }

      else if (event.type === "subscriber") { 
        // Update the last subscriber name when an event occurs
        setLastSubscriber(event.name);

        // Increment subscribers count
        setSubscribers((prev: number) => prev + 1);
      }

      // Mark event as processed
      processedEvents.current.add(event.id);
    });
  }, [messages]); // Runs every time a new event arrives

  const authData = { refreshToken, broadcasterId, settings: { 
    lang: settings.lang, 
    showFollowers: settings.showFollowers, 
    showSubscribers: settings.showSubscribers, 
    showLatests: settings.showLatests,
    followerGoal: settings.followerGoal, 
    subscriberGoal: settings.subscriberGoal, 
    themeColor: settings.themeColor, 
    backgroundColor: settings.backgroundColor 
  } };
  
  // Encrypt the authentication data array
  const encryptedData = encrypt(import.meta.env.VITE_PASSPHRASE, JSON.stringify(authData, null, 2));

  // Get the full URL dynamically
  const viewerLink = `${window.location.origin}/viewer/${encryptedData}`;

  // Copies URL to clipboard
  const copyURLToClipboard = () => { navigator.clipboard.writeText(viewerLink); };

  // Updates the i18n language and stores the selected language in state
  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    setSettings(prev => ({ ...prev, lang }));
  };

  interface StatItemProps {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    altIcon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    label: string;
    value: number;
    initialValue: number;
    goal: number;
    altValue: string;
  }

  const StatItem: React.FC<StatItemProps> = ({ icon: Icon, altIcon: AltIcon, label, value, initialValue, goal, altValue }) => {
    const [prevValue, setPrevValue] = useState(value);
    const difference = value - initialValue;
    const progress = (value / goal) * 100;

    useEffect(() => {
      if (value !== prevValue) {
        const timer = setTimeout(() => { setPrevValue(value); }, 100);
        return () => clearTimeout(timer);
      }
    }, [value, prevValue]);

    return (
      <div className="flex-auto">
        <div className="flex items-center gap-1.5 mb-1">
          <div className={`p-1 rounded-md transform group-hover:scale-110 transition-all duration-500`} style={{ backgroundColor: `${settings.themeColor}0d` }}>
            <Icon className="w-3 h-3 animate-glow" style={{ color: settings.themeColor, '--theme-color': settings.themeColor } as React.CSSProperties} strokeWidth={2} />
          </div>
          <span className="font-medium tracking-wide text-[11px]" style={{ color: settings.themeColor }}>{label}</span>
        </div>
        <div className="flex items-baseline gap-2 mb-2 overflow-hidden">
          <div className="text-lg font-bold tracking-tight text-white number-scroll drop-shadow-lg">
            <SlotCounter startValue={initialValue} value={value} sequentialAnimationMode direction="bottom-up" autoAnimationStart={true}/>
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
            <Trans t={t} i18nKey="goal" components={[<code key={0} />]} />: {goal.toLocaleString()}
          </div>
          <div className="text-[9px]" style={{ color: `${settings.themeColor}99` }}>
            {Math.round(progress)}%
          </div>
        </div>
        {settings.showLatests && altValue && (
          <div className="flex justify-start items-center gap-1 mt-2 pt-1 border-t-2" style={{ borderColor: `${settings.themeColor}0d` }}>
            <div className={`p-1 rounded-md transform group-hover:scale-110 transition-all duration-500`} style={{ backgroundColor: `${settings.themeColor}0d` }}>
              <AltIcon className="w-3 h-3 animate-glow" style={{ color: settings.themeColor, '--theme-color': settings.themeColor } as React.CSSProperties} strokeWidth={1} />
            </div>
            <span className="font-bold tracking-wide text-[9px]" style={{ color: settings.themeColor }}>{altValue}</span>
          </div>
        )}
      </div>
    );
  };

  // Memoize the followers stat component
  const memoFollowersStat = useMemo(() => (
    <StatItem
      icon={ICONS['Users']}
      altIcon={ICONS['UserPlus']}
      label={t('followers')}
      value={followers}
      initialValue={initialFollowers}
      goal={settings.followerGoal}
      altValue={lastFollower} />
  ), [followers, initialFollowers, settings]);

  // Memoize the subscribers stat component
  const memoSubscribersStat = useMemo(() => (
    <StatItem
      icon={ICONS['BadgeCheck']}
      altIcon={ICONS['BadgePlus']}
      label={t('subscribers')}
      value={subscribers}
      initialValue={initialSubscribers}
      goal={settings.subscriberGoal}
      altValue={lastSubscriber} />
  ), [subscribers, initialSubscribers, settings]);

  return (
    <div className="min-h-screen bg-transparent p-12 font-sans">
      <div className="fixed top-6 right-6 flex gap-4 pointer-events-auto z-5">
        <div className="flex justify-center items-center w-full">
          {/* Viewer Link */}
          <div className="flex justify-center items-center max-w-screen-xl bg-[rgba(31,32,41,0.4)] text-white pl-8 pr-4 py-2 rounded-lg shadow-lg">
            <span className="max-w-3xl overflow-hidden whitespace-nowrap text-ellipsis">
              {viewerLink}
            </span>
            <button onClick={copyURLToClipboard}
              className="bg-gray-900/90 hover:bg-gray-800 text-white ml-4 py-3 px-3 rounded-md transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] transform hover:scale-105 backdrop-blur-lg border border-gray-700/30">
              <svg className="w-[18px] h-[18px] dark:text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.6" d="M15 4h3a1 1 0 0 1 1 1v15a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h3m0 3h6m-6 5h6m-6 4h6M10 3v4h4V3h-4Z"/>
              </svg>
            </button>
          </div>
        </div>
        {/* Settings Button */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="bg-gray-900/90 hover:bg-gray-800 text-white rounded-2xl p-4 transition-all duration-300 shadow-[0_0_15px_rgba(0,0,0,0.2)] hover:shadow-[0_0_20px_rgba(0,0,0,0.3)] transform hover:scale-105 backdrop-blur-lg border border-gray-700/30">
          <Settings size={24} className="transform hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>
      <div className="relative group max-w-[280px]">
        <AnimatedBorderTrail trailSize="lg" trailColor={`${settings.themeColor}`} className='w-full'>
          <div className="relative bg-opacity-95 backdrop-blur-xl rounded-md p-4 transition-all duration-500"
            style={{ 
              backgroundColor: `${settings.backgroundColor}`,
              boxShadow: `0 0 0 1px ${settings.themeColor}`
            }}>
            <div className='flex space-x-4'>
              {settings.showFollowers && memoFollowersStat}
              {settings.showSubscribers && memoSubscribersStat}
            </div>
            <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500"
              style={{ 
                background: `linear-gradient(to bottom right, ${settings.themeColor}0d, transparent, transparent)`
              }}
            ></div>
          </div>
        </AnimatedBorderTrail>
      </div>
      {/* Settings Panel */}
      <div className={`fixed inset-y-0 right-0 w-80 bg-gray-900/90 backdrop-blur-xl p-6 transform transition-all duration-300 ease-in-out ${showSettings ? 'translate-x-0' : 'translate-x-full'} shadow-3xl`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-lg font-semibold"><Trans t={t} i18nKey="settings" components={[<code key={0} />]} /></h2>
          <button
            onClick={() => setShowSettings(false)}
            className="p-1 rounded-full transition-colors text-white hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm text-white/80">
              <Trans t={t} i18nKey="language" components={[<code key={0} />]} />
            </label>
            <select
              value={settings.lang}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-[settings.themeColor]">
              <option value="en">EN</option>
              <option value="pt">PT</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-white/80">
              <input
                type="checkbox"
                checked={settings.showFollowers}
                onChange={(e) => setSettings(prev => ({ ...prev, showFollowers: e.target.checked }))}
                className="w-5 h-5 rounded border border-white/10 bg-black/50 cursor-pointer"/>
              <span><Trans t={t} i18nKey="showFollowers" components={[<code key={0} />]} /></span>
            </label>
          </div>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-white/80">
              <input
                type="checkbox"
                checked={settings.showSubscribers}
                onChange={(e) => setSettings(prev => ({ ...prev, showSubscribers: e.target.checked }))}
                className="w-5 h-5 rounded border border-white/10 bg-black/50 cursor-pointer"/>
              <span><Trans t={t} i18nKey="showSubscribers" components={[<code key={0} />]} /></span>
            </label>
          </div>
          <div className="space-y-2">
            <label className="flex items-center space-x-2 text-white/80">
              <input
                type="checkbox"
                checked={settings.showLatests}
                onChange={(e) => setSettings(prev => ({ ...prev, showLatests: e.target.checked }))}
                className="w-5 h-5 rounded border border-white/10 bg-black/50 cursor-pointer"/>
              <span><Trans t={t} i18nKey="showLatests" components={[<code key={0} />]} /></span>
            </label>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-white/80"><Trans t={t} i18nKey="followersGoal" components={[<code key={0} />]} /></label>
            <input
              type="number"
              value={settings.followerGoal}
              onChange={(e) => setSettings(prev => ({ ...prev, followerGoal: parseInt(e.target.value) || 0 }))}
              className={`w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[${settings.themeColor}]`}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-white/80"><Trans t={t} i18nKey="subscribersGoal" components={[<code key={0} />]} /></label>
            <input
              type="number"
              value={settings.subscriberGoal}
              onChange={(e) => setSettings(prev => ({ ...prev, subscriberGoal: parseInt(e.target.value) || 0 }))}
              className={`w-full bg-black/50 border border-white/10 rounded px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-[${settings.themeColor}]`}
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-white/80"><Trans t={t} i18nKey="themeColor" components={[<code key={0} />]} /></label>
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
          <div className="space-y-2">
            <label className="block text-sm text-white/80"><Trans t={t} i18nKey="backgroundColor" components={[<code key={0} />]} /></label>
            <div className="flex gap-2">
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => setSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                className="w-10 h-10 rounded border border-white/10 bg-transparent cursor-pointer"
              />
              <input
                type="text"
                value={settings.backgroundColor}
                onChange={(e) => setSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
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