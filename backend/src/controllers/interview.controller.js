const pdf2json = require("pdf2json");
const { generateInterviewReport } = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");


// ─────────────────────────────────────────────
// PDF Text Extractor
// ─────────────────────────────────────────────
const extractTextFromPDF = (buffer) => {
    return new Promise((resolve, reject) => {
        const pdfParser = new pdf2json();

        pdfParser.on("pdfParser_dataError", (err) => reject(err.parserError));

        pdfParser.on("pdfParser_dataReady", (pdfData) => {
            const text = pdfData.Pages.map(page =>
                page.Texts.map(t => 
                    t.R.map(r => {
                        try {
                            return decodeURIComponent(r.T);
                        } catch {
                            return r.T; // use raw text if decode fails
                        }
                    }).join("")
                ).join(" ")
            ).join("\n");
            resolve(text);
        });

        pdfParser.parseBuffer(buffer);
    });
};


/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
    try {
        const resumeText = await extractTextFromPDF(req.file.buffer);
        const { selfDescription, jobDescription } = req.body;

        const interViewReportByAi = await generateInterviewReport({
            resume: resumeText,
            selfDescription,
            jobDescription
        });

        const interviewReport = await interviewReportModel.create({
            user: req.user.id,
            resume: resumeText,
            selfDescription,
            jobDescription,
            ...interViewReportByAi,
        });

        res.status(201).json({
            message: "Interview report generated successfully.",
            interviewReport,
        });

    } catch (err) {
        console.error("[generateInterViewReportController]", err.message);
        res.status(500).json({ message: err.message || "Something went wrong." });
    }
}


/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
    try {
        const { interviewId } = req.params;

        const interviewReport = await interviewReportModel.findOne({
            _id: interviewId,
            user: req.user.id,
        });

        if (!interviewReport) {
            return res.status(404).json({ message: "Interview report not found." });
        }

        res.status(200).json({
            message: "Interview report fetched successfully.",
            interviewReport,
        });

    } catch (err) {
        console.error("[getInterviewReportByIdController]", err.message);
        res.status(500).json({ message: err.message || "Something went wrong." });
    }
}


/**
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
    try {
        const interviewReports = await interviewReportModel
            .find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .select("-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan");

        res.status(200).json({
            message: "Interview reports fetched successfully.",
            interviewReports,
        });

    } catch (err) {
        console.error("[getAllInterviewReportsController]", err.message);
        res.status(500).json({ message: err.message || "Something went wrong." });
    }
}


module.exports = {
    generateInterViewReportController,
    getInterviewReportByIdController,
    getAllInterviewReportsController,
};