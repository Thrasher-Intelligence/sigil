import React, { useState } from 'react';
import ChatBubble from './ChatBubble';
import styles from './Chat.module.css';

const ThinkingTest = () => {
  // Test messages with thinking sections
  const testMessages = [
    {
      id: 'user-1',
      sender: 'user',
      text: 'What is a good language for me to start with if I\'m just getting into coding?',
      tokens: 16
    },
    {
      id: 'backend-1',
      sender: 'backend',
      text: '<think>\nOkay, the user is asking what a good language to start with if they\'re just getting into coding. Let me think about this. They might be new to coding and need a beginner-friendly language. First, I should consider the most popular and beginner-friendly options.\n\nThe most common languages for beginners are Python and JavaScript. Both are widely used and have good documentation. Python is great for data analysis, machine learning, and web development. JavaScript is great for web apps and front-end development.\n\nI should also mention other possibilities like Java, C++, C#, or Ruby, but maybe stick to the top two. Let me check if there are any other languages that might be more popular in certain fields, but the main point is to offer the best options.\n\nI need to make sure the answer is clear and covers both languages. Also, maybe suggest a combination if they want to learn multiple languages. Let me structure the answer to list Python and JavaScript, explain their strengths, and offer to help with further guidance if needed.\n</think>\n\nA great starting point for coding is to pick one of the most popular and beginner-friendly languages. Here are two excellent options:\n\n1. **Python**\n   - Very readable syntax that resembles English\n   - Gentle learning curve for beginners\n   - Versatile: great for data science, web development, automation, and AI\n   - Huge community and extensive libraries\n\n2. **JavaScript**\n   - The language of the web - runs in every browser\n   - Immediate visual feedback when learning\n   - Essential for front-end web development\n   - Can also be used for back-end with Node.js\n\nI recommend starting with Python if you\'re interested in data analysis, scientific applications, or general programming concepts. Choose JavaScript if you\'re excited about web development and creating interactive websites.\n\nWould you like more information about either of these languages or recommendations for learning resources?',
      tokens: 268
    },
    {
      id: 'user-2',
      sender: 'user',
      text: 'Python sounds good for me. How long would it take to learn the basics?',
      tokens: 14
    },
    {
      id: 'backend-2',
      sender: 'backend',
      text: 'Learning the basics of Python typically takes about 2-4 weeks if you study consistently for a few hours each day. Within this time, you should be able to understand fundamental concepts like variables, data types, control structures (if/else statements, loops), functions, and basic error handling.\n\nHere\'s a rough timeline:\n\n- **Week 1**: Python installation, basic syntax, variables, simple data types\n- **Week 2**: Control structures, lists, dictionaries\n- **Week 3**: Functions, modules, file handling\n- **Week 4**: Error handling, classes (intro to object-oriented programming)\n\nThe beauty of Python is that you can start building useful programs even with basic knowledge. Simple projects like calculators, to-do lists, or small games can be created within your first month of learning.\n\nWould you like some recommendations for beginner Python resources to get started?',
      tokens: 201
    },
    {
      id: 'backend-3',
      sender: 'backend',
      text: '<think>\nThis is a message with just thinking content and nothing else.\n</think>',
      tokens: 15
    }
  ];

  const [messages, setMessages] = useState(testMessages);

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <h1 style={{ color: 'white', textAlign: 'center' }}>Thinking Section Toggle Test</h1>
      <p style={{ color: '#ccc', textAlign: 'center', marginBottom: '30px' }}>
        This component demonstrates the functionality of the thinking toggle feature.
        Click on the 💭 icon to expand/collapse thinking sections.
      </p>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {messages.map(message => (
          <ChatBubble key={message.id} message={message} />
        ))}
      </div>
    </div>
  );
};

export default ThinkingTest;