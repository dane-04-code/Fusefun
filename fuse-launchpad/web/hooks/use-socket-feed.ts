import { useEffect, useState, useRef } from 'react';

interface TradeUpdate {
    type: 'buy' | 'sell' | 'create';
    mint: string;
    price: number;
    solAmount: number;
    tokenAmount: number;
    user: string;
    timestamp: number;
    signature: string;
    creatorPot?: number;
}

interface SocketFeedState {
    lastTrade: TradeUpdate | null;
    creatorPot: number;
    isConnected: boolean;
}

export const useSocketFeed = (): SocketFeedState => {
    const [lastTrade, setLastTrade] = useState<TradeUpdate | null>(null);
    const [creatorPot, setCreatorPot] = useState<number>(0);
    const [isConnected, setIsConnected] = useState(false);
    const ws = useRef<WebSocket | null>(null);

    useEffect(() => {
        // Determine WebSocket URL based on API URL
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
        const wsUrl = apiUrl.replace(/^http/, 'ws');
        
        const connect = () => {
            try {
                ws.current = new WebSocket(wsUrl);

                ws.current.onopen = () => {
                    console.log('Connected to FUSE.FUN WebSocket');
                    setIsConnected(true);
                };

                ws.current.onclose = () => {
                    console.log('Disconnected from FUSE.FUN WebSocket');
                    setIsConnected(false);
                    // Attempt reconnect after 3 seconds
                    setTimeout(connect, 3000);
                };

                ws.current.onerror = (error) => {
                    console.error('WebSocket error:', error);
                };

                ws.current.onmessage = (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        
                        // Handle trade updates
                        if (message.type === 'trade_update' || message.type === 'new_trade') {
                            setLastTrade(message.data);
                            if (message.data.creatorPot) {
                                setCreatorPot(message.data.creatorPot);
                            }
                        }
                        
                        // Handle other event types if needed
                    } catch (e) {
                        console.error('Error parsing WS message', e);
                    }
                };
            } catch (e) {
                console.error('WebSocket connection failed', e);
            }
        };

        connect();

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    return { lastTrade, creatorPot, isConnected };
};
