// src/features/interview/interview.context.js
import React, { createContext, useState } from "react";

export const InterviewContext = createContext(null);

export const InterviewProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [reports, setReports] = useState([]);

  const value = {
    loading,
    setLoading,
    report,
    setReport,
    reports,
    setReports
  };

  return (
    <InterviewContext.Provider value={value}>
      {children}
    </InterviewContext.Provider>
  );
};