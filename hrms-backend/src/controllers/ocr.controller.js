const Tesseract = require('tesseract.js');
const { success, error } = require('../utils/response');
const fs = require('fs');

exports.processDocument = async (req, res) => {
  if (!req.file) {
    return error(res, 'No document uploaded.', 400);
  }

  try {
    // Run OCR using Tesseract
    const { data: { text } } = await Tesseract.recognize(
      req.file.path,
      'eng',
      { logger: m => console.log(m) }
    );

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    // Basic NLP / Regex extraction simulation
    const extractedData = {
      emp_name: 'Unknown',
      emp_id: 'Unknown',
      department: 'Unknown',
      joining_date: 'Unknown'
    };

    // Simulated field extraction logic based on regex (simplified for demo)
    const nameMatch = text.match(/Name[:\s]+([A-Z][a-z]+ [A-Z][a-z]+)/i);
    if (nameMatch) extractedData.emp_name = nameMatch[1];

    const idMatch = text.match(/ID[:\s]+(GUJ\/[A-Z]+\/\d+\/\d+)/i) || text.match(/EMP\d+/i);
    if (idMatch) extractedData.emp_id = idMatch[1] || idMatch[0];

    const deptMatch = text.match(/(development|BA\/BDE|management|IT|QA|UI\/UX|marketing|sales|HR)\s*Department/i);
    if (deptMatch) extractedData.department = deptMatch[0];

    // Example date match (e.g., 15-Apr-2024 or 15/04/2024)
    const dateMatch = text.match(/\d{2}[-/][A-Za-z]{3}[-/]\d{4}/) || text.match(/\d{2}[-/]\d{2}[-/]\d{4}/);
    if (dateMatch) extractedData.joining_date = dateMatch[0];

    // We also provide a raw text output so frontend can see what was extracted
    return success(res, { extractedData, rawText: text, fields_extracted: Object.values(extractedData).filter(v => v !== 'Unknown').length }, 'OCR processing complete');

  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return error(res, 'OCR Processing Failed: ' + err.message, 500);
  }
};
