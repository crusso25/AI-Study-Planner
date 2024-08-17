import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import Classes from "./Pages/Classes";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Account } from "./User/Account";
import MyCalendar from "./Pages/MyCalendar";
import Home from "./Pages/Home"
import Practice from "./Pages/Practice";
import PracticeProblemPage from "./Pages/PracticeProblemPage";


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <Account>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="classes" element={<Classes />} />
          <Route path="calendar" element={<MyCalendar />} />
          <Route path="practice" element={<Practice />} />
          <Route path="practice/:id" element={<PracticeProblemPage />} />
        </Routes>
    </Account>
  </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
