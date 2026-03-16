// src/features/interview/pages/Home.jsx
import React, { useState, useRef } from "react"
import "../style/home.scss"
import { useNavigate } from "react-router-dom"
import { useInterview } from "../hooks/useInterview"
import Navbar from "../../auth/components/Navbar"

const Home = () => {

    const { loading, generateReport, reports } = useInterview()

    const [jobDescription, setJobDescription] = useState("")
    const [selfDescription, setSelfDescription] = useState("")

    const resumeInputRef = useRef(null)

    const navigate = useNavigate()

    const handleGenerateReport = async () => {

        const resumeFile = resumeInputRef.current?.files?.[0]

        if (!resumeFile && !selfDescription) {
            alert("Upload resume or write self description")
            return
        }

        if (!jobDescription) {
            alert("Job description is required")
            return
        }

        const data = await generateReport({
            jobDescription,
            selfDescription,
            resumeFile
        })

        if (data?._id) {
            navigate(`/interview/${data._id}`)
        } else {
            alert("Failed to generate interview report")
        }
    }

    if (loading) {
        return (
            <main className="loading-screen">
                <h1>Loading your interview plan...</h1>
            </main>
        )
    }

    return (
        <div className="home-page">

            {/* ✅ Navbar added here */}
            <Navbar />

            <header className="page-header">
                <h1>
                    Create Your Custom
                    <span className="highlight"> Interview Plan</span>
                </h1>

                <p>
                    Let our AI analyze the job requirements and your profile
                    to build a winning strategy.
                </p>
            </header>


            <div className="interview-card">

                <div className="interview-card__body">

                    {/* JOB DESCRIPTION */}
                    <div className="panel panel--left">

                        <div className="panel__header">
                            <h2>Target Job Description</h2>
                        </div>

                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            className="panel__textarea"
                            placeholder="Paste job description..."
                        />

                    </div>

                    <div className="panel-divider"></div>

                    {/* PROFILE */}
                    <div className="panel panel--right">

                        <div className="upload-section">
                            <label className="section-label">
                                Upload Resume
                            </label>
                            <input
                                ref={resumeInputRef}
                                type="file"
                                accept=".pdf,.docx"
                            />
                        </div>

                        <div className="or-divider">
                            <span>OR</span>
                        </div>

                        <textarea
                            value={selfDescription}
                            onChange={(e) => setSelfDescription(e.target.value)}
                            placeholder="Describe your skills..."
                            className="panel__textarea panel__textarea--short"
                        />

                    </div>

                </div>

                <div className="interview-card__footer">
                    <button
                        onClick={handleGenerateReport}
                        className="generate-btn"
                    >
                        Generate My Interview Strategy
                    </button>
                </div>

            </div>


            {/* RECENT REPORTS */}
            {reports?.length > 0 && (
                <section className="recent-reports">

                    <h2>My Recent Interview Plans</h2>

                    <ul className="reports-list">
                        {reports.map((report) => (
                            <li
                                key={report._id}
                                className="report-item"
                                onClick={() => navigate(`/interview/${report._id}`)}
                            >
                                <h3>{report.title || "Untitled Position"}</h3>
                                <p>
                                    Generated on{" "}
                                    {new Date(report.createdAt).toLocaleDateString()}
                                </p>
                                <p>Match Score: {report.matchScore}%</p>
                            </li>
                        ))}
                    </ul>

                </section>
            )}

        </div>
    )
}

export default Home