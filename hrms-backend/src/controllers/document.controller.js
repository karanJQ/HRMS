const { query } = require('../config/database');
const { success, error } = require('../utils/response');
const fs = require('fs');

// Replace with actual deployed OCR service endpoint if different
const OCR_API_URL = process.env.OCR_SERVICE_URL || 'https://hrms-ocr.onrender.com/process';

exports.uploadDocument = async (req, res) => {
  const { owner_id, doc_type } = req.body;
  if (!req.file) {
    return error(res, 'No document uploaded.', 400);
  }
  if (!owner_id || !doc_type) {
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    return error(res, 'Owner ID and Document Type are required.', 400);
  }

  try {
    const result = await query(
      `INSERT INTO employee_documents(owner_id, doc_type, file_path, uploaded_by)
       VALUES($1, $2, $3, $4) RETURNING *`,
      [owner_id, doc_type, req.file.path, req.user?.id || null]
    );
    return success(res, result.rows[0], 'Document uploaded successfully', 201);
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return error(res, err.message, 500);
  }
};

exports.getDocuments = async (req, res) => {
  const { owner_id } = req.params;
  try {
    const result = await query(
      `SELECT * FROM employee_documents WHERE owner_id = $1 ORDER BY created_at DESC`,
      [owner_id]
    );
    return success(res, result.rows);
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.performOCR = async (req, res) => {
  const { id } = req.params;
  try {
    // 1. Fetch document from DB
    const docResult = await query(`SELECT * FROM employee_documents WHERE id = $1`, [id]);
    if (docResult.rows.length === 0) {
      return error(res, 'Document not found.', 404);
    }
    const document = docResult.rows[0];

    if (!fs.existsSync(document.file_path)) {
      return error(res, 'Document file missing on server.', 404);
    }

    // 2. Prepare native FormData
    const path = require('path');
    const ext = path.extname(document.file_path).toLowerCase();
    let mimeType = 'application/octet-stream';
    if (ext === '.pdf') mimeType = 'application/pdf';
    else if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.png') mimeType = 'image/png';

    const fileBuffer = fs.readFileSync(document.file_path);
    const blob = new Blob([fileBuffer], { type: mimeType });
    const formData = new FormData();
    formData.append('file', blob, path.basename(document.file_path));

    // 3. Make HTTP request to OCR service using native fetch
    let extractedData = null;
    let rawText = '';
    
    try {
      // Determine the correct endpoint based on doc_type
      let endpointPath = '';
      switch (document.doc_type) {
        case 'Aadhar': endpointPath = 'api/v1/aadhar'; break;
        case 'PAN': endpointPath = 'api/v1/pan'; break;
        case 'Passport': endpointPath = 'api/v1/passport'; break;
        case 'Passbook': endpointPath = 'api/v1/bank_passbook'; break;
        case 'CancelCheque': endpointPath = 'api/v1/cancel_check'; break;
        case 'BirthCertificate': endpointPath = 'api/v1/birth_certificate'; break;
        default:
          return error(res, `OCR is not supported for document type: ${document.doc_type}`, 400);
      }
      
      const baseUrl = process.env.OCR_SERVICE_URL ? process.env.OCR_SERVICE_URL.replace(/\/+$/, '') : 'https://hrms-ocr.onrender.com';
      const apiUrl = `${baseUrl}/${endpointPath}`;

      // Using an AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        let errDetails = '';
        try {
           const errBody = await response.json();
           errDetails = JSON.stringify(errBody);
        } catch(e) {}
        throw new Error(`HTTP error! status: ${response.status} ${errDetails}`);
      }
      
      const responseData = await response.json();
      extractedData = responseData.extractedData || responseData.data || responseData;
      rawText = responseData.text || responseData.rawText || '';

      // Enrich with bank and branch details using IFSC code if applicable
      if (['CancelCheque', 'Passbook'].includes(document.doc_type) && extractedData) {
        const ifsc = extractedData.ifsc_code || extractedData.ifsc || extractedData.ifsc_number;
        if (ifsc) {
          try {
            const ifscRes = await fetch(`https://ifsc.razorpay.com/${ifsc.trim().toUpperCase()}`);
            if (ifscRes.ok) {
              const ifscData = await ifscRes.json();
              extractedData.bank_name = ifscData.BANK || '';
              extractedData.branch_name = ifscData.BRANCH || '';
              extractedData.bank_address = ifscData.ADDRESS || '';
            }
          } catch (ifscErr) {
            console.error('IFSC Lookup failed during enrichment:', ifscErr.message);
          }
        }
      }
    } catch (apiErr) {
      console.error('OCR API Error:', apiErr.message);
      // Mark as Failed if API request fails
      await query(`UPDATE employee_documents SET ocr_status = 'Failed', updated_at = NOW() WHERE id = $1`, [id]);
      return error(res, 'OCR Service failed: ' + apiErr.message, 500);
    }

    // 4. Update DB with extracted data
    const updatedResult = await query(
      `UPDATE employee_documents 
       SET ocr_status = 'Processed', extracted_data = $1, updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [JSON.stringify({ data: extractedData, rawText }), id]
    );

    return success(res, updatedResult.rows[0], 'OCR processing complete');
  } catch (err) {
    return error(res, err.message, 500);
  }
};

exports.deleteDocument = async (req, res) => {
  const { id } = req.params;
  try {
    const docResult = await query(`SELECT * FROM employee_documents WHERE id = $1`, [id]);
    if (docResult.rows.length === 0) {
      return error(res, 'Document not found.', 404);
    }
    const document = docResult.rows[0];

    // Remove file from disk
    if (fs.existsSync(document.file_path)) {
      fs.unlinkSync(document.file_path);
    }

    // Remove from DB
    await query(`DELETE FROM employee_documents WHERE id = $1`, [id]);
    
    return success(res, null, 'Document deleted successfully');
  } catch (err) {
    return error(res, err.message, 500);
  }
};
