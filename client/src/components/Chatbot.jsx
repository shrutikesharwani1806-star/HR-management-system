import React, { useState, useEffect, useRef } from 'react';

const FAQ_DATA = [
  {
    question: "What is this platform?",
    answer: "HRSphere is a comprehensive Enterprise HR Management System. We help you handle employees, attendance, leave workflows, and role-based access control all in one place."
  },
  {
    question: "How do I add a new employee?",
    answer: "To add a new employee, navigate to the 'Employees' tab on your dashboard and click the 'Add Employee' button in the top right corner. You'll need HR or Leadership permissions."
  },
  {
    question: "How does attendance tracking work?",
    answer: "Employees can seamlessly clock in and out from their Employee Dashboard. Managers and HR can track daily attendance, view timesheets, and monitor working hours in the 'Attendance' tab."
  },
  {
    question: "How do I request leave?",
    answer: "Simply go to the 'Leave' tab, click 'Request Leave', select your dates, and submit. Your manager will be notified and can approve or reject the request directly from their dashboard."
  },
  {
    question: "How are roles and permissions managed?",
    answer: "In the 'Roles' and 'User Management' tabs, Leadership can create custom roles (like HR, Manager, Employee) and define exact permissions (e.g., view reports, approve leaves, manage settings)."
  },
  {
    question: "What are the core dashboard views?",
    answer: "There are specialized dashboards for Leadership, HR, Managers, and Employees. Each view is optimized to show relevant analytics, pending approvals, and quick actions based on your role."
  }
];

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { type: 'bot', text: 'Hi there! 👋 I am your HRSphere assistant. How can I help you today?' }
  ]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  const handleFAQClick = (faq) => {
    setMessages((prev) => [...prev, { type: 'user', text: faq.question }]);
    
    // Simulate typing delay
    setTimeout(() => {
      setMessages((prev) => [...prev, { type: 'bot', text: faq.answer }]);
    }, 600);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setMessages((prev) => [...prev, { type: 'user', text: userText }]);
    setInputText('');

    // Simulate typing delay and simple fallback logic
    setTimeout(() => {
      const lowerText = userText.toLowerCase();
      // Simple keyword matching against FAQ
      const matchedFaq = FAQ_DATA.find(faq => {
        const keywords = faq.question.toLowerCase().replace(/[^a-z0-9 ]/g, '').split(' ').filter(w => w.length > 4);
        return keywords.some(keyword => lowerText.includes(keyword));
      });

      const botReply = matchedFaq 
        ? matchedFaq.answer 
        : "I'm a simple bot right now! Please choose from the suggested questions above, or contact HR for more complex queries.";

      setMessages((prev) => [...prev, { type: 'bot', text: botReply }]);
    }, 600);
  };

  return (
    <>
      {/* Chatbot Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 bg-blue-600 text-white p-4 rounded-full shadow-2xl hover:bg-blue-700 transition-all hover:scale-105 active:scale-95 flex items-center justify-center ${isOpen ? 'hidden sm:flex' : 'flex'}`}
        aria-label="Open chat"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        )}
      </button>

      {/* Chatbot Window */}
      {isOpen && (
        <div className="fixed inset-0 sm:inset-auto sm:bottom-24 sm:right-6 z-50 sm:w-96 max-h-[100vh] sm:max-h-[calc(100vh-7rem)] bg-white sm:rounded-2xl shadow-2xl sm:border border-gray-100 flex flex-col overflow-hidden animate-in sm:slide-in-from-bottom-5 slide-in-from-bottom-full">
          {/* Header */}
          <div className="bg-blue-600 p-4 text-white flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                HRSphere Guide
              </h3>
              <p className="text-blue-100 text-sm mt-1">Ask me anything about the platform!</p>
            </div>
            <button 
              onClick={() => setIsOpen(false)} 
              className="sm:hidden p-1 -mr-1 -mt-1 text-blue-200 hover:text-white transition-colors rounded-full hover:bg-blue-700"
              aria-label="Close chat"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-4 overflow-y-auto min-h-[150px] bg-slate-50 flex flex-col gap-3">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`max-w-[85%] p-3 rounded-xl text-sm ${
                  msg.type === 'user'
                    ? 'bg-blue-600 text-white self-end rounded-tr-none'
                    : 'bg-white text-gray-700 border border-gray-200 self-start rounded-tl-none shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* FAQ Suggestions */}
          <div className="p-3 bg-white border-t border-gray-100">
            <p className="text-xs text-gray-400 font-medium mb-2 uppercase tracking-wider">Suggested Questions</p>
            <div className="flex flex-col gap-2 max-h-24 overflow-y-auto pr-1">
              {FAQ_DATA.map((faq, index) => (
                <button
                  key={index}
                  onClick={() => handleFAQClick(faq)}
                  className="text-left text-sm p-2 hover:bg-blue-50 text-gray-700 hover:text-blue-700 rounded-lg transition-colors border border-gray-100"
                >
                  {faq.question}
                </button>
              ))}
            </div>
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-gray-100 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit"
              disabled={!inputText.trim()}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              aria-label="Send message"
            >
              <svg className="w-5 h-5 transform rotate-45 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
