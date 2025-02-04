import { useEffect, useRef, useState } from "react";

function useTwitchWebSocket(clientID, clientSecret, redirectURI) {
    const [messages, setMessages] = useState([]);
    const [accessToken, setAccessToken] = useState("");
    const [broadcasterId, setBroadcasterId] = useState(null);

    // Store WebSocket reference
    const wsRef = useRef(null);

    useEffect(() => {
        async function fetchOAuthAccToken() {
            try {
                // Parse the URL parameters to extract the code
                const urlParams = new URLSearchParams(window.location.search);
                const authorizationCode = urlParams.get('code');

                if (!accessToken) {
                    if (!authorizationCode) {
                        // If theres no access token and code, redirect to Twitch login page for authorization
                        const SCOPES = ["channel:read:subscriptions", "moderator:read:followers"]; // Scopes for the required permissions

                        // Construct the Twitch OAuth authorization URL with required parameters
                        window.location.href = `https://id.twitch.tv/oauth2/authorize?client_id=${clientID}&redirect_uri=${encodeURIComponent(redirectURI)}&response_type=code&scope=${SCOPES.join(" ")}`;
                        return;
                    } else {
                        // Twitch API details
                        const TOKEN_URL = "https://id.twitch.tv/oauth2/token";

                        // If authorization code is present, exchange it for an access token
                        const response = await fetch(TOKEN_URL, {
                            method: "POST",
                            headers: { "Content-Type": "application/x-www-form-urlencoded" },
                            body: new URLSearchParams({
                                client_id: clientID,
                                client_secret: clientSecret,
                                code: authorizationCode, // Use the code received from the URL
                                grant_type: "authorization_code",
                                redirect_uri: redirectURI
                            })
                        });

                        const data = await response.json();

                        if (data.access_token) {
                            // Save the access token and proceed
                            setAccessToken(data.access_token);
                            
                            // Validate the token
                            const VALIDATE_TOKEN_URL = "https://id.twitch.tv/oauth2/validate";
                            const responseToken = await fetch(VALIDATE_TOKEN_URL, {
                                method: "GET",
                                headers: { "Authorization": `Bearer ${data.access_token}` } // Use the access token for validation
                            });

                            // Check if the token validation request was successful
                            if (responseToken.ok) {
                                const tokenData = await responseToken.json();
                                setBroadcasterId(tokenData.user_id); // Set the broadcaster ID from the validated token data
                            } else {                                
                                // Log the error if token validation fails
                                const errorData = await responseToken.json();
                                console.error("Token Validation: ", responseToken.status, errorData);
                            }
                        } else {
                            console.error("Failed to obtain access token: ", data);
                        }
                    }
                }
            } catch (error) {
                console.error("Error fetching Twitch token: ", error);
            }
        }

        fetchOAuthAccToken();
    }, [clientID, clientSecret, redirectURI]);

    useEffect(() => {
        // Prevent multiple connections
        if (wsRef.current || broadcasterId === null) return;

        function connectWebSocket() {
            // WebSocket settings
            const KEEPALIVE_TIMEOUT = 600;
            const TWITCH_WS_URL = `wss://eventsub.wss.twitch.tv/ws?keepalive_timeout_seconds=${KEEPALIVE_TIMEOUT}`;
            
            // Create WebSocket connection
            wsRef.current = new WebSocket(TWITCH_WS_URL);

            // Handle incoming messages 
            wsRef.current.onmessage = (event) => {                
                const data = JSON.parse(event.data);

                // Check if the message type is a session welcome event
                if (data.metadata?.message_type === "session_welcome") {
                    // Subscribe to events using the session ID from the payload
                    subToEvents(data.payload.session.id);
                } else if (data.metadata?.message_type === "notification") {
                    // Handle incoming event notifications and update messages state
                    setMessages((prev) => [...prev, decodeTwitchEvent(data.payload)]);
                }
            };

            // Handle WebSocket errors
            wsRef.current.onerror = (error) => { console.error("WebSocket Error: ", error); };

            // Reconnect on WebSocket closure
            wsRef.current.onclose = (event) => {
                console.warn("WebSocket Closed. Reconnecting in 5s...", event);
                wsRef.current = null;
                setTimeout(() => {
                    // Reconnect only if it's fully closed
                    if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) { connectWebSocket(); }
                }, 5000);
            };
        }
        
        async function subToEvents(sessionId) {
            // Twitch API URL for subscribing to EventSub events
            const SUBSCRIBE_URL = "https://api.twitch.tv/helix/eventsub/subscriptions";

            const eventTypes = [
                { type: "channel.subscribe", version: "1", condition: { broadcaster_user_id: broadcasterId } }, // Subscription event (when a user subscribes)
                { type: "channel.follow", version: "2", condition: { broadcaster_user_id: broadcasterId, moderator_user_id: broadcasterId } } // Follow event (when a user follows)
            ];

            // Loop through each event type and send a subscription request
            for (const event of eventTypes) {
                try {
                    const response = await fetch(SUBSCRIBE_URL, {
                        method: "POST",
                        headers: {
                            "Client-ID": clientID,
                            "Authorization": `Bearer ${accessToken}`, // OAuth token for authentication
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            type: event.type,
                            version: event.version,
                            condition: event.condition,
                            transport: { method: "websocket", session_id: sessionId }
                        })
                    });

                    const result = await response.json();

                    if (response.status !== 202) {
                        console.error("Subscription failed: ", response.status, result);
                    }
                } catch (error) {
                    console.error("Error subscribing to events: ", error);
                }
            }
        }

        connectWebSocket();

        // Cleanup function to close the WebSocket connection when the component unmounts
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [broadcasterId, accessToken]);

    return messages;
}

export default useTwitchWebSocket;

// Decode Twitch events
function decodeTwitchEvent(payload) {
    if (payload.subscription?.type.includes("channel.subscribe")) { return { type: "subscriber", id: payload.event.user_id }; }
    if (payload.subscription?.type.includes("channel.follow")) { return { type: "follower", id: payload.event.user_id }; }
    return null;
}