import React, { useState, useEffect } from 'react';
import { 
    StyleSheet, 
    View, 
    Text, 
    ScrollView, 
    TextInput, 
    TouchableOpacity, 
    FlatList,
    ActivityIndicator,
    LogBox
} from 'react-native';

// --- Firebase Imports ---
import { initializeApp } from 'firebase/app';
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    addDoc, 
    onSnapshot, 
    collection, 
    query, 
    orderBy,
    setLogLevel
} from 'firebase/firestore';

// Hides non-critical warnings related to Firebase/React Native interaction
LogBox.ignoreLogs(['Setting a timer']);
setLogLevel('debug'); // Set Firestore logging to debug

// --- Global Variables (Canvas Environment) ---
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-cbo-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// 2. Placeholder for Gemini API Key (for AI Assistant)
// !!! CRITICAL STEP: Replace "" with your actual Gemini API Key here !!!
const GEMINI_API_KEY = ""; 
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=";

// --- Mock Data (To be replaced with CoinGecko API calls) ---
const MOCK_PRICES = [
    { symbol: 'BTC', price: 65200.50, change: '+1.5%', icon: '₿' },
    { symbol: 'ETH', price: 3450.75, change: '-0.8%', icon: 'Ξ' },
    { symbol: 'CBO', price: 0.12, change: '+5.1%', icon: '$' },
    { symbol: 'SOL', price: 155.30, change: '+2.1%', icon: '◎' },
];

// --- Firebase Initialization and Auth Logic ---
let app, db, auth;
const useFirebase = () => {
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        try {
            app = initializeApp(firebaseConfig);
            db = getFirestore(app);
            auth = getAuth(app);
            
            // 1. Authenticate User
            const authenticate = async () => {
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }
            };
            authenticate();
            
            // 2. Set up Auth State Listener
            const unsubscribe = onAuthStateChanged(auth, (user) => {
                if (user) {
                    setUserId(user.uid);
                }
                setIsAuthReady(true);
            });
            
            return () => unsubscribe();
        } catch (e) {
            console.error("Firebase initialization failed:", e);
        }
    }, []);

    return { userId, isAuthReady };
};


// --- Sub-View Components ---

// 1. AI Assistant View (Gives trading ideas about crypto)
const AIView = () => {
    const [prompt, setPrompt] = useState('Give me a risk assessment for holding ETH over the next quarter.');
    const [response, setResponse] = useState("Ask the AI for its first analysis or prediction!");
    const [isLoading, setIsLoading] = useState(false);

    const fetchAIAdvice = async () => {
        if (isLoading || !prompt) return;
        
        if (!GEMINI_API_KEY || GEMINI_API_KEY === "") {
            setResponse("ERROR: Please insert your Gemini API Key into the GEMINI_API_KEY constant at the top of the file before testing the AI.");
            return;
        }

        setIsLoading(true);
        setResponse("Analyzing market data and formulating advice...");
        
        try {
            const userQuery = `Act as a senior crypto analyst named 'CB-AI'. Give a concise, professional analysis for a Testnet trader based on this prompt: "${prompt}". Focus on past, present, and future price direction. Format the output clearly.`;
            
            const payload = {
                contents: [{ parts: [{ text: userQuery }] }],
                tools: [{ "google_search": {} }], 
                systemInstruction: { parts: [{ text: "You are an expert crypto market analyst named CB-AI. Provide only market analysis, predictions, and education." }] }
            };

            const response = await fetch(GEMINI_API_URL + GEMINI_API_KEY, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            const text = result.candidates?.[0]?.content?.parts?.[0]?.text || "Error: Could not retrieve AI advice. Check console for details.";
            setResponse(text);

        } catch (error) {
            console.error("Gemini API Error:", error);
            setResponse(`[API Error: Network issue or invalid response from the AI service. Check the console for full error details.]`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.contentContainer}>
            <Text style={styles.heading}>CB-AI Crypto Assistant</Text>
            <TextInput
                style={styles.input}
                placeholder="Ask CB-AI for a trade idea or analysis..."
                placeholderTextColor="#ccc"
                value={prompt}
                onChangeText={setPrompt}
                multiline
            />
            <TouchableOpacity style={styles.button} onPress={fetchAIAdvice} disabled={isLoading}>
                {isLoading ? (
                    <ActivityIndicator color="#0F172A" />
                ) : (
                    <Text style={styles.buttonText}>Get CB-AI Analysis</Text>
                )}
            </TouchableOpacity>

            <ScrollView style={styles.card} contentContainerStyle={{ padding: 10 }}>
                <Text style={{ color: '#aaa', marginBottom: 5, fontSize: 16 }}>AI Response:</Text>
                <Text style={{ color: '#fff', fontSize: 14 }}>{response}</Text>
            </ScrollView>
        </View>
    );
};

// 2. Charts & Indicators View (Real market prices and charts)
const ChartsView = () => (
    <View style={styles.contentContainer}>
        <Text style={styles.heading}>Real-Time Charts & Indicators</Text>
        <View style={{ ...styles.card, height: 300, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold', marginBottom: 5 }}>BTC/USDT Candlestick Chart</Text>
            <Text style={{ color: '#aaa', fontSize: 12 }}>[Placeholder for CoinGecko historical data and charting.]</Text>
            <Text style={{ color: '#34D399', marginTop: 15, fontSize: 14 }}>Indicators: MACD, RSI, Volume Profile</Text>
        </View>
        <Text style={styles.subHeading}>Market Overview (Mock Prices)</Text>
        <FlatList
            data={MOCK_PRICES}
            keyExtractor={item => item.symbol}
            renderItem={({ item }) => (
                <View style={styles.priceRow}>
                    <Text style={styles.symbolText}>{item.icon} {item.symbol}</Text>
                    <Text style={styles.priceText}>${item.price.toFixed(2)}</Text>
                    <Text style={[styles.changeText, { color: item.change.startsWith('+') ? '#34D399' : '#EF4444' }]}>{item.change}</Text>
                </View>
            )}
        />
    </View>
);

// 3. Testnet Trading View (Buy/Sell simulator)
const TradeView = () => {
    const [wallet, setWallet] = useState({ USDT: 10000.00, BTC: 0.5 });
    const [amount, setAmount] = useState('');
    const [symbol, setSymbol] = useState('BTC');

    const executeTrade = (type) => {
        const orderAmount = parseFloat(amount);
        const currentPrice = MOCK_PRICES.find(p => p.symbol === symbol)?.price || 0;

        if (isNaN(orderAmount) || orderAmount <= 0) {
            console.error('Testnet Error: Invalid amount entered.');
            return;
        }
        // ... trading logic remains the same
        if (type === 'BUY') {
            const cost = orderAmount * currentPrice;
            if (wallet.USDT >= cost) {
                setWallet(prev => ({ ...prev, USDT: prev.USDT - cost, BTC: prev.BTC + orderAmount }));
                console.log(`Testnet Buy: ${orderAmount} ${symbol} executed. Cost: ${cost.toFixed(2)} USDT`);
            } else {
                console.error('Testnet Error: Insufficient USDT funds.');
            }
        } else if (type === 'SELL') {
            if (wallet.BTC >= orderAmount) {
                const proceeds = orderAmount * currentPrice;
                setWallet(prev => ({ ...prev, USDT: prev.USDT + proceeds, BTC: prev.BTC - orderAmount }));
                console.log(`Testnet Sell: ${orderAmount} ${symbol} executed. Proceeds: ${proceeds.toFixed(2)} USDT`);
            } else {
                console.error('Testnet Error: Insufficient BTC balance.');
            }
        }
        setAmount('');
    };

    return (
        <View style={styles.contentContainer}>
            <Text style={styles.heading}>Testnet Trading Simulator</Text>
            
            <View style={styles.card}>
                <Text style={styles.subHeading}>Wallet Balance</Text>
                <Text style={styles.balanceText}>USDT: ${wallet.USDT.toFixed(2)}</Text>
                <Text style={styles.balanceText}>{symbol}: {wallet.BTC.toFixed(4)}</Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.subHeading}>Place Test Order ({symbol}/USDT)</Text>
                <Text style={{ color: '#fff', marginBottom: 5 }}>Current Price: ${MOCK_PRICES[0].price.toFixed(2)}</Text>

                <TextInput
                    style={styles.input}
                    placeholder={`Amount of ${symbol} to Trade`}
                    placeholderTextColor="#ccc"
                    keyboardType="numeric"
                    value={amount}
                    onChangeText={setAmount}
                />
                <View style={styles.tradeButtonContainer}>
                    <TouchableOpacity 
                        style={[styles.tradeButton, { backgroundColor: '#34D399' }]} 
                        onPress={() => executeTrade('BUY')}
                    >
                        <Text style={styles.buttonText}>BUY</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                        style={[styles.tradeButton, { backgroundColor: '#EF4444' }]}
                        onPress={() => executeTrade('SELL')}
                    >
                        <Text style={styles.buttonText}>SELL</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

// 4. Public Chat View (LIVE Firestore Chat)
const ChatView = ({ userId, isAuthReady }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    // 1. Real-time Message Listener (onSnapshot)
    useEffect(() => {
        if (!isAuthReady || !db || !userId) return; // Guard against unauthenticated access
        
        try {
            const chatCollectionPath = `/artifacts/${appId}/public/data/chat`;
            const q = query(
                collection(db, chatCollectionPath),
                orderBy('timestamp', 'asc')
            );

            const unsubscribe = onSnapshot(q, (snapshot) => {
                const fetchedMessages = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                }));
                setMessages(fetchedMessages);
            }, (error) => {
                console.error("Firestore Chat Listener Error:", error);
            });

            return () => unsubscribe();
        } catch (e) {
            console.error("Error setting up Firestore snapshot:", e);
        }
    }, [isAuthReady, userId]);

    // 2. Message Sender (addDoc)
    const sendMessage = async () => {
        if (!newMessage.trim() || !isAuthReady || isSending || !db) return;

        setIsSending(true);
        try {
            const chatCollectionPath = `/artifacts/${appId}/public/data/chat`;
            await addDoc(collection(db, chatCollectionPath), {
                user: userId,
                text: newMessage.trim(),
                timestamp: Date.now(),
            });
            setNewMessage('');
        } catch (error) {
            console.error("Error sending message to Firestore:", error);
        } finally {
            setIsSending(false);
        }
    };

    if (!isAuthReady) {
        return (
            <View style={styles.contentContainer}>
                <ActivityIndicator size="large" color="#60A5FA" style={{marginTop: 50}} />
                <Text style={{color: '#94A3B8', textAlign: 'center', marginTop: 10}}>Connecting to the trading floor...</Text>
            </View>
        );
    }


    return (
        <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
            <Text style={styles.heading}>Public Trading Chat</Text>
            <Text style={{color: '#94A3B8', paddingHorizontal: 15, marginBottom: 10, fontSize: 10}}>App ID: {appId}</Text>
            
            <FlatList
                data={messages}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                    <View style={[
                        styles.messageBubble, 
                        item.user === userId ? styles.myMessage : styles.otherMessage
                    ]}>
                        <Text style={[styles.messageUser, item.user === userId && {textAlign: 'right'}]}>{item.user}</Text>
                        <Text style={styles.messageText}>{item.text}</Text>
                    </View>
                )}
                contentContainerStyle={{ paddingHorizontal: 15 }}
                // Scroll to end automatically on new message
                onContentSizeChange={(w, h) => this.flatList.scrollToEnd({ animated: true })}
                ref={ref => this.flatList = ref}
            />

            <View style={styles.chatInputContainer}>
                <TextInput
                    style={styles.chatInput}
                    placeholder="Type your message here..."
                    placeholderTextColor="#ccc"
                    value={newMessage}
                    onChangeText={setNewMessage}
                    editable={!isSending}
                />
                <TouchableOpacity style={styles.chatSendButton} onPress={sendMessage} disabled={isSending}>
                    {isSending ? (
                        <ActivityIndicator color="#0F172A" />
                    ) : (
                        <Text style={styles.chatSendButtonText}>Send</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
};

// --- Main Application Component ---
const App = () => {
    const [activeTab, setActiveTab] = useState('Trade');
    const { userId, isAuthReady } = useFirebase(); // Get Auth State

    const renderContent = () => {
        switch (activeTab) {
            case 'Charts': return <ChartsView />;
            case 'Trade': return <TradeView />;
            case 'Chat': return <ChatView userId={userId} isAuthReady={isAuthReady} />;
            case 'AI': return <AIView />;
            default: return <TradeView />;
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>CBO Trade Learning</Text>
                <Text style={styles.headerStatus}>
                    {isAuthReady ? `User: ${userId}` : 'Connecting...'}
                </Text>
            </View>

            {/* Main Content Area */}
            <ScrollView style={styles.mainContent} contentContainerStyle={{ flexGrow: 1 }}>
                {renderContent()}
            </ScrollView>

            {/* Footer Navigation (Exchange Tabs) */}
            <View style={styles.footer}>
                {['Trade', 'Charts', 'Chat', 'AI'].map(tab => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
                        onPress={() => setActiveTab(tab)}
                        disabled={!isAuthReady && tab === 'Chat'}
                    >
                        <Text style={styles.tabText}>{tab}</Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );
};

// --- Styling ---
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F172A', 
    },
    header: {
        paddingTop: 40,
        paddingBottom: 15,
        paddingHorizontal: 20,
        backgroundColor: '#1E293B',
        borderBottomWidth: 1,
        borderBottomColor: '#334155',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#E0F2F1',
    },
    headerStatus: {
        fontSize: 12,
        color: '#60A5FA', 
        padding: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#60A5FA',
        maxWidth: 150,
    },
    mainContent: {
        flex: 1,
    },
    contentContainer: {
        padding: 15,
    },
    heading: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#E0F2F1',
        marginBottom: 15,
        borderLeftWidth: 3,
        borderLeftColor: '#34D399',
        paddingLeft: 10,
    },
    subHeading: {
        fontSize: 16,
        fontWeight: '600',
        color: '#94A3B8',
        marginTop: 10,
        marginBottom: 5,
    },
    card: {
        backgroundColor: '#1E293B',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    input: {
        backgroundColor: '#334155',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#475569',
        marginBottom: 10,
    },
    button: {
        backgroundColor: '#34D399', 
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    buttonText: {
        color: '#0F172A',
        fontWeight: 'bold',
        fontSize: 16,
    },
    balanceText: {
        fontSize: 16,
        color: '#E0F2F1',
        marginBottom: 5,
    },
    tradeButtonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    tradeButton: {
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 5,
    },
    priceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#1E293B',
        backgroundColor: '#1E293B',
        marginBottom: 2,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    symbolText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
        width: '30%',
    },
    priceText: {
        color: '#E0F2F1',
        fontSize: 15,
        width: '40%',
        textAlign: 'right',
    },
    changeText: {
        fontSize: 15,
        fontWeight: '600',
        width: '30%',
        textAlign: 'right',
    },
    // Chat Styles
    messageBubble: {
        padding: 10,
        borderRadius: 15,
        marginBottom: 8,
        maxWidth: '80%',
    },
    otherMessage: {
        backgroundColor: '#334155',
        alignSelf: 'flex-start',
    },
    myMessage: {
        backgroundColor: '#1C4532', // Darker green for user's own messages
        alignSelf: 'flex-end',
    },
    messageUser: {
        color: '#60A5FA',
        fontWeight: 'bold',
        marginBottom: 3,
        fontSize: 12,
    },
    messageText: {
        color: '#E0F2F1',
        fontSize: 14,
    },
    chatInputContainer: {
        flexDirection: 'row',
        padding: 15,
        backgroundColor: '#1E293B',
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    chatInput: {
        flex: 1,
        backgroundColor: '#334155',
        color: '#fff',
        padding: 12,
        borderRadius: 20,
        marginRight: 10,
    },
    chatSendButton: {
        backgroundColor: '#60A5FA',
        paddingHorizontal: 15,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chatSendButtonText: {
        color: '#fff',
        fontWeight: 'bold',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: '#1E293B',
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: '#334155',
    },
    tabButton: {
        paddingVertical: 8,
        paddingHorizontal: 15,
        borderRadius: 20,
    },
    tabButtonActive: {
        backgroundColor: '#34D399', 
    },
    tabText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});

export default App;

