import React, { useState, useEffect, useCallback } from "react";
import "./popUps.css";
import DragDrop from "./DragDrop";
import openai from "../openai";
import * as pdfjsLib from "pdfjs-dist";
import Tesseract from "tesseract.js";

const ClassPopUp = ({ onClose, addClassToList }) => {
  const [className, setClassName] = useState("");
  const [duration, setDuration] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [fileContents, setFileContents] = useState([]);
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
  }, [chatMessages]);

  const onSubmit = (event) => {
    event.preventDefault();
    addClassToList(className);
    onClose();
  };

  const readPDF = async (file) => {
    const pdf = await pdfjsLib.getDocument(URL.createObjectURL(file)).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item) => item.str).join(" ");
    }
    return text;
  };

  const readPNG = async (file) => {
    const result = await Tesseract.recognize(URL.createObjectURL(file), "eng");
    console.log(result.data.text);
    return result.data.text;
  };

  const onFilesAdded = useCallback((files) => {
    setUploadedFiles(files);
    const readers = files.map(async (file) => {
      if (file.type === "application/pdf") {
        return await readPDF(file);
      } else if (file.type === "image/png") {
        return await readPNG(file);
      } else {
        throw new Error("Unsupported file type");
      }
    });
    Promise.all(readers)
      .then((contents) => {
        setFileContents(contents);
      })
      .catch((error) => console.error("Error reading files:", error));
  }, []);

  const processQuestion = async () => {
    const filesContent = fileContents.join("\n\n");
    const newMessage = {
      role: "user",
      content:
        userMessage +
        (filesContent ? `\n\nFile Contents:\n${filesContent}` : ""),
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
    <>
      <form onSubmit={onSubmit}>
        <div id="class-pop-up">
          <div id="pop-up-header">
            <div id="cancel" onClick={onClose}>
              x
            </div>
          </div>

          <div id="form-container">
            <label htmlFor="className">Class Name: </label>
            <input
              id="className"
              value={className}
              onChange={(e) => {
                setClassName(e.target.value);
              }}
              required
            />
            <label htmlFor="duration">Duration: </label>
            <input
              id="duration"
              onChange={(e) => {
                setDuration(e.target.value);
              }}
              required
            />
            <br></br>
            <div id="drag-and-drop">
              <DragDrop onFilesAdded={onFilesAdded} />
              <br></br>
            </div>
            <div>
              <input
                value={userMessage}
                onChange={(e) => updateUserMessage(e.target.value)}
              />
              <button type="button" onClick={processQuestion}>
                Ask
              </button>
              <div>{chatResponse}</div>
            </div>
            <br></br>
            <button type="submit">Add Class</button>
          </div>
        </div>
      </form>
    </>
  );
};

export default ClassPopUp;
