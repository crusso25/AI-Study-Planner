import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import reportWebVitals from "./reportWebVitals";
import Homepage from "./Homepage";
import Header from "./Header";
import { CalendarProvider } from "./CalendarContext";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Account } from "./Account";
import MyCalendar from "./MyCalendar";

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <Account>
    <CalendarProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Header />}>
            <Route index element={<Homepage />} />
            <Route path="Calendar" element={<MyCalendar />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </CalendarProvider>
  </Account>
);
// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
