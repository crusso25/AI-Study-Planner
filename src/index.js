import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import Courses from "./Pages/Courses";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Account } from "./User/Account";
import MyCalendar from "./Pages/MyCalendar";
import Home from "./Pages/Home"
import Practice from "./Pages/Practice";
import PracticeProblemPage from "./Pages/PracticeProblemPage";
import Exams from "./Pages/Exams";
import StudyGuide from "./Pages/StudyGuide";


const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <BrowserRouter>
    <Account>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="courses" element={<Courses />} />
          <Route path="calendar" element={<MyCalendar />} />
          <Route path="practice" element={<Practice />} />
          <Route path="practice/:id" element={<PracticeProblemPage />} />
          <Route path="exams" element={<Exams />} />
          <Route path="exams/:id" element={<StudyGuide />} />
        </Routes>
    </Account>
  </BrowserRouter>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
