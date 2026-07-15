import{updateCandidate}from'./employeeService';
export function updateStatus(id,status,remarks=''){return updateCandidate(id,{status,remarks,statusUpdatedAt:new Date().toISOString()});}
export function createRejectionMail(candidate,remarks){return `To: ${candidate.email}
Subject: Offer Letter Verification Status - Rejected

Dear ${candidate.fullName},

Thank you for submitting your application to Verify-X. After reviewing your profile and uploaded documents, your application has been rejected.

Reason/Remarks: ${remarks||'Documents/profile did not match the verification requirements.'}

Regards,
HR Team
Verify-X`;}
