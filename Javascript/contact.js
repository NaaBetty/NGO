(() => {
  const form = document.getElementById('contact-form');
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const subject = `Le Shelter enquiry: ${String(data.get('subject')).trim()}`;
    const body = `Name: ${String(data.get('name')).trim()}\nReply email: ${String(data.get('email')).trim()}\n\n${String(data.get('message')).trim()}`;
    window.location.href = `mailto:lesheltergh@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    document.getElementById('contact-status').textContent = 'Your email draft is ready to open. Send it from your email app. If it does not open, email lesheltergh@gmail.com directly.';
  });
})();
