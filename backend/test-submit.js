const FormData = require('form-data');
const axios = require('axios');
const fs = require('fs');

async function test() {
  try {
    const form = new FormData();
    form.append('full_name', 'Test Candidate');
    form.append('email', 'test' + Date.now() + '@test.com');
    form.append('phone', '9876543210');
    form.append('primary_role', 'Software Engineer');
    form.append('preferred_domains', JSON.stringify(['Software Engineering']));
    form.append('education', "Bachelor's Degree");
    form.append('salary_min', '500000');
    form.append('salary_max', '800000');
    form.append('salary_flexible', 'false');
    form.append('years_of_experience', '5');
    
    // Create a dummy file
    const dummyFile = Buffer.from('dummy cv content');
    form.append('cv', dummyFile, { filename: 'resume.pdf' });

    const response = await axios.post('http://localhost:5000/api/applications', form, {
      headers: form.getHeaders(),
    });

    console.log('✓ Application submitted:', response.data);
  } catch (err) {
    console.error('✗ Error:', err.response?.data || err.message);
  }
}

test();
