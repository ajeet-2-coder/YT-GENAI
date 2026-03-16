// src/features/interview/hooks/useInterview.js
import {
  getAllInterviewReports,
  generateInterviewReport,
  getInterviewReportById
} from "../services/interview.api"; // adjust path if needed

import { useContext, useEffect } from "react";
import { InterviewContext } from "../interview.context";
import { useParams } from "react-router-dom"; // must be react-router-dom

export const useInterview = () => {
  const context = useContext(InterviewContext);
  const { interviewId } = useParams();

  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }

  const { loading, setLoading, report, setReport, reports, setReports } = context;

  const generateReport = async ({ jobDescription, selfDescription, resumeFile }) => {
    setLoading(true);
    try {
      const response = await generateInterviewReport({ jobDescription, selfDescription, resumeFile });
      if (response?.interviewReport) {
        setReport(response.interviewReport);
        return response.interviewReport;
      }
      return null;
    } catch (error) {
      console.error("Generate Report Error:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getReportById = async (id) => {
    setLoading(true);
    try {
      const response = await getInterviewReportById(id);
      if (response?.interviewReport) {
        setReport(response.interviewReport);
        return response.interviewReport;
      }
      return null;
    } catch (error) {
      console.error("Get Report Error:", error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getReports = async () => {
    setLoading(true);
    try {
      const response = await getAllInterviewReports();
      if (response?.interviewReports) {
        setReports(response.interviewReports);
        return response.interviewReports;
      }
      return [];
    } catch (error) {
      console.error("Get Reports Error:", error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (interviewId) {
      getReportById(interviewId);
    } else {
      getReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  return { loading, report, reports, generateReport, getReportById, getReports };
};