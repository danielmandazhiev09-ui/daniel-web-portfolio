// Basic client validation + inline errors + submit via fetch to /submit
const form = document.getElementById('requestForm');
const formErrors = document.getElementById('form-errors');

function showErrors(html){
  formErrors.innerHTML = html;
  formErrors.style.display = html ? 'block' : 'none';
}

function validate(data){
  const errors = [];

  // Name: at least 2 letters (Bulgarian and Latin allowed)
  if(!/^[A-Za-zА-Яа-яЁё\s'-]{2,}$/.test(data.name.trim())){
    errors.push({field:'name', msg:'Въведете валидно име (поне 2 букви).'});
  }

  // Phone: keep digits, allow + at start; require 7-15 digits
  const digits = (data.phone || '').replace(/\D/g,'');
  if(digits.length < 7 || digits.length > 15){
    errors.push({field:'phone', msg:'Телефонът трябва да съдържа между 7 и 15 цифри. Използвайте международен формат, напр. +359...' });
  }
  if(!/^\+?[\d\s()\-]+$/.test(data.phone)){
    errors.push({field:'phone', msg:'Телефонът съдържа недопустими символи.'});
  }

  // Address: minimal length
  if((data.address||'').trim().length < 5){
    errors.push({field:'address', msg:'Адресът е твърде кратък. Посочете улица и номер ако е възможно.'});
  }

  // Sender email (optional but if present must be valid)
  if(!data.senderEmail || !data.senderEmail.trim()){
    errors.push({field:'senderEmail', msg:'Имейлът за контакт е задължителен.'});
  } else {
    const em = data.senderEmail.trim();
    if(!/^\S+@\S+\.\S+$/.test(em)){
      errors.push({field:'senderEmail', msg:'Въведете валиден имейл адрес.'});
    }
  }

  // Service selected
  if(!data.service || data.service === ''){
    errors.push({field:'service', msg:'Моля, изберете услуга.'});
  }

  return errors;
}

form.addEventListener('submit', async (e)=>{
  e.preventDefault();
  const data = {
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    address: document.getElementById('address').value,
    senderEmail: document.getElementById('senderEmail').value,
    service: document.getElementById('service').value,
  };

  const errors = validate(data);
  if(errors.length){
    // Build helpful messages and tips how to fix each
    const html = '<ul>' + errors.map(err=>`<li><strong>${err.field}:</strong> ${err.msg}</li>`).join('') + '</ul>';
    showErrors(html);
    return;
  }

  showErrors('');

  // Optional: show confirmation before sending
  if(!confirm('Всички данни изглеждат коректни. Изпращам заявката?')) return;

  try{
    const res = await fetch('/submit', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });
    const j = await res.json().catch(()=>null);
    if(!res.ok){
      const errorMessage = j && j.error ? j.error : `Грешка от сървъра: ${res.status} ${res.statusText}`;
      showErrors('<p class="error">' + errorMessage + '</p>');
      return;
    }
    if(j && j.success){
      alert('Заявката е изпратена успешно.');
      form.reset();
      showErrors('');
    } else {
      showErrors('<p class="error">Възникна проблем при изпращане: ' + (j && j.error ? j.error : 'неизвестна грешка') + '</p>');
    }
  }catch(err){
    showErrors('<p class="error">Неуспех при връзка със сървъра. Проверете конзолата.</p>');
    console.error(err);
  }
});
