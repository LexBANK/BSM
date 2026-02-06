import { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore.js';

export default function ChatPage() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  const socket = useMemo(() => io(import.meta.env.VITE_WS_URL || 'http://localhost:5000'), []);

  useEffect(() => {
    if (user?.id) socket.emit('join', user.id);
    socket.on('private_message', (payload) => setMessages((prev) => [...prev, payload]));
    return () => socket.disconnect();
  }, [socket, user?.id]);

  const send = () => {
    if (!text.trim()) return;
    const payload = { senderId: user?.id, receiverId: 'demo-user', text };
    socket.emit('private_message', payload);
    setMessages((prev) => [...prev, payload]);
    setText('');
  };

  return (
    <main className="chat-wrap">
      <header>
        <h1>Realtime Chat</h1>
        <button onClick={logout}>Logout</button>
      </header>
      <section className="messages">
        {messages.map((m, i) => <div key={i} className="bubble">{m.text}</div>)}
      </section>
      <footer>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" />
        <button onClick={send}>Send</button>
      </footer>
    </main>
  );
}
