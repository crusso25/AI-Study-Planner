// CalendarContext.js
import React, { createContext, useState } from 'react';

export const CalendarContext = createContext();

export const CalendarProvider = ({ children }) => {
  const [calendarEvents, setCalendarEvents] = useState([]);

  return (
    <CalendarContext.Provider value={{ calendarEvents, setCalendarEvents }}>
      {children}
    </CalendarContext.Provider>
  );
};
