const fs = require('fs');

const filesToUpdate = [
  'hrms/src/pages/Landing.jsx',
  'hrms/src/data/mockData.js',
  'hrms-backend/src/seeds/seed.js'
];

filesToUpdate.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace hardcoded values in UI and data
    content = content.replace(/Revenue Dept\./g, 'development Dept.');
    content = content.replace(/"chart-row-label">Revenue<\/div>/g, '"chart-row-label">development</div>');
    content = content.replace(/"chart-row-label">Health<\/div>/g, '"chart-row-label">IT</div>');
    content = content.replace(/"chart-row-label">Education<\/div>/g, '"chart-row-label">management</div>');
    
    content = content.replace(/Revenue Department/g, 'development Department');
    
    content = content.replace(/"donut-label-text">Revenue<\/div>/g, '"donut-label-text">development</div>');
    content = content.replace(/"donut-label-text">Education<\/div>/g, '"donut-label-text">management</div>');
    content = content.replace(/"donut-label-text">Health<\/div>/g, '"donut-label-text">IT</div>');
    
    content = content.replace(/HOD Education/g, 'HOD development');
    content = content.replace(/HOD Revenue/g, 'HOD management');
    content = content.replace(/HOD Health/g, 'HOD IT');
    
    fs.writeFileSync(file, content);
    console.log('Updated ' + file);
  }
});
