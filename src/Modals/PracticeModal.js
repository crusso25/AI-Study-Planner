import React, { useState, useEffect, useContext } from "react";
import { AccountContext } from "../User/Account";
import Latex from "react-latex-next";

const PracticeModal = ({ event, closePracticeModal, problems }) => {
  const { getSession } = useContext(AccountContext);
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const session = await getSession();
        setSessionData(session);
      } catch (error) {
        console.error("Error fetching session:", error);
        setSessionData(null);
      }
    };
    fetchSession();
  }, []);

  const formatContent = (content) => {
    const parts = content.split(/(\$[^$]*\$|\\\[[^\\\]]*\\\]|\\\([^\\\)]*\\\))/g);
  
    const formattedParts = parts.map((part) => {
      if (part.startsWith("$") || part.startsWith("\\[") || part.startsWith("\\(")) {
        return part;
      } else {
        return part
          .replace(/###\s*(.*)/g, "<h3>$1</h3>")
          .replace(/####\s*(.*)/g, "<h4>$1</h4>")
          .replace(/##\s*(.*)/g, "<h2>$1</h2>")
          .replace(/#\s*(.*)/g, "<h1>$1</h1>")
          .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
          .replace(/_(.*?)_/g, "<em>$1</em>")
          .replace(/`([^`]+)`/g, "<code>$1</code>")
          .replace(/```(.*?)```/gs, "<pre><code>$1</code></pre>")
          .replace(/(\d+\.)/g, "<br/>$1")
          .replace(/-\s/g, "<br/>- ")
      }
    });
  
    return formattedParts.join("");
  };

  return (
    <div className="modal open">
      <div className="modal-overlay"></div>
      <div className="modal-container">
        <div className="modal-header">
          <div>
            <h2>Practice for {event.title}</h2>
            <p className="class-name">{event.className}</p>
          </div>
          <div className="close-icon" onClick={closePracticeModal}>
            ×
          </div>
        </div>
        <div className="modal-content">
          <Latex>{formatContent(problems)}</Latex>
        </div>
      </div>
    </div>
  );
};

export default PracticeModal;
