import React, { useState, useEffect } from 'react';
import openai from './openai';

const App = () => {
  const [chatMessages, updateChat] = useState([
    {
      role: "system",
      content: "Today is June 30th, 2024",
    },
  ]);
  const [userMessage, updateUserMessage] = useState("");
  const [chatResponse, updateResponse] = useState("");

  useEffect(() => {
    console.log(chatMessages);
  }, [chatMessages])

  const processQuestion = async () => {
    const newMessage = {
      role: "user",
      content: userMessage,
    };

    const updatedChatMessages = [...chatMessages, newMessage];
    updateChat(updatedChatMessages);
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: updatedChatMessages,
    });
    updateResponse(response.choices[0].message.content);
  };

  return (
    <div>
      <input
        value={userMessage}
        onChange={(e) => {
          updateUserMessage(e.target.value);
        }}
      />
      <button onClick={() => {processQuestion()}}>Ask</button>
      <div>{chatResponse}</div>
    </div>
  );
};

export default App;
