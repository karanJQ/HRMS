import React from 'react';
const colors = {
  Active:'#dcfce7:#166534', Paid:'#dcfce7:#166534', Completed:'#dcfce7:#166534', Approved:'#dcfce7:#166534', Cleared:'#dcfce7:#166534', Outstanding:'#dcfce7:#166534',
  Pending:'#fef9c3:#854d0e', 'Pending DPC':'#fef9c3:#854d0e', 'Pending Approval':'#fef9c3:#854d0e', 'Under Review':'#fef9c3:#854d0e', 'Upcoming':'#dbeafe:#1e40af',
  'On Leave':'#dbeafe:#1e40af', 'Inquiry Ongoing':'#fee2e2:#991b1b', Resolved:'#dcfce7:#166534',
  'Documents Verified':'#dbeafe:#1e40af', 'Joining Formalities':'#fef9c3:#854d0e', 'Pending Documents':'#fee2e2:#991b1b',
  High:'#fee2e2:#991b1b', Medium:'#fef9c3:#854d0e', Low:'#f1f5f9:#475569',
  Good:'#dbeafe:#1e40af', 'Very Good':'#dcfce7:#166534', 'Pending Self-Assessment':'#fef9c3:#854d0e', 'Pending Reporting Officer':'#fef9c3:#854d0e'
};
export default function Badge({ text }) {
  const [bg, color] = (colors[text] || '#f1f5f9:#475569').split(':');
  return <span className="badge" style={{ background: bg, color }}>{text}</span>;
}
